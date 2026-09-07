"""Gemini Flash structured-extraction pipeline.

Takes raw article text or a social-media caption - English, Bengali or
Banglish - and returns a normalised :class:`ExtractedIncident` ready to POST
to ``/api/v1/ingest/batch``.

Design notes
------------
* Gemini is asked for **structured JSON output** via ``response_schema`` so we
  never have to regex a model's prose.
* The model is never trusted for geography. It reports a thana *name*; the
  authoritative lat/lon comes from ``app.utils.thana_coordinates``.
* The model is never trusted for source confidence either - that is a
  property of the platform, fixed by policy in ``SOURCE_CONFIDENCE``.
* If ``GEMINI_API_KEY`` is unset, or the API errors/quota-limits, we fall
  back to a deterministic keyword classifier. It is weaker, but the pipeline
  keeps producing rows instead of dropping a scrape window on the floor.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.db.models import CRIME_CATEGORIES, SOURCE_CONFIDENCE
from app.utils.thana_coordinates import find_place_in_text, resolve_thana

logger = logging.getLogger(__name__)

# Bangladesh Standard Time - every human-facing date in this project is BST.
BST = timezone(timedelta(hours=6))

# Lazily-initialised Gemini client; None until the first successful call.
_MODEL: Any = None
_MODEL_INIT_FAILED = False


# ===========================================================================
# Output contract
# ===========================================================================
class ExtractedIncident(BaseModel):
    """One incident, fully normalised and ready for ingestion."""

    title: str
    narrative: str
    crime_category: str
    penal_code_tags: List[str] = Field(default_factory=list)
    incident_date: datetime
    thana_name: str
    district: str = "Dhaka"
    latitude: float
    longitude: float
    fir_or_gd: Optional[str] = None
    source_platform: str
    source_url: str
    source_confidence: int
    raw_content_hash: str

    # Provenance and corroboration, set by the collector and by run_scrapers.
    source_handle: Optional[str] = None
    verification_level: str = "single_source"

    # Not persisted; used by run_scrapers.py to drop low-quality rows.
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    is_crime_report: bool = True
    geocode_fallback: bool = False

    @field_validator("crime_category")
    @classmethod
    def _known_category(cls, value: str) -> str:
        normalised = value.strip().title()
        return normalised if normalised in CRIME_CATEGORIES else "Other"

    def to_ingest_payload(self) -> Dict[str, Any]:
        """Shape accepted by POST /api/v1/ingest/batch."""
        return {
            "title": self.title,
            "narrative": self.narrative,
            "crime_category": self.crime_category,
            "penal_code_tags": self.penal_code_tags or None,
            "incident_date": self.incident_date.isoformat(),
            "thana_name": self.thana_name,
            "district": self.district,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "fir_or_gd": self.fir_or_gd,
            "source_platform": self.source_platform,
            "source_url": self.source_url,
            "source_confidence": self.source_confidence,
            "raw_content_hash": self.raw_content_hash,
            "source_handle": self.source_handle,
            "verification_level": self.verification_level,
        }


# ===========================================================================
# Hashing - the idempotency key
# ===========================================================================
def _normalise_for_hash(text: str) -> str:
    """Collapse case, punctuation and whitespace so trivial edits re-hash equal."""
    lowered = text.strip().lower()
    stripped = re.sub(r"[^\w\sঀ-৿]", "", lowered)
    return re.sub(r"\s+", " ", stripped).strip()


def compute_content_hash(
    incident_date: datetime, thana_name: str, title: str
) -> str:
    """SHA-256 over (calendar date in BST | thana | title).

    The date is truncated to a calendar day deliberately: outlets publish the
    same incident with times that drift by hours, but almost never across the
    day boundary. Including a full timestamp would defeat deduplication.
    """
    if incident_date.tzinfo is None:
        incident_date = incident_date.replace(tzinfo=BST)
    day = incident_date.astimezone(BST).strftime("%Y-%m-%d")
    payload = f"{day}|{_normalise_for_hash(thana_name)}|{_normalise_for_hash(title)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# ===========================================================================
# Gemini plumbing
# ===========================================================================
RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "is_crime_report": {
            "type": "boolean",
            "description": (
                "True only if the text reports a specific criminal incident "
                "that occurred in Bangladesh. False for opinion pieces, "
                "policy coverage, court verdicts on old cases, sports, or "
                "crime reported outside Bangladesh."
            ),
        },
        "title": {
            "type": "string",
            "description": "Neutral English headline, max 120 characters.",
        },
        "summary": {
            "type": "string",
            "description": (
                "Two to four factual English sentences. Report only what the "
                "source states. Do not name victims, suspects, or minors."
            ),
        },
        "crime_category": {
            "type": "string",
            "enum": list(CRIME_CATEGORIES),
        },
        "incident_date": {
            "type": "string",
            "description": (
                "Date the incident occurred, ISO-8601 (YYYY-MM-DD), "
                "Bangladesh time. The article's publication date is given at "
                "the top of the input: the incident occurred on or shortly "
                "before it. When the text gives a day and month but no year, "
                "use the publication date's year - never a year from your own "
                "prior knowledge. When no date is stated at all, return the "
                "publication date."
            ),
        },
        "thana_name": {
            "type": "string",
            "description": (
                "Police thana with jurisdiction, English spelling, e.g. "
                "'Mirpur Model', 'Gulshan', 'Jatrabari'. Empty string if the "
                "text gives no recoverable location."
            ),
        },
        "district": {"type": "string"},
        "penal_code_tags": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Bangladeshi statutes explicitly cited or unambiguously "
                "implied, e.g. 'Penal Code 302', 'Penal Code 392', "
                "'Narcotics Control Act 2018', 'Cyber Security Act 2023', "
                "'Nari-o-Shishu Nirjatan Daman Ain 2000'. Empty if unclear."
            ),
        },
        "fir_or_gd": {
            "type": "string",
            "description": "FIR/GD number if quoted verbatim, else empty string.",
        },
        "confidence_score": {
            "type": "number",
            "description": (
                "0.0-1.0 self-assessed certainty that the extracted fields "
                "match the source text."
            ),
        },
    },
    "required": [
        "is_crime_report",
        "title",
        "summary",
        "crime_category",
        "incident_date",
        "thana_name",
        "confidence_score",
    ],
}


SYSTEM_PROMPT = """You are an OSINT analyst structuring Bangladeshi crime reporting.

