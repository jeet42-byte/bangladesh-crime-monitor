"""Async SQLAlchemy engine and session factory for Neon PostgreSQL."""

from __future__ import annotations

import ssl
from typing import Any, AsyncGenerator
from urllib.parse import urlsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", ""})


def _is_local(database_url: str) -> bool:
    """True when the URL points at a database on this machine."""
    host = urlsplit(database_url).hostname or ""
    return host in LOCAL_HOSTS


def _build_ssl_context() -> ssl.SSLContext:
    """TLS context for Neon.

    Neon terminates TLS with a publicly trusted certificate, so the default
    context - which verifies the hostname against the system trust store -
    is both correct and secure. We build it explicitly because asyncpg does
    not understand libpq's ``sslmode=require`` query parameter, which is
    stripped in ``Settings._normalise_driver``.
    """
    context = ssl.create_default_context()
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED
    return context


def _connect_args() -> dict[str, Any]:
    """asyncpg connect arguments, adjusted for local vs. hosted databases."""
    args: dict[str, Any] = {
        # Neon's pooled endpoint runs PgBouncer in transaction mode, which
        # cannot support server-side prepared statements.
        "statement_cache_size": 0,
        "server_settings": {"application_name": "bd-crime-monitor-api"},
    }

    # A development Postgres on this machine generally has no TLS listener at
    # all, and demanding one there fails the connection outright. Anything
    # remote - Neon, Supabase, a managed instance - must still be verified.
    if not _is_local(settings.DATABASE_URL):
        args["ssl"] = _build_ssl_context()

    return args


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,          # survives Neon's idle-connection reaping
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
    connect_args=_connect_args(),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a session bound to the request scope."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Close every pooled connection - called from the app lifespan."""
    await engine.dispose()
