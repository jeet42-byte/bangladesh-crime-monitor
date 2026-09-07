"""Official collector: BGD e-GOV CIRT advisories.

Why this source exists in the registry
--------------------------------------
E-commerce and online payment fraud is the worst-covered offence class in this
archive. It rarely reaches a crime desk: an order that never ships, a "seller"
who takes advance payment through bKash and disappears, a cloned storefront -
none of it produces a body, an arrest, or a photograph, so the newswire
carries a fraction of it and carries that fraction late.

BGD e-GOV CIRT (Bangladesh Computer Council, ICT Division) is the national
computer incident response team. Its ``/alerts`` stream is the closest thing
the country has to an authoritative, machine-readable register of live online
fraud campaigns - named platforms, named methods, published while the campaign
is still running rather than after someone is charged.

What was probed and rejected
----------------------------
    Facebook Graph      400 without a Page token; reading Pages the operator
                        does not administer needs Page Public Content Access,
                        which is App Review + Business Verification.
    RSSHub /facebook    403. The public instance no longer proxies Facebook.
    mbasic.facebook     400 to unauthenticated clients.
    DNCRP press notes   Reachable, and substantively the right source - daily
                        enforcement bulletins naming fined traders. But the
                        bulletins are PDF-only and the Bengali extracts with a
                        broken glyph map ("ভোক্তা" comes out "প্র াক্তা").
                        Feeding systematically corrupted Bengali to an LLM and
                        publishing what it guesses would manufacture facts
                        about named businesses, so this is left out until the
                        text can be recovered reliably.
    ecab.net.bd         DNS does not resolve.

Scope
-----
Advisories describe campaigns, not individual victims, so nothing here
identifies a person. Records land at district granularity (Dhaka, the issuing
authority's seat) because a nationwide phishing campaign has no thana, and
they are marked ``single_source``: an advisory is authoritative about the
threat, but it is still one organisation's account until a second source
agrees.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.parsers.llm_extractor import (
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)
from app.scrapers.news_scraper import USER_AGENT, looks_like_ecommerce_fraud

logger = logging.getLogger(__name__)

BASE_URL = "https://www.cirt.gov.bd"
REQUEST_TIMEOUT = httpx.Timeout(30.0, connect=12.0)

# Listing pages, in descending order of relevance. ``/bulletins`` is included
# for completeness but has historically carried one item.
LISTING_PATHS: tuple[str, ...] = ("/alerts", "/news", "/bulletins")

# Detail URLs look like /alerts/<slug>; the slug is always at least a few
# words, which is what distinguishes it from the section link itself.
_DETAIL_RE = re.compile(r"^/(alerts|news|bulletins)/[^/\s]{8,}$")

# "Published on 09-Dec-2025 16:00:00"
_PUBLISHED_RE = re.compile(
    r"Published\s+on\s+(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{2}):(\d{2}))?",
    re.IGNORECASE,
)

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# A national CERT advisory is a considered institutional judgement, not a
# newsroom's first take - but it is still one organisation reporting, so it
# sits below a police charge sheet and above a newsroom report.
ADVISORY_CONFIDENCE = 90

_WHITESPACE_RE = re.compile(r"\s+")

# Advisories defang the indicators they publish so the page cannot be used as
# a click-through. Restoring them makes the narrative readable without turning
# it into a live link, since nothing downstream renders it as one.
_DEFANG_SUBSTITUTIONS: tuple[tuple[str, str], ...] = (
    ("[:]", ":"),
    ("[.]", "."),
    ("[/]", "/"),
    ("hxxp", "http"),
)


def _clean(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", text or "").strip()


def _undefang(text: str) -> str:
    for needle, replacement in _DEFANG_SUBSTITUTIONS:
        text = text.replace(needle, replacement)
    return text


def _parse_published(text: str) -> Optional[datetime]:
    """Pull the advisory's publication timestamp out of the page text."""
    match = _PUBLISHED_RE.search(text)
    if not match:
        return None

    day, month_name, year, hour, minute = match.groups()
    month = _MONTHS.get(month_name.lower())
    if not month:
        return None

    try:
        # The site renders wall-clock Dhaka time with no zone marker.
        local = datetime(
            int(year),
            month,
            int(day),
            int(hour or 0),
            int(minute or 0),
            tzinfo=BST,
        )
    except ValueError:
        return None
    return local.astimezone(timezone.utc)


