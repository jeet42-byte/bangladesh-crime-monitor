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
from typing import Callable, Dict, Iterable, List, Optional, Sequence

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
    slug_filter: Callable[..., bool] = slug_is_candidate,
    extra_prefixes: Sequence[str] = (),
) -> List[Dict[str, str]]:
    """Candidate URLs for one outlet, filtered by slug before any fetch.

    ``slug_filter`` is the topic gate - the asset lexicon by default, the
    cyber lexicon for the cybercrime backfill. ``extra_prefixes`` adds
    sections only that topic needs (technology desks, for cyber).

    Returns dicts of ``{timestamp, url}``. The timestamp is the capture
    time and is only used to address the snapshot - never as a publication
    date.
    """
    seen: set[str] = set()
    candidates: List[Dict[str, str]] = []
    scanned = 0

    prefixes = list(dict.fromkeys((*source.path_prefixes, *extra_prefixes)))
    for prefix in prefixes:
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
                if not slug_filter(url, strict=source.slug_filterable):
                    continue

                candidates.append({"timestamp": timestamp, "url": url})

            # A short page means the offset has run past the end of this
            # prefix; move on rather than paging into empty responses.
            if len(rows) < page_size:
                break

    logger.info(
        "[%s] scanned %d captures -> %d candidates",
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

    # JSON-LD is the common fallback on these outlets. It lives in a <script>
    # tag, so this must run before scripts are stripped from the page.
    for block in _jsonld_blocks(soup):
        for key in ("datePublished", "dateCreated"):
            parsed = _parse_iso(str(block.get(key) or ""))
            if parsed:
                return parsed

    # Jagonews24 publishes only an update time, as a Unix timestamp. Edits
    # usually follow publication within hours, so it is an acceptable
    # stand-in; it is used only when nothing better exists.
    for attrs in ({"property": "og:updated_time"}, {"property": "article:modified_time"}):
        tag = soup.find("meta", attrs=attrs)
        parsed = _parse_iso(str((tag.get("content") if tag else "") or ""))
        if parsed:
            return parsed

    # Last resort: a "published" line in the visible text, English or Bangla
    # (Risingbd carries no machine-readable date at all). Only text right
    # after a published/updated label counts - a bare date elsewhere on the
    # page is usually today's date in the masthead.
    return _visible_published(soup.get_text(" "))


def _jsonld_blocks(soup: BeautifulSoup) -> List[Dict[str, object]]:
    blocks: List[Dict[str, object]] = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            payload = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        stack = payload if isinstance(payload, list) else [payload]
        while stack:
            block = stack.pop(0)
            if isinstance(block, dict):
                blocks.append(block)
                graph = block.get("@graph")
                if isinstance(graph, list):
                    stack.extend(graph)
    return blocks


def extract_jsonld_body(soup: BeautifulSoup) -> str:
    """Article text from JSON-LD, for pages that render the body client-side."""
    for block in _jsonld_blocks(soup):
        body = block.get("articleBody")
        if isinstance(body, str) and len(body) > 200:
            return re.sub(r"\s+", " ", BeautifulSoup(body, "html.parser").get_text(" ")).strip()
    return ""


_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
_MONTHS_BY_NAME = {
    "জানুয়ারি": 1, "ফেব্রুয়ারি": 2, "মার্চ": 3, "এপ্রিল": 4, "মে": 5, "জুন": 6,
    "জুলাই": 7, "আগস্ট": 8, "সেপ্টেম্বর": 9, "অক্টোবর": 10, "নভেম্বর": 11,
    "ডিসেম্বর": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12, "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
    "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}
_PUBLISHED_LABEL_RE = re.compile(
    r"(প্রকাশিত|প্রকাশ|আপডেট|published|updated|posted)\s*[:：]?", re.IGNORECASE
)
_MONTH_ALT = "|".join(sorted((re.escape(m) for m in _MONTHS_BY_NAME), key=len, reverse=True))
_DAY_MONTH_YEAR_RE = re.compile(
    rf"(\d{{1,2}})\s*({_MONTH_ALT})[\s,]*(\d{{4}})", re.IGNORECASE
)
_MONTH_DAY_YEAR_RE = re.compile(
    rf"({_MONTH_ALT})\s*(\d{{1,2}}),?\s*(\d{{4}})", re.IGNORECASE
)


def _visible_published(text: str) -> Optional[datetime]:
    text = re.sub(r"\s+", " ", text.translate(_BN_DIGITS))
    for label in _PUBLISHED_LABEL_RE.finditer(text):
        window = text[label.end() : label.end() + 80]
        for pattern, order in ((_DAY_MONTH_YEAR_RE, "dmy"), (_MONTH_DAY_YEAR_RE, "mdy")):
            match = pattern.search(window)
            if not match:
                continue
            if order == "dmy":
                day, month_name, year = match.groups()
            else:
                month_name, day, year = match.groups()
            month = _MONTHS_BY_NAME.get(month_name.lower())
            try:
                return datetime(int(year), month or 0, int(day), tzinfo=timezone.utc)
            except (ValueError, TypeError):
                continue
    return None


def _parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    if re.fullmatch(r"\d{9,10}", text):
        try:
            return datetime.fromtimestamp(int(text), tz=timezone.utc)
        except (ValueError, OSError):
            return None
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
    swept = " ".join(p for p in paragraphs if len(p) > 40).strip()
    if len(swept) > 200:
        return swept

    # Some layouts (Dhaka Post) put paragraphs in <div>s, not <p>s. Take the
    # container whose direct children carry the most sentence-length text.
    best, best_len = "", 0
    for node in soup.find_all(["div", "article", "section"]):
        pieces = [
            re.sub(r"\s+", " ", child.get_text(" ")).strip()
            for child in node.find_all(recursive=False)
        ]
        pieces = [piece for piece in pieces if len(piece) > 40]
        total = sum(len(piece) for piece in pieces)
        if len(pieces) >= 3 and total > best_len:
            best, best_len = " ".join(pieces), total
    return best or swept


#: Retries for a snapshot the archive refused or timed out on. A busy Wayback
#: answers 429/5xx or drops the connection; the first overnight run lost most
#: of 88,000 articles that way because nothing was retried.
SNAPSHOT_RETRIES = 3
SNAPSHOT_BACKOFF_SECONDS = (5, 15, 45)


async def fetch_snapshot(
    client: httpx.AsyncClient,
    candidate: Dict[str, str],
    source: ArchiveSource,
    semaphore: asyncio.Semaphore,
) -> Dict[str, object]:
    """Retrieve one archived article and pull out title, body and date.

    Always returns a dict. On failure it carries only ``error``, saying
    which kind: ``unretrievable: ...`` (the archive would not serve it, even
    after retries) or ``unparseable: ...`` (served, but the headline, text or
    date could not be found - a selector problem, not a network one).
    """
    url = SNAPSHOT_URL.format(
        timestamp=candidate["timestamp"], url=candidate["url"]
    )

    response = None
    last_error = ""
    for attempt in range(SNAPSHOT_RETRIES + 1):
        async with semaphore:
            try:
                response = await client.get(url)
            except httpx.HTTPError as exc:
                last_error = type(exc).__name__
                response = None
        if response is not None and response.status_code == 200:
            break
        if response is not None:
            last_error = f"HTTP {response.status_code}"
            # 404 and friends will not change on retry.
            if response.status_code < 500 and response.status_code != 429:
                break
        if attempt < SNAPSHOT_RETRIES:
            await asyncio.sleep(SNAPSHOT_BACKOFF_SECONDS[attempt])

    if response is None or response.status_code != 200:
        logger.debug("snapshot failed %s: %s", candidate["url"], last_error)
        return {"error": f"unretrievable: {last_error}"}

    soup = BeautifulSoup(response.text, "html.parser")
    # Before stripping scripts: the date and, on some outlets, the body live
    # in JSON-LD <script> blocks. Stripping first silently lost the date on
    # most of 75,000 pages.
    published = extract_published(soup)
    ld_body = extract_jsonld_body(soup)
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = extract_title(soup)
    body = extract_body(soup, source.body_selectors)
    if len(body) < 200 and ld_body:
        body = ld_body

    missing = [
        name
        for name, ok in (("title", bool(title)), ("body", len(body) >= 200), ("date", published is not None))
        if not ok
    ]
    if missing:
        return {"error": "unparseable: no " + "/".join(missing)}

    return {
        "url": candidate["url"],
        "title": title,
        "body": body,
        "published": published,
        "outlet": source.outlet,
    }
