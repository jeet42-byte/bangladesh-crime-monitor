"""Bangla narration: Microsoft Edge neural voices, Gemini TTS, or silence.

Every clip is normalised to 24 kHz mono 16-bit WAV so scenes can be stitched
with the standard-library ``wave`` module.
"""

from __future__ import annotations

import asyncio
import logging
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

from studio import llm

logger = logging.getLogger(__name__)

RATE = 24000
EDGE_VOICES = {
    "male": "bn-BD-PradeepNeural",
    "female": "bn-BD-NabanitaNeural",
}


@dataclass
class Clip:
    path: Optional[Path]          # None = silent placeholder
    duration: float
    #: (start_seconds, word) from the engine's word boundaries, when it gives them.
    words: List[Tuple[float, str]] = field(default_factory=list)
    engine: str = "silent"


def _estimate_seconds(text: str) -> float:
    # A Bangla newsreader runs at roughly 14 characters a second.
    return max(1.5, len(text) / 14.0)


def _to_wav(src: Path, dst: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", str(RATE),
         "-sample_fmt", "s16", str(dst)],
        check=True,
    )


def _wav_seconds(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())


def _edge(text: str, voice: str, rate: str, out: Path) -> Clip:
    import edge_tts  # optional dependency

    words: List[Tuple[float, str]] = []
    mp3 = out.with_suffix(".mp3")

    async def run() -> None:
        communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
        with mp3.open("wb") as fh:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    fh.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    words.append((chunk["offset"] / 10_000_000.0, chunk["text"]))

    asyncio.run(run())
    if mp3.stat().st_size == 0:
        raise RuntimeError("edge-tts returned no audio")
    _to_wav(mp3, out)
    mp3.unlink(missing_ok=True)
    return Clip(out, _wav_seconds(out), words, "edge")


def _gemini(text: str, voice: str, out: Path) -> Clip:
    pcm = llm.speak(text, voice=voice)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)
    return Clip(out, _wav_seconds(out), [], "gemini")


class Narrator:
    """Synthesises scene narration, falling through engines on failure."""

    def __init__(self, workdir: Path, voice: str = "male", rate: str = "+4%",
                 engine: str = "auto") -> None:
        self.workdir = workdir
        self.voice = EDGE_VOICES.get(voice, voice)
        self.rate = rate
        self.engine = engine
        self._edge_broken = False
        self._gemini_broken = False

    def say(self, text: str, name: str) -> Clip:
        text = text.strip()
        out = self.workdir / f"{name}.wav"
        if not text or self.engine == "silent":
            return Clip(None, _estimate_seconds(text) if text else 0.0)

        if self.engine in ("auto", "edge") and not self._edge_broken:
            try:
                return _edge(text, self.voice, self.rate, out)
            except Exception as exc:  # noqa: BLE001 - fall through to next engine
                logger.warning("edge-tts failed (%s); trying the next engine.", exc)
                self._edge_broken = True
                if self.engine == "edge":
                    raise

        if self.engine in ("auto", "gemini") and llm.available() and not self._gemini_broken:
            try:
                return _gemini(text, "Kore" if "Nabanita" in self.voice else "Charon", out)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini TTS failed (%s).", exc)
                self._gemini_broken = True
                if self.engine == "gemini":
                    raise

        logger.warning("No voice engine worked; scene '%s' will be silent.", name)
        return Clip(None, _estimate_seconds(text))


def build_track(segments: List[Tuple[Optional[Path], float, float]], out: Path) -> None:
    """Write one WAV: for each (clip, lead_in, total_seconds) place the clip
    after ``lead_in`` seconds of silence, padded to ``total_seconds``."""
    with wave.open(str(out), "wb") as dst:
        dst.setnchannels(1)
        dst.setsampwidth(2)
        dst.setframerate(RATE)
        for path, lead, total in segments:
            total_frames = int(round(total * RATE))
            written = 0
            lead_frames = min(total_frames, int(round(lead * RATE)))
            dst.writeframes(b"\x00\x00" * lead_frames)
            written += lead_frames
            if path is not None:
                with wave.open(str(path), "rb") as src:
                    frames = src.readframes(src.getnframes())
                room = (total_frames - written) * 2
                dst.writeframes(frames[:room])
                written += min(len(frames), room) // 2
            dst.writeframes(b"\x00\x00" * max(0, total_frames - written))
