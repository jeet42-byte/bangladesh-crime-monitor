"""Shared FastAPI dependencies."""

from __future__ import annotations

import hmac
import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db

# Imported at runtime, not under TYPE_CHECKING.
#
# FastAPI resolves a dependency function's own signature in the module where
# that function is defined. With User only available to the type checker,
# `require_owner(user: Annotated["User", Depends(get_current_user)])` could
# not be resolved here: FastAPI gave up on the dependency and treated `user`
# as a required query parameter, so the route returned 422 for a missing
# param and the owner check never ran. It looked correct at every call site,
# and `/auth/me` worked because auth.py happens to have User in scope.
#
# There is no cycle to guard against - models imports only db.database, which
# imports nothing from app.api.
from app.db.models import User

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


# ===========================================================================
# Read access
# ===========================================================================
async def require_reader(
    session: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer)
    ] = None,
) -> str:
    """Gate the read endpoints.

    Returns the caller's role: "owner", "member" or "guest".

    When ``PUBLIC_API`` is true this is a no-op and the endpoints behave as an
    open dataset. When it is false a caller must present either a signed-in
    account's token or a guest token issued by /auth/guest.

    This is a deterrent, not a wall. Guest tokens are issued to anyone who
    asks, because the site's own pages need them - so a determined scraper can
    obtain one exactly as the browser does. It stops the API being trivially
    consumable from a URL, and nothing stronger is achievable for data a
    public web page renders.
    """
    from app.core.security import decode_access_token
    from app.db.models import User

    if settings.PUBLIC_API:
        return "public"

    denied = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "This API requires a session. Use the site at "
            "https://bangladesh-crime-monitor.vercel.app, or sign in for an "
            "account token."
        ),
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise denied

    claims = decode_access_token(credentials.credentials)
    if not claims:
        raise denied

    role = str(claims.get("role") or "")
    if role == "guest":
        return "guest"

    # An account token still has to correspond to a live, active user: a
    # deactivated account must lose access immediately, not at token expiry.
    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (ValueError, TypeError):
        raise denied from None

    user = await session.get(User, user_id)
    if user is None or not user.is_active or not user.is_verified:
        raise denied

    return user.role


ReaderRole = Annotated[str, Depends(require_reader)]
