"""Headline collector over Google News search feeds.

Why this exists
---------------
Most Bangladeshi outlets refuse automated clients from GitHub's datacentre
ranges: a probe of 30 candidate feeds (backend/tools/probe_sources.py, Oct
2026) found 26 returning 403/404 or nothing. Google News indexes those same
outlets and serves a public RSS search feed that the runner *can* read - one
Bangla query returned 100 headlines from 46 distinct outlets, among them
Jugantor, Samakal, Jamuna TV, Channel 24 and Naya Diganta, none of which this
pipeline can reach directly.

What it can and cannot do
-------------------------
Only the headline and outlet name are available. The article link is a
Google redirect that resolves in a browser but not to a plain HTTP client,
so the body is never fetched and nothing is routed around a publisher's
block. Bangla crime headlines usually name the place and the offence
("নেত্রকোনায় সাংবাদিককে গুলি করে হত্যা"), which is enough for the extractor;
when they do not, the incident is dropped by the location rule as usual.
Headline-depth records are scored below a full article.

Outlets the pipeline already reads directly are skipped, so the same story
is not filed twice under two differently worded titles, and Indian or other
foreign outlets are skipped before they cost a model call.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional
from urllib.parse import quote, urlparse

import feedparser
import httpx

from app.parsers.llm_extractor import ExtractedIncident, extract_with_verdict_async
from app.scrapers.news_scraper import NEWS_FEEDS, USER_AGENT, is_reportable
from app.scrapers.seen_cache import SeenCache

logger = logging.getLogger(__name__)

SEARCH_URL = (
    "https://news.google.com/rss/search?q={query}&hl={lang}&gl=BD&ceid=BD:{lang}"
)

#: Headline-only reporting. Below YouTube's 70 (a newsroom's own video
#: report) and the 80 given to a full article.
HEADLINE_CONFIDENCE = 65

# (query, language). Grouped by harm so one noisy topic cannot crowd out the
# others: each query's results compete only for its share of the cap.
QUERIES: tuple[tuple[str, str], ...] = (
    ("হত্যা OR খুন OR ছিনতাই OR ডাকাতি OR অপহরণ", "bn"),
    ("ধর্ষণ OR যৌন হয়রানি OR শ্লীলতাহানি OR ইভটিজিং OR যৌতুক", "bn"),
    ("প্রতারণা OR হ্যাকিং OR সাইবার OR অনলাইন জুয়া OR বিকাশ প্রতারণা", "bn"),
    ("মানবপাচার OR মাদক উদ্ধার OR চাঁদাবাজি", "bn"),
    ("Bangladesh murder OR robbery OR arrested OR abducted", "en"),
    ("Bangladesh rape OR \"sexual harassment\" OR dowry OR trafficking", "en"),
    ("Bangladesh cybercrime OR hacking OR sextortion OR \"online fraud\"", "en"),
)

# Seen in probe results: Indian and international outlets that surface for
# Bangla or "Bangladesh" queries but report incidents elsewhere.
FOREIGN_OUTLETS: frozenset[str] = frozenset(
    {
        "anandabazar patrika", "ei samay", "hindustan times", "etv bharat",
        "kolkatatv", "aaro ananda", "jagarantripura.com", "the times of india",
        "india today", "ani news", "abp live english", "rediff", "the420.in",
        "sangbad ekalavya", "times today", "latestly", "newsd.in", "organiser",
        "wion", "malaysia sun", "the sun malaysia", "demócrata",
        "business insider africa", "vietnam.vn", "puber kalom",
    }
)

_TRAILING_OUTLET = re.compile(r"\s+[-–—|]\s+[^-–—|]{2,80}$")


def _norm(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip().lower()


def _host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _direct_outlets() -> tuple[frozenset[str], frozenset[str]]:
    """Outlets read directly by news_scraper: (normalised names, web hosts).

    Google names some outlets in Bangla (প্রথম আলো) or without the article
    ("Daily Star"), so the publisher's host is the dependable key and the
    name is a fallback for entries that carry no link.
    """
    names, hosts = set(), set()
    for feed in NEWS_FEEDS:
        base = _norm(feed.outlet.split("(")[0])
        names.add(base)
        names.add(base.removeprefix("the "))
        host = _host(feed.url)
        hosts.add(host)
        # bangla.dhakatribune.com and en.prothomalo.com are the same paper.
        hosts.add(host.split(".", 1)[1] if host.count(".") >= 2 else host)
    return frozenset(names), frozenset(hosts)


def _is_direct(outlet: str, href: str, direct: tuple[frozenset[str], frozenset[str]]) -> bool:
    names, hosts = direct
    host = _host(href)
    if host and (host in hosts or any(host.endswith("." + h) for h in hosts)):
        return True
    name = _norm(outlet)
    return name in names or name.removeprefix("the ") in names


def _is_foreign(outlet: str, href: str) -> bool:
    if _norm(outlet) in FOREIGN_OUTLETS:
        return True
    host = urlparse(href).hostname or ""
    return host.endswith(".in")


def _published(entry: feedparser.FeedParserDict) -> Optional[datetime]:
    struct = entry.get("published_parsed") or entry.get("updated_parsed")
    return datetime(*struct[:6], tzinfo=timezone.utc) if struct else None


async def _search(
    client: httpx.AsyncClient, query: str, lang: str, lookback_hours: int
) -> List[Dict[str, object]]:
    window = "1d" if lookback_hours <= 24 else f"{max(1, lookback_hours // 24)}d"
    url = SEARCH_URL.format(query=quote(f"{query} when:{window}"), lang=lang)
    try:
        response = await client.get(url)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("[gnews] %r failed: %s", query, exc)
        return []

    parsed = await asyncio.to_thread(feedparser.parse, response.content)
    items = []
    for entry in parsed.entries:
        source = entry.get("source") or {}
        outlet = str(source.get("title") or "").strip()
        title = str(entry.get("title") or "").strip()
        link = str(entry.get("link") or "").strip()
        if not (outlet and title and link):
            continue
        # Google appends " - Outlet" to every title; the outlet is recorded
        # separately, so keep it out of the text the model reads.
        if title.endswith(outlet):
            title = _TRAILING_OUTLET.sub("", title).strip() or title
        items.append(
            {
                "title": title,
                "outlet": outlet,
                "href": str(source.get("href") or ""),
                "link": link,
                "published": _published(entry),
                "query": query,
            }
        )
    logger.info("[gnews] %d headlines for %r", len(items), query[:40])
    return items


async def scrape_google_news(
    *,
    lookback_hours: int = 12,
    max_headlines: int = 40,
    queries: Iterable[tuple[str, str]] = QUERIES,
    seen: Optional[SeenCache] = None,
) -> List[ExtractedIncident]:
    query_list = list(queries)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    direct = _direct_outlets()

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT, "Accept-Language": "bn,en;q=0.9"},
        timeout=httpx.Timeout(20.0, connect=10.0),
        follow_redirects=True,
    ) as client:
        per_query = []
        for query, lang in query_list:
            per_query.append(await _search(client, query, lang, lookback_hours))
            await asyncio.sleep(1.0)  # be a light, sequential client

    seen_links: set[str] = set()
    seen_titles: set[str] = set()
    skipped = {"direct": 0, "foreign": 0, "processed": 0, "gate": 0}
    buckets: List[List[Dict[str, object]]] = []

    for items in per_query:
        bucket = []
        for item in items:
            link, title = str(item["link"]), str(item["title"])
            published = item["published"]
            if isinstance(published, datetime) and published < cutoff:
                continue
            if link in seen_links or _norm(title) in seen_titles:
                continue
            outlet = str(item["outlet"])
            if _is_direct(outlet, str(item["href"]), direct):
                skipped["direct"] += 1
                continue
            if _is_foreign(outlet, str(item["href"])):
                skipped["foreign"] += 1
                continue
            if seen is not None and link in seen:
                skipped["processed"] += 1
                continue
            if not is_reportable(title):
                skipped["gate"] += 1
                continue
            seen_links.add(link)
            seen_titles.add(_norm(title))
            bucket.append(item)
        bucket.sort(
            key=lambda it: it["published"] or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        buckets.append(bucket)

    # Round-robin across queries so each harm gets a fair share of the cap.
    candidates: List[Dict[str, object]] = []
    while len(candidates) < max_headlines and any(buckets):
        for bucket in buckets:
            if bucket and len(candidates) < max_headlines:
                candidates.append(bucket.pop(0))

    logger.info(
        "[gnews] %d candidate headlines (skipped: %s)", len(candidates), skipped
    )

    incidents: List[ExtractedIncident] = []
    for item in candidates:
        published = item["published"]
        # The extractor needs to know this is all there is; it also lifts the
        # text over the minimum length a bare Bangla headline can fall under.
        composed = (
            f"{item['title']}\n\n"
            f"(Headline only, as published by {item['outlet']}. No article body.)"
        )
        try:
            incident, final = await extract_with_verdict_async(
                composed,
                "news_portal",
                source_url=str(item["link"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - one bad headline must not stop the run
            logger.warning("[gnews] extraction failed for %s: %s", item["link"], exc)
            continue

        if final and seen is not None:
            seen.add(str(item["link"]))
        if incident is None:
            continue
        incident.source_confidence = HEADLINE_CONFIDENCE
        incident.source_handle = str(item["outlet"])[:120]
        incidents.append(incident)

    logger.info("google_news_scraper produced %d incidents", len(incidents))
    return incidents
