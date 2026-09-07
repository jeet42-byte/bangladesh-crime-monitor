"""Aggregate endpoints backing the metric cards and the charts."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import Integer, and_, cast, func, select

from app.api.deps import DbSession, require_reader
from app.db.models import CrimeIncident, public_incidents

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    # Applied at the router so a new endpoint cannot be added without the gate.
    dependencies=[Depends(require_reader)],
)

# All calendar bucketing happens in Bangladesh Standard Time so a chart tick
# labelled "12 Mar" means the Bangladeshi day, not the UTC one.
BST_TZ = "Asia/Dhaka"


# ===========================================================================
# Response models
# ===========================================================================
class SummaryOut(BaseModel):
    """Headline numbers for the four metric cards."""

    total_30d: int
    total_7d: int
    total_previous_7d: int
    change_7d_pct: float
    top_category: Optional[str]
    top_category_count: int
    highest_risk_thana: Optional[str]
    highest_risk_thana_count: int
    verified_source_count: int
    verified_source_ratio: float
    total_all_time: int
    last_ingest_at: Optional[datetime]
    window_days: int


class TrendPoint(BaseModel):
    """One day on the trend line."""

    date: date
    count: int


class TrendsOut(BaseModel):
    points: List[TrendPoint]
    window_days: int
    total: int
    daily_average: float


class CategoryCount(BaseModel):
    category: str
    count: int
    share_pct: float


class CategoriesOut(BaseModel):
    categories: List[CategoryCount]
    window_days: int
    total: int


class ThanaCount(BaseModel):
    thana_name: str
    count: int
    latitude: float
    longitude: float


class ThanaRankOut(BaseModel):
    thanas: List[ThanaCount]
    window_days: int


# ===========================================================================
# Helpers
# ===========================================================================
def _bst_date(column):
    """Cast a timestamptz column to a BST calendar date."""
    return func.date(func.timezone(BST_TZ, column))


def _window_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


# ===========================================================================
# Endpoints
# ===========================================================================
@router.get(
    "/summary",
    response_model=SummaryOut,
    summary="Headline aggregates for the command centre metric cards",
)
async def get_summary(
    session: DbSession,
    days: int = Query(30, ge=7, le=365, description="Primary rolling window"),
) -> SummaryOut:
    """Compute every metric card value in three round trips.

    The 7-day comparison uses the two adjacent windows [now-7d, now] and
    [now-14d, now-7d], so the percentage is a like-for-like week over week.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    # --- Trip 1: counters over the primary window ------------------------
    counters = (
        await session.execute(
            select(
                func.count().filter(CrimeIncident.incident_date >= window_start),
                func.count().filter(CrimeIncident.incident_date >= week_start),
                func.count().filter(
                    and_(
                        CrimeIncident.incident_date >= prev_week_start,
                        CrimeIncident.incident_date < week_start,
                    )
                ),
                func.count().filter(
                    and_(
                        CrimeIncident.incident_date >= window_start,
                        CrimeIncident.source_confidence >= 80,
                    )
                ),
                func.count(),
                func.max(CrimeIncident.created_at),
            )
            # These are conditional aggregates over the whole table rather
            # than a windowed query, so the visibility filter has to be
            # attached explicitly - there is no .where() here to join.
            .select_from(CrimeIncident)
            .where(public_incidents())
        )
    ).one()

    (
        total_window,
        total_7d,
        total_prev_7d,
        verified_count,
        total_all_time,
        last_ingest_at,
    ) = counters

    # --- Trip 2: dominant category ---------------------------------------
    category_row = (
        await session.execute(
            select(CrimeIncident.crime_category, func.count().label("n"))
            .where(public_incidents(), CrimeIncident.incident_date >= window_start)
            .group_by(CrimeIncident.crime_category)
            .order_by(func.count().desc())
            .limit(1)
        )
    ).first()

    # --- Trip 3: highest-volume thana ------------------------------------
    thana_row = (
        await session.execute(
            select(CrimeIncident.thana_name, func.count().label("n"))
            .where(public_incidents(), CrimeIncident.incident_date >= window_start)
            .group_by(CrimeIncident.thana_name)
            .order_by(func.count().desc())
            .limit(1)
        )
    ).first()

    if total_prev_7d:
        change_pct = (total_7d - total_prev_7d) / total_prev_7d * 100.0
    else:
        # No baseline to divide by: report growth only if something happened.
        change_pct = 100.0 if total_7d else 0.0

    return SummaryOut(
        total_30d=int(total_window or 0),
        total_7d=int(total_7d or 0),
        total_previous_7d=int(total_prev_7d or 0),
        change_7d_pct=round(change_pct, 1),
        top_category=category_row[0] if category_row else None,
        top_category_count=int(category_row[1]) if category_row else 0,
        highest_risk_thana=thana_row[0] if thana_row else None,
        highest_risk_thana_count=int(thana_row[1]) if thana_row else 0,
        verified_source_count=int(verified_count or 0),
        verified_source_ratio=(
            round((verified_count or 0) / total_window * 100.0, 1)
            if total_window
            else 0.0
        ),
        total_all_time=int(total_all_time or 0),
        last_ingest_at=last_ingest_at,
        window_days=days,
    )


