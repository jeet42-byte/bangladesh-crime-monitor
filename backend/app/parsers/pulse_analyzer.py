"""Public Pulse: read a video's comment section, report the crowd's reaction.

This is aggregate opinion analysis, not surveillance of people. The model
sees comment text only - the collector drops author names and channel IDs
before anything leaves YouTube's response - and is told to answer in
paraphrase. Nothing it returns can identify a commenter: no handles, no
quotes, no "one user said". What survives is what an analyst needs: how the
crowd feels, about what, whether it trusts the authorities, and whether the
thread carries signals worth attention (calls for mob justice, communal
hostility, rumours presented as fact).

Comments are Bangla, English, and romanised Bangla ("Banglish") mixed freely,
often sarcastic. Flash models handle all three; the prompt says so, because
sarcasm read literally flips the sentiment.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence

from app.core.config import settings
from app.db.models import CRIME_CATEGORIES, PULSE_FLAGS, PULSE_STANCES, PULSE_TOPIC_TYPES
from app.parsers.llm_extractor import _attempt_gemini

logger = logging.getLogger(__name__)

EMOTIONS: tuple[str, ...] = (
    "anger",
    "fear",
    "grief",
    "sarcasm",
    "support",
    "hope",
    "distrust",
    "humour",
)

#: Characters of comment text sent per video; ~150 comments of average length.
MAX_PROMPT_CHARS = 18000
MAX_COMMENT_CHARS = 350

SYSTEM_PROMPT = """You are an open-source intelligence analyst studying public reaction in Bangladesh.

You receive one viral YouTube video's title and channel, followed by a sample of its top public comments ordered by likes (most liked first, like count in brackets). Comments are in Bangla, English or romanised Bangla ("Banglish"), often sarcastic or rhetorical: read sarcasm for what it means, not what it literally says.

Describe the CROWD, never individuals:
- Never output a commenter's name, handle or any identifying detail, even if a comment contains one.
- Never quote a comment. key_views are short English paraphrases of positions many commenters share, with the approximate share of comments holding each.
- Do not reproduce slurs or abuse; describe them ("communal slurs against a religious minority").
- Do not name private individuals mentioned in the video or comments (victims, accused, bystanders). Public officials, parties and institutions may be named.

Sentiment is the commenters' attitude to the subject of the video. positive_pct + neutral_pct + negative_pct must equal 100.
Emotions are shares of comments (0 to 1) expressing each emotion; several can apply to one comment.
stance_authorities is the crowd's attitude to police, government, courts or officials where the comments discuss them; "not_discussed" otherwise.
Raise a flag only with clear evidence in several comments:
- mob_justice: calls to beat, lynch or punish someone outside the law.
- violent_threats: threats of violence against a person or group.
- communal_hostility: hostility against a religious or ethnic community.
- hate_speech: dehumanising language about a protected group.
- misinformation: an unverified claim widely repeated as fact.
- doxxing: sharing or demanding someone's address, phone or family details.
- coordinated_activity: many near-identical comments suggesting an organised campaign.
topic_type "crime_safety" covers crime, policing, accidents and public safety; set crime_category for it when one fits.

