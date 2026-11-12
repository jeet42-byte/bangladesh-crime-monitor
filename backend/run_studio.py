"""Render a Bangla YouTube video from the crime archive.

Examples
--------
    # Weekly numbers video (16:9) from the live API
    BACKEND_URL=https://... python backend/run_studio.py brief

    # Today's top stories as a Short (9:16), needs GEMINI_API_KEY for good scripts
    python backend/run_studio.py daily

    # One case, long-form; auto-picks the best-corroborated recent case
    python backend/run_studio.py case [--incident-id UUID]

    # Scam / safety explainer Short from the TTP library
    python backend/run_studio.py explainer [--topic fraud-otp-account-takeover]

    # Offline demo with bundled sample data (watermarked, never upload)
    python backend/run_studio.py brief --fixture backend/studio/sample_data.json

Output goes to studio_out/<slug>/: video.mp4, thumbnail.jpg, captions.srt,
metadata.json, description.txt and script.md (read script.md before uploading).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from studio import formats  # noqa: E402
from studio.render import render  # noqa: E402
from studio.source import SourceError, open_source  # noqa: E402
from studio.voice import Narrator  # noqa: E402

DEFAULT_SITE = "bangladesh-crime-monitor.vercel.app"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("format", choices=sorted(formats.BUILDERS))
    parser.add_argument("--aspect", choices=["16:9", "9:16"], help="Default: 16:9 for brief/case, 9:16 for daily/explainer")
    parser.add_argument("--out", default="studio_out", help="Output directory")
    parser.add_argument("--fixture", help="Read a JSON fixture instead of the API (sample/demo)")
    parser.add_argument("--incident-id", help="case: which incident")
    parser.add_argument("--topic", help="explainer: TTP profile id")
    parser.add_argument("--count", type=int, default=4, help="daily: number of stories (3-5 fits a Short)")
    parser.add_argument("--voice", default="male", help="male | female | any edge-tts voice name")
    parser.add_argument("--rate", default="+4%", help="Speech rate for edge-tts, e.g. +0%%, +8%%")
    parser.add_argument("--tts", default="auto", choices=["auto", "edge", "gemini", "silent"])
    parser.add_argument("--channel", default="অপরাধ মনিটর", help="Channel name shown on every frame")
    parser.add_argument("--site", default=DEFAULT_SITE, help="Website shown in the outro and description")
    parser.add_argument("--music", type=Path, help="Optional background music file (royalty-free!)")
    parser.add_argument("--script-only", action="store_true", help="Write script, metadata and thumbnail; skip the video")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    log = logging.getLogger("studio")

    try:
        src = open_source(args.fixture)
    except SourceError as exc:
        log.error("%s", exc)
        return 2

    aspect = args.aspect or formats.DEFAULT_ASPECT[args.format]
    builder = formats.BUILDERS[args.format]
    extra = {}
    if args.format == "daily":
        extra["count"] = max(1, min(6, args.count))
    elif args.format == "case":
        extra["incident_id"] = args.incident_id
    elif args.format == "explainer":
        extra["topic"] = args.topic

    try:
        episode = builder(src, aspect, args.site, **extra)
    except formats.NotEnoughData as exc:
        log.warning("Nothing rendered: %s", exc)
        return 3
    except SourceError as exc:
        log.error("Data source error: %s", exc)
        return 2

    if aspect != formats.DEFAULT_ASPECT[args.format]:
        episode.slug += "-short" if aspect == "9:16" else "-wide"
    out_dir = Path(args.out) / episode.slug
    narrator = Narrator(out_dir / "work", voice=args.voice, rate=args.rate, engine=args.tts)
    (out_dir / "work").mkdir(parents=True, exist_ok=True)
    meta = render(episode, out_dir, channel=args.channel, narrator=narrator, sample=src.is_sample,
                  music=args.music, script_only=args.script_only)

    print(f"\n✔ {episode.title}")
    print(f"  {out_dir}/  ({meta['duration_seconds']} s, voice: {', '.join(meta['voice_engines']) or 'none'})")
    for warning in meta["warnings"]:
        print(f"  ⚠ {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
