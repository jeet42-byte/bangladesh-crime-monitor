"""TTP profiles with prevalence measured against the archive.

The qualitative content is curated (see ``app.services.ttp_library``); this
router is what keeps it honest. Every profile is returned with a real count of
matching records over the requested window, so a pattern the archive cannot
evidence displays a zero and an explanation rather than an impressive-looking
number nobody can check.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select

from app.api.deps import DbSession, require_reader
from app.db.models import CrimeIncident
from app.services.ttp_library import (
    PROFILES,
    SUPPORT_NOTE,
    TTPProfile,
    threat_classes,
)

router = APIRouter(
    prefix="/ttp",
    tags=["ttp"],
    # Applied at the router, matching analytics: a new endpoint here cannot
    # be added without the reader gate.
    dependencies=[Depends(require_reader)],
)


# ===========================================================================
# Response models
# ===========================================================================
class StageOut(BaseModel):
    name: str
    description: str
    indicators: List[str]


class TreatmentOut(BaseModel):
    kind: str
    audience: str
    action: str
    stage_index: int
    note: str


class ProfileOut(BaseModel):
    id: str
    name: str
    threat_class: str
    categories: List[str]
    summary: str
    archive_support: str
    support_note: str
    provenance: str
    stages: List[StageOut]
    treatments: List[TreatmentOut]

    #: Records in the window matching this profile's terms *and* one of its
    #: categories. The honest number.
    observed_count: int
    #: Records in the window in this profile's categories, matched or not.
    #: The denominator, so a reader can see how much of a category the
    #: pattern accounts for rather than a bare count.
    category_total: int
    #: Most recent matching incident, for "is this still happening".
    last_seen: Optional[datetime]


class TTPResponse(BaseModel):
    profiles: List[ProfileOut]
    threat_classes: List[str]
    window_days: int
    archive_total: int
    generated_at: datetime


# ===========================================================================
# Prevalence
# ===========================================================================
def _match_clause(profile: TTPProfile):
    """SQL predicate for 'this record looks like this pattern'.

    Terms are matched against title and narrative with ILIKE rather than
    full-text search: the corpus is bilingual, and Postgres has no Bengali
    text-search configuration, so a tsvector would silently stem the English
    and ignore the Bengali. A substring match treats both the same.
    """
    haystack = CrimeIncident.title + " " + CrimeIncident.narrative
    return or_(*(haystack.ilike(f"%{term}%") for term in profile.match_terms))


async def _prevalence(
    session: DbSession, profile: TTPProfile, since: datetime
) -> tuple[int, int, Optional[datetime]]:
    """Return (matched, category_total, last_seen) for one profile."""
    in_window = CrimeIncident.incident_date >= since
    in_category = CrimeIncident.crime_category.in_(list(profile.categories))

    category_total = await session.scalar(
        select(func.count())
        .select_from(CrimeIncident)
        .where(in_window, in_category)
    )

    # A profile with no terms cannot be measured; report zero rather than
    # silently counting the whole category as a match.
    if not profile.match_terms:
        return 0, int(category_total or 0), None

    matched_where = (in_window, in_category, _match_clause(profile))

    matched = await session.scalar(
        select(func.count()).select_from(CrimeIncident).where(*matched_where)
    )
    last_seen = await session.scalar(
        select(func.max(CrimeIncident.incident_date)).where(*matched_where)
    )

    return int(matched or 0), int(category_total or 0), last_seen


def _serialise(
    profile: TTPProfile,
    matched: int,
    category_total: int,
    last_seen: Optional[datetime],
) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        name=profile.name,
        threat_class=profile.threat_class,
        categories=list(profile.categories),
        summary=profile.summary,
        archive_support=profile.archive_support,
        support_note=SUPPORT_NOTE[profile.archive_support],
        provenance=profile.provenance,
        stages=[
            StageOut(
                name=stage.name,
                description=stage.description,
                indicators=list(stage.indicators),
            )
            for stage in profile.stages
        ],
        treatments=[
            TreatmentOut(
                kind=treatment.kind,
                audience=treatment.audience,
                action=treatment.action,
                stage_index=treatment.stage_index,
                note=treatment.note,
            )
            for treatment in profile.treatments
        ],
        observed_count=matched,
        category_total=category_total,
        last_seen=last_seen,
    )


# ===========================================================================
# Endpoints
# ===========================================================================
@router.get("/profiles", response_model=TTPResponse)
async def list_profiles(
    session: DbSession,
    days: int = Query(90, ge=7, le=730, description="Rolling window in days."),
) -> TTPResponse:
    """The TTP catalogue, each profile scored against the live archive.

    The window defaults to 90 days rather than the dashboard's usual 30: these
    are structural patterns, and a month is too short a base for several of
    them to register at the archive's current volume.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    archive_total = await session.scalar(
        select(func.count())
        .select_from(CrimeIncident)
        .where(CrimeIncident.incident_date >= since)
    )

    profiles: List[ProfileOut] = []
    for profile in PROFILES:
        matched, category_total, last_seen = await _prevalence(
            session, profile, since
        )
        profiles.append(_serialise(profile, matched, category_total, last_seen))

    return TTPResponse(
        profiles=profiles,
        threat_classes=threat_classes(),
        window_days=days,
        archive_total=int(archive_total or 0),
        generated_at=datetime.now(timezone.utc),
    )
