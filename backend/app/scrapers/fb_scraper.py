"""Dual-strategy collector for public Facebook incident pages.

Strategy A - Meta Graph API
    Used when ``FB_PAGE_ACCESS_TOKEN`` is present. Reads the ``/feed`` edge of
    public Pages the token is authorised for. This is the only fully
    Terms-of-Service-clean path and is preferred whenever available.

Strategy B - public RSS mirrors (RSSHub and friends)
    Used when no token is configured or when a Page returns a permission
    error. Mirrors expose the same public posts as an RSS feed, so no login,
    no cookie replay, and no scraping of authenticated surfaces.

Both strategies converge on the same normaliser, so the rest of the pipeline
never learns which one produced a post.

Scope note: only Pages and Groups that publish publicly, without login, are
read. Nothing here touches private groups, personal timelines, comments, or
reactions, and no post author identity is retained - the LLM prompt strips
names and the payload keeps only the permalink.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional

import feedparser
import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.parsers.llm_extractor import (
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)
from app.scrapers.news_scraper import USER_AGENT, looks_like_crime

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

REQUEST_TIMEOUT = httpx.Timeout(25.0, connect=10.0)

# Public RSS mirrors, tried in order. Self-hosting RSSHub is recommended for
# production; the public instance is rate-limited and best-effort.
RSS_MIRROR_TEMPLATES: tuple[str, ...] = (
    "https://rsshub.app/facebook/page/{page_id}",
    "https://rss.app/feeds/facebook/{page_id}.xml",
)


class FacebookSource:
    """One public Page or Group to monitor."""

    def __init__(
        self,
        label: str,
        page_id: str,
        *,
        description: str = "",
    ) -> None:
        self.label = label
        # Numeric ID or vanity slug; both work with Graph and with RSSHub.
        self.page_id = page_id
        self.description = description

    def __repr__(self) -> str:  # pragma: no cover
        return f"<FacebookSource {self.label}>"


# ---------------------------------------------------------------------------
# Source registry
#
# These are official/public-interest Pages that post incident information.
# Edit this list to match the Pages you are authorised to read; the pipeline
# treats every one of them as source_confidence 55 regardless.
# ---------------------------------------------------------------------------
FACEBOOK_SOURCES: List[FacebookSource] = [
    FacebookSource(
        "Dhaka Metropolitan Police",
        "DMPPage",
        description="Official DMP page - advisories and case updates.",
    ),
    FacebookSource(
        "Bangladesh Police",
        "bangladeshpolice",
        description="National police service public page.",
    ),
    FacebookSource(
        "DMP Traffic",
        "dmptrafficdhaka",
        description="Traffic incidents and road-crime advisories.",
    ),
    FacebookSource(
        "RAB - Rapid Action Battalion",
        "rabbdofficial",
        description="Operations and seizure announcements.",
    ),
]


# ---------------------------------------------------------------------------
# Normalisation shared by both strategies
# ---------------------------------------------------------------------------
_URL_RE = re.compile(r"https?://\S+")
_HASHTAG_RE = re.compile(r"#(\w+)")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_caption(raw: str) -> str:
    """Strip social-media furniture while keeping the sentence content.

    Hashtags are unwrapped rather than deleted: "#Mirpur #chinatai" is often
    the only location and category signal a caption carries.
    """
    if not raw:
        return ""
    text = _URL_RE.sub(" ", raw)
    text = _HASHTAG_RE.sub(r"\1", text)
    text = text.replace("‌", "").replace("‍", "")
    return _WHITESPACE_RE.sub(" ", text).strip()


def _permalink(page_id: str, post_id: str) -> str:
    """Build a stable public permalink for a Graph post id."""
    if "_" in post_id:
        owner, story = post_id.split("_", 1)
        return f"https://www.facebook.com/{owner}/posts/{story}"
    return f"https://www.facebook.com/{page_id}/posts/{post_id}"


def _parse_graph_time(value: str) -> Optional[datetime]:
    """Graph returns ISO-8601 with a +0000 offset."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S%z")
    except ValueError:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None


# ---------------------------------------------------------------------------
# Strategy A - Meta Graph API
# ---------------------------------------------------------------------------
async def _fetch_via_graph(
    client: httpx.AsyncClient,
    source: FacebookSource,
    since: datetime,
    limit: int,
) -> List[Dict[str, object]]:
    """Read a Page's public feed through the Graph API."""
    token = settings.FB_PAGE_ACCESS_TOKEN
    if not token:
        return []

    params = {
        "fields": "id,message,created_time,permalink_url",
        "limit": str(limit),
        "since": str(int(since.timestamp())),
        "access_token": token,
    }

    try:
        response = await client.get(
            f"{GRAPH_API_BASE}/{source.page_id}/feed", params=params
        )
        if response.status_code in (400, 403):
            detail = response.json().get("error", {}).get("message", response.text)
            logger.info(
                "[%s] Graph declined (%s): %s - falling back to RSS mirror.",
                source.label,
                response.status_code,
                detail,
            )
            return []
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("[%s] Graph request failed: %s", source.label, exc)
        return []

    posts: List[Dict[str, object]] = []
    for item in payload.get("data", []):
        message = clean_caption(item.get("message", ""))
        if not message:
            continue
        posts.append(
            {
                "text": message,
                "url": item.get("permalink_url")
                or _permalink(source.page_id, item.get("id", "")),
                "published": _parse_graph_time(item.get("created_time", "")),
                "source_label": source.label,
                "strategy": "graph",
            }
        )

    logger.info("[%s] Graph returned %d posts", source.label, len(posts))
    return posts


