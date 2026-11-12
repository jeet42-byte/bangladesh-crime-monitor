"""Turn an :class:`Episode` into video.mp4, captions.srt, thumbnail.jpg and metadata."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

from PIL import Image

from studio import visuals
from studio.episode import Episode
from studio.safety import REVIEW_CHECKLIST, review_warnings
from studio.voice import Clip, Narrator, build_track

logger = logging.getLogger(__name__)

FPS = 30
LEAD_IN = 0.35     # silence before each scene's narration
TAIL = 0.55        # breathing room after it
FADE = 0.28        # cross-fade between scenes


@dataclass
class Cue:
    start: float
    end: float
    text: str


def chunk_text(text: str, max_chars: int) -> List[Tuple[int, str]]:
    """Split narration into caption-sized phrases. Returns (char_offset, phrase)."""
    chunks: List[Tuple[int, str]] = []
    current, start = "", 0
    for match in re.finditer(r"\S+", text):
        word = match.group()
        if not current:
            start = match.start()
        trial = f"{current} {word}".strip()
        if current and len(trial) > max_chars:
            chunks.append((start, current))
            current, start = word, match.start()
        else:
            current = trial
        if re.search(r"[।?!:;]$", word) or (word.endswith(",") and len(current) > max_chars * 0.55):
            chunks.append((start, current))
            current = ""
    if current:
        chunks.append((start, current))
    return chunks


def _anchors(text: str, clip: Clip) -> List[Tuple[int, float]]:
    """(char_offset, seconds) pairs from the engine's word boundaries."""
    anchors: List[Tuple[int, float]] = [(0, 0.0)]
    pos = 0
    for offset, word in clip.words:
        idx = text.find(word, pos)
        if idx < 0:
            continue
        anchors.append((idx, offset))
        pos = idx + len(word)
    anchors.append((len(text), clip.duration))
    return anchors


def _time_at(anchors: List[Tuple[int, float]], char: int) -> float:
    for (c0, t0), (c1, t1) in zip(anchors, anchors[1:]):
        if c0 <= char <= c1:
            return t0 + (t1 - t0) * ((char - c0) / max(1, c1 - c0))
    return anchors[-1][1]


def scene_cues(text: str, clip: Clip, offset: float, max_chars: int) -> List[Cue]:
    chunks = chunk_text(text, max_chars)
    if not chunks:
        return []
    anchors = _anchors(text, clip)
    starts = [_time_at(anchors, c) for c, _ in chunks]
    cues = []
    for i, (c, phrase) in enumerate(chunks):
        end = starts[i + 1] if i + 1 < len(chunks) else clip.duration + 0.2
        cues.append(Cue(offset + starts[i], offset + end, phrase))
    return cues


