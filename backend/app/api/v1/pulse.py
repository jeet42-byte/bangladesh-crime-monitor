"""Public Pulse read endpoints: aggregated reaction to viral videos."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DbSession, require_reader
from app.db.models import PULSE_TOPIC_TYPES, PulseTopic

router = APIRouter(
    prefix="/pulse",
    tags=["pulse"],
    dependencies=[Depends(require_reader)],
)

SORTS = ("views", "negative", "recent", "comments")


class KeyView(BaseModel):
    view: str
    share: float


class TopicOut(BaseModel):
    id: UUID
    platform: str
    video_id: str
    url: str
    title: str
    channel: Optional[str]
    published_at: Optional[datetime]
    discovered_via: str
    view_count: Optional[int]
    like_count: Optional[int]
    comment_count: Optional[int]
    comments_analysed: int
    topic: str
    topic_type: str
    crime_category: Optional[str]
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    emotions: Dict[str, float]
    stance_authorities: str
    themes: List[str]
    flags: List[str]
    summary: str
    key_views: List[KeyView]
    history: List[dict]
    first_seen_at: datetime
    analysed_at: datetime


class TopicsOut(BaseModel):
    items: List[TopicOut]
    total: int


class PulseSummaryOut(BaseModel):
    window_days: int
    topics: int
    comments_analysed: int
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    emotions: Dict[str, float]
    topic_types: Dict[str, int]
    stances: Dict[str, int]
    flags: Dict[str, int]
    top_themes: List[Dict[str, object]]
    last_analysed_at: Optional[datetime]


def _serialise(row: PulseTopic) -> TopicOut:
    return TopicOut(
        id=row.id,
        platform=row.platform,
        video_id=row.video_id,
        url=row.url,
        title=row.title,
        channel=row.channel,
        published_at=row.published_at,
        discovered_via=row.discovered_via,
        view_count=row.view_count,
        like_count=row.like_count,
        comment_count=row.comment_count,
        comments_analysed=row.comments_analysed,
        topic=row.topic,
        topic_type=row.topic_type,
        crime_category=row.crime_category,
        positive_pct=float(row.positive_pct),
        neutral_pct=float(row.neutral_pct),
        negative_pct=float(row.negative_pct),
        emotions={k: float(v) for k, v in (row.emotions or {}).items()},
        stance_authorities=row.stance_authorities,
        themes=list(row.themes or []),
        flags=list(row.flags or []),
        summary=row.summary,
        key_views=[KeyView(**v) for v in (row.key_views or []) if isinstance(v, dict) and "view" in v],
        history=list(row.history or []),
        first_seen_at=row.first_seen_at,
        analysed_at=row.analysed_at,
    )


async def _window(session: DbSession, days: int, topic_type: Optional[str]) -> List[PulseTopic]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    statement = select(PulseTopic).where(PulseTopic.analysed_at >= since)
    if topic_type:
        statement = statement.where(PulseTopic.topic_type == topic_type)
    return list((await session.execute(statement)).scalars().all())


@router.get("/topics", response_model=TopicsOut, summary="Viral topics with public reaction")
async def list_topics(
    session: DbSession,
    days: int = Query(7, ge=1, le=90),
    topic_type: Optional[str] = Query(None),
    sort: str = Query("views"),
    limit: int = Query(60, ge=1, le=200),
) -> TopicsOut:
    if topic_type and topic_type not in PULSE_TOPIC_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"topic_type must be one of {PULSE_TOPIC_TYPES}")
    if sort not in SORTS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"sort must be one of {SORTS}")
    rows = await _window(session, days, topic_type)
    key = {
        "views": lambda r: r.view_count or 0,
        "negative": lambda r: float(r.negative_pct),
        "recent": lambda r: r.analysed_at,
        "comments": lambda r: r.comments_analysed,
    }[sort]
    rows.sort(key=key, reverse=True)
    return TopicsOut(items=[_serialise(r) for r in rows[:limit]], total=len(rows))


@router.get("/summary", response_model=PulseSummaryOut, summary="Overall public mood")
async def summary(
    session: DbSession,
    days: int = Query(7, ge=1, le=90),
    include_entertainment: bool = Query(False),
) -> PulseSummaryOut:
    rows = await _window(session, days, None)
    if not include_entertainment:
        rows = [r for r in rows if r.topic_type not in ("entertainment", "sports")]

    # Weighted by comments analysed, so a video with 200 comments counts for
    # more than one with 30 - the mood of the crowd, not of the video list.
    weight = sum(r.comments_analysed for r in rows) or 1
    def avg(attr: str) -> float:
        return round(sum(float(getattr(r, attr)) * r.comments_analysed for r in rows) / weight, 1)

    emotions: Counter = Counter()
    for r in rows:
        for name, share in (r.emotions or {}).items():
            emotions[name] += float(share) * r.comments_analysed
    themes: Counter = Counter(t.lower() for r in rows for t in (r.themes or []))

    return PulseSummaryOut(
        window_days=days,
        topics=len(rows),
        comments_analysed=sum(r.comments_analysed for r in rows),
        positive_pct=avg("positive_pct") if rows else 0.0,
        neutral_pct=avg("neutral_pct") if rows else 0.0,
        negative_pct=avg("negative_pct") if rows else 0.0,
        emotions={k: round(v / weight, 3) for k, v in emotions.most_common()},
        topic_types=dict(Counter(r.topic_type for r in rows).most_common()),
        stances=dict(Counter(r.stance_authorities for r in rows).most_common()),
        flags=dict(Counter(f for r in rows for f in (r.flags or [])).most_common()),
        top_themes=[{"theme": t, "topics": n} for t, n in themes.most_common(12)],
        last_analysed_at=max((r.analysed_at for r in rows), default=None),
    )
