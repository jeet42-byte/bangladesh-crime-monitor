"""FastAPI application factory and entrypoint."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

from sqlalchemy import text

from app.api.v1 import analytics, auth, crimes, ingest
from app.core.config import settings
from app.db.database import AsyncSessionLocal, dispose_engine
from app.services.email import describe_backend

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DESCRIPTION = """
OSINT crime-tracking API for Bangladesh.

Read endpoints require a session and are intended for the Bangladesh Crime
Monitor site, not for third-party reuse.

Every record is derived from publicly available reporting and describes an
**allegation as reported**, not an adjudicated finding. Each record links back
to the original source so any claim can be checked against it.
"""



async def _seed_owner() -> None:
    """Create or refresh the owner account from environment configuration.

    The password arrives as an environment variable and is hashed before it
    touches the database. It is never logged. Re-running is safe: an existing
    owner keeps their password unless OWNER_PASSWORD is set to something new.
    """
    from sqlalchemy import func, select

    from app.core.security import hash_password, verify_password
    from app.db.models import User

    if not settings.OWNER_EMAIL:
        return

    email = settings.OWNER_EMAIL.strip().lower()
    credentials_blob = "|".join(auth.OWNER_CREDENTIALS)

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(
                select(User).where(func.lower(User.email) == email)
            )
        ).scalar_one_or_none()

        if existing is None:
            if not settings.OWNER_PASSWORD:
                logger.warning(
                    "OWNER_EMAIL is set but OWNER_PASSWORD is not; the owner "
                    "account was not created."
                )
                return
            session.add(
                User(
                    email=email,
                    username=settings.OWNER_USERNAME,
                    password_hash=hash_password(settings.OWNER_PASSWORD),
                    role="owner",
                    is_verified=True,
                    verified_at=datetime.now(timezone.utc),
                    display_name=auth.OWNER_DISPLAY_NAME,
                    credentials=credentials_blob,
                )
            )
            await session.commit()
            logger.info("Owner account created for %s", email)
            return

        # Keep role and attribution in step with the code, and rotate the
        # password only when the configured one differs from what is stored.
        existing.role = "owner"
        existing.is_verified = True
        existing.display_name = auth.OWNER_DISPLAY_NAME
        existing.credentials = credentials_blob
        # Only ever set the password when the account has none that works and
        # OWNER_PASSWORD_FORCE is explicitly requested. Otherwise a stale
        # value left in the environment would silently overwrite a password
        # the owner changed through the app, on every single restart.
        if settings.OWNER_PASSWORD and settings.OWNER_PASSWORD_FORCE:
            if not verify_password(settings.OWNER_PASSWORD, existing.password_hash):
                existing.password_hash = hash_password(settings.OWNER_PASSWORD)
                logger.warning(
                    "Owner password reset from OWNER_PASSWORD because "
                    "OWNER_PASSWORD_FORCE is set. Unset it once you have "
                    "signed in and changed the password."
                )
        await session.commit()
        logger.info("Owner account refreshed for %s", email)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Verify the database is reachable on boot and drain the pool on exit.

    A failed health check is logged, not raised: Render restarts a container
    that exits during startup, and a cold Neon endpoint can take a few seconds
    to wake. Serving 503s from the health endpoint is more useful than a crash
    loop.
    """
    logger.info("Starting %s", settings.PROJECT_NAME)
    try:
        async with AsyncSessionLocal() as session:
            version = (await session.execute(text("SELECT version()"))).scalar_one()
            incidents = (
                await session.execute(text("SELECT COUNT(*) FROM crime_incidents"))
            ).scalar_one()
        logger.info("Database reachable: %s", str(version).split(",")[0])
        logger.info("crime_incidents rows: %s", incidents)
        app.state.db_healthy = True
    except Exception as exc:  # noqa: BLE001 - never crash-loop on a cold DB
        logger.error("Database health check failed at startup: %s", exc)
        app.state.db_healthy = False

    try:
        await _seed_owner()
    except Exception as exc:  # noqa: BLE001 - never block startup on seeding
        logger.error("Owner seeding failed: %s", exc)

    logger.info("Email delivery backend: %s", describe_backend())

    yield

    logger.info("Shutting down; disposing connection pool")
    await dispose_engine()


def create_app() -> FastAPI:
    """Build the application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=DESCRIPTION,
        version="1.0.0",
        lifespan=lifespan,
        # Publishing the schema of a closed API hands a scraper the full
        # endpoint map, so the docs are off unless explicitly enabled.
        docs_url="/docs" if settings.ENABLE_DOCS else None,
        redoc_url="/redoc" if settings.ENABLE_DOCS else None,
        openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        # Sessions are Bearer tokens in the Authorization header, not cookies,
        # so credentialed CORS is not needed and SameSite/CSRF questions do
        # not arise. The trade-off is that the token is readable by scripts on
        # the page; it is short-lived and grants no privileged data access.
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Ingest-Key", "Authorization"],
        max_age=600,
    )

    @app.middleware("http")
    async def add_timing_header(request: Request, call_next):
        """Expose server-side latency; handy when Neon is cold-starting."""
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
        return response

    app.include_router(crimes.router, prefix=settings.API_V1_PREFIX)
    app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
    app.include_router(ingest.router, prefix=settings.API_V1_PREFIX)
    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)

    @app.get("/", tags=["meta"], summary="Service banner")
    async def root() -> dict:
        return {
            "service": settings.PROJECT_NAME,
            "version": "1.0.0",
            "docs": "/docs" if settings.ENABLE_DOCS else None,
            "disclaimer": (
                "Records describe allegations as publicly reported, not "
                "adjudicated findings."
            ),
        }

    @app.get("/health", tags=["meta"], summary="Liveness and database probe")
    async def health() -> JSONResponse:
        """Round-trips a query so an unreachable Neon endpoint shows up here."""
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            return JSONResponse(
                {
                    "status": "ok",
                    "database": "reachable",
                    "email": describe_backend(),
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("health check failed: %s", exc)
            return JSONResponse(
                {"status": "degraded", "database": "unreachable", "detail": str(exc)},
                status_code=503,
            )

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover - local development entrypoint
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
