"""Asset-protection lexicon: the narrow gate for the historical backfill.

Why narrower than the live pipeline
-----------------------------------
The live collector casts wide because it serves a public crime map. The
backfill has the opposite problem: three years of six outlets is far more
material than the free Gemini quota can extract, so the only way to buy depth
in time is to spend breadth in subject.

This gate keeps incidents that threaten a *commercial or industrial asset* -
premises, goods in transit, cash, staff, or the ability to operate - and drops
everything else, including most interpersonal violence. A domestic homicide
matters enormously and is not an asset-protection event; it belongs to the
live pipeline, not this one.

Two-part test, same shape as the fraud gate: something that names a
commercial target, plus something that names a hostile act. Either alone
matches most of a newspaper.

Applied twice
-------------
1. To the URL slug, before anything is fetched. The English outlets put the
   headline in the path, so this discards the large majority of candidates
   for the cost of a regex.
2. To the extracted title and body, before the LLM is called - because the
   Bengali outlets use numeric ids and cannot be filtered at step 1, and
   because a slug is a lossy summary.
"""

from __future__ import annotations

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# What is being protected
# ---------------------------------------------------------------------------
ASSET_TERMS: Tuple[str, ...] = (
    # Premises and operations
    "factory", "factories", "garment", "rmg", "mill", "warehouse", "godown",
    "depot", "plant", "industrial", "epz", "export processing",
    "economic zone", "showroom", "outlet",
    "businessman", "businessmen", "trader", "merchant",
    "entrepreneur", "company", "enterprise",
    # Movement of value
    "cargo", "container", "consignment", "shipment", "truck", "lorry",
    "covered van", "goods vehicle", "transport", "cash-in-transit",
    "terminal", "customs", "supply chain", "logistics",
    # Financial institutions
    "atm", "mfs", "bkash", "nagad", "financial institution", "insurance",
    # People as assets. "official", "officer", "manager" and "executive" were
    # removed after review: in Bangladeshi reporting almost every story has an
    # official in it, so they admitted campus and political violence wholesale.
    "worker", "workers", "labour", "labor", "employee",
    # Bengali
    "কারখানা", "গার্মেন্টস", "পোশাক", "কারখানার", "গুদাম", "ডিপো",
    "শিল্প", "ইপিজেড", "দোকান", "মার্কেট", "বাজার", "ব্যবসায়ী",
    "প্রতিষ্ঠান", "কোম্পানি", "অফিস", "কার্যালয়",
    "কনটেইনার", "কার্গো", "ট্রাক", "কাভার্ড ভ্যান", "পরিবহন", "বন্দর",
    "ব্যাংক", "এটিএম", "শাখা", "শ্রমিক", "কর্মচারী", "কর্মকর্তা",
)

# ---------------------------------------------------------------------------
# What is being done to it
# ---------------------------------------------------------------------------
THREAT_TERMS: Tuple[str, ...] = (
    # Predatory acquisition. Stems, not inflections - see _compile.
    "dacoit", "loot", "burglar", "heist", "hijack", "snatch",
    "pilfer", "steal", "stole", "stolen", "theft", "thief", "thieves",
    "shoplift",
    # Coercion
    "extort", "chanda", "ransom", "abduct", "kidnap", "threat", "intimidat",
    "hostage",
    # Destruction and disorder
    "arson", "torch", "set on fire", "vandalis", "vandaliz", "ransack",
    "attack", "clash", "unrest", "blockade", "siege", "gherao", "lockout",
    "sabotage", "riot", "blaze", "explosion", "violent", "violence",
    "teargas", "tear gas", "shutdown", "strike",
    # Economic crime against the enterprise
    "fraud", "scam", "swindl", "defraud", "embezzle", "misappropriat",
    "forgery", "fake", "counterfeit", "adulterat", "launder",
    "smuggl", "tax evasion", "over-invoicing", "under-invoicing",
    "bribe", "corrupt",
    # Cyber
    "hack", "cyberattack", "cyber attack", "ransomware", "phishing",
    "data breach",
    # Occupation of land or premises
    "forcible occupation", "encroach", "evict",
    # Bengali
    "ডাকাতি", "ছিনতাই", "লুট", "চুরি", "সিঁধ", "ডাকাত",
    "চাঁদা", "চাঁদাবাজি", "মুক্তিপণ", "অপহরণ", "হুমকি",
    "অগ্নিসংযোগ", "আগুন", "ভাঙচুর", "হামলা", "সংঘর্ষ", "অবরোধ",
    "ঘেরাও", "বিক্ষোভ", "নাশকতা",
    "প্রতারণা", "জালিয়াতি", "আত্মসাৎ", "মানি লন্ডারিং", "চোরাচালান",
    "ভেজাল", "নকল", "কর ফাঁকি",
    "হ্যাক", "সাইবার", "র‍্যানসমওয়্যার",
    "দখল", "জবরদখল", "উচ্ছেদ",
)

