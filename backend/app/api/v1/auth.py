"""Authentication: registration, email verification, login.

Guests are not represented here at all. Guest access to this site is simply
unauthenticated access - no row, no token, no tracking - which is why there
is no "create guest account" endpoint.

Threat notes
------------
* Registration and password reset responses are deliberately identical
  whether or not the address is already registered, so the endpoints cannot
  be used to enumerate who has an account.
* Every sensitive endpoint is rate limited by IP, and login is additionally
  limited per account with a temporary lock, so one victim cannot be
  targeted from many addresses.
* A failed login runs a dummy Argon2 verification before answering, so the
  response time does not reveal whether the account exists.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.core.config import settings
from app.core.security import (
    OTP_MAX_ATTEMPTS,
    create_access_token,
    generate_otp,
    hash_otp,
    hash_password,
    needs_rehash,
    otp_expiry,
    validate_email,
    validate_password_strength,
    validate_username,
    verify_otp,
    verify_password,
)
from app.db.models import AuthAttempt, EmailVerificationCode, User
from app.services.email import EmailDeliveryError, send_email, verification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# A pre-computed Argon2 digest of a random string. Verifying against it on a
# missing account costs the same as a real check, so timing does not leak
# whether the address is registered.
_DUMMY_DIGEST = hash_password("timing-equalisation-placeholder-value")

# bucket -> (max attempts, window)
RATE_LIMITS: dict[str, tuple[int, timedelta]] = {
    "register": (5, timedelta(hours=1)),
    "login": (10, timedelta(minutes=15)),
    "verify": (10, timedelta(minutes=15)),
    "resend": (4, timedelta(hours=1)),
    # Generous: one visitor legitimately refreshes and reopens tabs. Tight
    # enough that a scraper cannot mint thousands of sessions from one host.
    "guest": (40, timedelta(hours=1)),
}

ACCOUNT_LOCK_THRESHOLD = 8
ACCOUNT_LOCK_DURATION = timedelta(minutes=20)


# ===========================================================================
# Rate limiting
# ===========================================================================
def _client_ip(request: Request) -> str:
    """Best-effort client address.

    Render terminates TLS at a proxy, so the socket address is the proxy.
    X-Forwarded-For's first entry is the client. It is spoofable in general,
    but behind a trusted proxy that rewrites it, it is the best signal
    available - and this is a throttle, not an authorisation decision.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:60]
    return (request.client.host if request.client else "unknown")[:60]


async def _enforce_rate_limit(session: DbSession, action: str, key: str) -> None:
    limit, window = RATE_LIMITS[action]
    bucket = f"{action}:{key}"[:80]
    since = datetime.now(timezone.utc) - window

    used = int(
        (
            await session.execute(
                select(func.count())
                .select_from(AuthAttempt)
                .where(AuthAttempt.bucket == bucket, AuthAttempt.occurred_at >= since)
            )
        ).scalar_one()
    )

    if used >= limit:
        minutes = max(1, int(window.total_seconds() // 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many attempts. Try again in up to {minutes} minutes."
            ),
        )

    session.add(AuthAttempt(bucket=bucket))
    await session.commit()


