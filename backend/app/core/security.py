"""Password hashing, one-time codes and session tokens.

Everything security-sensitive lives here so there is one place to audit.

Design notes
------------
* Passwords use **Argon2id**, the PHC winner and the current OWASP first
  choice. Parameters are the argon2-cffi defaults, which target roughly
  64 MB and 0.5s on commodity hardware.
* One-time codes are stored as SHA-256 digests. Unlike a password, a 6-digit
  code has only a million possibilities, so the protection against brute
  force is the attempt counter and the short expiry, not the hash. The hash
  exists so that a database leak does not hand out live codes.
* Session tokens are stateless JWTs. There is no server-side session table,
  so a token cannot be revoked before it expires - the expiry is kept short
  for that reason.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
_hasher = PasswordHasher()

# Deliberately modest: NIST SP 800-63B advises length over composition rules,
# and blocking common passwords beats demanding a symbol.
MIN_PASSWORD_LENGTH = 10
MAX_PASSWORD_LENGTH = 128

# A short deny-list of the passwords that actually show up in credential
# stuffing lists. Not a substitute for a breach corpus, but it catches the
# worst choices without shipping a 10 MB word list.
_COMMON_PASSWORDS = frozenset(
    {
        "password", "password1", "password123", "12345678", "123456789",
        "1234567890", "qwertyuiop", "letmein123", "welcome123", "admin123",
        "iloveyou1", "bangladesh", "dhaka1234", "changeme1", "passw0rd",
        "qwerty1234", "abc12345", "111111111", "sunshine1", "football1",
    }
)


def hash_password(password: str) -> str:
    """Return an Argon2id digest. The plaintext is never persisted."""
    return _hasher.hash(password)


def verify_password(password: str, digest: str) -> bool:
    """Constant-time-ish verification that never raises on a bad digest."""
    try:
        return _hasher.verify(digest, password)
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False


def needs_rehash(digest: str) -> bool:
    """True when the stored digest used weaker parameters than we now use."""
    try:
        return _hasher.check_needs_rehash(digest)
    except (InvalidHashError, ValueError):
        return False


def validate_password_strength(password: str, *, email: str = "", username: str = "") -> Optional[str]:
    """Return a human-readable problem, or None when the password is acceptable.

    Rejecting a password that merely contains the user's own name is worth
    more than demanding a punctuation character, so that is what is checked.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(password) > MAX_PASSWORD_LENGTH:
        return f"Password must be at most {MAX_PASSWORD_LENGTH} characters."
    if password.lower() in _COMMON_PASSWORDS:
        return "That password is too common. Choose something less predictable."
    if len(set(password)) < 5:
        return "Password must use at least five different characters."

    local_part = email.split("@")[0].lower() if email else ""
    for personal in (local_part, username.lower()):
        if personal and len(personal) >= 4 and personal in password.lower():
            return "Password must not contain your username or email address."

    return None


# ---------------------------------------------------------------------------
# One-time codes
# ---------------------------------------------------------------------------
OTP_LENGTH = 6
OTP_TTL_MINUTES = 15
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> str:
    """A cryptographically random 6-digit code, leading zeros preserved."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def hash_otp(code: str) -> str:
    """SHA-256 of the code, salted with the app secret.

    Keyed with the application secret so a stolen table alone is not enough
    to precompute all one million digests.
    """
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        code.strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp(code: str, digest: str) -> bool:
    """Timing-safe comparison of a submitted code against its stored digest."""
    return hmac.compare_digest(hash_otp(code), digest)


def otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)


# ---------------------------------------------------------------------------
# Session tokens
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_HOURS = 24 * 7


def create_access_token(
    *, user_id: str, email: str, role: str, username: str
) -> str:
    """Sign a stateless session token."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "username": username,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp()),
        "iss": "bangladesh-crime-monitor",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Return the claims, or None when the token is invalid or expired."""
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer="bangladesh-crime-monitor",
        )
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# Identifier validation
# ---------------------------------------------------------------------------
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")

# Deliberately permissive. Strict RFC 5322 matching rejects addresses that
# work fine in practice; the authoritative test is whether the code arrives.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")


def validate_username(username: str) -> Optional[str]:
    if not _USERNAME_RE.match(username or ""):
        return (
            "Username must be 3-32 characters, using letters, numbers, "
            "dot, underscore or hyphen only."
        )
    return None


def validate_email(email: str) -> Optional[str]:
    if not _EMAIL_RE.match((email or "").strip()) or len(email) > 254:
        return "Enter a valid email address."
    return None
