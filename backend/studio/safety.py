"""Editorial guardrails for crime videos.

Three things can get a crime channel struck, demonetised or sued, and these
rules exist for each of them:

* **Victim identity.** Bangladeshi law (Nari o Shishu Nirjatan Daman Ain 2000,
  s.14; Children Act 2013, s.28) forbids publishing anything that identifies a
  victim of sexual violence or a child. Sexual and domestic violence are
  therefore never made into individual story videos - they appear only as
  numbers in the weekly brief.
* **Defamation.** A suspect is alleged until a court says otherwise. Scripts
  attribute every claim to its source and only use facts the source states.
* **Advertiser-friendly guidelines.** Graphic detail limits ads. Scripts
  describe what happened, not how it looked.
"""

from __future__ import annotations

import re
from typing import Iterable, List

from studio.source import Incident

#: Never made into an individual story (still counted in aggregates).
NO_STORY_CATEGORIES = frozenset({"Sexual Violence", "Domestic Violence"})

#: Not crime stories at all; fine for briefs, wrong for a crime-news Short.
NON_CRIME_CATEGORIES = frozenset({"Industrial Accident", "Labour Unrest"})

_VERIFICATION_RANK = {"corroborated": 2, "single_source": 1, "unverified": 0}

# Phone numbers, NID-length digit runs and e-mail addresses, in either script.
_PII_PATTERNS = (
    re.compile(r"(?:\+?৮৮|\+?88)?[০-৯0-9][০-৯0-9\- ]{8,}[০-৯0-9]"),
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
)

# Words that push a script toward graphic description.
_GRAPHIC_BN = ("রক্তাক্ত", "ক্ষতবিক্ষত", "টুকরো টুকরো", "গলাকাটা", "বীভৎস", "থেঁতলে")

STYLE_RULES = """\
Editorial rules (mandatory):
1. Write in standard, formal Bangla (প্রমিত বাংলা), in the calm voice of a TV news anchor. Short sentences.
2. Use only facts present in the input. Never invent names, ages, numbers, motives, quotes or outcomes.
3. Never name or describe any person: no victim, suspect, witness or child names, no addresses, phone numbers or photos.
4. Attribute every claim: "পুলিশ জানিয়েছে", "সংবাদমাধ্যমের খবরে বলা হয়েছে", "অভিযোগ রয়েছে". Call suspects "অভিযুক্ত" - never state guilt.
5. No graphic or gory detail. Describe what happened, not how injuries looked.
6. Use Bangla digits (০-৯). Avoid English words except unavoidable proper nouns.
7. Do not speculate, sensationalise or blame any religion, ethnicity, party or community.
"""


def story_eligible(incident: Incident) -> bool:
    """May this record become its own story video?"""
    return (
        incident.category not in NO_STORY_CATEGORIES
        and incident.verification != "unverified"
        and bool(incident.narrative.strip())
    )


def rank_for_story(incidents: Iterable[Incident]) -> List[Incident]:
    """Best-corroborated, highest-confidence, most recent first."""
    return sorted(
        incidents,
        key=lambda i: (_VERIFICATION_RANK.get(i.verification, 0), i.confidence, i.date),
        reverse=True,
    )


def pick_diverse(incidents: List[Incident], n: int) -> List[Incident]:
    """Top n, but at most one per category until every category had a turn."""
    chosen: List[Incident] = []
    seen: set[str] = set()
    for inc in incidents:
        if inc.category not in seen:
            chosen.append(inc)
            seen.add(inc.category)
        if len(chosen) == n:
            return chosen
    for inc in incidents:
        if inc not in chosen:
            chosen.append(inc)
        if len(chosen) == n:
            break
    return chosen


def scrub(text: str) -> str:
    """Remove personal identifiers a model might have copied from a source."""
    for pattern in _PII_PATTERNS:
        text = pattern.sub("", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def review_warnings(texts: Iterable[str]) -> List[str]:
    """Things a human should look at before uploading."""
    warnings: List[str] = []
    joined = "\n".join(texts)
    for word in _GRAPHIC_BN:
        if word in joined:
            warnings.append(f"Graphic word '{word}' in the script: soften it or ads may be limited.")
    latin = re.findall(r"[A-Za-z]{4,}", joined)
    if len(latin) > 6:
        warnings.append(f"{len(latin)} English words in the narration; the Bangla voice may mispronounce them.")
    return warnings


DISCLAIMER_BN = (
    "এই ভিডিওর তথ্য সংবাদমাধ্যম ও সরকারি সূত্রে প্রকাশিত প্রতিবেদন থেকে সংকলিত। "
    "সব অপরাধের খবর প্রকাশিত হয় না, তাই এগুলো সরকারি অপরাধ পরিসংখ্যান নয়। "
    "অভিযুক্ত ব্যক্তি আদালতে দোষী প্রমাণিত না হওয়া পর্যন্ত নির্দোষ।"
)

HELPLINES_BN = (
    ("৯৯৯", "জাতীয় জরুরি সেবা"),
    ("১০৯", "নারী ও শিশু নির্যাতন প্রতিরোধ"),
    ("১০৯৮", "শিশু সহায়তা"),
    ("১৬৪৩০", "সরকারি আইনি সহায়তা"),
)

REVIEW_CHECKLIST = (
    "Watch the whole video once before uploading.",
    "Check every fact on screen against the linked sources.",
    "No person is named or identifiable (faces, addresses, school, workplace).",
    "Suspects are described as alleged (অভিযুক্ত), never as guilty.",
    "YouTube Studio: answer 'Altered or synthetic content' per YouTube's current rules (a stock text-to-speech narrator over charts is normally not covered; realistic AI footage of events is), and set Made for Kids to No.",
)