def _srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(cues: List[Cue], path: Path) -> None:
    lines = []
    for i, cue in enumerate(cues, 1):
        lines += [str(i), f"{_srt_time(cue.start)} --> {_srt_time(cue.end)}", cue.text, ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def write_script(ep: Episode, durations: List[float], path: Path, warnings: List[str]) -> None:
    out = [f"# {ep.title}", "", f"Format: {ep.format} · {ep.aspect} · {sum(durations):.0f} s", ""]
    if warnings:
        out += ["## Check before upload", ""] + [f"- ⚠️ {w}" for w in warnings] + [""]
    out += ["## Review checklist", ""] + [f"- [ ] {c}" for c in REVIEW_CHECKLIST] + [""]
    out += ["## Script", ""]
    t = 0.0
    for scene, dur in zip(ep.scenes, durations):
        out += [f"**{int(t // 60):02d}:{int(t % 60):02d} · {scene.kind}**", "", scene.narration or "_(no narration)_", ""]
        t += dur
    if ep.sources:
        out += ["## Sources", ""] + [f"- {s.get('label', '')}: {s.get('url', '')}" for s in ep.sources]
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def render(ep: Episode, out_dir: Path, *, channel: str, narrator: Narrator, sample: bool,
           music: Optional[Path] = None, script_only: bool = False) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    work = out_dir / "work"
    work.mkdir(exist_ok=True)
    visuals.require_raqm()

    W, H = (1080, 1920) if ep.vertical else (1920, 1080)
    ctx = visuals.Ctx(W, H, show=ep.show, channel=channel, sample=sample)
    max_chars = 30 if ep.vertical else 46

    # ---- voice ---------------------------------------------------------
    clips: List[Clip] = []
    for i, scene in enumerate(ep.scenes):
        clips.append(narrator.say(scene.narration, f"scene{i:02d}"))
    durations = [max(scene.min_seconds, clip.duration + LEAD_IN + TAIL) if scene.narration else scene.min_seconds
                 for scene, clip in zip(ep.scenes, clips)]
    total = sum(durations)
    engines = sorted({c.engine for c in clips if c.path or c.duration})

    cues: List[Cue] = []
    t = 0.0
    for scene, clip, dur in zip(ep.scenes, clips, durations):
        cues += scene_cues(scene.narration, clip, t + LEAD_IN, max_chars)
        t += dur

    warnings = list(ep.notes) + review_warnings(s.narration for s in ep.scenes)
    if "silent" in engines:
        warnings.append("Some or all scenes have no voice (no TTS engine reachable). Do not upload this render.")
    if sample:
        warnings.append("Rendered from SAMPLE data. Do not upload.")
    if ep.vertical and total > 180:
        warnings.append(f"{total:.0f} s is over YouTube's 3-minute Shorts limit.")

    write_srt(cues, out_dir / "captions.srt")
    write_script(ep, durations, out_dir / "script.md", warnings)
    meta = {
        "title": ep.title,
        "description": ep.description,
        "tags": ep.tags,
        "format": ep.format,
        "aspect": ep.aspect,
        "duration_seconds": round(total, 1),
        "voice_engines": engines,
        "sample_data": sample,
        "sources": ep.sources,
        "warnings": warnings,
        "language": "bn",
        "category_id": "25",   # YouTube "News & Politics"
    }
    (out_dir / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "description.txt").write_text(ep.description, encoding="utf-8")
    visuals.thumbnail(out_dir / "thumbnail.jpg", channel=channel, sample=sample, **ep.thumbnail)
    if script_only:
        return meta

    # ---- audio ---------------------------------------------------------
    narration = work / "narration.wav"
    build_track([(c.path, LEAD_IN, d) for c, d in zip(clips, durations)], narration)

    # ---- video ---------------------------------------------------------
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", str(narration)]
    if music:
        cmd += ["-stream_loop", "-1", "-i", str(music),
                "-filter_complex",
                "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11[v];[2:a]volume=0.09[m];"
                "[v][m]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-af", "loudnorm=I=-15:TP=-1.5:LRA=11", "-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
            "-g", str(FPS * 2), "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
            "-movflags", "+faststart", "-shortest", str(out_dir / "video.mp4")]

    started = time.time()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    total_frames = int(round(total * FPS))
    frame_no = 0
    cue_i = 0
    prev_last: Optional[Image.Image] = None
    scene_start = 0.0
    try:
        for scene, dur in zip(ep.scenes, durations):
            ctx.duration = dur
            end_anim = visuals.anim_end(ctx, scene.kind, scene.data)
            cached: Optional[Image.Image] = None
            n = int(round((scene_start + dur) * FPS)) - frame_no
            last = None
            for f in range(n):
                t = f / FPS
                if cached is not None:
                    frame = cached.copy()
                else:
                    frame = visuals.draw_scene(ctx, scene.kind, scene.data, t)
                    if t >= end_anim:
                        cached = frame.copy()
                visuals.draw_live(ctx, scene.kind, scene.data, frame, t)
                if prev_last is not None and t < FADE:
                    frame = Image.blend(prev_last, frame, t / FADE)
                if f == n - 1:
                    last = frame.copy()   # clean copy, without overlays, for the next fade
                now = frame_no / FPS
                while cue_i < len(cues) and cues[cue_i].end <= now:
                    cue_i += 1
                if cue_i < len(cues) and cues[cue_i].start <= now:
                    visuals.paste_caption(ctx, frame, cues[cue_i].text)
                visuals.draw_progress(ctx, frame, frame_no / max(1, total_frames))
                proc.stdin.write(frame.tobytes())
                frame_no += 1
            prev_last = last
            scene_start += dur
    finally:
        proc.stdin.close()
        code = proc.wait()
    if code != 0:
        raise RuntimeError(f"ffmpeg exited with {code}")
    logger.info("Rendered %d frames (%.0f s of video) in %.0f s", frame_no, total, time.time() - started)
    for leftover in work.glob("*"):
        leftover.unlink()
    work.rmdir()
    return meta