# ---------------------------------------------------------------------------
# Strategy B - public RSS mirrors
# ---------------------------------------------------------------------------
async def _fetch_via_mirror(
    client: httpx.AsyncClient,
    source: FacebookSource,
    since: datetime,
    limit: int,
) -> List[Dict[str, object]]:
    """Read the same public posts through an RSS mirror."""
    for template in RSS_MIRROR_TEMPLATES:
        url = template.format(page_id=source.page_id)
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.debug("[%s] mirror %s failed: %s", source.label, url, exc)
            continue

        parsed = await asyncio.to_thread(feedparser.parse, response.content)
        if not parsed.entries:
            continue

        posts: List[Dict[str, object]] = []
        for entry in parsed.entries[:limit]:
            raw = getattr(entry, "summary", "") or getattr(entry, "title", "")
            text = clean_caption(
                BeautifulSoup(raw, "html.parser").get_text(" ", strip=True)
            )
            if not text:
                continue

            published: Optional[datetime] = None
            struct = getattr(entry, "published_parsed", None)
            if struct:
                try:
                    published = datetime(*struct[:6], tzinfo=timezone.utc)
                except (TypeError, ValueError):
                    published = None
            if published and published < since:
                continue

            posts.append(
                {
                    "text": text,
                    "url": getattr(entry, "link", "")
                    or f"https://www.facebook.com/{source.page_id}",
                    "published": published,
                    "source_label": source.label,
                    "strategy": "mirror",
                }
            )

        if posts:
            logger.info(
                "[%s] mirror returned %d posts via %s",
                source.label,
                len(posts),
                url,
            )
            return posts

    logger.info("[%s] no mirror produced posts", source.label)
    return []


async def _collect_source(
    client: httpx.AsyncClient,
    source: FacebookSource,
    since: datetime,
    limit: int,
) -> List[Dict[str, object]]:
    """Graph first, mirror as fallback."""
    posts = await _fetch_via_graph(client, source, since, limit)
    if posts:
        return posts
    return await _fetch_via_mirror(client, source, since, limit)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
async def scrape_facebook(
    *,
    lookback_hours: int = 12,
    max_posts_per_source: int = 25,
    max_incidents: int = 40,
    sources: Optional[Iterable[FacebookSource]] = None,
) -> List[ExtractedIncident]:
    """Collect public posts and normalise them into incidents."""
    source_list = list(sources) if sources is not None else FACEBOOK_SOURCES
    since = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en,bn;q=0.9",
    }

    async with httpx.AsyncClient(
        headers=headers,
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
    ) as client:
        gathered = await asyncio.gather(
            *(
                _collect_source(client, source, since, max_posts_per_source)
                for source in source_list
            ),
            return_exceptions=True,
        )

    posts: List[Dict[str, object]] = []
    seen_texts: set[str] = set()

    for result in gathered:
        if isinstance(result, BaseException):
            logger.warning("facebook source task raised: %s", result)
            continue
        for post in result:
            text = str(post["text"])
            # Pages cross-post the same advisory verbatim; drop exact repeats
            # before spending an LLM call on them.
            fingerprint = text[:200].lower()
            if fingerprint in seen_texts:
                continue
            if len(text) < 60 or not looks_like_crime(text):
                continue
            seen_texts.add(fingerprint)
            posts.append(post)

    posts.sort(
        key=lambda item: item["published"]
        or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    posts = posts[:max_incidents]

    logger.info("%d crime-candidate social posts after filtering", len(posts))

    incidents: List[ExtractedIncident] = []
    for post in posts:
        published = post["published"]
        try:
            incident = await extract_crime_entities_async(
                str(post["text"]),
                "facebook_public",
                source_url=str(post["url"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - never abort the batch
            logger.warning("extraction failed for %s: %s", post["url"], exc)
            continue

        if incident is not None:
            incidents.append(incident)

    logger.info("fb_scraper produced %d incidents", len(incidents))
    return incidents


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    async def _main() -> None:
        results = await scrape_facebook(lookback_hours=72)
        for item in results:
            local = item.incident_date.astimezone(BST).strftime("%Y-%m-%d")
            print(f"[{item.crime_category:<10}] {item.thana_name:<24} {local}  {item.title}")

    asyncio.run(_main())
