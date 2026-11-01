"""Batch ingestion endpoint - the only write path into the database."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.api.deps import DbSession, IngestAuth
from app.services.dedupe import corroborate, find_near_duplicate, merge_stored_duplicates
from app.db.models import (
    COLLECTION_MODES,
    CRIME_CATEGORIES,
    SOURCE_PLATFORMS,
    VERIFICATION_LEVELS,
    PULSE_FLAGS,
    PULSE_STANCES,
    PULSE_TOPIC_TYPES,
    CrimeIncident,
    PulseTopic,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])

# Keeps a single statement inside Neon's free-tier limits.
MAX_BATCH_SIZE = 200


class IncidentIn(BaseModel):
    """One incident as produced by the extraction pipeline."""

    title: str = Field(..., min_length=3, max_length=500)
    narrative: str = Field(..., min_length=10)
    crime_category: str
    penal_code_tags: Optional[List[str]] = None
    incident_date: datetime
    thana_name: str = Field(..., min_length=2, max_length=100)
    district: str = Field(default="Dhaka", max_length=50)
    latitude: float = Field(..., ge=20.5, le=26.7)
    longitude: float = Field(..., ge=88.0, le=92.7)
    fir_or_gd: Optional[str] = Field(default=None, max_length=100)
    source_platform: str
    source_url: str = Field(..., min_length=4)
    source_confidence: int = Field(..., ge=0, le=100)
    raw_content_hash: str = Field(..., min_length=64, max_length=64)
    source_handle: Optional[str] = Field(default=None, max_length=120)
    verification_level: str = Field(default="single_source")
    # 'backfill' stages the record for review instead of publishing it. The
    # default keeps every existing caller - the live cron included - writing
    # straight to the public archive exactly as before.
    collection_mode: str = Field(default="live")

    @field_validator("crime_category")
    @classmethod
    def _valid_category(cls, value: str) -> str:
        normalised = value.strip().title()
        if normalised not in CRIME_CATEGORIES:
            raise ValueError(
                f"crime_category must be one of {', '.join(CRIME_CATEGORIES)}"
            )
        return normalised

    @field_validator("collection_mode")
    @classmethod
    def _valid_mode(cls, value: str) -> str:
        if value not in COLLECTION_MODES:
            raise ValueError(
                f"collection_mode must be one of {', '.join(COLLECTION_MODES)}"
            )
        return value

    @field_validator("source_platform")
    @classmethod
    def _valid_platform(cls, value: str) -> str:
        normalised = value.strip().lower()
        if normalised not in SOURCE_PLATFORMS:
            raise ValueError(
                f"source_platform must be one of {', '.join(SOURCE_PLATFORMS)}"
            )
        return normalised

    @field_validator("verification_level")
    @classmethod
    def _valid_verification(cls, value: str) -> str:
        normalised = value.strip().lower()
        if normalised not in VERIFICATION_LEVELS:
            raise ValueError(
                f"verification_level must be one of {', '.join(VERIFICATION_LEVELS)}"
            )
        return normalised

    @field_validator("raw_content_hash")
    @classmethod
    def _valid_hash(cls, value: str) -> str:
        candidate = value.strip().lower()
        if any(character not in "0123456789abcdef" for character in candidate):
            raise ValueError("raw_content_hash must be a hex SHA-256 digest")
        return candidate


class IngestBatchIn(BaseModel):
    """Request body for POST /api/v1/ingest/batch."""

    incidents: List[IncidentIn] = Field(..., max_length=MAX_BATCH_SIZE)


class IngestBatchOut(BaseModel):
    """Response body: how many rows landed and how many were already present."""

    inserted: int
    duplicates_skipped: int
    received: int
    #: Of duplicates_skipped, how many were the same incident from another
    #: outlet (folded into an existing record) rather than a byte-identical
    #: re-send.
    merged: int = 0


@router.post(
    "/batch",
    response_model=IngestBatchOut,
    status_code=status.HTTP_201_CREATED,
    summary="Insert a batch of incidents, skipping duplicates",
)
async def ingest_batch(
    payload: IngestBatchIn,
    session: DbSession,
    _: IngestAuth,
) -> IngestBatchOut:
    """Idempotent bulk insert.

    Deduplication happens twice:

    1. In-payload - the scraper can legitimately produce the same incident
       from two outlets in one run, and PostgreSQL rejects an ``ON CONFLICT``
       statement that touches the same key twice in a single command.
    2. In-database - ``ON CONFLICT (raw_content_hash) DO NOTHING`` absorbs
       anything already stored from an earlier cron window.
    """
    received = len(payload.incidents)
    if received == 0:
        return IngestBatchOut(inserted=0, duplicates_skipped=0, received=0)

    rows: list[dict] = []
    seen_hashes: set[str] = set()
    in_payload_duplicates = 0

    for incident in payload.incidents:
        if incident.raw_content_hash in seen_hashes:
            in_payload_duplicates += 1
            continue
        seen_hashes.add(incident.raw_content_hash)

        rows.append(
            {
                "title": incident.title,
                "narrative": incident.narrative,
                "crime_category": incident.crime_category,
                "penal_code_tags": incident.penal_code_tags or None,
                "incident_date": incident.incident_date,
                "thana_name": incident.thana_name,
                "district": incident.district,
                "latitude": incident.latitude,
                "longitude": incident.longitude,
                "fir_or_gd": incident.fir_or_gd,
                "source_platform": incident.source_platform,
                "source_url": incident.source_url,
                "source_confidence": incident.source_confidence,
                "raw_content_hash": incident.raw_content_hash,
                "source_handle": incident.source_handle,
                "verification_level": incident.verification_level,
                "collection_mode": incident.collection_mode,
                # Backfilled history stages for review; live collection
                # publishes as it always has.
                "review_status": (
                    "unreviewed"
                    if incident.collection_mode == "backfill"
                    else "approved"
                ),
            }
        )

    # One row at a time so each new record is checked against the archive
    # and against the rows inserted earlier in this same batch. A batch is
    # at most MAX_BATCH_SIZE rows, so the extra round trips are cheap.
    inserted = 0
    merged = 0
    for row in rows:
        existing = await find_near_duplicate(
            session,
            title=row["title"],
            narrative=row["narrative"],
            thana_name=row["thana_name"],
            crime_category=row["crime_category"],
            incident_date=row["incident_date"],
        )
        if existing is not None:
            # The same incident from another outlet: confirm the stored
            # record instead of counting the incident twice.
            corroborate(existing, row["source_handle"])
            merged += 1
            continue

        statement = (
            pg_insert(CrimeIncident)
            .values(row)
            .on_conflict_do_nothing(index_elements=["raw_content_hash"])
            .returning(CrimeIncident.id)
        )
        result = await session.execute(statement)
        inserted += len(result.scalars().all())

    await session.commit()

    duplicates_skipped = received - inserted

    logger.info(
        "ingest: received=%d inserted=%d duplicates=%d (%d within payload, "
        "%d merged as the same incident)",
        received,
        inserted,
        duplicates_skipped,
        in_payload_duplicates,
        merged,
    )

    return IngestBatchOut(
        inserted=inserted,
        duplicates_skipped=duplicates_skipped,
        received=received,
        merged=merged,
    )


class MergeOut(BaseModel):
    applied: bool
    count: int
    merges: List[dict]


@router.post(
    "/merge-duplicates",
    response_model=MergeOut,
    summary="Find (and optionally hide) duplicate incidents already stored",
)
async def merge_duplicates(
    session: DbSession,
    _: IngestAuth,
    apply: bool = False,
) -> MergeOut:
    """Dry run unless ``apply=true``.

    Applying hides each later duplicate (review_status='rejected', note
    naming the survivor) and marks the survivor corroborated. Nothing is
    deleted; the review queue can restore any record.
    """
    merges = await merge_stored_duplicates(session, apply=apply)
    logger.info("merge-duplicates: %d found, applied=%s", len(merges), apply)
    return MergeOut(applied=apply, count=len(merges), merges=merges)


# ===========================================================================
# Public Pulse
# ===========================================================================
class PulseKeyViewIn(BaseModel):
    view: str = Field(..., min_length=3, max_length=300)
    share: float = Field(..., ge=0, le=1)


class PulseTopicIn(BaseModel):
    """One analysed video. Aggregates only - no commenter identities or quotes."""

    platform: str = Field(default="YouTube", max_length=30)
    video_id: str = Field(..., min_length=5, max_length=40)
    url: str = Field(..., min_length=10, max_length=300)
    title: str = Field(..., min_length=1, max_length=500)
    channel: Optional[str] = Field(default=None, max_length=200)
    published_at: Optional[datetime] = None
    discovered_via: str = Field(default="trending", max_length=30)
    view_count: Optional[int] = Field(default=None, ge=0)
    like_count: Optional[int] = Field(default=None, ge=0)
    comment_count: Optional[int] = Field(default=None, ge=0)
    comments_analysed: int = Field(..., ge=1)
    topic: str = Field(..., min_length=2, max_length=200)
    topic_type: str
    crime_category: Optional[str] = None
    positive_pct: float = Field(..., ge=0, le=100)
    neutral_pct: float = Field(..., ge=0, le=100)
    negative_pct: float = Field(..., ge=0, le=100)
    emotions: Dict[str, float] = Field(default_factory=dict)
    stance_authorities: str = "not_discussed"
    themes: List[str] = Field(default_factory=list, max_length=12)
    flags: List[str] = Field(default_factory=list, max_length=10)
    summary: str = Field(..., min_length=10, max_length=2000)
    key_views: List[PulseKeyViewIn] = Field(default_factory=list, max_length=6)

    @field_validator("topic_type")
    @classmethod
    def _valid_type(cls, value: str) -> str:
        if value not in PULSE_TOPIC_TYPES:
            raise ValueError(f"topic_type must be one of {PULSE_TOPIC_TYPES}")
        return value

    @field_validator("stance_authorities")
    @classmethod
    def _valid_stance(cls, value: str) -> str:
        return value if value in PULSE_STANCES else "not_discussed"

    @field_validator("flags")
    @classmethod
    def _valid_flags(cls, value: List[str]) -> List[str]:
        return [flag for flag in dict.fromkeys(value) if flag in PULSE_FLAGS]

    @field_validator("crime_category")
    @classmethod
    def _valid_crime(cls, value: Optional[str]) -> Optional[str]:
        return value if value in CRIME_CATEGORIES else None


class PulseBatchIn(BaseModel):
    topics: List[PulseTopicIn] = Field(..., min_length=1, max_length=100)


class PulseBatchOut(BaseModel):
    created: int
    updated: int


#: Earlier snapshots kept per video, so a shift in mood can be shown.
PULSE_HISTORY_LIMIT = 30


@router.get("/pulse/recent", summary="Videos analysed recently, so the collector can skip them")
async def pulse_recent(
    session: DbSession,
    _: IngestAuth,
    hours: int = 12,
) -> Dict[str, str]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await session.execute(
        select(PulseTopic.video_id, PulseTopic.analysed_at).where(PulseTopic.analysed_at >= since)
    )
    return {video_id: at.isoformat() for video_id, at in rows.all()}


@router.post(
    "/pulse",
    response_model=PulseBatchOut,
    status_code=status.HTTP_200_OK,
    summary="Upsert analysed videos for Public Pulse",
)
async def ingest_pulse(payload: PulseBatchIn, session: DbSession, _: IngestAuth) -> PulseBatchOut:
    created = updated = 0
    now = datetime.now(timezone.utc)
    for item in payload.topics:
        data = item.model_dump()
        existing = (
            await session.execute(select(PulseTopic).where(PulseTopic.video_id == item.video_id))
        ).scalar_one_or_none()
        if existing is None:
            session.add(PulseTopic(**data, analysed_at=now))
            created += 1
            continue
        snapshot = {
            "at": existing.analysed_at.isoformat(),
            "negative_pct": float(existing.negative_pct),
            "positive_pct": float(existing.positive_pct),
            "comments_analysed": existing.comments_analysed,
            "view_count": existing.view_count,
        }
        history = (list(existing.history or []) + [snapshot])[-PULSE_HISTORY_LIMIT:]
        for field, value in data.items():
            setattr(existing, field, value)
        existing.history = history
        existing.analysed_at = now
        updated += 1
    await session.commit()
    logger.info("pulse ingest: %d created, %d updated", created, updated)
    return PulseBatchOut(created=created, updated=updated)
