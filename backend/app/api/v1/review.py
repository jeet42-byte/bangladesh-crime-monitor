"""Review queue for backfilled history. Owner only.

Backfilled records are published only after a human has looked at them. The
rest of the API is read-only over an approved archive; this is the one router
that changes what the public can see, so it sits behind ``require_owner``
rather than ``require_reader``.

Why the asymmetry with live collection
--------------------------------------
Live records come from feeds published hours earlier, through a lexicon tuned
over months, and anything wrong is current enough that someone notices and
uses the corrections route. A record dated 2023 has none of that: it arrived
through a much wider gate, nobody is watching for it, and it can sit
unchallenged indefinitely. The first backfill run produced exactly the kinds
of error that argument predicts - two records with unresolvable locations, a
handful of political stories that are not asset-protection events, and a bail
hearing on a years-old case.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import DbSession, require_owner
from app.db.models import (
    COLLECTION_MODES,
    NON_CRIMINAL_CATEGORIES,
    REVIEW_STATUSES,
    CrimeIncident,
    User,
)

# Spelled out rather than using the OwnerUser alias from deps. That alias is
# Annotated["User", ...] with a string forward reference, and User is imported
# there only under TYPE_CHECKING - so at runtime FastAPI cannot resolve it,
# silently gives up on the dependency, and treats `owner` as a required query
# parameter. The endpoint then returns 422 for a missing param instead of 403,
# and require_owner never runs. Caught by probing the deployed route with a
# guest token; the annotation looked correct in review.
OwnerDep = Annotated[User, Depends(require_owner)]

router = APIRouter(prefix="/review", tags=["review"])


# ===========================================================================
# Response models
# ===========================================================================
class ReviewItem(BaseModel):
    id: str
    title: str
    narrative: str
    crime_category: str
    is_criminal_offence: bool
    penal_code_tags: List[str]
    incident_date: datetime
    thana_name: str
    district: str
    latitude: float
    longitude: float
    source_platform: str
    source_handle: Optional[str]
    source_url: str
    source_confidence: int
    verification_level: str
    collection_mode: str
    review_status: str
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    review_note: Optional[str]
    created_at: datetime
    #: Days between the incident and when the row was written. Large gaps are
    #: normal for backfill and are the reviewer's cue that this is history,
    #: not a live report.
    ingest_lag_days: int


class QueueResponse(BaseModel):
    items: List[ReviewItem]
    total: int
    limit: int
    offset: int
    has_more: bool
    counts: dict[str, int]


class DecisionIn(BaseModel):
    status: Literal["approved", "rejected", "unreviewed"]
    note: Optional[str] = Field(default=None, max_length=1000)


class BulkDecisionIn(BaseModel):
    ids: List[str] = Field(..., min_length=1, max_length=200)
    status: Literal["approved", "rejected", "unreviewed"]
    note: Optional[str] = Field(default=None, max_length=1000)


class DecisionOut(BaseModel):
    updated: int
    status: str


# ===========================================================================
# Helpers
# ===========================================================================
def _serialise(row: CrimeIncident) -> ReviewItem:
    lag = (row.created_at - row.incident_date).days if row.created_at else 0
    return ReviewItem(
        id=str(row.id),
        title=row.title,
        narrative=row.narrative,
        crime_category=row.crime_category,
        is_criminal_offence=row.crime_category not in NON_CRIMINAL_CATEGORIES,
        penal_code_tags=list(row.penal_code_tags or []),
        incident_date=row.incident_date,
        thana_name=row.thana_name,
        district=row.district,
        latitude=float(row.latitude),
        longitude=float(row.longitude),
        source_platform=row.source_platform,
        source_handle=row.source_handle,
        source_url=row.source_url,
        source_confidence=row.source_confidence,
        verification_level=row.verification_level,
        collection_mode=row.collection_mode,
        review_status=row.review_status,
        reviewed_at=row.reviewed_at,
        reviewed_by=row.reviewed_by,
        review_note=row.review_note,
        created_at=row.created_at,
        ingest_lag_days=max(lag, 0),
    )


# ===========================================================================
# Endpoints
# ===========================================================================
@router.get("/queue", response_model=QueueResponse)
async def review_queue(
    session: DbSession,
    owner: OwnerDep,
    status: str = Query("unreviewed"),
    collection_mode: str = Query("backfill"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> QueueResponse:
    """Records awaiting a decision, oldest incident first.

    Oldest first is deliberate: the backfill reaches furthest back at its
    thinnest, so the records most likely to be wrong and least likely to be
    noticed are the ones a reviewer should meet first.
    """
    if status not in REVIEW_STATUSES and status != "all":
        raise HTTPException(400, f"status must be one of {REVIEW_STATUSES} or 'all'")
    if collection_mode not in COLLECTION_MODES and collection_mode != "all":
        raise HTTPException(400, f"collection_mode must be one of {COLLECTION_MODES} or 'all'")

    filters = []
    if status != "all":
        filters.append(CrimeIncident.review_status == status)
    if collection_mode != "all":
        filters.append(CrimeIncident.collection_mode == collection_mode)

    total = await session.scalar(
        select(func.count()).select_from(CrimeIncident).where(*filters)
    )

    rows = (
        await session.execute(
            select(CrimeIncident)
            .where(*filters)
            .order_by(CrimeIncident.incident_date.asc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()

    tallies = (
        await session.execute(
            select(CrimeIncident.review_status, func.count())
            .where(CrimeIncident.collection_mode == "backfill")
            .group_by(CrimeIncident.review_status)
        )
    ).all()

    return QueueResponse(
        items=[_serialise(row) for row in rows],
        total=int(total or 0),
        limit=limit,
        offset=offset,
        has_more=offset + len(rows) < int(total or 0),
        counts={status_name: count for status_name, count in tallies},
    )


@router.post("/{incident_id}", response_model=DecisionOut)
async def decide(
    incident_id: str,
    payload: DecisionIn,
    session: DbSession,
    owner: OwnerDep,
) -> DecisionOut:
    """Record a decision on one record."""
    row = await session.get(CrimeIncident, incident_id)
    if row is None:
        raise HTTPException(404, "No such incident.")

    row.review_status = payload.status
    row.review_note = payload.note
    # An 'unreviewed' decision is a reset, so the audit fields clear with it -
    # leaving a reviewer's name on a record nobody has decided would be a lie.
    if payload.status == "unreviewed":
        row.reviewed_at = None
        row.reviewed_by = None
    else:
        row.reviewed_at = datetime.now(timezone.utc)
        row.reviewed_by = owner.username

    await session.commit()
    return DecisionOut(updated=1, status=payload.status)


@router.post("", response_model=DecisionOut)
async def decide_bulk(
    payload: BulkDecisionIn,
    session: DbSession,
    owner: OwnerDep,
) -> DecisionOut:
    """Record the same decision on many records.

    Exists because approving 200 records one dialog at a time is how a review
    step gets abandoned, and an abandoned review step is worse than none: it
    leaves the queue looking like a control while nothing is being checked.
    """
    rows = (
        await session.execute(
            select(CrimeIncident).where(CrimeIncident.id.in_(payload.ids))
        )
    ).scalars().all()

    now = datetime.now(timezone.utc)
    for row in rows:
        row.review_status = payload.status
        row.review_note = payload.note
        if payload.status == "unreviewed":
            row.reviewed_at = None
            row.reviewed_by = None
        else:
            row.reviewed_at = now
            row.reviewed_by = owner.username

    await session.commit()
    return DecisionOut(updated=len(rows), status=payload.status)
