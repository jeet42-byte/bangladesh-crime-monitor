"""Batch ingestion endpoint - the only write path into the database."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.api.deps import DbSession, IngestAuth
from app.db.models import (
    CRIME_CATEGORIES,
    SOURCE_PLATFORMS,
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

    @field_validator("crime_category")
    @classmethod
    def _valid_category(cls, value: str) -> str:
        normalised = value.strip().title()
        if normalised not in CRIME_CATEGORIES:
            raise ValueError(
                f"crime_category must be one of {', '.join(CRIME_CATEGORIES)}"
            )
        return normalised

    @field_validator("source_platform")
    @classmethod
    def _valid_platform(cls, value: str) -> str:
        normalised = value.strip().lower()
        if normalised not in SOURCE_PLATFORMS:
            raise ValueError(
                f"source_platform must be one of {', '.join(SOURCE_PLATFORMS)}"
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
            }
        )

    statement = (
        pg_insert(CrimeIncident)
        .values(rows)
        .on_conflict_do_nothing(index_elements=["raw_content_hash"])
        .returning(CrimeIncident.id)
    )

    result = await session.execute(statement)
    inserted = len(result.scalars().all())
    await session.commit()

    duplicates_skipped = received - inserted

    logger.info(
        "ingest: received=%d inserted=%d duplicates=%d (%d within payload)",
        received,
        inserted,
        duplicates_skipped,
        in_payload_duplicates,
    )

    return IngestBatchOut(
        inserted=inserted,
        duplicates_skipped=duplicates_skipped,
        received=received,
    )