async def _discover(client: httpx.AsyncClient) -> List[str]:
    """Collect advisory detail URLs from every listing page."""
    found: List[str] = []
    seen: set[str] = set()

    for path in LISTING_PATHS:
        url = urljoin(BASE_URL, path)
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("[CIRT] listing %s failed: %s", path, exc)
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"].split("?")[0].rstrip("/")
            if not _DETAIL_RE.match(href):
                continue
            absolute = urljoin(BASE_URL, href)
            if absolute in seen:
                continue
            seen.add(absolute)
            found.append(absolute)

    logger.info("[CIRT] discovered %d advisory pages", len(found))
    return found


async def _fetch_detail(
    client: httpx.AsyncClient, url: str, semaphore: asyncio.Semaphore
) -> Optional[Dict[str, object]]:
    """Fetch one advisory and return its title, body and publication time."""
    async with semaphore:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("[CIRT] %s failed: %s", url, exc)
            return None

    soup = BeautifulSoup(response.text, "html.parser")

    heading = soup.find("h1") or soup.find("h2")
    title = _clean(heading.get_text(" ")) if heading else ""

    for tag in soup(["script", "style", "nav", "footer", "header", "form"]):
        tag.decompose()

    page_text = _clean(soup.get_text(" "))
    published = _parse_published(page_text)

    # Everything after the "Published on ..." stamp is the advisory proper;
    # everything before it is the site chrome and the repeated title.
    match = _PUBLISHED_RE.search(page_text)
    body = page_text[match.end():] if match else page_text
    body = _undefang(_clean(body))

    if not title or len(body) < 150:
        return None

    return {"url": url, "title": title, "body": body, "published": published}


async def scrape_cirt(
    *,
    lookback_hours: int = 168,
    max_advisories: int = 10,
) -> List[ExtractedIncident]:
    """Collect fraud advisories from BGD e-GOV CIRT.

    ``lookback_hours`` defaults to a week rather than the pipeline's usual
    window: CIRT publishes a handful of advisories a year, so a 6-hour window
    would return nothing on all but a few days. Re-reading the same advisory
    is harmless - the content hash absorbs it at ingest.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en,bn;q=0.9"}

    async with httpx.AsyncClient(
        headers=headers,
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
    ) as client:
        urls = await _discover(client)
        if not urls:
            return []

        semaphore = asyncio.Semaphore(4)
        details = await asyncio.gather(
            *(_fetch_detail(client, url, semaphore) for url in urls),
            return_exceptions=True,
        )

    candidates: List[Dict[str, object]] = []
    for detail in details:
        if isinstance(detail, BaseException) or detail is None:
            continue

        published = detail["published"]
        if isinstance(published, datetime) and published < cutoff:
            continue

        blob = f"{detail['title']} {detail['body'][:600]}"
        if not looks_like_ecommerce_fraud(blob):
            continue

        candidates.append(detail)

    candidates.sort(
        key=lambda item: item["published"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    candidates = candidates[:max_advisories]

    logger.info("[CIRT] %d advisories passed the fraud gate", len(candidates))

    incidents: List[ExtractedIncident] = []
    for detail in candidates:
        composed = f"{detail['title']}\n\n{detail['body']}"
        published = detail["published"]

        try:
            incident = await extract_crime_entities_async(
                composed,
                "police_report",
                source_url=str(detail["url"]),
                published_at=published if isinstance(published, datetime) else None,
            )
        except Exception as exc:  # noqa: BLE001 - one bad page must not stop the run
            logger.warning("[CIRT] extraction failed for %s: %s", detail["url"], exc)
            continue

        if incident is None:
            continue

        incident.source_confidence = ADVISORY_CONFIDENCE
        incident.source_handle = "BGD e-GOV CIRT"
        # Authoritative about the threat, still one organisation's account of
        # it. Promotion to 'corroborated' happens in run_scrapers when a
        # second source reports the same campaign.
        incident.verification_level = "single_source"
        incidents.append(incident)

    logger.info("cirt_scraper produced %d incidents", len(incidents))
    return incidents


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    async def _main() -> None:
        results = await scrape_cirt(lookback_hours=24 * 365 * 3, max_advisories=10)
        for item in results:
            when = item.incident_date.astimezone(BST).strftime("%Y-%m-%d")
            print(
                f"[{item.crime_category:<10}] {item.thana_name:<20} "
                f"conf={item.source_confidence} {when}  {item.title[:70]}"
            )

    asyncio.run(_main())
