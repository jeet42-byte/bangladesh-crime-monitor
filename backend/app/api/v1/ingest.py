"""Batch ingestion endpoint - the only write path into the database."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.api.deps import DbSession, IngestAuth
from app.services.dedupe import corroborate, find_near_duplicate, merge_stored_duplicates
from app.db.models import (
    COLLECTION_MODES,
    CRIME_CATEGORIES,
    SOURCE_PLATFORMS,
    VERIFICATION_LEVELS,
    CrimeIncident,
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
