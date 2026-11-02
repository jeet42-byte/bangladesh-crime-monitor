"""Live disruptions: what is blocked, shut or on the streets right now."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from app.api.deps import DbSession, IngestAuth, require_reader
from app.db.models import Disruption
from app.parsers.disruption_classifier import DISRUPTION_KINDS

router = APIRouter(tags=["disruptions"])

#: Two reports of the same kind this close together, overlapping in time,
#: are one disruption reported twice.
MERGE_KM = 2.0
MAX_SOURCES = 8


class SourceOut(BaseModel):
    outlet: str
    url: str
    title: str


class DisruptionOut(BaseModel):
    id: UUID
    kind: str
    status: str
    title: str
    place: str
    district: str
    lat: float
    lon: float
    starts_at: datetime
    expires_at: datetime
    sources: List[SourceOut]
    updated_at: datetime


class DisruptionIn(BaseModel):
    kind: str
    status: str = "ongoing"
    title: str = Field(..., min_length=5, max_length=200)
    place: str = Field(..., min_length=2, max_length=120)
    district: str = Field(..., min_length=2, max_length=60)
    lat: float = Field(..., ge=20.5, le=26.7)
    lon: float = Field(..., ge=88.0, le=92.7)
    starts_at: datetime
    expires_at: datetime
    source: SourceOut

    @field_validator("kind")
    @classmethod
    def _kind(cls, value: str) -> str:
        if value not in DISRUPTION_KINDS:
            raise ValueError(f"kind must be one of {DISRUPTION_KINDS}")
        return value


class DisruptionBatchIn(BaseModel):
    items: List[DisruptionIn] = Field(..., min_length=1, max_length=100)


def _km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def _serialise(row: Disruption) -> DisruptionOut:
    return DisruptionOut(
        id=row.id, kind=row.kind, status=row.status, title=row.title, place=row.place,
        district=row.district, lat=row.lat, lon=row.lon, starts_at=row.starts_at,
        expires_at=row.expires_at, sources=[SourceOut(**s) for s in row.sources or []],
        updated_at=row.updated_at,
    )


@router.get(
    "/disruptions/active",
    response_model=List[DisruptionOut],
    dependencies=[Depends(require_reader)],
    summary="Disruptions that have not yet expired, including announced ones",
)
async def active(session: DbSession, district: Optional[str] = Query(None, max_length=60)) -> List[DisruptionOut]:
    now = datetime.now(timezone.utc)
    statement = select(Disruption).where(Disruption.expires_at > now)
    if district:
        statement = statement.where(Disruption.district == district)
    rows = (await session.execute(statement.order_by(Disruption.starts_at.desc()))).scalars().all()
    return [_serialise(r) for r in rows]


@router.post("/ingest/disruptions", summary="Record disruptions, merging repeat reports")
async def ingest(payload: DisruptionBatchIn, session: DbSession, _: IngestAuth) -> dict:
    now = datetime.now(timezone.utc)
    live = list(
        (await session.execute(select(Disruption).where(Disruption.expires_at > now - timedelta(hours=2)))).scalars().all()
    )
    created = merged = 0
    for item in payload.items:
        if item.expires_at <= now:
            continue  # already over: nothing to show
        source = item.source.model_dump()
        match = next(
            (
                row for row in live
                if row.kind == item.kind
                and _km(row.lat, row.lon, item.lat, item.lon) <= MERGE_KM
                and row.starts_at <= item.expires_at and item.starts_at <= row.expires_at
            ),
            None,
        )
        if match is None:
            row = Disruption(
                kind=item.kind, status=item.status, title=item.title, place=item.place,
                district=item.district, lat=item.lat, lon=item.lon, starts_at=item.starts_at,
                expires_at=item.expires_at, sources=[source], updated_at=now,
            )
            session.add(row)
            live.append(row)
            created += 1
            continue
        if all(s.get("url") != source["url"] for s in match.sources or []):
            match.sources = (list(match.sources or []) + [source])[:MAX_SOURCES]
        match.expires_at = max(match.expires_at, item.expires_at)
        if item.status == "ongoing":
            match.status = "ongoing"
        match.updated_at = now
        merged += 1
    await session.commit()
    return {"created": created, "merged": merged}