Return JSON conforming to the provided schema. Return nothing else."""

RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "topic": {"type": "string", "description": "Neutral English label for what the video is about, max 80 characters."},
        "topic_type": {"type": "string", "enum": list(PULSE_TOPIC_TYPES)},
        "crime_category": {"type": "string", "enum": list(CRIME_CATEGORIES) + ["None"]},
        "positive_pct": {"type": "number"},
        "neutral_pct": {"type": "number"},
        "negative_pct": {"type": "number"},
        "emotions": {
            "type": "object",
            "properties": {name: {"type": "number"} for name in EMOTIONS},
        },
        "stance_authorities": {"type": "string", "enum": list(PULSE_STANCES)},
        "themes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Three to six short English phrases naming what commenters talk about.",
        },
        "flags": {"type": "array", "items": {"type": "string", "enum": list(PULSE_FLAGS)}},
        "summary": {
            "type": "string",
            "description": "Two to four English sentences on how the public is reacting and why.",
        },
        "key_views": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "view": {"type": "string"},
                    "share": {"type": "number"},
                },
                "required": ["view", "share"],
            },
            "description": "Up to four widely held positions, paraphrased, with share of comments (0 to 1).",
        },
    },
    "required": [
        "topic", "topic_type", "positive_pct", "neutral_pct", "negative_pct",
        "emotions", "stance_authorities", "themes", "flags", "summary", "key_views",
    ],
}

_MODEL: Any = None
_MODEL_INIT_FAILED = False


def _get_model() -> Any:
    global _MODEL, _MODEL_INIT_FAILED
    if _MODEL is not None:
        return _MODEL
    if _MODEL_INIT_FAILED or not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _MODEL = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 4096,
                "response_mime_type": "application/json",
                "response_schema": RESPONSE_SCHEMA,
            },
        )
        return _MODEL
    except Exception as exc:  # noqa: BLE001
        _MODEL_INIT_FAILED = True
        logger.warning("Gemini unavailable for Public Pulse (%s)", exc)
        return None


def build_prompt(title: str, channel: Optional[str], comments: Sequence[Dict[str, Any]]) -> str:
    """Video header plus comments, most liked first, within the size budget."""
    lines = [f"VIDEO TITLE: {title}", f"CHANNEL: {channel or 'unknown'}", "", "COMMENTS:"]
    used = sum(len(line) for line in lines)
    for comment in sorted(comments, key=lambda c: c.get("likes", 0), reverse=True):
        text = " ".join(str(comment.get("text", "")).split())[:MAX_COMMENT_CHARS]
        if not text:
            continue
        line = f"[{comment.get('likes', 0)}] {text}"
        if used + len(line) > MAX_PROMPT_CHARS:
            break
        lines.append(line)
        used += len(line) + 1
    return "\n".join(lines)


def _clamp01(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def normalise(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Coerce the model's answer into what the ingest endpoint accepts."""
    try:
        shares = [max(0.0, float(data.get(k, 0) or 0)) for k in ("positive_pct", "neutral_pct", "negative_pct")]
    except (TypeError, ValueError):
        return None
    total = sum(shares)
    if total <= 0 or not str(data.get("summary", "")).strip():
        return None
    # Models round to sums of 99 or 101; rescale so the bar always closes.
    positive, neutral, negative = (round(s * 100 / total, 2) for s in shares)
    topic_type = data.get("topic_type")
    crime = data.get("crime_category")
    return {
        "topic": str(data.get("topic") or "").strip()[:200] or "Untitled topic",
        "topic_type": topic_type if topic_type in PULSE_TOPIC_TYPES else "other",
        "crime_category": crime if crime in CRIME_CATEGORIES else None,
        "positive_pct": positive,
        "neutral_pct": neutral,
        "negative_pct": negative,
        "emotions": {
            name: round(_clamp01(share), 3)
            for name, share in (data.get("emotions") or {}).items()
            if name in EMOTIONS and _clamp01(share) > 0
        },
        "stance_authorities": data.get("stance_authorities") if data.get("stance_authorities") in PULSE_STANCES else "not_discussed",
        "themes": [str(t).strip()[:80] for t in (data.get("themes") or []) if str(t).strip()][:8],
        "flags": [f for f in dict.fromkeys(data.get("flags") or []) if f in PULSE_FLAGS],
        "summary": str(data["summary"]).strip()[:2000],
        "key_views": [
            {"view": str(v.get("view", "")).strip()[:300], "share": round(_clamp01(v.get("share")), 3)}
            for v in (data.get("key_views") or [])
            if isinstance(v, dict) and len(str(v.get("view", "")).strip()) >= 3
        ][:4],
    }


def analyse(title: str, channel: Optional[str], comments: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Analyse one video's comments; None if the model could not answer."""
    model = _get_model()
    if model is None or not comments:
        return None
    data, _reached = _attempt_gemini(model, build_prompt(title, channel, comments))
    if not data:
        return None
    return normalise(data)