Input is raw text from a news article or a public social-media post. It may be
in English, Bengali (Bangla script), or Banglish (Bengali written in Latin
letters). Read all three fluently.

Rules:
1. Extract only what the text actually states. Never infer, embellish, or fill
   a gap with a plausible guess. If a field is unknown, return an empty string
   or an empty array.
2. Write `title` and `summary` in neutral English. Do not reproduce the
   source's sensational framing.
3. Redact identity: no victim names, no accused names, no minors, no exact
   home addresses, no phone numbers, no national ID numbers. Refer to people
   by role ("a shopkeeper", "a rideshare driver").
4. Treat every report as an allegation. Use "reportedly" / "police said"
   framing rather than asserting guilt.
5. `thana_name` must be the police station area, not a neighbourhood, road, or
   market. Map landmarks to their thana where the text makes it unambiguous.
6. `crime_category` must be exactly one of the enum values. Pick the most
   serious offence described. Mob violence and beatings are Assault; abduction
   for ransom is Extortion; mugging and snatching are Robbery; pickpocketing
   and burglary are Theft; online fraud is Cybercrime; offline financial
   deception is Fraud.
7. If the text is not a specific criminal incident in Bangladesh, set
   `is_crime_report` to false and leave the other fields minimal.

Return JSON conforming to the provided schema. Return nothing else."""


def _get_model() -> Any:
    """Initialise the Gemini client once; return None if unavailable."""
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
                "temperature": 0.1,
                "top_p": 0.85,
                # Current Flash models spend output tokens on internal
                # reasoning before emitting the JSON, so a 1024 ceiling can
                # truncate the structured payload mid-object.
                "max_output_tokens": 4096,
                "response_mime_type": "application/json",
                "response_schema": RESPONSE_SCHEMA,
            },
        )
        logger.info("Gemini model initialised: %s", settings.GEMINI_MODEL)
        return _MODEL
    except Exception as exc:  # noqa: BLE001 - never let init kill the run
        _MODEL_INIT_FAILED = True
        logger.warning("Gemini unavailable (%s); using heuristic extractor.", exc)
        return None


# Free-tier Gemini enforces a low requests-per-minute ceiling, and the shared
# capacity behind `-latest` aliases returns 503 under load. A scrape window
# fires 30-60 calls back to back, so without pacing and retries a large share
# of articles would silently drop to the keyword path and be discarded by the
# confidence gate - the run would look like a quiet news day.
_MIN_SECONDS_BETWEEN_CALLS = 1.5
_TRANSIENT_MARKERS = ("429", "503", "quota", "rate limit", "overloaded",
                      "high demand", "unavailable", "resource_exhausted")
_MAX_ATTEMPTS = 4
_BACKOFF_SECONDS = (4, 12, 30)

_last_call_at = 0.0


def _is_transient(message: str) -> bool:
    lowered = message.lower()
    return any(marker in lowered for marker in _TRANSIENT_MARKERS)


def _parse_json_response(text: str) -> Optional[Dict[str, Any]]:
    """Parse the model's JSON, tolerating fences or surrounding prose."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Some models wrap structured output in ```json fences despite the
    # response_mime_type, and reasoning models can emit a preamble.
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    return None


