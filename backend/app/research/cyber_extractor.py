"""Model coding of articles against the cybercrime codebook.

Differences from the dashboard extractor, all deliberate
--------------------------------------------------------
* **No keyword fallback.** The dashboard degrades to heuristics when Gemini
  fails, which keeps a map populated. In a research corpus a silently
  heuristic row is a measurement from a different instrument, so here a
  failed call raises and the article is retried on the next run.
* **Every article gets a record**, including "not a cybercrime". The
  validation needs the model's negatives as much as its positives; the
  dashboard extractor returns None for both "not a crime" and "could not be
  geolocated", which cannot be told apart afterwards.
* **The model name is stored on every record.** ``GEMINI_MODEL`` is a floating
  alias (see HANDOFF.md §5); the methods section has to say what produced the
  data, and a mid-corpus model change has to be visible.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.config import settings
from app.parsers import llm_extractor
from app.parsers.llm_extractor import BST
from app.research.cyber_codebook import (
    SYSTEM_PROMPT,
    normalise_record,
    response_schema,
)

_MODEL: Any = None


class ModelUnavailable(RuntimeError):
    """Gemini gave no usable answer.

    ``reached_model`` is True when the model answered but the answer was empty
    or unparseable - a property of that article, worth recording. False means
    the call itself failed (quota, network, key), which will repeat for every
    article until fixed.
    """

    def __init__(self, reason: str, *, reached_model: bool = False) -> None:
        super().__init__(reason)
        self.reached_model = reached_model


def _get_model() -> Any:
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    if not settings.GEMINI_API_KEY:
        raise ModelUnavailable("GEMINI_API_KEY is not set")

    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    _MODEL = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
        generation_config={
            # Zero for coding: the same article should get the same answer.
            "temperature": 0.0,
            "max_output_tokens": 4096,
            "response_mime_type": "application/json",
            "response_schema": response_schema(),
        },
    )
    return _MODEL


def code_article(
    title: str, body: str, published_at: Optional[datetime]
) -> Dict[str, str]:
    """Code one article. Raises ModelUnavailable rather than guessing."""
    anchor = (
        published_at.astimezone(BST).strftime("%Y-%m-%d") if published_at else "unknown"
    )
    text = f"ARTICLE PUBLICATION DATE: {anchor}\n\n{title}\n\n{body}"

    # Shares pacing and retry/backoff with the dashboard extractor, so a
    # research run and a scrape on the same key respect one rate limit.
    parsed, reached_model = llm_extractor._attempt_gemini(_get_model(), text)
    if parsed is None:
        reason = "unparseable or empty response" if reached_model else "call failed"
        raise ModelUnavailable(reason, reached_model=reached_model)

    record = normalise_record(parsed)
    record["model"] = settings.GEMINI_MODEL
    record["coded_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return record


async def code_article_async(
    title: str, body: str, published_at: Optional[datetime]
) -> Dict[str, str]:
    return await asyncio.to_thread(code_article, title, body, published_at)


# ---------------------------------------------------------------------------
# CIRT advisories (RQ3)
#
# An advisory warns about a threat; it is not an incident, so under the
# article codebook every one would be is_cybercrime = "no" and carry no
# type. For the media-vs-CERT comparison only three things are needed: what
# kind of advisory it is, and - using the article codebook's own categories,
# so the two streams line up - which cybercrime type and platform it concerns.
# ---------------------------------------------------------------------------
ADVISORY_KINDS = (
    ("fraud_or_abuse_campaign", "A scam, fraud, phishing, sextortion or other "
                                "campaign aimed at people or organisations."),
    ("technical_vulnerability", "A software vulnerability, patch notice or "
                                "malware/attack technique aimed at systems."),
    ("other", "General guidance, events, or anything else."),
)

_ADVISORY_MODEL: Any = None


def _advisory_options(field_name: str) -> list[tuple[str, str]]:
    from app.research.cyber_codebook import FIELDS_BY_NAME

    return [
        option
        for option in FIELDS_BY_NAME[field_name].options or ()
        if option[0] != "none"
    ]


def _advisory_prompt() -> str:
    lines = [
        "You code threat advisories from BGD e-GOV CIRT, Bangladesh's national "
        "computer incident response team, for an academic study. Use only what "
        "the advisory states.",
        "",
        "- `advisory_kind`: what kind of advisory is this?",
    ]
    lines += [f"    - `{v}`: {d}" for v, d in ADVISORY_KINDS]
    for name, question in (
        ("cyber_type", "Which cybercrime type does the threat concern? Pick the main one."),
        ("platform", "Which platform or channel is mainly involved?"),
        ("victim_type", "Who is the threat aimed at?"),
    ):
        lines.append(f"- `{name}`: {question}")
        lines += [f"    - `{v}`: {d}" for v, d in _advisory_options(name)]
    lines += ["", "Return JSON conforming to the provided schema. Return nothing else."]
    return "\n".join(lines)


def _get_advisory_model() -> Any:
    global _ADVISORY_MODEL
    if _ADVISORY_MODEL is not None:
        return _ADVISORY_MODEL
    if not settings.GEMINI_API_KEY:
        raise ModelUnavailable("GEMINI_API_KEY is not set")

    import google.generativeai as genai

    schema = {
        "type": "object",
        "properties": {
            "advisory_kind": {"type": "string", "enum": [v for v, _ in ADVISORY_KINDS]},
            **{
                name: {"type": "string", "enum": [v for v, _ in _advisory_options(name)]}
                for name in ("cyber_type", "platform", "victim_type")
            },
        },
        "required": ["advisory_kind", "cyber_type", "platform", "victim_type"],
    }
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _ADVISORY_MODEL = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=_advisory_prompt(),
        generation_config={
            "temperature": 0.0,
            "max_output_tokens": 2048,
            "response_mime_type": "application/json",
            "response_schema": schema,
        },
    )
    return _ADVISORY_MODEL


def code_advisory(title: str, body: str) -> Dict[str, str]:
    """Code one CIRT advisory. Raises ModelUnavailable rather than guessing."""
    parsed, reached_model = llm_extractor._attempt_gemini(
        _get_advisory_model(), f"{title}\n\n{body}"
    )
    if parsed is None:
        reason = "unparseable or empty response" if reached_model else "call failed"
        raise ModelUnavailable(reason, reached_model=reached_model)

    record: Dict[str, str] = {}
    allowed = {"advisory_kind": [v for v, _ in ADVISORY_KINDS]}
    for name in ("cyber_type", "platform", "victim_type"):
        allowed[name] = [v for v, _ in _advisory_options(name)]
    for name, values in allowed.items():
        value = str(parsed.get(name) or "").strip().lower()
        record[name] = value if value in values else ""
    record["model"] = settings.GEMINI_MODEL
    return record


async def code_advisory_async(title: str, body: str) -> Dict[str, str]:
    return await asyncio.to_thread(code_advisory, title, body)
