"""Shared FastAPI dependencies."""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db

# Re-exported so routers depend on one import site.
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def require_ingest_key(
    x_ingest_key: Annotated[str | None, Header(alias="X-Ingest-Key")] = None,
) -> str:
    """Authorise a write to the ingestion endpoint.

    Comparison uses ``hmac.compare_digest`` so a caller cannot recover the key
    one byte at a time from response-timing differences.
    """
    if not settings.INGEST_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ingestion is disabled: INGEST_API_KEY is not configured.",
        )

    if not x_ingest_key or not hmac.compare_digest(
        x_ingest_key, settings.INGEST_API_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Ingest-Key header.",
            headers={"WWW-Authenticate": "X-Ingest-Key"},
        )

    return x_ingest_key


IngestAuth = Annotated[str, Depends(require_ingest_key)]
