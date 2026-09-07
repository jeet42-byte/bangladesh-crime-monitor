"""Live signal collector: public Telegram channel previews.

Why Telegram and nothing else
-----------------------------
Every mainstream social platform was probed for unauthenticated read access:

    Facebook   Cloudflare interstitial, refuses automated clients
    Instagram  429, login required
    X/Twitter  429 on the syndication endpoint; Nitter instances are dead
    Reddit     403 - OAuth now required even for public .json
    LinkedIn   explicit login wall
    Bluesky    reachable, but negligible Bangladesh crime content
    Mastodon   reachable, effectively no Bangladesh content

Telegram exposes a read-only HTML preview of *public* channels at
``t.me/s/<channel>``. No login, no token, no API key, and no scraping of a
private surface: it is the page Telegram serves to anyone with the link.

What this is good for
---------------------
Speed. Bangladeshi newsrooms post to Telegram minutes after an incident,
often before the article appears in their RSS feed. That is the whole value:
these are the same organisations already in ``news_scraper``, reporting
faster.

What it is not
--------------
It is not eyewitness social media. Public channels here are overwhelmingly
broadcast accounts, not members of the public, and the collector is
deliberately restricted to a curated registry rather than open search.
Unattributed claims about crime spread fast in Bangladesh and have triggered
real violence; an open firehose of anonymous posts on a crime map would be an
actively harmful thing to build, so this collects from named publishers only
and marks everything it produces as unverified until a second source agrees.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional

import httpx
from bs4 import BeautifulSoup

from app.parsers.llm_extractor import (
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)
from app.scrapers.news_scraper import USER_AGENT, looks_like_crime

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = httpx.Timeout(25.0, connect=10.0)
PREVIEW_URL = "https://t.me/s/{channel}"


class TelegramChannel:
    """One public channel, with the trust we extend to it."""

    def __init__(
        self,
        handle: str,
        outlet: str,
        *,
        tier: str = "newsroom",
        language: str = "bn",
    ) -> None:
        self.handle = handle
        self.outlet = outlet
        # 'official'  - a government or police channel
        # 'newsroom'  - a masthead we already ingest via RSS
        # 'community' - anything else; not currently used, and deliberately so
        self.tier = tier
        self.language = language

    def __repr__(self) -> str:  # pragma: no cover
        return f"<TelegramChannel @{self.handle}>"


# ---------------------------------------------------------------------------
# Registry
#
# Verified as reachable and actually posting. Channels are listed explicitly:
# there is no discovery or keyword search, because a crime archive should not
# ingest claims from accounts nobody has vetted.
# ---------------------------------------------------------------------------
TELEGRAM_CHANNELS: List[TelegramChannel] = [
    TelegramChannel("prothomalo", "Prothom Alo", tier="newsroom", language="bn"),
    TelegramChannel("thedailystar", "The Daily Star", tier="newsroom", language="en"),
    TelegramChannel("bdnews24com", "bdnews24", tier="newsroom", language="en"),
    TelegramChannel("jamunatvbd", "Jamuna TV", tier="newsroom", language="bn"),
]

# Confidence by channel tier. Deliberately below the news_portal score of 80:
# a Telegram post is a headline flash, not an edited article, and the same
# outlet's RSS entry is the better record of the same event.
TIER_CONFIDENCE: Dict[str, int] = {
    "official": 85,
    "newsroom": 65,
    "community": 45,
}


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
def _parse_timestamp(node) -> Optional[datetime]:
    """Telegram renders an ISO timestamp in a <time datetime="..."> element."""
    time_tag = node.select_one("time[datetime]")
    if not time_tag:
        return None
    raw = time_tag.get("datetime", "")
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _parse_channel_html(html: str, channel: TelegramChannel) -> List[Dict[str, object]]:
    """Extract posts from a t.me/s/ preview page."""
    soup = BeautifulSoup(html, "lxml")
    posts: List[Dict[str, object]] = []

    for wrapper in soup.select("div.tgme_widget_message"):
        body = wrapper.select_one("div.tgme_widget_message_text")
        if body is None:
            continue

        text = re.sub(r"\s+", " ", body.get_text(" ", strip=True)).strip()
        if not text:
            continue

        # data-post is "channel/123"; the permalink is t.me/<that>.
        data_post = wrapper.get("data-post", "")
        permalink = (
            f"https://t.me/{data_post}"
            if data_post
            else f"https://t.me/s/{channel.handle}"
        )

        posts.append(
            {
                "text": text,
                "url": permalink,
                "published": _parse_timestamp(wrapper),
                "channel": channel,
            }
        )

    return posts


async def _fetch_channel(
    client: httpx.AsyncClient, channel: TelegramChannel
) -> List[Dict[str, object]]:
    url = PREVIEW_URL.format(channel=channel.handle)
    try:
        response = await client.get(url)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("[tg:%s] fetch failed: %s", channel.handle, exc)
        return []

    posts = await asyncio.to_thread(_parse_channel_html, response.text, channel)
    logger.info("[tg:%s] %d posts in preview", channel.handle, len(posts))
    return posts


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
async def scrape_telegram(
    *,
    lookback_hours: int = 12,
    max_posts: int = 25,
    channels: Optional[Iterable[TelegramChannel]] = None,
) -> List[ExtractedIncident]:
    """Collect recent crime-shaped posts from the registered channels.

    Everything returned is marked ``unverified`` by the caller; promotion to
    a corroborated record happens only when an independent source reports the
    same incident.
    """
    registry = list(channels) if channels is not None else TELEGRAM_CHANNELS
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en,bn;q=0.9"}

    async with httpx.AsyncClient(
        headers=headers, timeout=REQUEST_TIMEOUT, follow_redirects=True
    ) as client:
        gathered = await asyncio.gather(
            *(_fetch_channel(client, channel) for channel in registry),
            return_exceptions=True,
        )

    candidates: List[Dict[str, object]] = []
    seen: set[str] = set()

    for result in gathered:
        if isinstance(result, BaseException):
            logger.warning("telegram task raised: %s", result)
            continue
        for post in result:
            published = post["published"]
            if isinstance(published, datetime) and published < cutoff:
                continue

            text = str(post["text"])
            if len(text) < 60 or not looks_like_crime(text):
                continue

            # Channels repost each other verbatim; one LLM call is enough.
            fingerprint = text[:160].lower()
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            candidates.append(post)

    candidates.sort(
        key=lambda item: item["published"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    candidates = candidates[:max_posts]

    logger.info("%d crime-candidate Telegram posts after filtering", len(candidates))

    incidents: List[ExtractedIncident] = []
    for post in candidates:
        channel: TelegramChannel = post["channel"]  # type: ignore[assignment]
        published = post["published"]

        try:
            incident = await extract_crime_entities_async(
                str(post["text"]),
                # Routed through the same extractor as everything else; the
                # platform only decides scoring, never parsing.
                "telegram_channel",
                source_url=str(post["url"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - one bad post must not stop the run
            logger.warning("telegram extraction failed for %s: %s", post["url"], exc)
            continue

        if incident is None:
            continue

        incident.source_confidence = TIER_CONFIDENCE.get(channel.tier, 45)
        incident.source_handle = channel.handle
        # Always unverified on arrival. run_scrapers decides whether an
        # independent source already reported the same thing.
        incident.verification_level = "unverified"
        incidents.append(incident)

    logger.info("telegram_scraper produced %d live signals", len(incidents))
    return incidents


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    async def _main() -> None:
        results = await scrape_telegram(lookback_hours=48)
        for item in results:
            when = item.incident_date.astimezone(BST).strftime("%Y-%m-%d")
            print(
                f"[{item.crime_category:<10}] @{item.source_handle:<14} "
                f"conf={item.source_confidence} {when} {item.title[:50]}"
            )

    asyncio.run(_main())
