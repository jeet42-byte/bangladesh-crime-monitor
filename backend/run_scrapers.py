#!/usr/bin/env python3
"""Scraper orchestrator - the entrypoint the GitHub Actions cron invokes.

    python backend/run_scrapers.py --lookback-hours 8

Reads both collectors, merges and deduplicates their output, then POSTs the
result to ``/api/v1/ingest/batch`` in chunks. Exits non-zero only on a
transport or auth failure - an empty scrape window is a normal outcome, not
an error, and must not turn the workflow red.
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
from typing import Dict, List, Sequence

# Make ``app.*`` importable when this file is run as backend/run_scrapers.py
# from the repository root, which is what the workflow does.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402

from app.parsers.llm_extractor import BST, ExtractedIncident  # noqa: E402
from app.scrapers.fb_scraper import scrape_facebook  # noqa: E402
from app.scrapers.news_scraper import scrape_news  # noqa: E402
from app.scrapers.telegram_scraper import scrape_telegram  # noqa: E402
from app.scrapers.youtube_scraper import scrape_youtube  # noqa: E402

logger = logging.getLogger("run_scrapers")

# One POST per chunk; matches MAX_BATCH_SIZE in the ingest router.
INGEST_CHUNK_SIZE = 100
POST_TIMEOUT = httpx.Timeout(90.0, connect=20.0)

# Render's free tier sleeps after inactivity; the first request wakes it and
# can take the better part of a minute.
COLD_START_RETRIES = 4
COLD_START_BACKOFF_SECONDS = 15


def _dedupe(incidents: Sequence[ExtractedIncident]) -> List[ExtractedIncident]:
    """Collapse incidents sharing a content hash, keeping the best source.

    The same murder is typically carried by several outlets within an hour.
    Where their headlines normalise to the same string the hashes collide and
    we keep whichever carries the higher source confidence, breaking ties on
    the model's own extraction confidence.

    This is title-based and therefore imperfect: two outlets that headline the
    same incident differently - most obviously a Bengali headline and an
    English one - hash differently and both survive. Near-duplicate collapse
    would need embedding similarity, which is out of scope for a pipeline that
    has to stay inside a free LLM quota.
    """
    best: Dict[str, ExtractedIncident] = {}
    for incident in incidents:
        existing = best.get(incident.raw_content_hash)
        if existing is None:
            best[incident.raw_content_hash] = incident
            continue

        candidate_rank = (incident.source_confidence, incident.extraction_confidence)
        existing_rank = (existing.source_confidence, existing.extraction_confidence)
        if candidate_rank > existing_rank:
            best[incident.raw_content_hash] = incident

    return list(best.values())


# Platforms that count as an editorial or official record rather than a live
# flash. A live signal is promoted when one of these reports the same event.
_CORROBORATING_PLATFORMS = frozenset({"news_portal", "police_report"})

# How close two reports must be, in hours, to be treated as the same event.
_CORROBORATION_WINDOW_HOURS = 36


def _assign_verification(incidents: Sequence[ExtractedIncident]) -> None:
    """Mark each live signal as corroborated when an editorial source agrees.

    Matching is deliberately loose - same thana, same category, within a day
    and a half - because two outlets describing one shooting will not produce
    identical headlines, which is exactly why the content hash does not
    already merge them.

    Anything not corroborated stays 'unverified' and must be presented as a
    lead, never as an established incident.
    """
    editorial = [
        item
        for item in incidents
        if item.source_platform in _CORROBORATING_PLATFORMS
    ]

    for signal in incidents:
        if signal.source_platform in _CORROBORATING_PLATFORMS:
            signal.verification_level = "single_source"
            continue

        match = next(
            (
                other
                for other in editorial
                if other.thana_name == signal.thana_name
                and other.crime_category == signal.crime_category
                and abs(other.incident_date - signal.incident_date)
                <= timedelta(hours=_CORROBORATION_WINDOW_HOURS)
            ),
            None,
        )

        if match is not None:
            signal.verification_level = "corroborated"
            logger.info(
                "Live signal corroborated by %s: %s",
                match.source_url.split("/")[2] if "/" in match.source_url else "source",
                signal.title[:60],
            )
        else:
            signal.verification_level = "unverified"


def _filter_quality(
    incidents: Sequence[ExtractedIncident], min_confidence: float
) -> List[ExtractedIncident]:
    """Drop rows the extractor was not confident about."""
    kept: List[ExtractedIncident] = []
    for incident in incidents:
        if incident.extraction_confidence < min_confidence:
            logger.debug(
                "dropping low-confidence row (%.2f): %s",
                incident.extraction_confidence,
                incident.title[:70],
            )
            continue
        kept.append(incident)
    return kept


def _chunk(items: Sequence[ExtractedIncident], size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


async def _post_chunk(
    client: httpx.AsyncClient,
    url: str,
    api_key: str,
    chunk: Sequence[ExtractedIncident],
) -> Dict[str, int]:
    """POST one chunk, retrying through a Render cold start."""
    payload = {"incidents": [incident.to_ingest_payload() for incident in chunk]}
    headers = {"X-Ingest-Key": api_key, "Content-Type": "application/json"}

    last_error: Exception | None = None

    for attempt in range(1, COLD_START_RETRIES + 1):
        try:
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 401:
                raise SystemExit(
                    "Ingest rejected: INGEST_API_KEY does not match the backend."
                )
            if response.status_code == 422:
                logger.error("Ingest rejected the payload: %s", response.text[:2000])
                return {"inserted": 0, "duplicates_skipped": 0, "received": len(chunk)}

            response.raise_for_status()
            return response.json()

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
            last_error = exc
            if attempt == COLD_START_RETRIES:
                break
            wait = COLD_START_BACKOFF_SECONDS * attempt
            logger.warning(
                "ingest attempt %d/%d failed (%s); retrying in %ds",
                attempt,
                COLD_START_RETRIES,
                exc,
                wait,
            )
            await asyncio.sleep(wait)

    raise RuntimeError(f"ingest failed after {COLD_START_RETRIES} attempts: {last_error}")


async def run(args: argparse.Namespace) -> int:
    """Collect, merge, and ship. Returns a process exit code."""
    started = datetime.now(timezone.utc)
    logger.info(
        "=== Bangladesh Crime Monitor ingest run: %s (lookback %dh) ===",
        started.astimezone(BST).strftime("%Y-%m-%d %H:%M BST"),
        args.lookback_hours,
    )

    tasks = []
    if not args.skip_news:
        tasks.append(
            scrape_news(
                lookback_hours=args.lookback_hours,
                max_articles=args.max_articles,
            )
        )
    if not args.skip_facebook:
        tasks.append(
            scrape_facebook(
                lookback_hours=args.lookback_hours,
                max_incidents=args.max_posts,
            )
        )
    if not args.skip_youtube:
        tasks.append(
            scrape_youtube(
                lookback_hours=args.lookback_hours,
                max_videos=args.max_videos,
            )
        )
    if args.with_telegram:
        tasks.append(
            scrape_telegram(
                lookback_hours=args.lookback_hours,
                max_posts=args.max_posts,
            )
        )

    if not tasks:
        logger.error("Both collectors are disabled; nothing to do.")
        return 1

    results = await asyncio.gather(*tasks, return_exceptions=True)

    collected: List[ExtractedIncident] = []
    for result in results:
        if isinstance(result, BaseException):
            # One collector failing must not sink the other's output.
            logger.error("collector failed: %s", result, exc_info=result)
            continue
        collected.extend(result)

    logger.info("collected %d raw incidents", len(collected))

    incidents = _dedupe(collected)
    logger.info("%d after cross-source deduplication", len(incidents))

    _assign_verification(incidents)
    levels = {}
    for item in incidents:
        levels[item.verification_level] = levels.get(item.verification_level, 0) + 1
    if levels:
        logger.info("verification levels: %s", levels)

    incidents = _filter_quality(incidents, args.min_confidence)
    logger.info("%d after confidence filtering (>= %.2f)", len(incidents), args.min_confidence)

    # Guard against a model hallucinating a date far outside the window.
    horizon = datetime.now(timezone.utc) + timedelta(days=1)
    floor = datetime.now(timezone.utc) - timedelta(days=args.max_age_days)
    incidents = [
        incident
        for incident in incidents
        if floor <= incident.incident_date <= horizon
    ]
    logger.info("%d after date sanity check", len(incidents))

    if args.dry_run:
        print(
            json.dumps(
                [incident.to_ingest_payload() for incident in incidents],
                indent=2,
                ensure_ascii=False,
            )
        )
        logger.info("dry run: nothing was posted")
        return 0

    if not incidents:
        logger.info("nothing new in this window; exiting cleanly")
        return 0

    backend_url = args.backend_url.rstrip("/")
    api_key = args.ingest_key
    if not api_key:
        logger.error("INGEST_API_KEY is not set; cannot authenticate to the backend.")
        return 1

    endpoint = f"{backend_url}/api/v1/ingest/batch"
    totals = {"inserted": 0, "duplicates_skipped": 0, "received": 0}

    async with httpx.AsyncClient(timeout=POST_TIMEOUT, follow_redirects=True) as client:
        for index, chunk in enumerate(_chunk(incidents, INGEST_CHUNK_SIZE), start=1):
            logger.info("posting chunk %d (%d incidents) -> %s", index, len(chunk), endpoint)
            result = await _post_chunk(client, endpoint, api_key, chunk)
            for key in totals:
                totals[key] += int(result.get(key, 0))

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    logger.info(
        "=== done in %.1fs: inserted=%d duplicates_skipped=%d received=%d ===",
        elapsed,
        totals["inserted"],
        totals["duplicates_skipped"],
        totals["received"],
    )

    # Surface the numbers in the GitHub Actions job summary.
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("### Ingest run\n\n")
            handle.write("| metric | value |\n|---|---|\n")
            handle.write(f"| collected | {len(collected)} |\n")
            handle.write(f"| posted | {totals['received']} |\n")
            handle.write(f"| inserted | {totals['inserted']} |\n")
            handle.write(f"| duplicates skipped | {totals['duplicates_skipped']} |\n")
            handle.write(f"| duration | {elapsed:.1f}s |\n")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Collect Bangladeshi crime reports and ingest them."
    )
    parser.add_argument(
        "--backend-url",
        default=os.environ.get("BACKEND_URL", "http://127.0.0.1:8000"),
        help="Base URL of the FastAPI service.",
    )
    parser.add_argument(
        "--ingest-key",
        default=os.environ.get("INGEST_API_KEY", ""),
        help="Value for the X-Ingest-Key header.",
    )
    parser.add_argument(
        "--lookback-hours",
        type=int,
        default=int(os.environ.get("LOOKBACK_HOURS", "8")),
        help="How far back to look. Should exceed the cron interval.",
    )
    parser.add_argument("--max-articles", type=int, default=60)
    parser.add_argument("--max-posts", type=int, default=40)
    parser.add_argument("--max-videos", type=int, default=20)
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=30,
        help="Reject incidents dated further back than this.",
    )
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.45,
        help="Drop extractions below this self-reported confidence.",
    )
    parser.add_argument("--skip-news", action="store_true")
    parser.add_argument("--skip-facebook", action="store_true")
    parser.add_argument("--skip-youtube", action="store_true")
    parser.add_argument(
        "--with-telegram",
        action="store_true",
        help=(
            "Also read public Telegram channels. Off by default: of every "
            "Bangladeshi channel probed, only The Daily Star's is still "
            "active, and it posts the same headlines already collected from "
            "their RSS feed - so it costs model calls and adds no coverage."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the payload as JSON instead of posting it.",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    # Third-party libraries are chatty at DEBUG.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    try:
        raise SystemExit(asyncio.run(run(args)))
    except KeyboardInterrupt:
        logger.warning("interrupted")
        raise SystemExit(130)


if __name__ == "__main__":
    main()
