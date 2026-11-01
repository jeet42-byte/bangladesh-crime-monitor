"""Idempotent DDL the backend applies to itself at startup.

Earlier migrations had to be pasted into the Neon console by hand, and more
than one sat unapplied for weeks while the code that needed it was live. New
tables that only add (never alter) are applied here instead, from the same
SQL file a human would run, so a Render deploy is the only step.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from sqlalchemy import text

from app.db.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

_MIGRATIONS = Path(__file__).resolve().parents[2] / "db_migrations"

#: Files that consist only of CREATE ... IF NOT EXISTS statements.
SELF_APPLIED = ("007_public_pulse.sql",)


def _statements(sql: str) -> list[str]:
    # These files hold no functions or string literals containing ';', so a
    # plain split is exact. Comment lines are dropped first.
    body = "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))
    return [s.strip() for s in re.split(r";\s*(?:\n|$)", body) if s.strip()]


async def ensure_schema() -> None:
    """Apply SELF_APPLIED migrations; log and continue on failure."""
    for name in SELF_APPLIED:
        path = _MIGRATIONS / name
        try:
            async with AsyncSessionLocal() as session:
                for statement in _statements(path.read_text(encoding="utf-8")):
                    await session.execute(text(statement))
                await session.commit()
            logger.info("Schema ensured: %s", name)
        except Exception as exc:  # noqa: BLE001 - never block startup on DDL
            logger.error("Could not apply %s: %s", name, exc)
