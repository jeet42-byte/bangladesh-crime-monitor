"""Classify news headlines as live disruptions: blockades, hartals, protests.

These are not crimes, so the incident extractor rejects them by design -
yet "is my road blocked?" is the question a Dhaka commuter, driver or
factory manager asks every morning. Headlines are classified in batches of
up to BATCH_SIZE per model call: a disruption needs a type, a place and a
rough duration, not a full article read, and batching keeps the free-tier
quota for the incident pipeline.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence

from app.core.config import settings
from app.parsers.llm_extractor import _attempt_gemini

logger = logging.getLogger(__name__)

BATCH_SIZE = 25

DISRUPTION_KINDS: tuple[str, ...] = (
    "road_blockade",   # a road, highway, rail line or ferry route blocked by people
    "hartal_strike",   # hartal, transport strike, shutdown, general strike
    "protest_rally",   # rally, procession, sit-in, siege (gherao), human chain on a road
    "clash",           # clashes, chases, violence in the street
    "road_closure",    # closed or diverted by authorities, collapse, flooding, accident
)

SYSTEM_PROMPT = """You read Bangladeshi news headlines (Bangla or English) and pick out the ones that report a disruption people moving around need to know about: a blocked road, highway, rail line or ferry route; a hartal, transport strike or shutdown; a rally, procession, sit-in or siege occupying a road; street clashes; or a road closed or diverted.

For each headline decide:
- is_disruption: true only for a specific disruption in Bangladesh that is happening now or is announced for a stated day. False for opinion, policy news, court cases, crime reports without street disruption, and disruptions that are reported as already over.
- kind: one of road_blockade, hartal_strike, protest_rally, clash, road_closure.
- status: "ongoing" if happening now or today, "planned" if announced for a later date.
- starts_in_hours: 0 if ongoing; otherwise hours from now until it starts (best estimate).
- expected_hours: how long it is likely to last, best estimate (blockades often 2-6, hartals 12-24).
- place: the most specific place named (road, intersection, area, upazila, district), in English. Empty if none.
- district: the district, in English, if known.
- title: a neutral English headline, max 100 characters.

Return JSON: {"items": [...]} with one object per input headline, in the same order, each with its index."""

RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "is_disruption": {"type": "boolean"},
                    "kind": {"type": "string", "enum": list(DISRUPTION_KINDS)},
                    "status": {"type": "string", "enum": ["ongoing", "planned"]},
                    "starts_in_hours": {"type": "number"},
                    "expected_hours": {"type": "number"},
                    "place": {"type": "string"},
                    "district": {"type": "string"},
                    "title": {"type": "string"},
                },
                # Every field required: with only index and is_disruption
                # required, the live model returned nothing else, and no
                # disruption could be placed on the map.
                "required": [
                    "index", "is_disruption", "kind", "status", "starts_in_hours",
                    "expected_hours", "place", "district", "title",
                ],
            },
        }
    },
    "required": ["items"],
}

#: Cheap gate before any model call. Bangla first: most reporting is Bangla.
LEXICON: tuple[str, ...] = (
    "অবরোধ", "হরতাল", "ধর্মঘট", "শাটডাউন", "বিক্ষোভ", "সমাবেশ", "মিছিল",
    "যান চলাচল বন্ধ", "যানচলাচল বন্ধ", "ট্রেন চলাচল", "রেল চলাচল", "ফেরি চলাচল",
    "সংঘর্ষ", "ধাওয়া", "ঘেরাও", "অবস্থান কর্মসূচি", "মানববন্ধন", "সড়ক বন্ধ",
    "blockade", "blocked", "hartal", "strike", "shutdown", "protest", "rally",
    "procession", "clash", "traffic halted", "traffic suspended", "road closed",
    "diverted", "sit-in", "siege",
)


def looks_like_disruption(text: str) -> bool:
    lowered = text.lower()
    return any(word in lowered for word in LEXICON)


_MODEL: Any = None


def _model() -> Any:
    global _MODEL
    if _MODEL is None and settings.GEMINI_API_KEY:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _MODEL = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
                "response_schema": RESPONSE_SCHEMA,
            },
        )
    return _MODEL


def _clamp(value: Any, low: float, high: float, default: float) -> float:
    try:
        return max(low, min(high, float(value)))
    except (TypeError, ValueError):
        return default


def classify(headlines: Sequence[str]) -> Optional[List[Optional[Dict[str, Any]]]]:
    """One result per headline (None where it is not a disruption).

    Returns None if the model could not be reached, so the caller can retry
    those headlines on a later run instead of recording them as answered.
    """
    model = _model()
    if model is None:
        return None
    results: List[Optional[Dict[str, Any]]] = [None] * len(headlines)
    for start in range(0, len(headlines), BATCH_SIZE):
        chunk = headlines[start:start + BATCH_SIZE]
        prompt = "\n".join(f"{i}. {text}" for i, text in enumerate(chunk))
        data, reached = _attempt_gemini(model, prompt)
        if not reached:
            return None
        for item in (data or {}).get("items", []):
            try:
                index = int(item.get("index"))
            except (TypeError, ValueError):
                continue
            if not (0 <= index < len(chunk)) or not item.get("is_disruption"):
                continue
            kind = item.get("kind")
            if kind not in DISRUPTION_KINDS:
                continue
            results[start + index] = {
                "kind": kind,
                "status": "planned" if item.get("status") == "planned" else "ongoing",
                "starts_in_hours": _clamp(item.get("starts_in_hours"), 0, 72, 0),
                "expected_hours": _clamp(item.get("expected_hours"), 1, 36, 4),
                "place": str(item.get("place") or "").strip()[:120],
                "district": str(item.get("district") or "").strip()[:60],
                "title": str(item.get("title") or "").strip()[:160],
            }
    return results

