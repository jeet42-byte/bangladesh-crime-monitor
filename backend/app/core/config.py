"""Application settings, loaded from the environment via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration.

    Every value can be supplied either as a process environment variable
    (Render / GitHub Actions) or through a local ``.env`` file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Identity ---------------------------------------------------------
    PROJECT_NAME: str = "Bangladesh Crime Monitor"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # --- Database ---------------------------------------------------------
    DATABASE_URL: str = Field(
        ...,
        description="Neon connection string using the postgresql+asyncpg driver.",
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_RECYCLE_SECONDS: int = 280  # Neon closes idle connections at ~5 min.

    # --- Auth -------------------------------------------------------------
    INGEST_API_KEY: str = Field(
        ...,
        description="Shared secret required in the X-Ingest-Key header.",
    )

    # --- LLM --------------------------------------------------------------
    GEMINI_API_KEY: str = ""
    # A floating alias, not a pinned version, and deliberately so: this
    # pipeline runs unattended on a cron. When a pinned model is retired -
    # which is what happened to gemini-2.0-flash - every call 404s, the
    # extractor falls back to keyword classification, and the confidence gate
    # then silently rejects every row. The dashboard just stops updating. The
    # alias trades reproducibility for not dying quietly.
    GEMINI_MODEL: str = "gemini-flash-latest"

    # --- Scraper ----------------------------------------------------------
    FB_PAGE_ACCESS_TOKEN: str = ""
    BACKEND_URL: str = "http://127.0.0.1:8000"

    # --- CORS -------------------------------------------------------------
    # NoDecode suppresses pydantic-settings' default "complex field must be
    # JSON" handling, which would reject the comma-separated form before any
    # validator ran. Render's dashboard only accepts flat strings, so the
    # comma form is what actually gets used in production.
    CORS_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Accept either a JSON list or a plain comma-separated string."""
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                import json

                return json.loads(stripped)
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalise_driver(cls, value: object) -> object:
        """Coerce a plain Neon URL into the async driver form.

        Neon's dashboard hands out ``postgresql://...?sslmode=require``.
        asyncpg rejects the ``sslmode`` query parameter (it is a libpq
        concept), so we rewrite the scheme and strip the query string here.
        TLS is still enforced - see ``app/db/database.py``, which passes an
        explicit SSL context in ``connect_args``.
        """
        if not isinstance(value, str):
            return value

        url = value.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://") :]

        if "?" in url:
            base, _, query = url.partition("?")
            keep = [
                param
                for param in query.split("&")
                if param
                and not param.lower().startswith(("sslmode=", "channel_binding="))
            ]
            url = base + ("?" + "&".join(keep) if keep else "")

        return url

    @property
    def sync_database_url(self) -> str:
        """psycopg2 form of the same URL, for migration helpers."""
        return self.DATABASE_URL.replace("+asyncpg", "")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached accessor so the environment is parsed exactly once."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