# ---------------------------------------------------------------------------
# Noise that trips both lists without describing an incident
#
# Business desks are full of "market attack", "bank fraud investigation
# report", "garment export growth" and opinion columns. These are the
# recurring false positives observed while tuning the gate.
# ---------------------------------------------------------------------------
EXCLUDE_TERMS: Tuple[str, ...] = (
    "share price", "stock index", "dse turnover", "index rises", "index falls",
    "gdp", "inflation rate", "remittance inflow", "export earnings",
    "trade deficit", "budget allocation", "monetary policy", "interest rate",
    "seminar", "workshop", "webinar", "mou signed", "agreement signed",
    "opinion", "editorial", "column", "book review", "obituary",
    "world cup", "match", "innings", "wicket", "box office", "trailer",
    "covid", "coronavirus", "vaccine", "dengue", "pandemic",
)

def _compile(terms: Tuple[str, ...], exact: Tuple[str, ...] = ()) -> re.Pattern[str]:
    """Match each term as a word *stem*, allowing any suffix.

    The first draft of this module listed inflected forms as plain
    substrings - "robbed", "looted" - and consequently matched neither
    "robbers" nor "loot". Every threat term failed silently and the gate
    rejected every candidate, including a garment factory robbery.

    So: anchor at a word start and allow the word to continue, which covers
    rob/robbed/robbery/robbers and extort/extortion from one entry. The
    leading lookbehind keeps "port" out of "report" while still matching
    "ports". Multi-word phrases are matched literally, since a stem rule
    makes no sense across a space.
    """
    parts: list[str] = []

    # Whole-word, optional plural only. Short nouns need this: an open suffix
    # let "office" match "officer" and "rob" match "Robi", the telecom
    # operator, which admitted campus and political violence into an
    # asset-protection gate. Both were found by auditing the first ten
    # extracted records, not by reading the regex.
    for term in exact:
        parts.append(r"(?<![^\W\d_])" + re.escape(term) + r"(?:s|es)?(?![^\W\d_])")

    for term in terms:
        escaped = re.escape(term)
        if " " in term or "-" in term:
            parts.append(escaped)
        else:
            parts.append(rf"(?<![^\W\d_]){escaped}[^\W\d_]*")
    return re.compile("|".join(parts), re.IGNORECASE | re.UNICODE)


#: Short nouns whose suffixed forms mean something else entirely.
ASSET_EXACT: Tuple[str, ...] = (
    "office", "shop", "store", "market", "bank", "branch", "firm", "plant",
    "port", "booth", "staff", "business",
)

#: Same, on the threat side. "rob" as a stem matches "Robi".
THREAT_EXACT: Tuple[str, ...] = (
    "rob", "robbed", "robbery", "robberies", "robber", "fire", "fires",
    "grab", "grabbed", "grabbing", "breach", "breached", "forge", "forged",
)

_ASSET_RE = _compile(ASSET_TERMS, ASSET_EXACT)
_THREAT_RE = _compile(THREAT_TERMS, THREAT_EXACT)
_EXCLUDE_RE = _compile(EXCLUDE_TERMS)

# Slug separators, so "fake-bank-cheques" reads as "fake bank cheques".
_SLUG_SPLIT_RE = re.compile(r"[-_/+]+")
# Trailing numeric article id, which would otherwise glue onto a word.
_TRAILING_ID_RE = re.compile(r"\b\d{4,}\b")


def slug_to_text(url: str) -> str:
    """Turn a URL path into something the lexicons can match against.

    Returns an empty string for paths carrying no words - the Bengali
    outlets use bare numeric ids, and an empty result correctly means
    "cannot be judged from the URL" rather than "does not match".
    """
    path = url.split("://", 1)[-1]
    path = path.split("?", 1)[0].split("#", 1)[0]
    if "/" in path:
        path = path.split("/", 1)[1]
    else:
        return ""

    text = _SLUG_SPLIT_RE.sub(" ", path)
    text = _TRAILING_ID_RE.sub(" ", text)
    text = re.sub(r"\.(html?|php|amp)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()

    # A path of one or two short tokens is a section index, not an article.
    return text if len(text) >= 12 else ""


def is_asset_relevant(text: str) -> bool:
    """True when the text describes a hostile act against a commercial asset."""
    if not text:
        return False
    if _EXCLUDE_RE.search(text):
        return False
    return bool(_ASSET_RE.search(text) and _THREAT_RE.search(text))


def slug_is_candidate(url: str, *, strict: bool = False) -> bool:
    """Pre-fetch filter.

    ``strict`` decides what to do with a URL whose path carries no words.
    For an outlet that puts the headline in the path, a wordless slug is a
    section index or a legacy id and should be dropped. For the Bengali
    outlets, which address articles by bare numeric id, it is simply
    unjudgeable and must be kept for the post-fetch gate - dropping those
    would exclude the outlet wholesale.
    """
    text = slug_to_text(url)
    if not text:
        return not strict
    return is_asset_relevant(text)


def explain(text: str) -> dict[str, list[str]]:
    """Which terms fired. Used to audit the gate rather than trust it."""
    return {
        "asset": sorted({m.group(0).lower() for m in _ASSET_RE.finditer(text)}),
        "threat": sorted({m.group(0).lower() for m in _THREAT_RE.finditer(text)}),
        "excluded_by": sorted({m.group(0).lower() for m in _EXCLUDE_RE.finditer(text)}),
    }