def _call_gemini(raw_text: str) -> Optional[Dict[str, Any]]:
    """One Gemini extraction, paced and retried through transient failures."""
    global _last_call_at

    model = _get_model()
    if model is None:
        return None

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        # Pace calls so a burst does not trip the per-minute quota.
        elapsed = time.monotonic() - _last_call_at
        if elapsed < _MIN_SECONDS_BETWEEN_CALLS:
            time.sleep(_MIN_SECONDS_BETWEEN_CALLS - elapsed)

        try:
            _last_call_at = time.monotonic()
            response = model.generate_content(raw_text[:24000])
            text = (response.text or "").strip()

            if not text:
                logger.warning(
                    "Gemini returned an empty response (finish_reason may be "
                    "MAX_TOKENS or a safety block); falling back."
                )
                return None

            parsed = _parse_json_response(text)
            if parsed is not None:
                return parsed

            logger.warning(
                "Gemini returned unparseable output (%d chars); falling back.",
                len(text),
            )
            return None

        except Exception as exc:  # noqa: BLE001 - quota, network, safety blocks
            message = str(exc)

            # A retired or misspelled model 404s on every single call, so the
            # whole run silently degrades to keyword extraction and the
            # confidence gate then drops everything. That is indistinguishable
            # from "no news today" in the logs unless called out at ERROR.
            if "404" in message or "no longer available" in message.lower():
                logger.error(
                    "Gemini model %r is unavailable - every extraction this "
                    "run will fall back to keyword classification and will "
                    "almost certainly be rejected by the confidence gate. Set "
                    "GEMINI_MODEL to a current model. Detail: %s",
                    settings.GEMINI_MODEL,
                    message,
                )
                return None

            if _is_transient(message) and attempt < _MAX_ATTEMPTS:
                wait = _BACKOFF_SECONDS[attempt - 1]
                logger.info(
                    "Gemini transient failure (attempt %d/%d): %s - retrying "
                    "in %ds",
                    attempt,
                    _MAX_ATTEMPTS,
                    message[:120],
                    wait,
                )
                time.sleep(wait)
                continue

            logger.warning("Gemini call failed (%s); falling back.", message[:200])
            return None

    return None


# ===========================================================================
# Heuristic fallback
# ===========================================================================
# Ordered most-severe first: the first matching bucket wins, mirroring the
# "pick the most serious offence" instruction given to the model.
_CATEGORY_KEYWORDS: List[tuple[str, tuple[str, ...]]] = [
    ("Homicide", (
        "murder", "killed", "stabbed to death", "shot dead", "homicide",
        "body recovered", "beaten to death", "লাশ", "খুন", "হত্যা", "নিহত",
    )),
    ("Robbery", (
        "robbery", "robbed", "mugging", "mugger", "snatch", "dacoity",
        "gunpoint", "knifepoint", "ছিনতাই", "ডাকাতি", "দস্যুতা",
    )),
    ("Extortion", (
        "extortion", "extort", "ransom", "abduct", "kidnap", "chanda",
        "চাঁদাবাজি", "মুক্তিপণ", "অপহরণ",
    )),
    ("Narcotics", (
        "yaba", "narcotic", "drug", "heroin", "cannabis", "ganja", "phensedyl",
        "ইয়াবা", "মাদক", "গাঁজা", "হেরোইন",
    )),
    ("Cybercrime", (
        "cyber", "hacked", "hacking", "online fraud", "digital security act",
        "cyber security act", "phishing", "deepfake", "blackmail online",
        "সাইবার", "হ্যাক", "অনলাইন প্রতারণা",
    )),
    ("Assault", (
        "assault", "attacked", "beaten", "clash", "injured", "acid attack",
        "mob", "হামলা", "মারধর", "সংঘর্ষ", "আহত",
    )),
    ("Fraud", (
        "fraud", "forgery", "embezzle", "cheating", "scam", "counterfeit",
        "প্রতারণা", "জালিয়াতি", "আত্মসাৎ",
    )),
    ("Theft", (
        "theft", "stolen", "burglary", "shoplift", "pickpocket", "looted",
        "চুরি", "চোর",
    )),
]

