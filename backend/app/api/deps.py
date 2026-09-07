"""Shared FastAPI dependencies."""

from __future__ import annotations

import hmac
import uuid
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.db.models import User

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


# ===========================================================================
# Session authentication
# ===========================================================================
_bearer = HTTPBearer(auto_error=False)


async def _user_from_token(
    session: AsyncSession,
    credentials: HTTPAuthorizationCredentials | None,
) -> "User | None":
    """Resolve a bearer token to a live user row, or None."""
    from app.core.security import decode_access_token
    from app.db.models import User

    if credentials is None or not credentials.credentials:
        return None

    claims = decode_access_token(credentials.credentials)
    if not claims:
        return None

    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (ValueError, TypeError):
        return None

    user = await session.get(User, user_id)

    # The token is stateless, so re-check state that may have changed since
    # it was issued: a deactivated account must stop working immediately
    # rather than at token expiry.
    if user is None or not user.is_active or not user.is_verified:
        return None
    return user


async def get_optional_user(
    session: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer)
    ] = None,
) -> "User | None":
    """The signed-in user, or None for a guest.

    Guest access is a first-class mode on this site: every read endpoint works
    without a token, so this returns None rather than raising.
    """
    return await _user_from_token(session, credentials)


async def get_current_user(
    session: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer)
    ] = None,
) -> "User":
    """Require a signed-in user."""
    user = await _user_from_token(session, credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_owner(user: Annotated["User", Depends(get_current_user)]) -> "User":
    """Require the site owner."""
    if user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required.",
        )
    return user


CurrentUser = Annotated["User", Depends(get_current_user)]
OptionalUser = Annotated["User | None", Depends(get_optional_user)]
OwnerUser = Annotated["User", Depends(require_owner)]
