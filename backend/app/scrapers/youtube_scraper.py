"""Television newsroom collector, via YouTube channel RSS.

YouTube publishes a per-channel Atom feed at
``/feeds/videos.xml?channel_id=UC...`` with no key, no auth and no quota.
That makes the television newsrooms reachable - Channel 24, DBC, Jamuna,
Independent TV - none of which expose a usable article RSS feed, and none of
which the text collectors currently cover.

Measured yield, before building anything
----------------------------------------
Across 90 recent videos from six channels, six titles tripped the crime
lexicon and roughly two were genuine Bangladeshi incidents. That is a low
hit rate, but the keyword gate runs before any model call, so the cost is
about six extractions per poll rather than ninety.

Two limits worth knowing
------------------------
**This is headline depth, not article depth.** YouTube descriptions run
50-70% boilerplate - subscribe links, social handles, hashtags - and the
remainder usually just repeats the title. Records from here are scored below
article-based reporting for that reason.

**Titles use algospeak.** Creators break monetisation-sensitive words with
punctuation, so হত্যা (murder) is published as "হ/ত্যা" or "হ ত্যা". Left
alone this defeats both the keyword gate and the extractor. ``_deobfuscate``
repairs it.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional

import feedparser
import httpx

from app.parsers.llm_extractor import (
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)
from app.scrapers.news_scraper import USER_AGENT, looks_like_crime

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = httpx.Timeout(25.0, connect=10.0)
FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

# Headline-only reporting from a real newsroom. Below the 80 given to a full
# article from the same class of outlet, above a social post.
VIDEO_REPORT_CONFIDENCE = 70


class YouTubeChannel:
    """One television newsroom's channel."""

    def __init__(self, outlet: str, channel_id: str, *, language: str = "bn") -> None:
        self.outlet = outlet
        self.channel_id = channel_id
        self.language = language

    def __repr__(self) -> str:  # pragma: no cover
        return f"<YouTubeChannel {self.outlet}>"


# ---------------------------------------------------------------------------
# Registry
#
# Channel IDs were resolved from the live channel pages and each feed was
# checked for freshness. Several obvious handles resolve to the wrong channel
# entirely and are recorded below so nobody re-adds them:
#
#   @ntvbd            -> NTV *Turkey*, not NTV Bangladesh
#   @SOMOYTV          -> "Daily Explore", unrelated
#   @SomoyTVNews      -> a Somoy channel whose newest video is 11 years old
#   @Banglavision     -> the drama channel, not the news channel
#   @thedailystarnews -> last upload roughly three years ago
#   UCfVmpWSfQWtW9GZ5eGYZlhA -> a stale secondary Jamuna channel
# ---------------------------------------------------------------------------
YOUTUBE_CHANNELS: List[YouTubeChannel] = [
    YouTubeChannel("Jamuna TV", "UC2qb5FD5IRnXEP4CBdt7PvA"),
    YouTubeChannel("Channel 24", "UCHLqIOMPk20w-6cFgkA90jw"),
    YouTubeChannel("DBC News", "UCUvXoiDEKI8VZJrr58g4VAw"),
    YouTubeChannel("Independent Television", "UCATUkaOHwO9EP_W87zCiPbA"),
    YouTubeChannel("Rtv News", "UC2PvBto6gvSLVub6CdwaivA"),
]


# ---------------------------------------------------------------------------
# Text repair
# ---------------------------------------------------------------------------

# Bengali words that get split to dodge demonetisation, written here as the
# fragments actually observed in titles.
_ALGOSPEAK_PAIRS: tuple[tuple[str, str], ...] = (
    ("হ/ত্যা", "হত্যা"),
    ("হ/ ত্যা", "হত্যা"),
    ("হ ত্যা", "হত্যা"),
    ("খু/ন", "খুন"),
    ("খু ন", "খুন"),
    ("ধ/র্ষ", "ধর্ষ"),
    ("ধ র্ষ", "ধর্ষ"),
    ("আ/ত্মহ", "আত্মহ"),
    ("গু/লি", "গুলি"),
    ("গু লি", "গুলি"),
    ("নি/হ", "নিহ"),
    ("মা/দক", "মাদক"),
    ("অ/স্ত্র", "অস্ত্র"),
    ("লা/শ", "লাশ"),
)

# A slash wedged between two Bengali letters is always obfuscation - Bengali
# orthography has no such construction.
_BENGALI_SLASH = re.compile(r"(?<=[ঀ-৿])\s*/\s*(?=[ঀ-৿])")