@router.get(
    "/trends",
    response_model=TrendsOut,
    summary="Daily incident counts for the trend chart",
)
async def get_trends(
    session: DbSession,
    days: int = Query(30, ge=7, le=365),
    category: Optional[str] = Query(None),
    thana: Optional[str] = Query(None),
) -> TrendsOut:
    """Chronological daily counts, gap-filled so the line never breaks.

    PostgreSQL returns no row for a day with zero incidents. A charting
    library reading that as "no data" would draw a straight segment across
    the gap and overstate the quiet period, so zero days are materialised
    here rather than in the browser.
    """
    window_start = _window_start(days)

    statement = (
        select(_bst_date(CrimeIncident.incident_date).label("day"), func.count())
        .where(public_incidents(), CrimeIncident.incident_date >= window_start)
        .group_by("day")
        .order_by("day")
    )
    if category:
        statement = statement.where(CrimeIncident.crime_category == category)
    if thana:
        statement = statement.where(CrimeIncident.thana_name == thana)

    rows = (await session.execute(statement)).all()
    counts = {row[0]: int(row[1]) for row in rows}

    today_bst = (datetime.now(timezone.utc) + timedelta(hours=6)).date()
    points = [
        TrendPoint(
            date=today_bst - timedelta(days=offset),
            count=counts.get(today_bst - timedelta(days=offset), 0),
        )
        for offset in range(days - 1, -1, -1)
    ]

    total = sum(point.count for point in points)
    return TrendsOut(
        points=points,
        window_days=days,
        total=total,
        daily_average=round(total / days, 2) if days else 0.0,
    )


@router.get(
    "/categories",
    response_model=CategoriesOut,
    summary="Incident counts grouped by crime category",
)
async def get_categories(
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
    thana: Optional[str] = Query(None),
) -> CategoriesOut:
    """Category breakdown, descending, with each slice's share of the window."""
    window_start = _window_start(days)

    statement = (
        select(CrimeIncident.crime_category, func.count().label("n"))
        .where(public_incidents(), CrimeIncident.incident_date >= window_start)
        .group_by(CrimeIncident.crime_category)
        .order_by(func.count().desc())
    )
    if thana:
        statement = statement.where(CrimeIncident.thana_name == thana)

    rows = (await session.execute(statement)).all()
    total = sum(int(row[1]) for row in rows)

    return CategoriesOut(
        categories=[
            CategoryCount(
                category=row[0],
                count=int(row[1]),
                share_pct=round(int(row[1]) / total * 100.0, 1) if total else 0.0,
            )
            for row in rows
        ],
        window_days=days,
        total=total,
    )


@router.get(
    "/thanas",
    response_model=ThanaRankOut,
    summary="Thanas ranked by incident volume (heat ranking)",
)
async def get_thana_ranking(
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(15, ge=1, le=50),
) -> ThanaRankOut:
    """Volume leaderboard, with centroids so the client can draw a heat layer."""
    window_start = _window_start(days)

    statement = (
        select(
            CrimeIncident.thana_name,
            func.count().label("n"),
            func.avg(CrimeIncident.latitude).label("lat"),
            func.avg(CrimeIncident.longitude).label("lon"),
        )
        .where(public_incidents(), CrimeIncident.incident_date >= window_start)
        .group_by(CrimeIncident.thana_name)
        .order_by(func.count().desc())
        .limit(limit)
    )

    rows = (await session.execute(statement)).all()

    return ThanaRankOut(
        thanas=[
            ThanaCount(
                thana_name=row[0],
                count=int(row[1]),
                latitude=float(row[2]),
                longitude=float(row[3]),
            )
            for row in rows
        ],
        window_days=days,
    )


@router.get(
    "/hourly",
    summary="Incident distribution across the 24-hour clock (BST)",
)
async def get_hourly_distribution(
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
) -> dict:
    """When incidents happen, bucketed by hour of the Bangladeshi day."""
    window_start = _window_start(days)

    hour_expression = cast(
        func.extract("hour", func.timezone(BST_TZ, CrimeIncident.incident_date)),
        Integer,
    ).label("hour")

    rows = (
        await session.execute(
            select(hour_expression, func.count())
            .where(public_incidents(), CrimeIncident.incident_date >= window_start)
            .group_by("hour")
            .order_by("hour")
        )
    ).all()

    counts = {int(row[0]): int(row[1]) for row in rows}
    return {
        "window_days": days,
        "hours": [{"hour": hour, "count": counts.get(hour, 0)} for hour in range(24)],
    }


@router.get(
    "/sources",
    summary="Ingestion mix by source platform",
)
async def get_source_mix(
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
) -> dict:
    """Where the data came from - the transparency number on /methodology."""
    window_start = _window_start(days)

    rows = (
        await session.execute(
            select(
                CrimeIncident.source_platform,
                func.count().label("n"),
                func.avg(
                    cast(CrimeIncident.source_confidence, Integer)
                ).label("avg_confidence"),
            )
            .where(public_incidents(), CrimeIncident.incident_date >= window_start)
            .group_by(CrimeIncident.source_platform)
            .order_by(func.count().desc())
        )
    ).all()

    total = sum(int(row[1]) for row in rows)

    return {
        "window_days": days,
        "total": total,
        "sources": [
            {
                "source_platform": row[0],
                "label": {
                    "police_report": "Official",
                    "news_portal": "Verified News",
                    "facebook_public": "Public Social",
                }.get(row[0], "Unclassified"),
                "count": int(row[1]),
                "share_pct": round(int(row[1]) / total * 100.0, 1) if total else 0.0,
                "avg_confidence": round(float(row[2] or 0), 1),
            }
            for row in rows
        ],
    }
