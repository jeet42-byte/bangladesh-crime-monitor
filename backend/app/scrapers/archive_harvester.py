"""Historical harvest: Wayback CDX discovery plus snapshot retrieval.

Why the Wayback Machine rather than the outlets
-----------------------------------------------
RSS carries the last 10-100 items, so 2023 is simply not reachable through
the live pipeline. The alternatives were each probed:

    Outlet sitemaps     Partial, inconsistent, and several outlets 403 or
                        serve a Cloudflare interstitial to automated clients.
    Date archive pages  Exist on some outlets, absent on others, and each
                        needs bespoke pagination.
    Wayback CDX         One uniform interface across every outlet, no auth,
                        no key, and retrieval comes from the archive rather
                        than the publisher - so a three-year backfill puts no
                        load on newsrooms that never asked to be crawled, and
                        sidesteps the Cloudflare problem entirely.

The trap in CDX timestamps
--------------------------
A CDX timestamp records when a page was *captured*, not when it was
published. Sampling 2023 captures of The Daily Star returns 2020 pandemic
coverage that happened to be crawled that year. Filtering the backfill on the
capture date would therefore quietly seed the archive with incidents years
older than they appear.

So the capture date is used only to bound the crawl. Publication date is
taken from the article itself and anything outside the requested window is
discarded - see ``extract_published``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Sequence

import httpx
from bs4 import BeautifulSoup

from app.parsers.asset_lexicon import slug_is_candidate

logger = logging.getLogger(__name__)

CDX_ENDPOINT = "http://web.archive.org/cdx/search/cdx"
# The ``id_`` modifier returns the original bytes without the Wayback banner
# and rewritten links, which keeps the HTML parseable by the normal selectors.
SNAPSHOT_URL = "https://web.archive.org/web/{timestamp}id_/{url}"

CDX_TIMEOUT = httpx.Timeout(180.0, connect=30.0)
SNAPSHOT_TIMEOUT = httpx.Timeout(60.0, connect=20.0)

# Wayback returns 504 freely under load. These are not failures, they are the
# service asking to be approached more slowly.
CDX_RETRIES = 4
CDX_BACKOFF_SECONDS = 8

USER_AGENT = (
    "Mozilla/5.0 (compatible; BangladeshCrimeMonitor/1.0; "
    "+https://github.com/bangladesh-crime-monitor) OSINT research backfill"
)

#: Paths that are never articles. Cuts the candidate set before the lexicon.
_NON_ARTICLE_RE = re.compile(
    r"/(tag|tags|topic|topics|author|authors|page|category|categories|"
    r"search|feed|rss|sitemap|amp|print|video|videos|photo|photos|"
    r"gallery|epaper|archive)(/|$|\?)",
    re.IGNORECASE,
)


class ArchiveSource:
    """One outlet to harvest, with the selectors its article pages use."""

    def __init__(
        self,
        outlet: str,
        host: str,
        *,
        language: str = "en",
        body_selectors: Sequence[str] = (),
        path_prefixes: Sequence[str] = ("*",),
        slug_filterable: bool = True,
    ) -> None:
        self.outlet = outlet
        self.host = host
        self.language = language
        self.body_selectors = tuple(body_selectors)
        # Queried one at a time. A bare host wildcard combined with a date
        # range times out; narrowing the path makes the same query return in
        # seconds. Measured across all six outlets - see _cdx_page.
        self.path_prefixes = tuple(path_prefixes)
        # True when this outlet puts the headline in the URL path, so a URL
        # whose slug carries no words can be rejected outright rather than
        # fetched on the chance it might be relevant. False for the Bengali
        # outlets, which use bare numeric ids and must be judged after
        # retrieval. Getting this wrong in the permissive direction is what
        # made the first run fetch hundreds of 2007-2009 "news-detail-100003"
        # pages that no slug rule could have distinguished.
        self.slug_filterable = slug_filterable

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ArchiveSource {self.outlet}>"


# ---------------------------------------------------------------------------
# Which outlets are worth harvesting
#
# Coverage measured against CDX for 2023-2026 (capped at 8000 rows each, so
# these are floors):
#
#   thedailystar.net   2369 / 2196 / 3265 / 170
#   tbsnews.net        3551 / 3484 /  683 / 282
#   dhakatribune.com   1184 / 1640 / 2191 / 2985
#   dhakapost.com      6279 / 1177 /  506 /  38
#   risingbd.com       7499 /   40 /  453 /   8
#   jagonews24.com      469 /  445 / 6787 / 299
#
# The English three carry the headline in the URL path, so the lexicon can
# discard most candidates before a single page is fetched. The Bengali three
# use bare numeric ids and cannot be pre-filtered, which makes them roughly an
# order of magnitude more expensive per usable record. They are included but
# ordered last, so a quota-limited run spends itself on the cheap sources
# first.
# ---------------------------------------------------------------------------
ARCHIVE_SOURCES: List[ArchiveSource] = [
    ArchiveSource(
        "The Daily Star",
        "thedailystar.net",
        path_prefixes=("news/*", "business/*", "city/*", "country/*"),
        body_selectors=(
            "div.section-content .article-section",
            "div.pR .section-content",
            "article .field--name-body",
        ),
    ),
    ArchiveSource(
        "The Business Standard",
        "tbsnews.net",
        path_prefixes=("bangladesh/*", "economy/*", "nation/*"),
        body_selectors=("div.section-content", "div.node__content"),
    ),
    ArchiveSource(
        "Dhaka Tribune",
        "dhakatribune.com",
        path_prefixes=("bangladesh/*", "business/*"),
        body_selectors=("div.jw-detail-content", "div.content-detail"),
    ),
    ArchiveSource(
        "Dhaka Post",
        "dhakapost.com",
        language="bn",
        slug_filterable=False,
        path_prefixes=("country/*", "national/*", "law-courts/*", "economy/*"),
        body_selectors=("div.news-details", "article"),
    ),
    ArchiveSource(
        "Risingbd",
        "risingbd.com",
        language="bn",
        slug_filterable=False,
        path_prefixes=("bangladesh/*", "economy/*"),
        body_selectors=("article", "div.news-details"),
    ),
    ArchiveSource(
        "Jagonews24",
        "jagonews24.com",
        language="bn",
        slug_filterable=False,
        path_prefixes=("country/*", "national/*", "economy/*"),
        body_selectors=("div.content-details", "article"),
    ),
]


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------
async def _cdx_page(
    client: httpx.AsyncClient,
    source: ArchiveSource,
    prefix: str,
    *,
    from_date: str,
    to_date: str,
    limit: int,
    offset: int,
) -> List[List[str]]:
    """One page of CDX results, with backoff on the 504s Wayback likes to
    return. Returns [] once the archive has nothing more.

    The date range is affordable only because the path is narrowed first.
    Measured against the live service: a bare host wildcard with from/to
    times out at 60s on every attempt, while the same query scoped to a
    section prefix returns 1500 rows in 6-60s across all six outlets.
    Without any date range CDX paginates from the oldest capture it holds,
    which returns 2010-era URLs and is useless here.

    The capture dates that come back still are not publication dates - they
    only bound the crawl. Publication date is read from the article itself
    downstream, and anything outside the window is discarded there.
    """
    params = {
        "url": f"{source.host}/{prefix}",
        "from": from_date,
        "to": to_date,
        "output": "json",
        "fl": "timestamp,original",
        "filter": ["statuscode:200", "mimetype:text/html"],
        "collapse": "urlkey",
        "limit": str(limit),
        "offset": str(offset),
    }

    for attempt in range(1, CDX_RETRIES + 1):
        try:
            response = await client.get(CDX_ENDPOINT, params=params)
        except httpx.HTTPError as exc:
            logger.warning("[%s] CDX transport error: %s", source.outlet, exc)
            await asyncio.sleep(CDX_BACKOFF_SECONDS * attempt)
            continue

        if response.status_code == 200:
            body = response.text.strip()
            if not body:
                return []
            try:
                rows = json.loads(body)
            except json.JSONDecodeError:
                logger.warning("[%s] CDX returned non-JSON", source.outlet)
                return []
            # First row is the column header.
            return rows[1:] if len(rows) > 1 else []

        logger.info(
            "[%s] CDX HTTP %s (attempt %d/%d), backing off",
            source.outlet,
            response.status_code,
            attempt,
            CDX_RETRIES,
        )
        await asyncio.sleep(CDX_BACKOFF_SECONDS * attempt)

    logger.warning("[%s] CDX gave up after %d attempts", source.outlet, CDX_RETRIES)
    return []


def _is_plausible_article(url: str) -> bool:
    if _NON_ARTICLE_RE.search(url):
        return False
    if url.endswith((".jpg", ".png", ".pdf", ".xml", ".css", ".js")):
        return False
    # ``?amp`` duplicates are the same article twice.
    if url.endswith("?amp") or url.endswith("/amp"):
        return False
    return True


async def discover(
    client: httpx.AsyncClient,
    source: ArchiveSource,
    *,
    from_date: str,
    to_date: str,
    page_size: int = 1500,
    max_pages: int = 6,
) -> List[Dict[str, str]]:
    """Candidate URLs for one outlet, filtered by slug before any fetch.

    Returns dicts of ``{timestamp, url}``. The timestamp is the capture
    time and is only used to address the snapshot - never as a publication
    date.
    """
    seen: set[str] = set()
    candidates: List[Dict[str, str]] = []
    scanned = 0

    for prefix in source.path_prefixes:
        for page in range(max_pages):
            rows = await _cdx_page(
                client,
                source,
                prefix,
                from_date=from_date,
                to_date=to_date,
                limit=page_size,
                offset=page * page_size,
            )
            if not rows:
                break

            scanned += len(rows)
            for row in rows:
                if len(row) < 2:
                    continue
                timestamp, url = row[0], row[1]

                key = url.split("?", 1)[0]
                if key in seen:
                    continue
                seen.add(key)

                if not _is_plausible_article(url):
                    continue
                if not slug_is_candidate(url, strict=source.slug_filterable):
                    continue

                candidates.append({"timestamp": timestamp, "url": url})

            # A short page means the offset has run past the end of this
            # prefix; move on rather than paging into empty responses.
            if len(rows) < page_size:
                break

    logger.info(
        "[%s] scanned %d captures -> %d asset-relevant candidates",
        source.outlet,
        scanned,
        len(candidates),
    )
    return candidates


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
_PUBLISHED_META = (
    ("meta", {"property": "article:published_time"}),
    ("meta", {"name": "article:published_time"}),
    ("meta", {"property": "og:published_time"}),
    ("meta", {"itemprop": "datePublished"}),
    ("meta", {"name": "pubdate"}),
    ("meta", {"name": "publish-date"}),
    ("meta", {"name": "date"}),
)


def extract_published(soup: BeautifulSoup) -> Optional[datetime]:
    """Publication date from the article's own metadata.

    This is load-bearing: the CDX capture date is not the publication date,
    and using it would date incidents to whenever a crawler happened to visit.
    An article whose date cannot be established is dropped rather than
    guessed at.
    """
    for tag_name, attrs in _PUBLISHED_META:
        tag = soup.find(tag_name, attrs=attrs)
        if not tag:
            continue
        value = (tag.get("content") or "").strip()
        if not value:
            continue
        parsed = _parse_iso(value)
        if parsed:
            return parsed

    # JSON-LD is the common fallback on these outlets.
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            payload = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for block in payload if isinstance(payload, list) else [payload]:
            if not isinstance(block, dict):
                continue
            for key in ("datePublished", "dateCreated"):
                parsed = _parse_iso(str(block.get(key) or ""))
                if parsed:
                    return parsed

    return None


def _parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
        if not match:
            return None
        try:
            parsed = datetime(*(int(g) for g in match.groups()))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def extract_title(soup: BeautifulSoup) -> str:
    for finder in (
        lambda: soup.find("meta", attrs={"property": "og:title"}),
        lambda: soup.find("h1"),
        lambda: soup.title,
    ):
        tag = finder()
        if not tag:
            continue
        text = (tag.get("content") if tag.name == "meta" else tag.get_text(" ")) or ""
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 10:
            return text
    return ""


def extract_body(soup: BeautifulSoup, selectors: Sequence[str]) -> str:
    for selector in selectors:
        node = soup.select_one(selector)
        if node:
            text = re.sub(r"\s+", " ", node.get_text(" ")).strip()
            if len(text) > 200:
                return text

    # Generic sweep: the longest run of paragraphs on the page.
    paragraphs = [
        re.sub(r"\s+", " ", p.get_text(" ")).strip() for p in soup.find_all("p")
    ]
    return " ".join(p for p in paragraphs if len(p) > 40).strip()


async def fetch_snapshot(
    client: httpx.AsyncClient,
    candidate: Dict[str, str],
    source: ArchiveSource,
    semaphore: asyncio.Semaphore,
) -> Optional[Dict[str, object]]:
    """Retrieve one archived article and pull out title, body and date."""
    url = SNAPSHOT_URL.format(
        timestamp=candidate["timestamp"], url=candidate["url"]
    )

    async with semaphore:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.debug("snapshot failed %s: %s", candidate["url"], exc)
            return None

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = extract_title(soup)
    body = extract_body(soup, source.body_selectors)
    published = extract_published(soup)

    if not title or len(body) < 200 or published is None:
        return None

    return {
        "url": candidate["url"],
        "title": title,
        "body": body,
        "published": published,
        "outlet": source.outlet,
    }
