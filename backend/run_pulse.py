#!/usr/bin/env python3
"""Public Pulse collector - the entrypoint the pulse cron invokes.

    python backend/run_pulse.py --max-videos 15

Finds the most viral recent Bangladeshi videos (YouTube trending in BD plus
the TV newsrooms' uploads), reads each one's top comments, has Gemini
summarise the crowd's reaction, and posts the aggregates to
``/api/v1/ingest/pulse``. Videos analysed in the last 12 hours are skipped,
so each run spends its model calls on new or still-rising topics.

Exits non-zero only when nothing could be collected because of a
configuration or transport failure - a quiet day is not an error.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402

from app.parsers.pulse_analyzer import analyse  # noqa: E402
from app.scrapers.youtube_pulse import (  # noqa: E402
    MAX_AGE,
    PULSE_SEARCHES,
    YouTubeAPIError,
    YouTubeClient,
    newsroom_video_ids,
    select_viral,
)

logger = logging.getLogger("run_pulse")

POST_TIMEOUT = httpx.Timeout(90.0, connect=20.0)
COLD_START_RETRIES = 4
COLD_START_BACKOFF_SECONDS = 15


def _backend(method: str, url: str, key: str, **kwargs: Any) -> httpx.Response:
    """Call the backend, waiting out a Render cold start."""
    headers = {"X-Ingest-Key": key, "Content-Type": "application/json"}
    last: Exception | None = None
    for attempt in range(COLD_START_RETRIES + 1):
        try:
            response = httpx.request(method, url, headers=headers, timeout=POST_TIMEOUT, **kwargs)
            if response.status_code < 500:
                return response
            last = RuntimeError(f"HTTP {response.status_code}: {response.text[:200]}")
        except httpx.HTTPError as exc:
            last = exc
        if attempt < COLD_START_RETRIES:
            time.sleep(COLD_START_BACKOFF_SECONDS)
    raise RuntimeError(f"backend unreachable: {last}")


def run(args: argparse.Namespace) -> int:
    youtube_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not youtube_key:
        logger.error("YOUTUBE_API_KEY is not set - add it as a repository secret.")
        return 2
    yt = YouTubeClient(youtube_key)
    now = datetime.now(timezone.utc)

    recent: Dict[str, str] = {}
    if not args.dry_run:
        response = _backend("GET", f"{args.api}/api/v1/ingest/pulse/recent", args.key)
        if response.status_code != 200:
            logger.error("pulse/recent HTTP %s: %s", response.status_code, response.text[:200])
            return 1
        recent = response.json()
    logger.info("%d videos analysed in the last 12h will be skipped", len(recent))

    sources: Dict[str, str] = {}
    try:
        for video_id in yt.trending():
            sources.setdefault(video_id, "trending")
    except YouTubeAPIError as exc:
        logger.error("trending failed: %s", exc)
        return 1
    for video_id in newsroom_video_ids(now - MAX_AGE):
        sources.setdefault(video_id, "newsroom")
    if not args.skip_search:
        for query in PULSE_SEARCHES:
            try:
                for video_id in yt.search(query, now - MAX_AGE):
                    sources.setdefault(video_id, "search")
            except YouTubeAPIError as exc:
                logger.warning("search %r failed: %s", query, exc)

    videos = yt.details(sources)
    for video in videos:
        video.discovered_via = sources.get(video.video_id, "trending")
    chosen = select_viral(videos, limit=args.max_videos, skip=recent, now=now)
    logger.info(
        "candidates: %d ids, %d with details, %d chosen (%s)",
        len(sources), len(videos), len(chosen),
        ", ".join(f"{v.discovered_via}" for v in chosen),
    )

    topics: List[Dict[str, Any]] = []
    for video in chosen:
        try:
            comments = yt.comments(video.video_id, limit=args.comments_per_video)
        except YouTubeAPIError as exc:
            # commentsDisabled, or a video taken down since discovery.
            logger.info("skip %s: %s", video.video_id, exc)
            continue
        if len(comments) < 20:
            continue
        result = analyse(video.title, video.channel, comments)
        if result is None:
            logger.warning("no analysis for %s (%s)", video.video_id, video.title[:60])
            continue
        topics.append({
            "platform": "YouTube",
            "video_id": video.video_id,
            "url": video.url,
            "title": video.title[:500],
            "channel": video.channel[:200] or None,
            "published_at": video.published_at.isoformat() if video.published_at else None,
            "discovered_via": video.discovered_via,
            "view_count": video.view_count,
            "like_count": video.like_count,
            "comment_count": video.comment_count,
            "comments_analysed": len(comments),
            **result,
        })
        logger.info(
            "%-11s %-14s neg %5.1f%%  %s", video.video_id, result["topic_type"],
            result["negative_pct"], result["topic"][:70],
        )

    logger.info("YouTube quota used this run: ~%d units", yt.units)
    if args.dry_run:
        print(json.dumps(topics, ensure_ascii=False, indent=2))
        return 0
    if not topics:
        logger.info("nothing new to post")
        return 0
    response = _backend("POST", f"{args.api}/api/v1/ingest/pulse", args.key, json={"topics": topics})
    if response.status_code != 200:
        logger.error("ingest/pulse HTTP %s: %s", response.status_code, response.text[:500])
        return 1
    logger.info("posted: %s", response.json())
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", default=os.environ.get("BACKEND_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--key", default=os.environ.get("INGEST_API_KEY", ""))
    parser.add_argument("--max-videos", type=int, default=15)
    parser.add_argument("--comments-per-video", type=int, default=200)
    parser.add_argument("--skip-search", action="store_true", help="Save 100 quota units per query")
    parser.add_argument("--dry-run", action="store_true", help="Print instead of posting")
    return parser


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    sys.exit(run(build_parser().parse_args()))
