"""Public read endpoints: paginated feed, GeoJSON, thana reference list."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import Select, func, select

from app.api.deps import DbSession, require_reader
from app.db.models import CRIME_CATEGORIES, SOURCE_PLATFORMS, CrimeIncident, Jurisdiction

router = APIRouter(
    prefix="/crimes",
    tags=["crimes"],
    # Applied at the router so a new endpoint cannot be added without the gate.
    dependencies=[Depends(require_reader)],
)

MAX_LIMIT = 200
GEOJSON_MAX_FEATURES = 2000


# ===========================================================================
# Response models
# ===========================================================================
class IncidentOut(BaseModel):
    """One incident as served to the browser."""

    id: UUID
    title: str
    narrative: str
    crime_category: str
    penal_code_tags: List[str]
    incident_date: datetime
    thana_name: str
    district: str
    latitude: float
    longitude: float
    fir_or_gd: Optional[str]
    source_platform: str
    source_url: str
    source_confidence: int
    # Which outlet or channel the record came from, and how well corroborated
    # it is. Both were stored but never served, so the UI could not show
    # provenance at all.
    source_handle: Optional[str]
    verification_level: str
    created_at: datetime


class FeedOut(BaseModel):
    """Paginated envelope around a list of incidents."""

    items: List[IncidentOut]
    total: int
    limit: int
    offset: int
    has_more: bool


class ThanaOut(BaseModel):
    """Jurisdiction reference row, used to populate filter dropdowns."""

    thana_name: str
    district: str
    division: str
    latitude: float
    longitude: float


# ===========================================================================
# Helpers
# ===========================================================================
def _serialise(row: CrimeIncident) -> IncidentOut:
    return IncidentOut(
        id=row.id,
        title=row.title,
        narrative=row.narrative,
        crime_category=row.crime_category,
        penal_code_tags=list(row.penal_code_tags or []),
        incident_date=row.incident_date,
        thana_name=row.thana_name,
        district=row.district,
        latitude=float(row.latitude),
        longitude=float(row.longitude),
        fir_or_gd=row.fir_or_gd,
        source_platform=row.source_platform,
        source_url=row.source_url,
        source_confidence=row.source_confidence,
        source_handle=row.source_handle,
        verification_level=row.verification_level,
        created_at=row.created_at,
    )


def _apply_filters(
    statement: Select,
    *,
    thana: Optional[str],
    category: Optional[str],
    source_platform: Optional[str],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    search: Optional[str],
) -> Select:
    """Attach every active filter to a SELECT over ``crime_incidents``."""
    if thana:
        statement = statement.where(CrimeIncident.thana_name == thana)
    if category:
        statement = statement.where(CrimeIncident.crime_category == category)
    if source_platform:
        statement = statement.where(
            CrimeIncident.source_platform == source_platform
        )
    if start_date:
        statement = statement.where(CrimeIncident.incident_date >= start_date)
    if end_date:
        statement = statement.where(CrimeIncident.incident_date <= end_date)
    if search:
        pattern = f"%{search.strip()}%"
        statement = statement.where(
            CrimeIncident.title.ilike(pattern)
            | CrimeIncident.narrative.ilike(pattern)
        )
    return statement


def _validate_enums(
    category: Optional[str], source_platform: Optional[str]
) -> None:
    if category and category not in CRIME_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown category. Expected one of: {', '.join(CRIME_CATEGORIES)}",
        )
    if source_platform and source_platform not in SOURCE_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unknown source_platform. Expected one of: "
                f"{', '.join(SOURCE_PLATFORMS)}"
            ),
        )


# ===========================================================================
# Endpoints
# ===========================================================================
@router.get(
    "/feed",
    response_model=FeedOut,
    summary="Paginated incident feed, newest first",
)
async def get_feed(
    session: DbSession,
    thana: Optional[str] = Query(None, description="Exact canonical thana name"),
    category: Optional[str] = Query(None, description="Crime category"),
    source_platform: Optional[str] = Query(
        None, description="news_portal | facebook_public | police_report"
    ),
    start_date: Optional[datetime] = Query(
        None, description="Inclusive lower bound on incident_date (ISO-8601)"
    ),
    end_date: Optional[datetime] = Query(
        None, description="Inclusive upper bound on incident_date (ISO-8601)"
    ),
    search: Optional[str] = Query(
        None, min_length=2, max_length=120, description="Free text over title/narrative"
    ),
    limit: int = Query(50, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
) -> FeedOut:
    """Serve the intelligence feed with every filter the dashboard exposes."""
    _validate_enums(category, source_platform)

    filters = {
        "thana": thana,
        "category": category,
        "source_platform": source_platform,
        "start_date": start_date,
        "end_date": end_date,
        "search": search,
    }

    count_statement = _apply_filters(
        select(func.count()).select_from(CrimeIncident), **filters
    )
    total = int((await session.execute(count_statement)).scalar_one())

    rows_statement = (
        _apply_filters(select(CrimeIncident), **filters)
        .order_by(CrimeIncident.incident_date.desc(), CrimeIncident.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await session.execute(rows_statement)).scalars().all()

    return FeedOut(
        items=[_serialise(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + len(rows)) < total,
    )


@router.get(
    "/geojson",
    summary="Incidents as a GeoJSON FeatureCollection for the map",
)
async def get_geojson(
    session: DbSession,
    thana: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    source_platform: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    days: int = Query(
        30,
        ge=1,
        le=365,
        description="Rolling window applied when start_date is omitted",
    ),
    limit: int = Query(GEOJSON_MAX_FEATURES, ge=1, le=GEOJSON_MAX_FEATURES),
) -> Dict[str, Any]:
    """RFC 7946 FeatureCollection, one Point feature per incident.

    Properties are pre-shaped for the Leaflet popup so the client needs no
    second request to render a marker.
    """
    _validate_enums(category, source_platform)

    effective_start = start_date or (
        datetime.now(timezone.utc) - timedelta(days=days)
    )

    statement = (
        _apply_filters(
            select(CrimeIncident),
            thana=thana,
            category=category,
            source_platform=source_platform,
            start_date=effective_start,
            end_date=end_date,
            search=None,
        )
        .order_by(CrimeIncident.incident_date.desc())
        .limit(limit)
    )

    rows = (await session.execute(statement)).scalars().all()

    features: List[Dict[str, Any]] = []
    for row in rows:
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    # GeoJSON is [longitude, latitude] - not the other way round.
                    "coordinates": [float(row.longitude), float(row.latitude)],
                },
                "properties": {
                    "id": str(row.id),
                    "title": row.title,
                    "narrative": row.narrative,
                    "crime_category": row.crime_category,
                    "penal_code_tags": list(row.penal_code_tags or []),
                    "incident_date": row.incident_date.isoformat(),
                    "thana_name": row.thana_name,
                    "district": row.district,
                    "source_platform": row.source_platform,
                    "source_url": row.source_url,
                    "source_confidence": row.source_confidence,
                    "source_handle": row.source_handle,
                    "verification_level": row.verification_level,
                    "fir_or_gd": row.fir_or_gd,
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "count": len(features),
            "window_start": effective_start.isoformat(),
            "window_end": (end_date or datetime.now(timezone.utc)).isoformat(),
            "truncated": len(features) >= limit,
        },
    }


@router.get(
    "/thanas",
    response_model=List[ThanaOut],
    summary="Jurisdiction reference list for filter dropdowns",
)
async def list_thanas(session: DbSession) -> List[ThanaOut]:
    """Every seeded thana, alphabetically."""
    statement = select(Jurisdiction).order_by(Jurisdiction.thana_name)
    rows = (await session.execute(statement)).scalars().all()
    return [
        ThanaOut(
            thana_name=row.thana_name,
            district=row.district,
            division=row.division,
            latitude=float(row.latitude),
            longitude=float(row.longitude),
        )
        for row in rows
    ]


@router.get(
    "/{incident_id}",
    response_model=IncidentOut,
    summary="Fetch a single incident by id",
)
async def get_incident(incident_id: UUID, session: DbSession) -> IncidentOut:
    """Detail lookup used by permalinks."""
    row = await session.get(CrimeIncident, incident_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
        )
    return _serialise(row)
