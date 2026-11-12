"""Gemini over plain REST: structured JSON scripts and (fallback) speech.

REST rather than the google-generativeai SDK the extractor uses, because the
SDK is deprecated and has no audio output; both calls here are one POST.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class LLMUnavailable(RuntimeError):
    pass


def api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "").strip()


def available() -> bool:
    return bool(api_key())


def _post(model: str, body: dict, timeout: float = 120.0) -> dict:
    key = api_key()
    if not key:
        raise LLMUnavailable("GEMINI_API_KEY is not set")
    url = f"{API_BASE}/models/{model}:generateContent"
    delay = 8.0
    last = ""
    for attempt in range(4):
        try:
            response = httpx.post(url, json=body, timeout=timeout, headers={"x-goog-api-key": key})
        except httpx.HTTPError as exc:
            last = str(exc)
        else:
            if response.status_code == 200:
                return response.json()
            last = f"HTTP {response.status_code}: {response.text[:300]}"
            if response.status_code not in (429, 500, 502, 503, 504):
                break
        logger.warning("Gemini %s attempt %d failed: %s", model, attempt + 1, last)
        time.sleep(delay)
        delay *= 2
    raise LLMUnavailable(f"Gemini {model} failed: {last}")


def _gemini_schema(node: Any) -> Any:
    """Gemini's REST schema wants upper-case type names (OBJECT, STRING...)."""
    if isinstance(node, dict):
        return {k: (v.upper() if k == "type" and isinstance(v, str) else _gemini_schema(v)) for k, v in node.items()}
    if isinstance(node, list):
        return [_gemini_schema(v) for v in node]
    return node


def generate_json(prompt: str, schema: dict, *, temperature: float = 0.5,
                  model: Optional[str] = None) -> Any:
    """Ask for JSON matching ``schema`` and return it parsed."""
    model = model or os.environ.get("STUDIO_GEMINI_MODEL", "gemini-flash-latest")
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
            "responseSchema": _gemini_schema(schema),
        },
    }
    data = _post(model, body)
    try:
        text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
        return json.loads(text)
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMUnavailable(f"Gemini returned no usable JSON: {str(data)[:300]}") from exc


def speak(text: str, voice: str = "Kore", model: Optional[str] = None) -> bytes:
    """Gemini text-to-speech. Returns raw 24 kHz mono 16-bit PCM."""
    model = model or os.environ.get("STUDIO_TTS_MODEL", "gemini-2.5-flash-preview-tts")
    body = {
        "contents": [{"parts": [{"text": f"Read this Bangla news narration in a calm, clear anchor voice:\n{text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    data = _post(model, body, timeout=180.0)
    try:
        b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except (KeyError, IndexError) as exc:
        raise LLMUnavailable(f"Gemini TTS returned no audio: {str(data)[:300]}") from exc
    return base64.b64decode(b64)