async def _prune(session: DbSession) -> None:
    """Opportunistic cleanup so the ledger cannot grow without bound."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=1)
    await session.execute(delete(AuthAttempt).where(AuthAttempt.occurred_at < cutoff))
    await session.execute(
        delete(EmailVerificationCode).where(
            EmailVerificationCode.expires_at < cutoff
        )
    )
    await session.commit()


# ===========================================================================
# Schemas
# ===========================================================================
class RegisterIn(BaseModel):
    email: str = Field(..., max_length=254)
    username: str = Field(..., max_length=32)
    password: str = Field(..., max_length=128)


class VerifyIn(BaseModel):
    email: str = Field(..., max_length=254)
    code: str = Field(..., min_length=4, max_length=10)


class ResendIn(BaseModel):
    email: str = Field(..., max_length=254)


class LoginIn(BaseModel):
    # Accepts either the username or the email address.
    identifier: str = Field(..., max_length=254)
    password: str = Field(..., max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    role: str
    is_verified: bool
    display_name: Optional[str] = None
    credentials: Optional[str] = None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


# With verification ON, every registration outcome returns this one string:
# a distinct "account created" message would tell an attacker which addresses
# are already registered.
REGISTRATION_ACK = (
    "If that address can be registered, a 6-digit verification code is on "
    "its way. Enter it below to finish setting up your account."
)

# With verification OFF the same disguise is not achievable: a new signup is
# handed a session token and an existing address cannot be, so the two are
# distinguishable whatever the wording says. Given the leak exists either
# way, saying so plainly is better than sending someone to a code screen
# that can never resolve. Enumeration resistance returns with verification.
ALREADY_REGISTERED = (
    "That email address already has an account. Sign in instead, or use a "
    "different address."
)


class MessageOut(BaseModel):
    message: str
    # Lets the client decide whether a code screen makes any sense. Without
    # it the UI cannot tell "check your email" from "nothing was sent".
    verification_required: bool = True
    # Only ever true when ALLOW_CONSOLE_EMAIL is on, so the UI can say plainly
    # that the code went to the server log rather than an inbox.
    delivered_to_console: bool = False
    # Populated only when REQUIRE_EMAIL_VERIFICATION is off: the account is
    # usable immediately, so the client signs in rather than asking for a code.
    access_token: Optional[str] = None
    expires_in: Optional[int] = None
    user: Optional["UserOut"] = None


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        is_verified=user.is_verified,
        display_name=user.display_name,
        credentials=user.credentials,
        created_at=user.created_at,
    )


def _issue_token(user: User) -> TokenOut:
    from app.core.security import ACCESS_TOKEN_TTL_HOURS

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        username=user.username,
    )
    return TokenOut(
        access_token=token,
        expires_in=ACCESS_TOKEN_TTL_HOURS * 3600,
        user=_to_user_out(user),
    )


async def _send_code(session: DbSession, user: User) -> bool:
    """Issue a fresh code, invalidating any outstanding one. True if console."""
    await session.execute(
        update(EmailVerificationCode)
        .where(
            EmailVerificationCode.user_id == user.id,
            EmailVerificationCode.purpose == "verify_email",
            EmailVerificationCode.consumed_at.is_(None),
        )
        .values(consumed_at=datetime.now(timezone.utc))
    )

    code = generate_otp()
    session.add(
        EmailVerificationCode(
            user_id=user.id,
            code_hash=hash_otp(code),
            purpose="verify_email",
            expires_at=otp_expiry(),
        )
    )
    await session.commit()

    subject, html, text_body = verification_email(code, user.username)
    backend = await send_email(user.email, subject, html, text_body)
    return backend == "console"


# ===========================================================================
# Endpoints
# ===========================================================================
@router.post(
    "/register",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account and send a verification code",
)
async def register(payload: RegisterIn, request: Request, session: DbSession) -> MessageOut:
    if not settings.ALLOW_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed.",
        )

    await _enforce_rate_limit(session, "register", _client_ip(request))

    email = payload.email.strip().lower()
    username = payload.username.strip()

    for problem in (
        validate_email(email),
        validate_username(username),
        validate_password_strength(payload.password, email=email, username=username),
    ):
        if problem:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=problem
            )

    existing = (
        await session.execute(select(User).where(func.lower(User.email) == email))
    ).scalar_one_or_none()

    if existing is not None:
        if existing.is_verified:
            if not settings.REQUIRE_EMAIL_VERIFICATION:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=ALREADY_REGISTERED,
                )
            # Do not confirm that this address is registered. Someone probing
            # for accounts gets exactly the message a new signup gets.
            return MessageOut(message=REGISTRATION_ACK, verification_required=True)
        if not settings.REQUIRE_EMAIL_VERIFICATION:
            # Left over from when verification was on. Nothing can send a
            # code now, so activate it rather than stranding the address.
            existing.is_verified = True
            existing.verified_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(existing)
            token = _issue_token(existing)
            return MessageOut(
                message="Account activated. You are signed in.",
                access_token=token.access_token,
                expires_in=token.expires_in,
                user=token.user,
                verification_required=False,
            )

        # Unverified re-registration: reissue rather than error, since the
        # most likely cause is a code that never arrived.
        try:
            console = await _send_code(session, existing)
        except EmailDeliveryError as exc:
            logger.error("Verification email failed on re-registration: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Verification email could not be sent. This is a server "
                    "configuration problem, not something you did - please "
                    "try again later."
                ),
            ) from exc
        return MessageOut(
            message=REGISTRATION_ACK,
            delivered_to_console=console,
            verification_required=True,
        )

    username_taken = (
        await session.execute(
            select(User.id).where(func.lower(User.username) == username.lower())
        )
    ).first()
    if username_taken:
        # A username is public by nature, so saying it is taken leaks nothing.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken.",
        )

    verification_required = settings.REQUIRE_EMAIL_VERIFICATION

    user = User(
        email=email,
        username=username,
        password_hash=hash_password(payload.password),
        role="member",
        is_verified=not verification_required,
        verified_at=None if verification_required else datetime.now(timezone.utc),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    if not verification_required:
        # No mail to send, so the account is live immediately and the client
        # is handed a session rather than a "check your inbox" screen.
        await _prune(session)
        token = _issue_token(user)
        logger.info("Account created without email verification: %s", user.username)
        return MessageOut(
            message="Account created. You are signed in.",
            access_token=token.access_token,
            expires_in=token.expires_in,
            user=token.user,
            verification_required=False,
        )

    try:
        console = await _send_code(session, user)
    except EmailDeliveryError as exc:
        # Roll the account back. Leaving it would hold the address hostage:
        # the row exists but is unverified, so the owner can neither sign in
        # nor register again, and "resend" fails for the same reason the
        # first send did. Deleting makes a retry work once mail is fixed.
        logger.error("Verification email failed for a new account: %s", exc)
        await session.delete(user)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Verification email could not be sent, so no account was "
                "created. This is a server configuration problem, not "
                "something you did - please try again later."
            ),
        ) from exc

    await _prune(session)
    return MessageOut(
            message=REGISTRATION_ACK,
            delivered_to_console=console,
            verification_required=True,
        )


@router.post(
    "/verify",
    response_model=TokenOut,
    summary="Confirm an email address with its one-time code",
)
async def verify(payload: VerifyIn, request: Request, session: DbSession) -> TokenOut:
    await _enforce_rate_limit(session, "verify", _client_ip(request))

    email = payload.email.strip().lower()
    user = (
        await session.execute(select(User).where(func.lower(User.email) == email))
    ).scalar_one_or_none()

    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="That code is invalid or has expired. Request a new one.",
    )

    if user is None:
        raise invalid
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This address is already verified. You can sign in.",
        )

    record = (
        await session.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.user_id == user.id,
                EmailVerificationCode.purpose == "verify_email",
                EmailVerificationCode.consumed_at.is_(None),
            )
            .order_by(EmailVerificationCode.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if record is None or record.expires_at < datetime.now(timezone.utc):
        raise invalid

    if record.attempts >= OTP_MAX_ATTEMPTS:
        # Burn the code rather than allow unlimited guessing at 1-in-a-million.
        record.consumed_at = datetime.now(timezone.utc)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect codes. Request a new one.",
        )

    if not verify_otp(payload.code, record.code_hash):
        record.attempts += 1
        await session.commit()
        raise invalid

    now = datetime.now(timezone.utc)
    record.consumed_at = now
    user.is_verified = True
    user.verified_at = now
    user.last_login_at = now
    await session.commit()
    await session.refresh(user)

    logger.info("Account verified: %s", user.username)
    return _issue_token(user)


@router.post(
    "/resend",
    response_model=MessageOut,
    summary="Send a fresh verification code",
)
async def resend(payload: ResendIn, request: Request, session: DbSession) -> MessageOut:
    await _enforce_rate_limit(session, "resend", _client_ip(request))

    email = payload.email.strip().lower()
    user = (
        await session.execute(select(User).where(func.lower(User.email) == email))
    ).scalar_one_or_none()

    # Same answer whether or not the account exists, and whether or not it is
    # already verified.
    generic = MessageOut(
        message="If that address needs verifying, a new code has been sent."
    )

    if user is None or user.is_verified:
        return generic

    try:
        console = await _send_code(session, user)
    except EmailDeliveryError as exc:
        logger.error("Resend failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send the email just now. Try again shortly.",
        ) from exc

    return MessageOut(message=generic.message, delivered_to_console=console)


@router.post("/login", response_model=TokenOut, summary="Sign in")
async def login(payload: LoginIn, request: Request, session: DbSession) -> TokenOut:
    await _enforce_rate_limit(session, "login", _client_ip(request))

    identifier = payload.identifier.strip().lower()
    user = (
        await session.execute(
            select(User).where(
                (func.lower(User.email) == identifier)
                | (func.lower(User.username) == identifier)
            )
        )
    ).scalar_one_or_none()

    rejected = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password.",
    )

    if user is None:
        # Equalise timing so a missing account is not measurably faster.
        verify_password(payload.password, _DUMMY_DIGEST)
        raise rejected

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        remaining = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {remaining} minutes.",
        )

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= ACCOUNT_LOCK_THRESHOLD:
            user.locked_until = now + ACCOUNT_LOCK_DURATION
            user.failed_login_count = 0
            logger.warning("Account locked after repeated failures: %s", user.username)
        await session.commit()
        raise rejected

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email address before signing in.",
        )

    # Transparent upgrade if Argon2 parameters have been raised since signup.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    await session.commit()
    await session.refresh(user)

    return _issue_token(user)


@router.get("/me", response_model=UserOut, summary="The signed-in account")
async def me(user: CurrentUser) -> UserOut:
    return _to_user_out(user)


@router.post("/logout", response_model=MessageOut, summary="Sign out")
async def logout(user: OptionalUser) -> MessageOut:
    # Sessions are stateless JWTs, so there is nothing server-side to revoke.
    # The client discards the token; this endpoint exists so the frontend has
    # one place to call and so the intent is explicit in the API surface.
    return MessageOut(message="Signed out. Discard the access token.")


MessageOut.model_rebuild()


class GuestTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post(
    "/guest",
    response_model=GuestTokenOut,
    summary="Issue a short-lived anonymous session for the site itself",
)
async def guest_session(request: Request, session: DbSession) -> GuestTokenOut:
    """Mint a guest token so the public pages can read the API.

    Anyone can call this - the site's own pages have to, and they run in the
    visitor's browser. It therefore raises the cost of scraping rather than
    preventing it: a scraper must now hold a session and respect the rate
    limit instead of curling a URL. That is the honest ceiling for data a
    public web page renders.
    """
    await _enforce_rate_limit(session, "guest", _client_ip(request))
    from app.core.security import create_guest_token

    return GuestTokenOut(
        access_token=create_guest_token(),
        expires_in=settings.GUEST_TOKEN_TTL_MINUTES * 60,
    )


class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., max_length=128)


@router.post(
    "/change-password",
    response_model=MessageOut,
    summary="Change your own password",
)
async def change_password(
    payload: ChangePasswordIn,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> MessageOut:
    """Requires the current password, so a stolen session token alone cannot
    lock the real owner out of their account."""
    await _enforce_rate_limit(session, "login", _client_ip(request))

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    problem = validate_password_strength(
        payload.new_password, email=user.email, username=user.username
    )
    if problem:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=problem
        )

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The new password must be different from the current one.",
        )

    user.password_hash = hash_password(payload.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    await session.commit()

    logger.info("Password changed for %s", user.username)
    # The existing token stays valid: sessions are stateless JWTs, so there is
    # nothing to revoke. Kept short-lived for exactly this reason.
    return MessageOut(
        message="Password updated. Your current session stays signed in."
    )


class OwnerOut(BaseModel):
    display_name: str
    credentials: list[str]
    username: Optional[str] = None


@router.get(
    "/owner",
    response_model=OwnerOut,
    summary="Public ownership attribution for the site",
)
async def owner(session: DbSession) -> OwnerOut:
    record = (
        await session.execute(
            select(User).where(User.role == "owner").limit(1)
        )
    ).scalar_one_or_none()

    if record is None or not record.credentials:
        # Falls back to the static attribution so the page renders even
        # before the owner account is seeded.
        return OwnerOut(
            display_name=OWNER_DISPLAY_NAME,
            credentials=list(OWNER_CREDENTIALS),
        )

    return OwnerOut(
        display_name=record.display_name or OWNER_DISPLAY_NAME,
        credentials=[
            line.strip() for line in record.credentials.split("|") if line.strip()
        ],
        username=record.username,
    )


# ---------------------------------------------------------------------------
# Ownership attribution
#
# Exactly as supplied by the site operator. Nothing here is inferred: no
# dates, units, or titles beyond what was stated.
# ---------------------------------------------------------------------------
OWNER_DISPLAY_NAME = "Ahnaf Akif"
OWNER_CREDENTIALS: tuple[str, ...] = (
    "Former Major, Bangladesh Army",
    "Researcher and student, Criminology and Criminal Justice, University of Dhaka",
    "Cybersecurity, United International University",
)