def _deobfuscate(text: str) -> str:
    """Repair monetisation-dodging punctuation in a video title."""
    if not text:
        return text
    for broken, whole in _ALGOSPEAK_PAIRS:
        text = text.replace(broken, whole)
    text = _BENGALI_SLASH.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


# Description lines that are promotional furniture rather than reporting.
_BOILERPLATE = re.compile(
    r"(subscribe|follow us|like.*share|facebook\.com|twitter\.com|instagram\.com"
    r"|youtube\.com|tiktok|website|www\.|https?://|#\w+|@\w+"
    r"|our channels?|stay (?:tuned|connected)|©|all rights reserved)",
    re.IGNORECASE,
)


def _clean_description(raw: str, title: str) -> str:
    """Strip boilerplate and any line that merely restates the title."""
    if not raw:
        return ""

    normalised_title = re.sub(r"\W+", "", title).lower()
    kept: List[str] = []

    for line in raw.splitlines():
        line = line.strip()
        if not line or _BOILERPLATE.search(line):
            continue
        # Channels routinely paste the title in as the first description line.
        if re.sub(r"\W+", "", line).lower()[:60] == normalised_title[:60]:
            continue
        kept.append(line)

    return re.sub(r"\s+", " ", " ".join(kept)).strip()


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
async def _fetch_channel(
    client: httpx.AsyncClient, channel: YouTubeChannel
) -> List[Dict[str, object]]:
    url = FEED_URL.format(channel_id=channel.channel_id)
    try:
        response = await client.get(url)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("[yt:%s] feed fetch failed: %s", channel.outlet, exc)
        return []

    parsed = await asyncio.to_thread(feedparser.parse, response.content)

    entries: List[Dict[str, object]] = []
    for entry in parsed.entries:
        title = _deobfuscate((getattr(entry, "title", "") or "").strip())
        link = (getattr(entry, "link", "") or "").strip()
        if not title or not link:
            continue

        published: Optional[datetime] = None
        struct = getattr(entry, "published_parsed", None)
        if struct:
            try:
                published = datetime(*struct[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                published = None

        entries.append(
            {
                "title": title,
                "description": _clean_description(
                    getattr(entry, "summary", "") or "", title
                ),
                "link": link,
                "published": published,
                "channel": channel,
            }
        )

    logger.info("[yt:%s] %d videos in feed", channel.outlet, len(entries))
    return entries


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
async def scrape_youtube(
    *,
    lookback_hours: int = 12,
    max_videos: int = 20,
    channels: Optional[Iterable[YouTubeChannel]] = None,
) -> List[ExtractedIncident]:
    """Collect crime-shaped television reports from the registered channels."""
    registry = list(channels) if channels is not None else YOUTUBE_CHANNELS
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
            logger.warning("youtube task raised: %s", result)
            continue
        for entry in result:
            published = entry["published"]
            if isinstance(published, datetime) and published < cutoff:
                continue

            title = str(entry["title"])
            blob = f"{title} {entry['description']}"
            if not looks_like_crime(blob):
                continue

            fingerprint = title[:120].lower()
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            candidates.append(entry)

    candidates.sort(
        key=lambda item: item["published"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    candidates = candidates[:max_videos]

    logger.info("%d crime-candidate videos after filtering", len(candidates))

    incidents: List[ExtractedIncident] = []
    for entry in candidates:
        channel: YouTubeChannel = entry["channel"]  # type: ignore[assignment]
        published = entry["published"]

        # Title first: it is the reporting. The cleaned description adds
        # context when the channel wrote any, and is empty when it did not.
        composed = f"{entry['title']}\n\n{entry['description']}".strip()

        try:
            incident = await extract_crime_entities_async(
                composed,
                "news_portal",
                source_url=str(entry["link"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - one bad video must not stop the run
            logger.warning("youtube extraction failed for %s: %s", entry["link"], exc)
            continue

        if incident is None:
            continue

        # Headline depth, so scored below a full article from the same outlet.
        incident.source_confidence = VIDEO_REPORT_CONFIDENCE
        incident.source_handle = channel.outlet
        incidents.append(incident)

    logger.info("youtube_scraper produced %d incidents", len(incidents))
    return incidents


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    async def _main() -> None:
        results = await scrape_youtube(lookback_hours=48)
        for item in results:
            when = item.incident_date.astimezone(BST).strftime("%Y-%m-%d")
            print(
                f"[{item.crime_category:<10}] {item.source_handle:<24} "
                f"{item.thana_name:<16} {when} {item.title[:48]}"
            )

    asyncio.run(_main())
