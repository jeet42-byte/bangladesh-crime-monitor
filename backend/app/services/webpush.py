"""Web Push delivery: VAPID signing (RFC 8292) and aes128gcm (RFC 8291).

Written on ``cryptography`` rather than pulling in pywebpush, whose
http-ece dependency ships only as an sdist with a legacy setup.py: one
failed build on Render would take the whole API down with it. The two RFCs
are short and the implementation is checked against http_ece's own
decryptor in the tests that accompanied this change.

The server's VAPID key pair is created on first use and kept in
app_settings, so a deploy needs no new secret.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import struct
import time
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlsplit

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hmac import HMAC
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppSetting

logger = logging.getLogger(__name__)

VAPID_SETTING = "vapid_private_key_pem"
#: Contact the push services can use about this sender (RFC 8292 "sub").
VAPID_SUBJECT = "https://bangladesh-crime-monitor.vercel.app"
RECORD_SIZE = 4096
TTL_SECONDS = 24 * 3600

#: The server POSTs to whatever endpoint a browser hands it, so only real
#: push services are accepted - otherwise the subscribe call is an SSRF.
PUSH_HOST_SUFFIXES: Tuple[str, ...] = (
    "fcm.googleapis.com",          # Chrome, Edge, Samsung Internet, Opera
    "push.services.mozilla.com",   # Firefox
    "push.apple.com",              # Safari (iOS 16.4+ home-screen apps, macOS)
    "notify.windows.com",          # legacy Edge
)


class PushGone(Exception):
    """The push service says the subscription no longer exists."""


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def allowed_endpoint(endpoint: str) -> bool:
    parts = urlsplit(endpoint)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and any(
        host == suffix or host.endswith("." + suffix) for suffix in PUSH_HOST_SUFFIXES
    )


# -- keys --------------------------------------------------------------------
_KEY: Optional[ec.EllipticCurvePrivateKey] = None


async def vapid_key(session: AsyncSession) -> ec.EllipticCurvePrivateKey:
    """The server's signing key, created and stored on first use."""
    global _KEY
    if _KEY is not None:
        return _KEY
    row = await session.get(AppSetting, VAPID_SETTING)
    if row is None:
        key = ec.generate_private_key(ec.SECP256R1())
        pem = key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode()
        session.add(AppSetting(key=VAPID_SETTING, value=pem))
        await session.commit()
        logger.info("Generated a new VAPID key pair")
        _KEY = key
    else:
        loaded = serialization.load_pem_private_key(row.value.encode(), password=None)
        assert isinstance(loaded, ec.EllipticCurvePrivateKey)
        _KEY = loaded
    return _KEY


def public_key_b64(key: ec.EllipticCurvePrivateKey) -> str:
    """Uncompressed P-256 point: the browser's applicationServerKey."""
    return b64url(
        key.public_key().public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
    )


def vapid_authorization(key: ec.EllipticCurvePrivateKey, endpoint: str, now: Optional[int] = None) -> str:
    parts = urlsplit(endpoint)
    claims = {
        "aud": f"{parts.scheme}://{parts.netloc}",
        "exp": (now or int(time.time())) + 12 * 3600,
        "sub": VAPID_SUBJECT,
    }
    header = {"typ": "JWT", "alg": "ES256"}
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + b64url(json.dumps(claims, separators=(",", ":")).encode())
    )
    r, s = decode_dss_signature(key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256())))
    signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    return f"vapid t={signing_input}.{b64url(signature)}, k={public_key_b64(key)}"


# -- encryption (RFC 8291) ---------------------------------------------------
def _hkdf(salt: bytes, ikm: bytes, info: bytes, length: int) -> bytes:
    extract = HMAC(salt, hashes.SHA256())
    extract.update(ikm)
    prk = extract.finalize()
    expand = HMAC(prk, hashes.SHA256())
    expand.update(info + b"\x01")
    return expand.finalize()[:length]


def encrypt(payload: bytes, p256dh: str, auth: str, *, salt: Optional[bytes] = None,
            sender_key: Optional[ec.EllipticCurvePrivateKey] = None) -> bytes:
    """aes128gcm body for one push message (single record)."""
    ua_public = b64url_decode(p256dh)
    auth_secret = b64url_decode(auth)
    salt = salt or os.urandom(16)
    sender = sender_key or ec.generate_private_key(ec.SECP256R1())
    as_public = sender.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    receiver = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_public)
    shared = sender.exchange(ec.ECDH(), receiver)

    ikm = _hkdf(auth_secret, shared, b"WebPush: info\x00" + ua_public + as_public, 32)
    cek = _hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
    nonce = _hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)

    if len(payload) > RECORD_SIZE - 16 - 1 - 86:
        raise ValueError("push payload too large for one record")
    ciphertext = AESGCM(cek).encrypt(nonce, payload + b"\x02", None)
    header = salt + struct.pack("!L", RECORD_SIZE) + bytes([len(as_public)]) + as_public
    return header + ciphertext


async def send(
    client: httpx.AsyncClient,
    key: ec.EllipticCurvePrivateKey,
    *,
    endpoint: str,
    p256dh: str,
    auth: str,
    message: Dict[str, Any],
) -> None:
    """Deliver one notification. Raises PushGone for dead subscriptions."""
    if not allowed_endpoint(endpoint):
        raise PushGone("endpoint is not a known push service")
    body = encrypt(json.dumps(message, ensure_ascii=False).encode(), p256dh, auth)
    response = await client.post(
        endpoint,
        content=body,
        headers={
            "Authorization": vapid_authorization(key, endpoint),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": str(TTL_SECONDS),
            "Urgency": "normal",
        },
    )
    if response.status_code in (404, 410):
        raise PushGone(f"HTTP {response.status_code}")
    if response.status_code >= 300:
        raise RuntimeError(f"push HTTP {response.status_code}: {response.text[:200]}")
