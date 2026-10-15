"""Cybercrime lexicon: the gate for the cybercrime research backfill.

Why a separate gate
-------------------
The asset gate keeps hostile acts against commercial targets and drops almost
all cybercrime against individuals - a student sextorted over Messenger, a
farmer emptied by a fake bKash agent call. Those are exactly the incidents the
cybercrime study (``research/cybercrime-paper/PLAN.md``) is about, so the
backfill needs its own gate rather than a widened asset one.

Two ways in
-----------
1. A **strong** term on its own: words that only appear in cybercrime
   reporting - hacking, phishing, sextortion, ransomware, the Cyber Security
   Act. One is enough.
2. A **channel** term plus a **harm** term: "Facebook" or "bKash" alone is a
   business or culture story, "fraud" or "blackmail" alone is mostly offline
   crime; together they are the bulk of Bangladeshi online fraud and
   harassment reporting.

Like the asset gate this is applied to the URL slug before fetching, then to
the headline and lede before the model is called. It is deliberately
recall-leaning: the LLM still decides whether an article is a crime report at
all, and the hand-coded validation sample measures how much noise got through.
"""

from __future__ import annotations

import re
from typing import Tuple

from app.parsers.asset_lexicon import _compile, slug_to_text

# ---------------------------------------------------------------------------
# Sufficient on their own
# ---------------------------------------------------------------------------
STRONG_TERMS: Tuple[str, ...] = (
    "cybercrim", "cyber crim", "cyber-crim", "cyberattack", "cyber attack",
    "cyber-attack", "cyber fraud", "cyber security act", "digital security act",
    "cyber tribunal", "cyber police", "cyber unit", "cyber harass",
    "cyberbully", "cyber bully",
    "hack", "phishing", "ransomware", "malware", "spyware", "trojan",
    "sextort", "deepfake", "deep fake", "revenge porn", "data breach",
    "data leak", "identity theft", "ddos", "defac",
    "online fraud", "online scam", "online gambling", "online betting",
    "e-commerce fraud", "ecommerce fraud", "mfs fraud", "otp fraud",
    "sim swap", "fake page", "fake account", "fake id", "fake profile",
    "objectionable photo", "objectionable video", "obscene video",
    "obscene photo", "private photo", "private video",
    # Bengali
    "সাইবার", "হ্যাক", "ফিশিং", "র‍্যানসমওয়্যার", "ম্যালওয়্যার",
    "ডিজিটাল নিরাপত্তা আইন", "ডিজিটাল নিরাপত্তা আইনে",
    "সাইবার নিরাপত্তা আইন", "সাইবার ট্রাইব্যুনাল",
    "অনলাইন প্রতারণা", "অনলাইনে প্রতারণা", "অনলাইন জুয়া", "অনলাইনে জুয়া",
    "ডিপফেক", "আপত্তিকর ছবি", "আপত্তিকর ভিডিও", "অশ্লীল ভিডিও",
    "অশ্লীল ছবি", "ভুয়া আইডি", "ফেক আইডি", "ভুয়া পেজ", "তথ্য ফাঁস",
    "ওটিপি", "সিম ক্লোন",
)

# ---------------------------------------------------------------------------
# Online channels: need a harm term alongside
# ---------------------------------------------------------------------------
CHANNEL_TERMS: Tuple[str, ...] = (
    "online", "internet", "digital", "facebook", "messenger", "whatsapp",
    "imo", "telegram", "tiktok", "youtube", "instagram", "social media",
    "website", "app", "apps", "e-commerce", "ecommerce", "f-commerce",
    "bkash", "nagad", "rocket", "upay", "mfs", "mobile banking",
    "mobile financial", "card", "credit card", "debit card", "atm card",
    "crypto", "bitcoin", "email", "sms", "otp", "sim", "password",
    "account", "server", "computer", "smartphone",
    # Bengali
    "অনলাইন", "অনলাইনে", "ইন্টারনেট", "ডিজিটাল", "ফেসবুক", "ফেসবুকে",
    "মেসেঞ্জার", "হোয়াটসঅ্যাপ", "ইমো", "টেলিগ্রাম", "টিকটক", "ইউটিউব",
    "সামাজিক যোগাযোগমাধ্যম", "সামাজিক যোগাযোগ মাধ্যম", "ওয়েবসাইট", "অ্যাপ",
    "বিকাশ", "বিকাশে", "নগদ", "নগদে", "রকেট", "মোবাইল ব্যাংকিং",
    "ক্রেডিট কার্ড", "এটিএম কার্ড", "ক্রিপ্টো", "বিটকয়েন", "ইমেইল",
    "মোবাইল ফোন", "অ্যাকাউন্ট", "পাসওয়ার্ড",
)

