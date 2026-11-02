"""Tell subscribed browsers about new reports near their chosen area."""

from __future__ import annotations

import logging
import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CrimeIncident, PushSubscription, public_incidents
from app.services import webpush

logger = logging.getLogger(__name__)

#: At most one notification per subscription in this interval.
MIN_INTERVAL = timedelta(hours=6)
#: A new subscription is not told about the backlog, only what comes next;
#: and a long outage does not produce a flood when it ends.
MAX_LOOKBACK = timedelta(hours=48)
EARTH_KM = 6371.0


def _km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(math.sqrt(a))


def message_for(label: str, incidents: list[CrimeIncident]) -> Dict[str, Any]:
    kinds = Counter(i.crime_category for i in incidents)
    summary = ", ".join(f"{name}" + (f" ×{n}" if n > 1 else "") for name, n in kinds.most_common(3))
    count = len(incidents)
    return {
        "title": f"{count} new report{'s' if count != 1 else ''} near {label}",
        "body": f"{summary}. Tap to see them on My Area." if count > 1 else f"{incidents[0].title[:120]}",
        "url": "/area",
        "tag": "bcm-area",
    }


async def dispatch(session: AsyncSession, *, dry_run: bool = False) -> Dict[str, int]:
    now = datetime.now(timezone.utc)
    key = await webpush.vapid_key(session)
    subs = (await session.execute(select(PushSubscription))).scalars().all()
    stats = {"subscriptions": len(subs), "notified": 0, "quiet": 0, "waiting": 0, "removed": 0, "failed": 0}
    if not subs:
        return stats

    earliest = min(max(s.last_checked_at, now - MAX_LOOKBACK) for s in subs)
    fresh = (
        await session.execute(
            select(CrimeIncident)
            .where(public_incidents(), CrimeIncident.created_at > earliest)
            .order_by(CrimeIncident.created_at.desc())
        )
    ).scalars().all()

    gone: list[str] = []
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as client:
        for sub in subs:
            if sub.last_notified_at and now - sub.last_notified_at < MIN_INTERVAL:
                stats["waiting"] += 1
                continue
            since = max(sub.last_checked_at, now - MAX_LOOKBACK)
            nearby = [
                i for i in fresh
                if i.created_at > since
                and _km(sub.lat, sub.lon, float(i.latitude), float(i.longitude)) <= sub.radius_km
            ]
            sub.last_checked_at = now
            if not nearby:
                stats["quiet"] += 1
                continue
            if dry_run:
                stats["notified"] += 1
                continue
            try:
                await webpush.send(
                    client, key, endpoint=sub.endpoint, p256dh=sub.p256dh, auth=sub.auth,
                    message=message_for(sub.label, nearby),
                )
                sub.last_notified_at = now
                stats["notified"] += 1
            except webpush.PushGone:
                gone.append(sub.endpoint)
            except Exception as exc:  # noqa: BLE001 - one bad endpoint must not stop the rest
                logger.warning("push to %s failed: %s", sub.endpoint[:60], exc)
                stats["failed"] += 1

    if gone:
        await session.execute(delete(PushSubscription).where(PushSubscription.endpoint.in_(gone)))
        stats["removed"] = len(gone)
    if not dry_run:
        await session.commit()
    logger.info("alerts dispatch: %s", stats)
    return stats