# Statute inference from the same keyword evidence.
_PENAL_CODE_BY_CATEGORY: Dict[str, List[str]] = {
    "Homicide": ["Penal Code 302"],
    "Robbery": ["Penal Code 392"],
    "Extortion": ["Penal Code 384"],
    "Assault": ["Penal Code 323"],
    "Theft": ["Penal Code 379"],
    "Fraud": ["Penal Code 420"],
    "Narcotics": ["Narcotics Control Act 2018"],
    "Cybercrime": ["Cyber Security Act 2023"],
}

# The capture group requires at least one digit via lookahead, so prose like
# "a case was filed" cannot masquerade as a case number.
_FIR_PATTERN = re.compile(
    r"\b(?:FIR|G\.?D\.?|General Diary|Case)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*"
    r"((?=[A-Za-z0-9/\-]*\d)[A-Za-z0-9/\-]{2,30})",
    re.IGNORECASE,
)

_DATE_PATTERNS = (
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
    re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b"),
)


# ---------------------------------------------------------------------------
# Redaction
#
# The Gemini prompt instructs the model to strip identities, but an
# instruction is not an enforcement mechanism and the heuristic fallback has
# no model at all. These patterns run over *every* narrative and title,
# whichever path produced them, so the published de-identification promise
# does not depend on a model choosing to honour it.
# ---------------------------------------------------------------------------
# Every pattern is anchored with digit lookarounds so it cannot match a
# fragment inside a longer number, and none of them consume the surrounding
# whitespace - otherwise redaction silently welds adjacent words together.
_REDACTIONS: tuple[tuple[re.Pattern[str], str], ...] = (
    # Email addresses.
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b"), "[email removed]"),
    # National ID (10, 13 or 17 digits). Checked before phone numbers so a
    # 13-digit NID is not partly consumed by the mobile pattern.
    (re.compile(r"(?<!\d)(?:\d{17}|\d{13}|\d{10})(?!\d)"), "[id removed]"),
    # Passport-style identifiers.
    (re.compile(r"\b[A-Z]{2}\d{7}\b"), "[id removed]"),
)

# Bangladeshi mobile numbers are 01XXXXXXXXX - 11 digits - but reporting
# breaks them with spaces and hyphens in no consistent position, and may
# prefix +88. Rather than trying to encode every separator placement in the
# pattern, match a loose candidate and confirm the digit count in the
# replacement, so ordinary figures ("Tk 38,00,000") are never swallowed.
_PHONE_CANDIDATE = re.compile(r"(?<![\d+])(?:\+?88[ -]?)?01[\d -]{9,13}")


