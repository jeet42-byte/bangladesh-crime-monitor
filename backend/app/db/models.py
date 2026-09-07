"""Declarative ORM models mapped onto db_migrations/init_schema.sql.

The SQL file remains the source of truth for DDL (it is what actually runs
against Neon). These classes mirror it so the API can query with typed
attributes instead of raw strings.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

# Canonical vocabularies, re-exported so the API and the LLM extractor agree
# on exactly one spelling of every enum value.
CRIME_CATEGORIES: tuple[str, ...] = (
    "Homicide",
    "Robbery",
    "Assault",
    "Narcotics",
    "Cybercrime",
    "Fraud",
    "Extortion",
    "Theft",
    "Other",
)

SOURCE_PLATFORMS: tuple[str, ...] = (
    "news_portal",
    "facebook_public",
    "police_report",
    "telegram_channel",
)

# How well corroborated a claim is, as distinct from who published it.
VERIFICATION_LEVELS: tuple[str, ...] = (
    "unverified",
    "single_source",
    "corroborated",
)

# Confidence floor per platform, per the published methodology.
SOURCE_CONFIDENCE: dict[str, int] = {
    "police_report": 95,
    "news_portal": 80,
    # A channel post is a headline flash, not an edited article; the same
    # outlet's RSS entry is the better record of the same event.
    "telegram_channel": 65,
    "facebook_public": 55,
}


class Jurisdiction(Base):
    """A police thana and its approximate centroid."""

    __tablename__ = "jurisdictions"

    thana_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    division: Mapped[str] = mapped_column(String(50), nullable=False)
    district: Mapped[str] = mapped_column(String(50), nullable=False)
    thana_name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Jurisdiction {self.thana_name} ({self.district})>"


class CrimeIncident(Base):
    """One reported incident."""

    __tablename__ = "crime_incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    fir_or_gd: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    narrative: Mapped[str] = mapped_column(Text, nullable=False)

    crime_category: Mapped[str] = mapped_column(String(50), nullable=False)
    penal_code_tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(Text), nullable=True
    )

    incident_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    thana_name: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="Dhaka"
    )
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)

    source_platform: Mapped[str] = mapped_column(String(50), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    source_confidence: Mapped[int] = mapped_column(Integer, nullable=False)

    raw_content_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )

    source_handle: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    verification_level: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="single_source"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("idx_incidents_date_thana", incident_date.desc(), thana_name),
        Index("idx_incidents_category", crime_category),
        Index("idx_incidents_content_hash", raw_content_hash),
        Index(
            "idx_incidents_source_platform",
            source_platform,
            incident_date.desc(),
        ),
        CheckConstraint(
            "crime_category IN ('Homicide','Robbery','Assault','Narcotics',"
            "'Cybercrime','Fraud','Extortion','Theft','Other')",
            name="ck_crime_category",
        ),
        CheckConstraint(
            "source_platform IN ('news_portal','facebook_public',"
            "'police_report','telegram_channel')",
            name="ck_source_platform",
        ),
        CheckConstraint(
            "verification_level IN ('unverified','single_source','corroborated')",
            name="ck_verification_level",
        ),
        CheckConstraint(
            "source_confidence BETWEEN 0 AND 100", name="ck_source_confidence"
        ),
        CheckConstraint("latitude BETWEEN 20.5 AND 26.7", name="ck_latitude"),
        CheckConstraint("longitude BETWEEN 88.0 AND 92.7", name="ck_longitude"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<CrimeIncident {self.crime_category} @ {self.thana_name}>"


# ===========================================================================
# Authentication
# ===========================================================================
USER_ROLES: tuple[str, ...] = ("owner", "member")


class User(Base):
    """A registered account.

    Guests are deliberately absent from this table: guest access is
    unauthenticated, stores nothing, and creates no row.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )

    # CITEXT in the database; declared here as String because SQLAlchemy has
    # no core CITEXT type. Case-insensitive uniqueness is enforced by the
    # column type itself, not by the application.
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    username: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)

    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="member"
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    display_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    credentials: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    failed_login_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.username} ({self.role})>"


class EmailVerificationCode(Base):
    """A hashed, single-use one-time code."""

    __tablename__ = "email_verification_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default="verify_email"
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    consumed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AuthAttempt(Base):
    """Rate-limiting ledger.

    Stored in the database rather than process memory because Render restarts
    the container freely, and an in-memory limiter resets its counters with it.
    """

    __tablename__ = "auth_attempts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    bucket: Mapped[str] = mapped_column(String(80), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
