"""RSS-driven news scraper for Bangladeshi dailies.

Flow per feed:

    RSS/Atom feed  ->  candidate entries  ->  article HTML  ->  body text
                   ->  llm_extractor      ->  ExtractedIncident

Only entries whose title or summary trips a crime lexicon are fetched in
full. That single filter is what keeps the run inside Gemini's free-tier
request budget: a typical 6-hour window yields ~400 feed entries but only
30-60 plausible crime stories.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Sequence

import feedparser
import httpx
from bs4 import BeautifulSoup

from app.parsers.llm_extractor import (
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (compatible; BangladeshCrimeMonitor/1.0; "
    "+https://github.com/bangladesh-crime-monitor) OSINT research bot"
)

REQUEST_TIMEOUT = httpx.Timeout(20.0, connect=10.0)

# Concurrency ceiling for article fetches. Deliberately modest: these are
# small newsrooms and we are an uninvited guest.
MAX_CONCURRENT_FETCHES = 4

# Politeness delay between article fetches from the same host.
FETCH_DELAY_SECONDS = 0.6


class NewsFeed:
    """One RSS/Atom source."""

    def __init__(
        self,
        outlet: str,
        url: str,
        *,
        language: str = "en",
        body_selectors: Sequence[str] = (),
        source_platform: str = "news_portal",
    ) -> None:
        self.outlet = outlet
        self.url = url
        self.language = language
        # Tried in order; the first selector that yields text wins. Falls back
        # to a generic <article>/<p> sweep when none match.
        self.body_selectors = tuple(body_selectors)
        # Drives source_confidence downstream: an official police release is
        # scored 95, a newsroom 80. Set per feed rather than per article,
        # because it is a property of who published it.
        self.source_platform = source_platform

    def __repr__(self) -> str:  # pragma: no cover
        return f"<NewsFeed {self.outlet}>"


# ---------------------------------------------------------------------------
# Feed registry
#
# Every URL here was verified to return parseable entries. A feed that starts
# 404-ing or gets put behind a WAF is logged and skipped, so the run degrades
# one source at a time rather than failing outright.
# ---------------------------------------------------------------------------
NEWS_FEEDS: List[NewsFeed] = [
    NewsFeed(
        "The Daily Star",
        "https://www.thedailystar.net/rss.xml",
        body_selectors=(
            "div.section-content .article-section",
            "div.pR .section-content",
            "article .field--name-body",
        ),
    ),
    NewsFeed(
        "The Daily Star (City)",
        "https://www.thedailystar.net/city/rss.xml",
        body_selectors=("div.section-content .article-section",),
    ),
    NewsFeed(
        "The Daily Star (Country)",
        "https://www.thedailystar.net/country/rss.xml",
        body_selectors=("div.section-content .article-section",),
    ),
    NewsFeed(
        "Prothom Alo",
        "https://www.prothomalo.com/feed",
        language="bn",
        body_selectors=("div.story-element-text", "div.story-content"),
    ),
    NewsFeed(
        "The Business Standard",
        "https://www.tbsnews.net/bangladesh/rss.xml",
        body_selectors=("div.section-content", "div.node__content"),
    ),
    # Bengali-language outlets, added after a reachability probe from a GitHub
    # runner (see .github/workflows/feed_probe.yml). These carry much of the
    # same incident reporting as the blocked outlets below, at higher volume:
    # 50-100 entries per feed against the English dailies' 8-20.
    NewsFeed(
        "Jagonews24",
        "https://www.jagonews24.com/rss/rss.xml",
        language="bn",
        body_selectors=("div.content-details", "article"),
    ),
    NewsFeed(
        "Dhaka Post",
        "https://www.dhakapost.com/rss/rss.xml",
        language="bn",
        body_selectors=("div.news-details", "article"),
    ),
    NewsFeed(
        "Risingbd",
        "https://www.risingbd.com/rss/rss.xml",
        language="bn",
        body_selectors=("article", "div.news-details"),
    ),
    NewsFeed(
        # No selector matches this one; the generic <p> sweep in _extract_body
        # recovers ~3.5k characters, which is plenty.
        "Ajker Patrika",
        "https://www.ajkerpatrika.com/feed",
        language="bn",
    ),
    # Reachable from most networks but 403 from GitHub's datacentre ranges, so
    # it contributes on local runs and drops out on the cron.
    NewsFeed(
        "Dhaka Tribune",
        "https://www.dhakatribune.com/feed/",
        body_selectors=("div.jw-detail-content", "div.content-detail"),
    ),
]

# Deliberately NOT added: business/economy desks.
#
# The Business Standard's economy feed and The Daily Star's business feed were
# both probed against the fraud lexicon and returned zero consumer-fraud
# entries out of 30. Those desks cover markets and macro; an online seller who
# takes advance payment and disappears is reported by the Bengali general
# desks, which this registry already carries. Adding them would have spent
# request budget on nothing.

# Deliberately NOT in the registry:
#
#   bdnews24 (both editions), Jugantor, Kaler Kantho
#       Return 403 to automated clients from every network tested, and sit
#       behind a Cloudflare interstitial ("Just a moment...") even through a
#       text-extraction proxy. That is the outlet declining automated access,
#       not a transport problem to route around. Their reporting is largely
#       duplicated by the Bengali outlets above, which publish openly.
#
#   Barta24
#       Reachable and high volume, but article pages are client-rendered so
#       no body text can be extracted, and its RSS summaries run ~165
#       characters. 120 thin entries per run would consume the free Gemini
#       quota for very little signal.
#
#   Google News aggregate feeds
#       Surface the blocked outlets, but entries carry only a headline-length
#       summary (~80-100 chars) and the links no longer HTTP-redirect to the
#       publisher, so the article body is unreachable anyway.



# ---------------------------------------------------------------------------
# Official sources - scored source_confidence 95 rather than 80.
#
# Probed the obvious candidates: Bangladesh Police, RAB and BSS all return
# feeds with zero entries, and DMP's WordPress feed carries only tender and
# auction notices. CID is the one national force publishing an actual
# machine-readable stream of case press releases.
# ---------------------------------------------------------------------------
POLICE_FEEDS: List[NewsFeed] = [
    NewsFeed(
        "CID Bangladesh (press releases)",
        "https://news.cid.gov.bd/feed",
        language="bn",
        body_selectors=("div.entry-content", "article"),
        source_platform="police_report",
    ),
]
# news.cid.gov.bd/category/press-release/feed returns the same ten entries as
# the site feed, so it is not listed separately.

NEWS_FEEDS.extend(POLICE_FEEDS)

# ---------------------------------------------------------------------------
# Crime lexicon - the pre-LLM gate
# ---------------------------------------------------------------------------
CRIME_KEYWORDS: tuple[str, ...] = (
    # English
    "murder", "killed", "stabbed", "shot", "body recovered", "homicide",
    "robbery", "robbed", "mugging", "mugger", "snatch", "dacoity", "looted",
    "rape", "assault", "attacked", "beaten", "clash", "acid attack",
    "abduct", "kidnap", "ransom", "extortion", "extort", "chanda",
    "yaba", "narcotic", "drug haul", "heroin", "cannabis", "phensedyl",
    "cyber", "hacked", "online fraud", "phishing", "blackmail",
    "fraud", "forgery", "embezzle", "scam", "counterfeit", "cheating",
    "theft", "stolen", "burglary", "pickpocket",
    "arrested", "detained", "police said", "case filed", "fir", "gd",
    "thana", "police station", "crime",
    # Bengali
    "খুন", "হত্যা", "নিহত", "লাশ", "ছিনতাই", "ডাকাতি", "দস্যুতা",
    "ধর্ষণ", "হামলা", "মারধর", "সংঘর্ষ", "আহত", "অপহরণ", "মুক্তিপণ",
    "চাঁদাবাজি", "ইয়াবা", "মাদক", "গাঁজা", "হেরোইন", "সাইবার", "হ্যাক",
    "প্রতারণা", "জালিয়াতি", "আত্মসাৎ", "চুরি", "গ্রেপ্তার", "আটক",
    "থানা", "মামলা", "পুলিশ",
)

_KEYWORD_RE = re.compile(
    "|".join(re.escape(keyword) for keyword in CRIME_KEYWORDS),
    re.IGNORECASE,
)

# Cheap negative filter: sports/entertainment stories use violent verbs too.
_EXCLUDE_RE = re.compile(
    r"\b(match|innings|wicket|goal scored|box office|trailer|album|"
    r"stock index|dse turnover)\b",
    re.IGNORECASE,
)


def looks_like_crime(text: str) -> bool:
    """Keyword gate applied to the RSS title + summary."""
    if not text:
        return False
    if _EXCLUDE_RE.search(text):
        return False
    return bool(_KEYWORD_RE.search(text))


# ---------------------------------------------------------------------------
# Consumer / e-commerce fraud lexicon
#
# Two-part test, not one. A business-desk feed is full of stories that match
# "fraud" while being about bank capital adequacy or a listed company's
# accounts; and full of stories that mention "e-commerce" while being about
# market size. Requiring one term from each list is what separates "online
# shop took the money and vanished" from both.
# ---------------------------------------------------------------------------
COMMERCE_TERMS: tuple[str, ...] = (
    # Deliberately narrow. An earlier revision included the generic trade
    # vocabulary - "product", "customer", "seller", "পণ্য", "ব্যবসা" - and
    # measured a 4-in-13 false positive rate against live feeds, admitting an
    # essay on Bengali advertising and an iPad column. Every term below names
    # an *online* transaction channel, which is the thing being defrauded.
    # English
    "e-commerce", "ecommerce", "online shop", "online store", "online seller",
    "online purchase", "online order", "online payment", "online transaction",
    "online business", "online fraud", "online betting", "online gambling",
    "marketplace", "f-commerce", "digital commerce", "cash on delivery",
    "advance payment", "mobile financial", "mfs", "payment gateway",
    "bkash", "nagad", "rocket", "digital wallet", "app-based",
    # Bengali
    "ই-কমার্স", "ইকমার্স", "অনলাইন", "ই-ক্যাব", "অর্ডার", "ডেলিভারি",
    "অগ্রিম", "বিকাশ", "নগদ", "রকেট", "পেমেন্ট", "মোবাইল ব্যাংকিং",
    "ফেসবুক পেজ", "ওয়েবসাইট", "অ্যাপ",
)

FRAUD_TERMS: tuple[str, ...] = (
    # English
    "fraud", "scam", "cheat", "cheating", "swindl", "defraud", "dupe",
    "duped", "embezzle", "misappropriat", "siphon", "ponzi", "pyramid",
    "fake", "counterfeit", "forgery", "phishing", "hacked", "extort",
    "complaint", "fined", "penalt", "refund not", "did not deliver",
    "failed to deliver", "money laundering", "unauthorised transaction",
    "unauthorized transaction", "cyber", "vanished", "absconded",
    # Bengali
    "প্রতারণা", "প্রতারক", "জালিয়াতি", "আত্মসাৎ", "ঠকা", "ফাঁদ",
    "ভুয়া", "নকল", "নকলপণ্য", "জরিমানা", "অভিযোগ", "লোপাট",
    "হাতিয়ে", "গায়েব", "উধাও", "মানি লন্ডারিং", "সাইবার",
)

_COMMERCE_RE = re.compile(
    "|".join(re.escape(term) for term in COMMERCE_TERMS), re.IGNORECASE
)
_FRAUD_RE = re.compile(
    "|".join(re.escape(term) for term in FRAUD_TERMS), re.IGNORECASE
)

# Business-desk noise that trips both lists without describing a victim:
# regulatory capital stories, index moves, macro coverage.
_FRAUD_EXCLUDE_RE = re.compile(
    r"\b(index|turnover|ipo|dividend|share price|bourse|"
    r"gdp|inflation|remittance inflow|budget|tariff|"
    r"quarterly (results|earnings)|balance sheet)\b",
    re.IGNORECASE,
)


def looks_like_ecommerce_fraud(text: str) -> bool:
    """True when the text describes fraud against an *online* transaction.

    Two-part test: a commerce term and a fraud term must both appear. Either
    alone is far too common on a news feed to mean anything.
    """
    if not text:
        return False
    if _FRAUD_EXCLUDE_RE.search(text):
        return False
    return bool(_COMMERCE_RE.search(text) and _FRAUD_RE.search(text))


def is_reportable(text: str) -> bool:
    """Admission gate: either lexicon is enough to earn an entry a look."""
    return looks_like_crime(text) or looks_like_ecommerce_fraud(text)


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def _entry_published(entry: object) -> Optional[datetime]:
    """Pull a timezone-aware publication datetime out of a feedparser entry."""
    for attribute in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attribute, None)
        if parsed:
            try:
                return datetime(*parsed[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                continue
    return None


async def _fetch_feed(
    client: httpx.AsyncClient, feed: NewsFeed
) -> List[Dict[str, object]]:
    """Download and parse one feed into candidate entry dicts."""
    try:
        response = await client.get(feed.url)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("[%s] feed fetch failed: %s", feed.outlet, exc)
        return []

    # feedparser is CPU-bound C/Python parsing - keep it off the event loop.
    parsed = await asyncio.to_thread(feedparser.parse, response.content)

    entries: List[Dict[str, object]] = []
    for entry in parsed.entries:
        raw_title = (getattr(entry, "title", "") or "").strip()
        summary = (getattr(entry, "summary", "") or "").strip()
        link = (getattr(entry, "link", "") or "").strip()
        if not raw_title or not link:
            continue

        # Several outlets wrap the headline in an anchor tag inside the feed,
        # so titles need the same HTML strip the summary gets.
        title = BeautifulSoup(raw_title, "html.parser").get_text(" ", strip=True)
        summary_text = BeautifulSoup(summary, "html.parser").get_text(" ", strip=True)
        if not title:
            continue

        entries.append(
            {
                "outlet": feed.outlet,
                "title": title,
                "summary": summary_text,
                "link": link,
                "published": _entry_published(entry),
                "feed": feed,
            }
        )

    logger.info("[%s] %d entries in feed", feed.outlet, len(entries))
    return entries


def _extract_body(html: str, selectors: Sequence[str]) -> str:
    """Pull readable article text out of a page."""
    soup = BeautifulSoup(html, "lxml")

    # Remove furniture that otherwise pollutes the LLM context window.
    for tag in soup(
        ["script", "style", "nav", "header", "footer", "aside", "form", "iframe"]
    ):
        tag.decompose()

    for selector in selectors:
        nodes = soup.select(selector)
        if nodes:
            text = " ".join(node.get_text(" ", strip=True) for node in nodes)
            if len(text) > 200:
                return re.sub(r"\s+", " ", text).strip()

    # Generic fallback: the longest <article>, else all paragraphs.
    article = soup.find("article")
    if article:
        text = article.get_text(" ", strip=True)
        if len(text) > 200:
            return re.sub(r"\s+", " ", text).strip()

    paragraphs = [
        p.get_text(" ", strip=True)
        for p in soup.find_all("p")
        if len(p.get_text(strip=True)) > 40
    ]
    return re.sub(r"\s+", " ", " ".join(paragraphs)).strip()


async def _fetch_article_body(
    client: httpx.AsyncClient,
    url: str,
    selectors: Sequence[str],
    semaphore: asyncio.Semaphore,
) -> str:
    """Fetch one article page and reduce it to plain text."""
    async with semaphore:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.debug("article fetch failed %s: %s", url, exc)
            return ""

        await asyncio.sleep(FETCH_DELAY_SECONDS)
        return await asyncio.to_thread(_extract_body, response.text, selectors)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
async def scrape_news(
    *,
    lookback_hours: int = 12,
    max_articles: int = 60,
    feeds: Optional[Iterable[NewsFeed]] = None,
) -> List[ExtractedIncident]:
    """Run the full news pipeline and return normalised incidents.

    ``lookback_hours`` should comfortably exceed the cron interval so a late
    feed update is never missed; duplicates are absorbed downstream by the
    ``raw_content_hash`` unique constraint.
    """
    feed_list = list(feeds) if feeds is not None else NEWS_FEEDS
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en,bn;q=0.9",
    }

    async with httpx.AsyncClient(
        headers=headers,
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
    ) as client:
        feed_results = await asyncio.gather(
            *(_fetch_feed(client, feed) for feed in feed_list),
            return_exceptions=True,
        )

        candidates: List[Dict[str, object]] = []
        seen_links: set[str] = set()

        for result in feed_results:
            if isinstance(result, BaseException):
                logger.warning("feed task raised: %s", result)
                continue
            for entry in result:
                link = str(entry["link"])
                if link in seen_links:
                    continue

                published = entry["published"]
                if isinstance(published, datetime) and published < cutoff:
                    continue

                headline_blob = f"{entry['title']} {entry['summary']}"
                if not is_reportable(headline_blob):
                    continue
                entry["is_fraud"] = looks_like_ecommerce_fraud(headline_blob)

                seen_links.add(link)
                candidates.append(entry)

        # Newest first, so the cap keeps the freshest stories.
        candidates.sort(
            key=lambda item: item["published"] or datetime.min.replace(
                tzinfo=timezone.utc
            ),
            reverse=True,
        )

        # Official sources publish a handful of press releases a week while
        # the newsrooms publish hundreds of articles a day. Sorting purely by
        # recency therefore pushes every police release below the cap and the
        # archive ends up 100% newswire. Reserve their slots first.
        official = [
            item
            for item in candidates
            if item["feed"].source_platform != "news_portal"  # type: ignore[union-attr]
        ]
        # Same argument as the official reservation, one rung down: consumer
        # fraud is low-volume and low-urgency, so it always loses a straight
        # recency race against the crime desks. Measured on live feeds: 3 of
        # 460 entries were e-commerce fraud, all of them already admitted by
        # the crime gate and all of them below the cap. Without a floor they
        # contribute nothing on a busy news day, which is every day.
        fraud = [
            item
            for item in candidates
            if item["feed"].source_platform == "news_portal"  # type: ignore[union-attr]
            and item["is_fraud"]
        ]
        newswire = [
            item
            for item in candidates
            if item["feed"].source_platform == "news_portal"  # type: ignore[union-attr]
            and not item["is_fraud"]
        ]

        reserved = min(len(official), max(1, max_articles // 4))
        fraud_reserved = min(len(fraud), max(1, max_articles // 5))
        remaining = max_articles - reserved - fraud_reserved

        candidates = (
            official[:reserved] + fraud[:fraud_reserved] + newswire[:remaining]
        )

        if official or fraud:
            logger.info(
                "reserved %d official + %d e-commerce-fraud of %d total slots",
                reserved,
                fraud_reserved,
                max_articles,
            )

        logger.info("%d crime-candidate articles after filtering", len(candidates))
        if not candidates:
            return []

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_FETCHES)
        bodies = await asyncio.gather(
            *(
                _fetch_article_body(
                    client,
                    str(entry["link"]),
                    entry["feed"].body_selectors,  # type: ignore[union-attr]
                    semaphore,
                )
                for entry in candidates
            ),
            return_exceptions=True,
        )

    incidents: List[ExtractedIncident] = []

    for entry, body in zip(candidates, bodies):
        if isinstance(body, BaseException):
            continue

        # Fall back to the RSS summary when the body extractor comes up dry -
        # a two-sentence summary still carries category and location.
        article_text = body if len(str(body)) > 200 else str(entry["summary"])
        if len(article_text) < 80:
            continue

        published = entry["published"]
        composed = f"{entry['title']}\n\n{article_text}"

        try:
            incident = await extract_crime_entities_async(
                composed,
                entry["feed"].source_platform,  # type: ignore[union-attr]
                source_url=str(entry["link"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - one bad article must not stop the run
            logger.warning("extraction failed for %s: %s", entry["link"], exc)
            continue

        if incident is not None:
            # The masthead, not the hostname. Until this was set, every news
            # record rendered as "tbsnews.net" while a Telegram record showed
            # a real publisher name - the newswire looked like the less
            # attributable source, which is backwards.
            incident.source_handle = entry["feed"].outlet  # type: ignore[union-attr]
            incidents.append(incident)

    logger.info("news_scraper produced %d incidents", len(incidents))
    return incidents


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    async def _main() -> None:
        results = await scrape_news(lookback_hours=48, max_articles=10)
        for item in results:
            local = item.incident_date.astimezone(BST).strftime("%Y-%m-%d")
            print(f"[{item.crime_category:<10}] {item.thana_name:<24} {local}  {item.title}")

    asyncio.run(_main())