def _redact_phone(match: re.Match[str]) -> str:
    raw = match.group(0)
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("88"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("01"):
        # Preserve any trailing separator the loose pattern swept up.
        trailing = len(raw) - len(raw.rstrip(" -"))
        return "[number removed]" + (raw[-trailing:] if trailing else "")
    return raw


def redact(text: str) -> str:
    """Remove contact details and identifiers from free text.

    Note the limit: this removes *identifiers*, not names. No regex can
    reliably strip personal names from Bengali and English prose, which is
    why the heuristic path publishes no article-derived narrative at all.
    """
    if not text:
        return text
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    return _PHONE_CANDIDATE.sub(_redact_phone, text)


def _heuristic_extract(raw_text: str) -> Dict[str, Any]:
    """Deterministic keyword extraction used when Gemini is unavailable."""
    lowered = raw_text.lower()

    category = "Other"
    for candidate, keywords in _CATEGORY_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            category = candidate
            break

    # Title: first sentence-ish chunk, capped.
    first_line = next(
        (line.strip() for line in raw_text.splitlines() if line.strip()), ""
    )
    title = (first_line[:117] + "...") if len(first_line) > 120 else first_line
    if not title:
        title = f"Reported {category.lower()} incident"

    # Location: let the gazetteer scan the text for any thana it recognises.
    thana_guess = ""
    for token_window in re.findall(r"[\wঀ-৿][\wঀ-৿\s\-]{2,40}", raw_text):
        location = resolve_thana(token_window, fallback=False)
        if location:
            thana_guess = location["thana_name"]
            break

    fir_match = _FIR_PATTERN.search(raw_text)

    incident_date = ""
    for pattern in _DATE_PATTERNS:
        match = pattern.search(raw_text)
        if match:
            groups = match.groups()
            incident_date = (
                f"{groups[0]}-{groups[1]}-{groups[2]}"
                if len(groups[0]) == 4
                else f"{groups[2]}-{int(groups[1]):02d}-{int(groups[0]):02d}"
            )
            break

    # Deliberately NOT the article text. Reproducing raw copy would republish
    # the names, ages and addresses of accused and victims that Bangladeshi
    # crime reporting routinely prints - the exact thing the Gemini prompt is
    # told to strip. With no model to do that stripping, the only safe
    # narrative this path can emit is one it composes itself.
    location_phrase = f" in {thana_guess}" if thana_guess else ""
    summary = (
        f"Reported {category.lower()} incident{location_phrase}, classified "
        f"automatically from public reporting without model-assisted "
        f"extraction. No summary is published for this record: see the linked "
        f"source for details."
    )

    return {
        "is_crime_report": category != "Other",
        "title": title,
        "summary": summary,
        "crime_category": category,
        "incident_date": incident_date,
        "thana_name": thana_guess,
        "district": "Dhaka",
        "penal_code_tags": _PENAL_CODE_BY_CATEGORY.get(category, []),
        "fir_or_gd": fir_match.group(1) if fir_match else "",
        # Deliberately low: the caller can filter heuristic rows out entirely.
        "confidence_score": 0.35 if category != "Other" else 0.1,
    }


# ===========================================================================
# Date parsing
# ===========================================================================
# How far before its publication date an incident may plausibly be dated.
# Crime reporting occasionally covers an older case, but a gap wider than
# this in a freshly published article means the year was invented.
MAX_DAYS_BEFORE_PUBLICATION = 45


def _parse_incident_date(value: str, published_at: Optional[datetime]) -> datetime:
    """Parse the model's date, anchored to the article's publication date.

    Language models do not know today's date. Given "5 September" with no
    year, they fill the year in from their own prior - which in practice
    means the year their training data ended. Observed in production: every
    article published in September 2026 came back dated 2024 or 2025, and the
    downstream age filter then discarded the entire run.

    So the publication date is treated as authoritative: anything implausibly
    far from it is replaced rather than trusted.
    """
    fallback = None
    if published_at is not None:
        fallback = (
            published_at
            if published_at.tzinfo
            else published_at.replace(tzinfo=BST)
        )

    if value:
        cleaned = value.strip().replace("Z", "+00:00")
        for attempt in (cleaned, cleaned[:10]):
            try:
                parsed = datetime.fromisoformat(attempt)
            except ValueError:
                continue

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=BST)

            # Never accept a date in the future.
            if parsed > datetime.now(timezone.utc) + timedelta(days=1):
                break

            if fallback is None:
                return parsed

            # Published articles describe incidents that already happened, so
            # a date after publication is wrong; so is one long before it.
            if parsed > fallback + timedelta(days=1):
                logger.info(
                    "Extracted date %s postdates publication %s; using "
                    "publication date.",
                    parsed.date(),
                    fallback.date(),
                )
                return fallback

            if (fallback - parsed).days > MAX_DAYS_BEFORE_PUBLICATION:
                logger.info(
                    "Extracted date %s is %d days before publication %s - "
                    "the year was almost certainly invented; using "
                    "publication date.",
                    parsed.date(),
                    (fallback - parsed).days,
                    fallback.date(),
                )
                return fallback

            return parsed

    if fallback is not None:
        return fallback
    return datetime.now(BST)


