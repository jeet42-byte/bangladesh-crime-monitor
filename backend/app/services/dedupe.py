"""Near-duplicate detection: one incident reported by several outlets.

The content hash (date | thana | title) only catches outlets whose headlines
normalise to the same string. Two papers rarely do, and once Google News
headlines joined the pipeline the same stabbing could land three times under
three wordings - inflating every count, hotspot and trend on the site.

The extractor writes every title and summary in English, whatever the
article's language, so they can be compared with pg_trgm. Similarity alone
is not safe, though. Calibrated on hand-made pairs:

    same incident  "Journalist shot dead in Netrokona" /
                   "Journalist killed by gunfire in Netrokona"            0.46
    different      "Two arrested with 5,000 yaba pills in Cox's Bazar" /
                   "Three arrested with 2,000 yaba pills in Cox's Bazar"  0.79

So a match also requires the same thana, the same category, dates within
WINDOW_DAYS, and no conflicting numbers between the two texts. That trades
some missed merges for almost no false ones: wrongly hiding a real incident
is worse than counting one twice.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CrimeIncident

#: Minimum trigram similarity on either the title or the summary.
SIMILARITY = 0.40
#: Outlets date the same incident from the article, the FIR or "last night".
WINDOW_DAYS = 2
#: Labels written into review_note so a merge can be found and undone.
MERGED_BY = "auto-dedupe"

_NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}
_DIGITS = re.compile(r"\d[\d,]*(?:\.\d+)?")
_WORDS = re.compile(r"[a-z]+")


def _numbers(text: str) -> set[float]:
    """Quantities stated in a text: '5,000 yaba', 'two arrested'."""
    found: set[float] = set()
    for token in _DIGITS.findall(text):
        try:
            found.add(float(token.replace(",", "")))
        except ValueError:
            continue
    for word in _WORDS.findall(text.lower()):
        if word in _NUMBER_WORDS:
            found.add(float(_NUMBER_WORDS[word]))
    return found


def numbers_conflict(a: str, b: str) -> bool:
    """True when both texts state quantities and they share none.

    A text with no numbers never conflicts: "Police arrest two with yaba"
    and "Two arrested with 5,000 yaba pills" are the same raid.
    """
    na, nb = _numbers(a), _numbers(b)
    return bool(na and nb and not (na & nb))


async def find_near_duplicate(
    session: AsyncSession,
    *,
    title: str,
    narrative: str,
    thana_name: str,
    crime_category: str,
    incident_date: datetime,
    exclude_id: Any = None,
    created_before: Optional[datetime] = None,
) -> Optional[CrimeIncident]:
    """The stored incident this one duplicates, or None."""
    score = func.greatest(
        func.similarity(CrimeIncident.title, title),
        func.similarity(CrimeIncident.narrative, narrative),
    )
    statement = (
        select(CrimeIncident, score.label("score"))
        .where(
            CrimeIncident.thana_name == thana_name,
            CrimeIncident.crime_category == crime_category,
            CrimeIncident.incident_date >= incident_date - timedelta(days=WINDOW_DAYS),
            CrimeIncident.incident_date <= incident_date + timedelta(days=WINDOW_DAYS),
            CrimeIncident.review_status != "rejected",
            score >= SIMILARITY,
        )
        .order_by(score.desc())
        .limit(5)
    )
    if exclude_id is not None:
        statement = statement.where(CrimeIncident.id != exclude_id)
    if created_before is not None:
        statement = statement.where(CrimeIncident.created_at < created_before)

    for candidate, _score in (await session.execute(statement)).all():
        if numbers_conflict(
            f"{title} {narrative}", f"{candidate.title} {candidate.narrative}"
        ):
            continue
        return candidate
    return None


def corroborate(existing: CrimeIncident, new_source_handle: Optional[str]) -> bool:
    """Record a second outlet on the surviving incident. True if it changed."""
    if existing.verification_level == "corroborated":
        return False
    if new_source_handle and new_source_handle == existing.source_handle:
        # The same outlet filing twice is not independent confirmation.
        return False
    existing.verification_level = "corroborated"
    return True


async def merge_stored_duplicates(
    session: AsyncSession, *, apply: bool
) -> List[Dict[str, Any]]:
    """Find duplicates already in the archive; hide them if ``apply``.

    Oldest first, so the record that was published first survives. A hidden
    duplicate is set to review_status='rejected' with a note naming the
    survivor - nothing is deleted, and the owner review queue can restore it.
    """
    rows = (
        await session.execute(
            select(CrimeIncident)
            .where(CrimeIncident.review_status == "approved")
            .order_by(CrimeIncident.created_at.asc())
        )
    ).scalars().all()

    merged: List[Dict[str, Any]] = []
    hidden: set[Any] = set()
    for row in rows:
        if row.id in hidden:
            continue
        survivor = await find_near_duplicate(
            session,
            title=row.title,
            narrative=row.narrative,
            thana_name=row.thana_name,
            crime_category=row.crime_category,
            incident_date=row.incident_date,
            exclude_id=row.id,
            created_before=row.created_at,
        )
        if survivor is None or survivor.id in hidden:
            continue
        merged.append(
            {
                "duplicate_id": str(row.id),
                "duplicate_title": row.title,
                "survivor_id": str(survivor.id),
                "survivor_title": survivor.title,
                "thana": row.thana_name,
                "category": row.crime_category,
            }
        )
        hidden.add(row.id)
        if apply:
            row.review_status = "rejected"
            row.reviewed_by = MERGED_BY
            row.reviewed_at = datetime.now(tz=row.created_at.tzinfo)
            row.review_note = f"Duplicate of {survivor.id}"
            corroborate(survivor, row.source_handle)

    if apply:
        await session.commit()
    return merged
