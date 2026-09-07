"""FastAPI application factory and entrypoint."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import analytics, crimes, ingest
from app.core.config import settings
from app.db.database import AsyncSessionLocal, dispose_engine

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DESCRIPTION = """
Public OSINT crime-tracking API for Bangladesh.

Every record is derived from **publicly available reporting** and describes an
**allegation as reported**, not an adjudicated finding. Records carry a
`source_confidence` score and a link back to the original source so any claim
can be checked against it.

* `GET /api/v1/crimes/feed` - paginated incident feed
* `GET /api/v1/crimes/geojson` - map layer as a GeoJSON FeatureCollection
* `GET /api/v1/analytics/*` - aggregates for charts and metric cards
* `POST /api/v1/ingest/batch` - write path, requires `X-Ingest-Key`
"""


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
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=False,  # the API is public and cookie-free
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Ingest-Key"],
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

    @app.get("/", tags=["meta"], summary="Service banner")
    async def root() -> dict:
        return {
            "service": settings.PROJECT_NAME,
            "version": "1.0.0",
            "docs": "/docs",
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
            return JSONResponse({"status": "ok", "database": "reachable"})
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
