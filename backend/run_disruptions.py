#!/usr/bin/env python3
"""Live disruptions collector - the entrypoint disruptions_cron.yml invokes.

    python backend/run_disruptions.py --lookback-hours 8

Reads the same news feeds as the incident pipeline plus a few Google News
searches for blockades, hartals and rallies, keeps headlines that mention
a disruption, classifies them in batches, places them on the map and posts
them to /api/v1/ingest/disruptions. Headlines already classified on an
earlier run are skipped via a seen-cache.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402

from app.parsers.disruption_classifier import classify, looks_like_disruption  # noqa: E402
from app.scrapers.google_news_scraper import _is_foreign, _search  # noqa: E402
from app.scrapers.news_scraper import NEWS_FEEDS, USER_AGENT, _fetch_feed  # noqa: E402
from app.scrapers.seen_cache import SeenCache  # noqa: E402
from app.utils.thana_coordinates import find_place_in_text, resolve_district, resolve_thana  # noqa: E402

logger = logging.getLogger("run_disruptions")

QUERIES: tuple[tuple[str, str], ...] = (
    ("সড়ক অবরোধ OR মহাসড়ক অবরোধ OR যান চলাচল বন্ধ OR রেলপথ অবরোধ", "bn"),
    ("হরতাল OR ধর্মঘট OR শাটডাউন OR ঘেরাও", "bn"),
    ("ঢাকা বিক্ষোভ OR সংঘর্ষ OR মিছিল", "bn"),
    ("Dhaka blockade OR hartal OR protest OR \"traffic halted\"", "en"),
)
MAX_HEADLINES = 150


async def gather(lookback_hours: int) -> List[Dict[str, Any]]:
    since = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=10.0), headers=headers, follow_redirects=True) as client:
        feeds = await asyncio.gather(*(_fetch_feed(client, feed) for feed in NEWS_FEEDS))
        searches = await asyncio.gather(*(_search(client, q, lang, 24) for q, lang in QUERIES))
    items: List[Dict[str, Any]] = []
    for entries in feeds:
        for e in entries:
            items.append({"title": e["title"], "text": f"{e['title']} {e.get('summary', '')[:200]}",
                          "outlet": e["outlet"], "url": e["link"], "published": e["published"]})
    for entries in searches:
        for e in entries:
            if _is_foreign(str(e["outlet"]), str(e["href"])):
                continue
            items.append({"title": e["title"], "text": e["title"], "outlet": e["outlet"],
                          "url": e["link"], "published": e["published"]})
    seen_titles, fresh = set(), []
    for item in items:
        key = item["title"].strip().lower()
        published = item["published"]
        if key in seen_titles or (published and published < since) or not looks_like_disruption(item["text"]):
            continue
        seen_titles.add(key)
        fresh.append(item)
    fresh.sort(key=lambda i: i["published"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return fresh[:MAX_HEADLINES]


def place_for(result: Dict[str, Any], headline: str):
    """Most specific location consistent with the district the model named.

    Places come as "Dhaka-Tangail highway, Chandra": highways are named
    after both end cities, so the name alone would put a Gazipur blockade
    in Tangail. Each comma part is tried, most specific (last) first, and
    one in the stated district wins; failing that, the district centroid.
    """
    hint = result.get("district") or None
    hinted = resolve_district(hint) if hint else None
    parts = [p.strip() for p in str(result.get("place") or "").split(",") if p.strip()]
    candidates = [resolve_thana(p, district_hint=hint) for p in reversed(parts)]
    candidates.append(find_place_in_text(headline))
    for loc in candidates:
        if loc and (hinted is None or loc["district"] == hinted["district"]):
            return loc
    return hinted or next((loc for loc in candidates if loc), None)


def run(args: argparse.Namespace) -> int:
    seen = SeenCache(Path(args.seen_cache) if args.seen_cache else None)
    headlines = [h for h in asyncio.run(gather(args.lookback_hours)) if h["url"] not in seen]
    logger.info("%d new disruption-like headlines", len(headlines))
    if not headlines:
        return 0
    results = classify([h["text"] for h in headlines])
    if results is None:
        logger.error("classifier unreachable; nothing recorded, will retry next run")
        return 0

    now = datetime.now(timezone.utc)
    out: List[Dict[str, Any]] = []
    for headline, result in zip(headlines, results):
        seen.add(headline["url"])
        if not result:
            continue
        loc = place_for(result, headline["title"])
        if loc is None:
            logger.info("unplaced: %s", headline["title"][:80])
            continue
        published = headline["published"] or now
        starts = published + timedelta(hours=result["starts_in_hours"]) if result["status"] == "planned" else published
        expires = starts + timedelta(hours=result["expected_hours"])
        if expires <= now:
            continue
        out.append({
            "kind": result["kind"], "status": result["status"],
            "title": result["title"] or headline["title"][:160],
            "place": result["place"] or loc["thana_name"], "district": loc["district"],
            "lat": loc["lat"], "lon": loc["lon"],
            "starts_at": starts.isoformat(), "expires_at": expires.isoformat(),
            "source": {"outlet": headline["outlet"][:80], "url": headline["url"], "title": headline["title"][:200]},
        })
        logger.info("%-14s %-8s %-28s %s", result["kind"], result["status"], (result["place"] or loc["thana_name"])[:28], headline["title"][:70])

    if args.dry_run:
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return 0
    if out:
        response = httpx.post(f"{args.api}/api/v1/ingest/disruptions", json={"items": out},
                              headers={"X-Ingest-Key": args.key}, timeout=httpx.Timeout(90.0, connect=20.0))
        if response.status_code != 200:
            logger.error("ingest/disruptions HTTP %s: %s", response.status_code, response.text[:300])
            return 1
        logger.info("posted: %s", response.json())
    seen.save()
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", default=os.environ.get("BACKEND_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--key", default=os.environ.get("INGEST_API_KEY", ""))
    parser.add_argument("--lookback-hours", type=int, default=8)
    parser.add_argument("--seen-cache", default=None)
    parser.add_argument("--dry-run", action="store_true")
    return parser


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    sys.exit(run(build_parser().parse_args()))
