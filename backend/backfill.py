#!/usr/bin/env python3
"""Historical backfill: three years of asset-protection incidents.

    python backend/backfill.py discover
    python backend/backfill.py fetch
    python backend/backfill.py extract --max-calls 200
    python backend/backfill.py post

Why three separate stages with checkpoints
------------------------------------------
This job cannot run to completion in one sitting and pretending otherwise
would waste days of work on the first interruption:

* Wayback returns 504 freely under load.
* The free Gemini tier runs out partway through, every time.
* Discovery over six outlets takes tens of minutes before a single article
  is fetched.

So each stage writes a JSONL file and records what it has already done.
Re-running a stage resumes rather than restarting, and the expensive stage
(``extract``) takes a hard ceiling on model calls so a day's quota can be
spent deliberately instead of being burned by a runaway loop.

The narrowing
-------------
This deliberately collects far less than the live pipeline. Only incidents
that threaten a commercial or industrial asset survive the gate - premises,
goods in transit, cash, staff, the ability to operate. That is the trade the
backfill exists to make: give up breadth of subject to buy depth in time,
because a three-year series on a narrow question is worth more for risk work
than three months on a broad one.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

from app.parsers.asset_lexicon import is_asset_relevant  # noqa: E402
from app.parsers.llm_extractor import (  # noqa: E402
    BST,
    ExtractedIncident,
    extract_crime_entities_async,
)
from app.scrapers.archive_harvester import (  # noqa: E402
    ARCHIVE_SOURCES,
    CDX_TIMEOUT,
    SNAPSHOT_TIMEOUT,
    USER_AGENT,
    ArchiveSource,
    discover,
    fetch_snapshot,
)

logger = logging.getLogger("backfill")

STATE_DIR = Path(__file__).resolve().parent / ".backfill"
CANDIDATES_PATH = STATE_DIR / "candidates.jsonl"
ARTICLES_PATH = STATE_DIR / "articles.jsonl"
INCIDENTS_PATH = STATE_DIR / "incidents.jsonl"
POSTED_PATH = STATE_DIR / "posted.txt"

INGEST_CHUNK_SIZE = 100
POST_TIMEOUT = httpx.Timeout(90.0, connect=20.0)

# Concurrency against the Wayback Machine. Deliberately low: it is a free
# public archive doing us a favour, and it 504s when pushed.
SNAPSHOT_CONCURRENCY = 4


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------
def _ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def _read_jsonl(path: Path) -> List[Dict[str, object]]:
    if not path.exists():
        return []
    rows: List[Dict[str, object]] = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                # A partial final line is what an interrupted run leaves
                # behind. Skipping it is correct; the row will be redone.
                continue
    return rows


def _append_jsonl(path: Path, rows: Iterable[Dict[str, object]]) -> int:
    _ensure_state_dir()
    written = 0
    with path.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            written += 1
    return written


def _seen_urls(path: Path, key: str = "url") -> Set[str]:
    return {str(row.get(key, "")) for row in _read_jsonl(path)}


def _select_sources(names: Optional[str]) -> List[ArchiveSource]:
    if not names:
        return ARCHIVE_SOURCES
    wanted = {n.strip().lower() for n in names.split(",")}
    chosen = [
        source
        for source in ARCHIVE_SOURCES
        if source.outlet.lower() in wanted or source.host.lower() in wanted
    ]
    if not chosen:
        raise SystemExit(f"No outlet matched {names!r}")
    return chosen


# ---------------------------------------------------------------------------
# Stage 1: discover
# ---------------------------------------------------------------------------
async def stage_discover(args: argparse.Namespace) -> int:
    sources = _select_sources(args.outlets)
    already = _seen_urls(CANDIDATES_PATH)
    logger.info("%d candidates already recorded", len(already))

    total_new = 0
    async with httpx.AsyncClient(
        timeout=CDX_TIMEOUT,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        for source in sources:
            found = await discover(
                client,
                source,
                from_date=args.from_date,
                to_date=args.to_date,
                page_size=args.page_size,
                max_pages=args.max_pages,
            )
            fresh = [
                {
                    "url": item["url"],
                    "timestamp": item["timestamp"],
                    "outlet": source.outlet,
                }
                for item in found
                if item["url"] not in already
            ]
            for item in fresh:
                already.add(str(item["url"]))
            written = _append_jsonl(CANDIDATES_PATH, fresh)
            total_new += written
            logger.info("[%s] +%d new candidates", source.outlet, written)

    logger.info("discover complete: %d new candidates", total_new)
    return 0


# ---------------------------------------------------------------------------
# Stage 2: fetch + gate
# ---------------------------------------------------------------------------
async def stage_fetch(args: argparse.Namespace) -> int:
    candidates = _read_jsonl(CANDIDATES_PATH)
    if not candidates:
        logger.error("No candidates. Run 'discover' first.")
        return 1

    done = _seen_urls(ARTICLES_PATH) | _seen_urls(
        STATE_DIR / "fetch_rejected.jsonl"
    )
    by_outlet = {source.outlet: source for source in ARCHIVE_SOURCES}

    pending = [c for c in candidates if c["url"] not in done]
    if args.outlets:
        wanted = {s.outlet for s in _select_sources(args.outlets)}
        pending = [c for c in pending if c["outlet"] in wanted]
    pending = pending[: args.limit]

    logger.info(
        "%d candidates pending, fetching %d", len(candidates) - len(done), len(pending)
    )
    if not pending:
        return 0

    floor = datetime.strptime(args.from_date, "%Y%m%d").replace(tzinfo=timezone.utc)
    ceiling = datetime.now(timezone.utc)

    kept: List[Dict[str, object]] = []
    rejected: List[Dict[str, object]] = []

    async with httpx.AsyncClient(
        timeout=SNAPSHOT_TIMEOUT,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        semaphore = asyncio.Semaphore(SNAPSHOT_CONCURRENCY)
        results = await asyncio.gather(
            *(
                fetch_snapshot(client, item, by_outlet[str(item["outlet"])], semaphore)
                for item in pending
            ),
            return_exceptions=True,
        )

    for item, result in zip(pending, results):
        url = str(item["url"])
        if isinstance(result, BaseException) or result is None:
            rejected.append({"url": url, "reason": "unretrievable"})
            continue

        published = result["published"]
        assert isinstance(published, datetime)

        # The capture date is not the publication date. Sampled captures from
        # inside the requested window returned articles from 2007-2009, two of
        # which passed the asset gate - this check is the only thing that
        # stops them being ingested as recent incidents.
        if not (floor <= published <= ceiling):
            rejected.append(
                {"url": url, "reason": f"published {published.date()} outside window"}
            )
            continue

        # Title plus a short lede, not a slab of body. Measured on the first
        # 33 gated articles: 1500 characters of body kept 33/33 because the
        # extracted text still carries navigation and related-link furniture
        # ("bank", "market", "business"), which passes the asset half of the
        # gate on its own. The headline and opening sentences are what the
        # article is actually about.
        blob = f"{result['title']} {str(result['body'])[:250]}"
        if not is_asset_relevant(blob):
            rejected.append({"url": url, "reason": "not asset-relevant"})
            continue

        kept.append(
            {
                "url": url,
                "outlet": result["outlet"],
                "title": result["title"],
                "body": str(result["body"])[:6000],
                "published": published.isoformat(),
            }
        )

    _append_jsonl(ARTICLES_PATH, kept)
    _append_jsonl(STATE_DIR / "fetch_rejected.jsonl", rejected)

    # Group by kind, not by the individual date - otherwise every rejected
    # publication date becomes its own bucket and the summary is unreadable.
    reasons: Dict[str, int] = {}
    for row in rejected:
        text = str(row["reason"])
        kind = "published outside window" if text.startswith("published ") else text
        reasons[kind] = reasons.get(kind, 0) + 1

    logger.info("fetch complete: %d kept, %d rejected %s", len(kept), len(rejected), reasons)
    return 0


# ---------------------------------------------------------------------------
# Stage 3: extract (the expensive one)
# ---------------------------------------------------------------------------
async def stage_extract(args: argparse.Namespace) -> int:
    articles = _read_jsonl(ARTICLES_PATH)
    if not articles:
        logger.error("No gated articles. Run 'fetch' first.")
        return 1

    done = _seen_urls(INCIDENTS_PATH, key="source_url") | _seen_urls(
        STATE_DIR / "extract_failed.jsonl"
    )
    pending = [a for a in articles if a["url"] not in done][: args.max_calls]

    logger.info(
        "%d articles gated, %d already extracted, attempting %d "
        "(ceiling %d model calls)",
        len(articles),
        len(done),
        len(pending),
        args.max_calls,
    )
    if not pending:
        logger.info("nothing left to extract")
        return 0

    produced: List[Dict[str, object]] = []
    failed: List[Dict[str, object]] = []
    quota_exhausted = False

    for index, article in enumerate(pending, start=1):
        published = datetime.fromisoformat(str(article["published"]))
        composed = f"{article['title']}\n\n{article['body']}"

        try:
            incident = await extract_crime_entities_async(
                composed,
                "news_portal",
                source_url=str(article["url"]),
                published_at=published,
            )
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            failed.append({"url": article["url"], "reason": message[:200]})
            # A quota error will repeat for every remaining article. Stopping
            # preserves them for the next run instead of burning the whole
            # backlog into the failed file.
            if "429" in message or "quota" in message.lower():
                logger.warning("quota exhausted after %d calls; stopping", index)
                quota_exhausted = True
                break
            continue

        if incident is None:
            failed.append({"url": article["url"], "reason": "not a crime report"})
            continue

        incident.source_handle = article["outlet"]
        payload = incident.to_ingest_payload()
        # Stage rather than publish. Three years of machine-extracted history
        # through a wide gate is not material to put in front of readers
        # unseen - see db_migrations/005_review_queue.sql.
        payload["collection_mode"] = "backfill"
        produced.append(payload)

        if index % 25 == 0:
            logger.info("  %d/%d processed", index, len(pending))

    _append_jsonl(INCIDENTS_PATH, produced)
    _append_jsonl(STATE_DIR / "extract_failed.jsonl", failed)

    logger.info(
        "extract complete: %d incidents, %d failed%s",
        len(produced),
        len(failed),
        " (stopped on quota)" if quota_exhausted else "",
    )
    return 0


# ---------------------------------------------------------------------------
# Stage 4: post
# ---------------------------------------------------------------------------
async def stage_post(args: argparse.Namespace) -> int:
    incidents = _read_jsonl(INCIDENTS_PATH)
    if not incidents:
        logger.error("No extracted incidents. Run 'extract' first.")
        return 1

    posted: Set[str] = set()
    if POSTED_PATH.exists():
        posted = {
            line.strip() for line in POSTED_PATH.read_text(encoding="utf-8").splitlines()
        }

    pending = [i for i in incidents if str(i.get("source_url")) not in posted]
    logger.info("%d incidents, %d already posted, %d pending",
                len(incidents), len(posted), len(pending))

    if args.dry_run:
        print(json.dumps(pending[:5], indent=2, ensure_ascii=False))
        logger.info("dry run: nothing posted (showing first 5 of %d)", len(pending))
        return 0

    if not pending:
        return 0

    api_key = args.ingest_key
    if not api_key:
        logger.error("INGEST_API_KEY is not set.")
        return 1

    endpoint = f"{args.backend_url.rstrip('/')}/api/v1/ingest/batch"
    totals = {"inserted": 0, "duplicates_skipped": 0, "received": 0}

    async with httpx.AsyncClient(timeout=POST_TIMEOUT, follow_redirects=True) as client:
        for start in range(0, len(pending), INGEST_CHUNK_SIZE):
            chunk = pending[start : start + INGEST_CHUNK_SIZE]
            response = await client.post(
                endpoint,
                json={"incidents": chunk},
                headers={"X-Ingest-Key": api_key},
            )
            if response.status_code >= 400:
                logger.error("ingest failed %s: %s", response.status_code, response.text[:300])
                return 1

            body = response.json()
            for key in totals:
                totals[key] += int(body.get(key, 0) or 0)

            _ensure_state_dir()
            with POSTED_PATH.open("a", encoding="utf-8") as handle:
                for item in chunk:
                    handle.write(f"{item.get('source_url')}\n")

            logger.info("posted chunk of %d -> %s", len(chunk), body)

    logger.info("post complete: %s", totals)
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Historical asset-protection backfill from the Wayback Machine."
    )
    parser.add_argument(
        "stage", choices=["discover", "fetch", "extract", "post", "status"]
    )
    parser.add_argument("--outlets", help="Comma-separated outlet or host filter.")
    parser.add_argument("--from-date", default="20230101", help="YYYYMMDD.")
    parser.add_argument("--to-date", default="20261231", help="YYYYMMDD.")
    parser.add_argument("--page-size", type=int, default=1500)
    parser.add_argument("--max-pages", type=int, default=6)
    parser.add_argument(
        "--limit", type=int, default=400, help="Articles to fetch this run."
    )
    parser.add_argument(
        "--max-calls",
        type=int,
        default=150,
        help=(
            "Hard ceiling on Gemini calls for this run. The free tier is the "
            "binding constraint; this is how a day's quota gets spent "
            "deliberately."
        ),
    )
    parser.add_argument(
        "--backend-url", default=os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
    )
    parser.add_argument("--ingest-key", default=os.getenv("INGEST_API_KEY", ""))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", "-v", action="store_true")
    return parser


def stage_status() -> int:
    rows = {
        "candidates": len(_read_jsonl(CANDIDATES_PATH)),
        "articles (gated)": len(_read_jsonl(ARTICLES_PATH)),
        "fetch rejected": len(_read_jsonl(STATE_DIR / "fetch_rejected.jsonl")),
        "incidents extracted": len(_read_jsonl(INCIDENTS_PATH)),
        "extract failed": len(_read_jsonl(STATE_DIR / "extract_failed.jsonl")),
        "posted": len(
            POSTED_PATH.read_text(encoding="utf-8").splitlines()
            if POSTED_PATH.exists()
            else []
        ),
    }
    width = max(len(k) for k in rows)
    for key, value in rows.items():
        print(f"  {key:<{width}}  {value}")
    return 0


def main() -> int:
    args = build_parser().parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    if args.stage == "status":
        return stage_status()

    runner = {
        "discover": stage_discover,
        "fetch": stage_fetch,
        "extract": stage_extract,
        "post": stage_post,
    }[args.stage]
    return asyncio.run(runner(args))


if __name__ == "__main__":
    raise SystemExit(main())