HARM_TERMS: Tuple[str, ...] = (
    "fraud", "scam", "swindl", "cheat", "defraud", "dupe", "duped",
    "blackmail", "extort", "harass", "stalk", "threat", "defam",
    "impersonat", "fake", "forg", "steal", "stole", "stolen", "theft",
    "embezzle", "launder", "gambl", "betting", "porn", "obscene",
    "leak", "breach", "arrest", "held", "detain", "case filed",
    "rumour", "rumor", "propaganda",
    # Bengali
    "প্রতারণা", "প্রতারক", "প্রতারকচক্র", "প্রতারক চক্র", "জালিয়াতি",
    "ব্ল্যাকমেইল", "ব্ল্যাকমেল", "চাঁদা", "হয়রানি", "হুমকি", "মানহানি",
    "ভুয়া", "চুরি", "আত্মসাৎ", "জুয়া", "পর্নো", "অশ্লীল", "ফাঁস",
    "গ্রেপ্তার", "গ্রেফতার", "আটক", "মামলা", "গুজব", "অপপ্রচার",
)

# ---------------------------------------------------------------------------
# Recurring non-incidents: policy debate, events, explainers
# ---------------------------------------------------------------------------
EXCLUDE_TERMS: Tuple[str, ...] = (
    "seminar", "workshop", "webinar", "summit", "training",
    "awareness campaign", "olympiad", "hackathon",
    "opinion", "editorial", "column", "book review", "obituary", "explainer",
    "how to protect", "tips", "world cup", "match", "innings", "wicket",
    "box office", "trailer", "share price", "stock index",
    "সেমিনার", "কর্মশালা", "ওয়েবিনার", "সম্মেলন", "প্রশিক্ষণ", "হ্যাকাথন",
    "সচেতনতা", "মতামত", "সম্পাদকীয়",
)

#: Short channel words whose suffixed forms are unrelated ("app" in "apply",
#: "appeal", "approve"; "sim" in "similar"; "card" in "cardinal"; "imo" in
#: "imon").
CHANNEL_EXACT: Tuple[str, ...] = ("app", "sim", "card", "imo", "sms", "otp", "mfs")

#: "hack" must not match "hackathon"; handled by the exclusion list instead
#: of an exact form, because "hacker", "hacked" and "hacking" all matter.
STRONG_EXACT: Tuple[str, ...] = ("ddos",)

_STRONG_RE = _compile(STRONG_TERMS, STRONG_EXACT)
_CHANNEL_RE = _compile(
    tuple(t for t in CHANNEL_TERMS if t not in CHANNEL_EXACT), CHANNEL_EXACT
)
_HARM_RE = _compile(HARM_TERMS)
_EXCLUDE_RE = _compile(EXCLUDE_TERMS)


def is_cyber_relevant(text: str) -> bool:
    """True when the text plausibly reports a cybercrime incident."""
    if not text:
        return False
    if _EXCLUDE_RE.search(text):
        return False
    if _STRONG_RE.search(text):
        return True
    return bool(_CHANNEL_RE.search(text) and _HARM_RE.search(text))


def slug_is_cyber_candidate(url: str, *, strict: bool = False) -> bool:
    """Pre-fetch filter for outlets that put the headline in the URL.

    ``strict`` is False for the Bengali outlets, whose paths carry only a
    section name and a numeric id. Unlike the asset gate, a non-strict URL
    is always kept: a path such as ``country/news/1234567`` survives
    ``slug_to_text`` as "country news", and judging that as a headline would
    reject every Bengali article - the outlets that report most of the
    MFS fraud this study needs. They are judged after fetching instead.
    """
    if not strict:
        return True
    text = slug_to_text(url)
    return bool(text) and is_cyber_relevant(text)


def explain(text: str) -> dict[str, list[str]]:
    """Which terms fired. Used to audit the gate rather than trust it."""
    def hits(pattern: re.Pattern[str]) -> list[str]:
        return sorted({m.group(0).lower() for m in pattern.finditer(text)})

    return {
        "strong": hits(_STRONG_RE),
        "channel": hits(_CHANNEL_RE),
        "harm": hits(_HARM_RE),
        "excluded_by": hits(_EXCLUDE_RE),
    }