# ===========================================================================
# Public entry points
# ===========================================================================
def extract_crime_entities(
    raw_text: str,
    source_type: str,
    *,
    source_url: str = "",
    published_at: Optional[datetime] = None,
) -> Optional[ExtractedIncident]:
    """Turn raw text into a normalised incident, or ``None`` if not a crime report.

    ``source_type`` is one of ``news_portal``, ``facebook_public`` or
    ``police_report``; it fixes ``source_confidence`` by policy.
    """
    if not raw_text or len(raw_text.strip()) < 40:
        return None

    if source_type not in SOURCE_CONFIDENCE:
        raise ValueError(
            f"Unknown source_type {source_type!r}; "
            f"expected one of {sorted(SOURCE_CONFIDENCE)}"
        )

    # The model has no idea what today's date is, so state it explicitly.
    # Without this anchor it resolves a bare "5 September" using its training
    # cutoff year and every record lands one to two years in the past.
    if published_at is not None:
        anchor = published_at.astimezone(BST).strftime("%Y-%m-%d")
        prompt_text = (
            f"ARTICLE PUBLICATION DATE: {anchor} (Bangladesh time).\n"
            f"Resolve any incomplete date in the text against this date.\n\n"
            f"{raw_text}"
        )
    else:
        today = datetime.now(BST).strftime("%Y-%m-%d")
        prompt_text = (
            f"TODAY'S DATE: {today} (Bangladesh time).\n"
            f"Resolve any incomplete date in the text against this date.\n\n"
            f"{raw_text}"
        )

    data = _call_gemini(prompt_text)
    used_llm = data is not None
    if data is None:
        # The heuristic path reads the original text; the date banner would
        # only confuse its keyword and location scanning.
        data = _heuristic_extract(raw_text)

    if not data.get("is_crime_report", False):
        return None

    # Redaction is applied to both paths: the model is instructed to strip
    # identifiers, but this pass is what actually guarantees it.
    title = redact((data.get("title") or "").strip())
    summary = redact((data.get("summary") or "").strip())
    if not title or not summary:
        return None

    incident_date = _parse_incident_date(
        str(data.get("incident_date") or ""), published_at
    )

    # An incident that cannot be placed is dropped, not pinned to a default.
    # Guessing a location is worse than omitting the record: it puts a
    # Bagerhat murder on a Dhaka street and inflates whichever thana is used
    # as the default into a fake hotspot.
    reported_place = (data.get("thana_name") or "").strip()
    location = resolve_thana(reported_place)

    if location is None:
        # The model often reports an upazila the gazetteer does not carry
        # ("Kachua"), or a bare "Sadar", while the district is stated plainly
        # in the headline. Recover from the text before giving up.
        location = find_place_in_text(f"{title}. {summary}")
        if location is not None:
            logger.info(
                "Location %r unknown; recovered %s from the text.",
                reported_place,
                location["thana_name"],
            )

    if location is None:
        logger.info(
            "Dropping incident with unresolvable location %r: %s",
            reported_place,
            title[:70],
        )
        return None

    # True when the match landed on a district centroid rather than a named
    # thana, i.e. the position is accurate to roughly a district, not a
    # neighbourhood.
    geocode_fallback = location["thana_name"] == location["district"]

    fir = (data.get("fir_or_gd") or "").strip() or None

    tags = [
        tag.strip()
        for tag in (data.get("penal_code_tags") or [])
        if isinstance(tag, str) and tag.strip()
    ]

    confidence = float(data.get("confidence_score") or 0.0)
    confidence = min(max(confidence, 0.0), 1.0)

    return ExtractedIncident(
        title=title[:300],
        narrative=summary,
        crime_category=data.get("crime_category") or "Other",
        penal_code_tags=tags,
        incident_date=incident_date,
        thana_name=location["thana_name"],
        district=location["district"],
        latitude=location["lat"],
        longitude=location["lon"],
        fir_or_gd=fir[:100] if fir else None,
        source_platform=source_type,
        source_url=source_url,
        source_confidence=SOURCE_CONFIDENCE[source_type],
        raw_content_hash=compute_content_hash(
            incident_date, location["thana_name"], title
        ),
        extraction_confidence=confidence if used_llm else min(confidence, 0.4),
        is_crime_report=True,
        geocode_fallback=geocode_fallback,
    )


async def extract_crime_entities_async(
    raw_text: str,
    source_type: str,
    *,
    source_url: str = "",
    published_at: Optional[datetime] = None,
) -> Optional[ExtractedIncident]:
    """Async wrapper - google-generativeai is blocking, so run it off-loop."""
    return await asyncio.to_thread(
        extract_crime_entities,
        raw_text,
        source_type,
        source_url=source_url,
        published_at=published_at,
    )


__all__ = [
    "ExtractedIncident",
    "extract_crime_entities",
    "extract_crime_entities_async",
    "compute_content_hash",
    "BST",
]
