"""My Area: what has been reported near one place.

Everything is radius-based from a point, so the same query serves a Dhaka
thana, a rural upazila and a phone's own location. Records are placed at
thana or upazila level where the reporting allows it, and at the district
centroid where it does not; the response counts how many records in the
radius are district-level so the page can say how precise the picture is.
"""

from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DbSession, require_reader
from app.api.v1.crimes import IncidentOut, _serialise
from app.db.models import CrimeIncident, public_incidents
from app.utils.thana_coordinates import (
    _UPAZILA_LOOKUP,
    DISTRICT_COORDINATES,
    THANA_COORDINATES,
)

router = APIRouter(
    prefix="/area",
    tags=["area"],
    dependencies=[Depends(require_reader)],
)

EARTH_KM = 6371.0
RECENT_LIMIT = 60


class PlaceOut(BaseModel):
    name: str
    kind: str  # "thana" (DMP), "upazila", "district"
    district: str
    lat: float
    lon: float


class CategoryCount(BaseModel):
    category: str
    count: int
    previous: int


class WeekCount(BaseModel):
    week_start: str
    count: int


class AreaSummaryOut(BaseModel):
    lat: float
    lon: float
    radius_km: float
    window_days: int
    total: int
    previous_total: int
    district_level: int
    categories: List[CategoryCount]
    weekly: List[WeekCount]
    recent: List[IncidentOut]


def _km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(math.sqrt(a))


def _places() -> List[PlaceOut]:
    places: Dict[tuple, PlaceOut] = {}
    for name, loc in THANA_COORDINATES.items():
        places[("thana", name)] = PlaceOut(
            name=name, kind="thana", district=loc["district"], lat=loc["lat"], lon=loc["lon"]
        )
    for entries in _UPAZILA_LOOKUP.values():
        for loc in entries:
            key = ("upazila", loc["thana_name"], loc["district"])
            places.setdefault(key, PlaceOut(
                name=loc["thana_name"], kind="upazila", district=loc["district"],
                lat=loc["lat"], lon=loc["lon"],
            ))
    for name, (lat, lon) in DISTRICT_COORDINATES.items():
        places[("district", name)] = PlaceOut(name=name, kind="district", district=name, lat=lat, lon=lon)
    order = {"thana": 0, "upazila": 1, "district": 2}
    return sorted(places.values(), key=lambda p: (p.name.lower(), order[p.kind]))


_PLACES_CACHE: List[PlaceOut] = []


@router.get("/places", response_model=List[PlaceOut], summary="Every selectable place")
async def list_places() -> List[PlaceOut]:
    global _PLACES_CACHE
    if not _PLACES_CACHE:
        _PLACES_CACHE = _places()
    return _PLACES_CACHE


@router.get("/summary", response_model=AreaSummaryOut, summary="Reported incidents near a point")
async def area_summary(
    session: DbSession,
    lat: float = Query(..., ge=20.5, le=26.7),
    lon: float = Query(..., ge=88.0, le=92.7),
    radius_km: float = Query(5.0, ge=0.5, le=50.0),
    days: int = Query(30, ge=7, le=365),
) -> AreaSummaryOut:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    previous_start = start - timedelta(days=days)

    # Bounding box first so Postgres does the coarse cut; exact distance below.
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(0.2, math.cos(math.radians(lat))))
    rows = (
        await session.execute(
            select(CrimeIncident)
            .where(
                public_incidents(),
                CrimeIncident.incident_date >= previous_start,
                CrimeIncident.latitude.between(lat - dlat, lat + dlat),
                CrimeIncident.longitude.between(lon - dlon, lon + dlon),
            )
            .order_by(CrimeIncident.incident_date.desc())
        )
    ).scalars().all()
    inside = [r for r in rows if _km(lat, lon, float(r.latitude), float(r.longitude)) <= radius_km]

    def _aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    current = [r for r in inside if _aware(r.incident_date) >= start]
    previous = [r for r in inside if _aware(r.incident_date) < start]

    district_names = set(DISTRICT_COORDINATES)
    now_counts = Counter(r.crime_category for r in current)
    before_counts = Counter(r.crime_category for r in previous)
    categories = [
        CategoryCount(category=c, count=now_counts.get(c, 0), previous=before_counts.get(c, 0))
        for c in sorted(set(now_counts) | set(before_counts), key=lambda c: -now_counts.get(c, 0))
    ]

    weeks: Counter = Counter()
    for r in current:
        d = _aware(r.incident_date).date()
        weeks[(d - timedelta(days=d.weekday())).isoformat()] += 1

    return AreaSummaryOut(
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        window_days=days,
        total=len(current),
        previous_total=len(previous),
        district_level=sum(1 for r in current if r.thana_name in district_names),
        categories=categories,
        weekly=[WeekCount(week_start=k, count=v) for k, v in sorted(weeks.items())],
        recent=[_serialise(r) for r in current[:RECENT_LIMIT]],
    )
