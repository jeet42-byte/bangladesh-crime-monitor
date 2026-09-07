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
    GEMINI_MODEL: str = "gemini-flash-lite-latest"

    # --- Auth -------------------------------------------------------------
    # Signs session tokens and keys the one-time-code HMAC. Rotating it logs
    # everyone out and invalidates outstanding verification codes, which is
    # the intended behaviour for a compromised secret.
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(48))"
    SECRET_KEY: str = Field(
        default="",
        description="HMAC/JWT signing secret. Must be set in production.",
    )
    # Registration can be closed without redeploying the frontend.
    ALLOW_REGISTRATION: bool = True

    # Owner account, seeded on startup when all three are present. The
    # password is read from the environment and immediately hashed; it is
    # never written to the database or the logs in plaintext.
    OWNER_EMAIL: str = ""
    OWNER_USERNAME: str = "ahnaf"
    OWNER_PASSWORD: str = ""
    # Guard on re-applying OWNER_PASSWORD to an existing account. Without it a
    # value left in the environment would overwrite a password the owner set
    # through the app every time the service restarted.
    OWNER_PASSWORD_FORCE: bool = False

    # --- API exposure -----------------------------------------------------
    # When false the read endpoints require a session (a signed-in account or
    # a short-lived guest token issued to the site itself), and the
    # interactive docs and OpenAPI schema are not served at all.
    PUBLIC_API: bool = False
    # Serve /docs, /redoc and /openapi.json. Publishing the schema of an
    # otherwise closed API hands a scraper the full endpoint map.
    ENABLE_DOCS: bool = False
    # Lifetime of an anonymous guest session token.
    GUEST_TOKEN_TTL_MINUTES: int = 180

    # --- Email ------------------------------------------------------------
    EMAIL_FROM: str = "Bangladesh Crime Monitor <onboarding@resend.dev>"
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False
    # Print verification codes to the log instead of emailing them. Local
    # testing only - it makes "check your inbox" a lie.
    ALLOW_CONSOLE_EMAIL: bool = False

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
    resolved = Settings()  # type: ignore[call-arg]

    if not resolved.SECRET_KEY:
        # An empty signing key would let anyone forge a session token, so
        # generate an ephemeral one rather than run unsigned. It changes on
        # every restart, which logs everyone out - loud, but not insecure.
        import logging
        import secrets

        resolved.SECRET_KEY = secrets.token_urlsafe(48)
        logging.getLogger(__name__).error(
            "SECRET_KEY is not set. Using a random per-process key: sessions "
            "will be invalidated on every restart and will not work across "
            "multiple instances. Set SECRET_KEY in the environment."
        )

    return resolved


settings = get_settings()
