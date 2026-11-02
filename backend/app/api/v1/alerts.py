"""Area alerts: browsers subscribe to push notifications for one area."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select

from app.api.deps import DbSession, require_reader
from app.api.v1.auth import _client_ip, _enforce_rate_limit
from app.db.models import PushSubscription
from app.services import webpush

router = APIRouter(prefix="/alerts", tags=["alerts"], dependencies=[Depends(require_reader)])

#: A modest ceiling keeps one script from filling the table.
MAX_SUBSCRIPTIONS = 50_000


class KeysIn(BaseModel):
    p256dh: str = Field(..., min_length=40, max_length=200)
    auth: str = Field(..., min_length=10, max_length=64)


class SubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=20, max_length=1000)
    keys: KeysIn
    label: str = Field(..., min_length=2, max_length=120)
    lat: float = Field(..., ge=20.5, le=26.7)
    lon: float = Field(..., ge=88.0, le=92.7)
    radius_km: float = Field(..., ge=0.5, le=50)


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=20, max_length=1000)


@router.get("/vapid-public-key", summary="Key the browser needs to subscribe")
async def vapid_public_key(session: DbSession) -> dict:
    return {"key": webpush.public_key_b64(await webpush.vapid_key(session))}


@router.post("/subscribe", summary="Subscribe this browser to alerts for one area")
async def subscribe(payload: SubscribeIn, request: Request, session: DbSession) -> dict:
    if not webpush.allowed_endpoint(payload.endpoint):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Not a recognised push service endpoint.")
    await _enforce_rate_limit(session, "alerts", _client_ip(request))
    existing = (
        await session.execute(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    ).scalar_one_or_none()
    if existing is None:
        total = int((await session.execute(select(func.count()).select_from(PushSubscription))).scalar_one())
        if total >= MAX_SUBSCRIPTIONS:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Alerts are full right now.")
        existing = PushSubscription(endpoint=payload.endpoint)
        session.add(existing)
    existing.p256dh = payload.keys.p256dh
    existing.auth = payload.keys.auth
    existing.label = payload.label
    existing.lat = payload.lat
    existing.lon = payload.lon
    existing.radius_km = payload.radius_km
    await session.commit()
    return {"subscribed": True, "label": payload.label}


@router.post("/unsubscribe", summary="Stop alerts for this browser")
async def unsubscribe(payload: UnsubscribeIn, session: DbSession) -> dict:
    result = await session.execute(delete(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    await session.commit()
    return {"removed": result.rowcount or 0}
