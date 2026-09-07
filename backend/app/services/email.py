"""Transactional email delivery.

Three backends, chosen automatically in this order:

1. **Resend** when ``RESEND_API_KEY`` is set. 3,000 messages/month free and
   a plain HTTPS API, so it needs no outbound SMTP port - which matters
   because Render's free tier blocks outbound port 25.
2. **SMTP** when ``SMTP_HOST`` is set, for anyone who would rather use their
   own mail server or a Gmail app password.
3. **Console** otherwise: the message is written to the application log.

The console backend exists so the whole signup flow can be exercised before
any provider is configured. It is refused in production unless
``ALLOW_CONSOLE_EMAIL`` is explicitly set, because silently "sending" a
verification code to a log file while telling the user to check their inbox
is a failure mode worth making loud.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


class EmailDeliveryError(RuntimeError):
    """Raised when a message could not be handed to any provider."""


def _active_backend() -> str:
    if settings.RESEND_API_KEY:
        return "resend"
    if settings.SMTP_HOST:
        return "smtp"
    return "console"


async def _send_via_resend(to: str, subject: str, html: str, text: str) -> None:
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0)) as client:
        response = await client.post(
            RESEND_ENDPOINT,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
        )
    if response.status_code >= 300:
        # Resend echoes the offending field in the body; it never contains
        # the message content, so it is safe to log.
        raise EmailDeliveryError(
            f"Resend rejected the message ({response.status_code}): "
            f"{response.text[:300]}"
        )


def _send_via_smtp(to: str, subject: str, html: str, text: str) -> None:
    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    context = ssl.create_default_context()
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=20
        ) as server:
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.starttls(context=context)
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)


async def send_email(to: str, subject: str, html: str, text: str) -> str:
    """Deliver one message. Returns the backend that handled it."""
    backend = _active_backend()

    if backend == "resend":
        await _send_via_resend(to, subject, html, text)
        return "resend"

    if backend == "smtp":
        # smtplib is blocking; keep it off the event loop.
        import asyncio

        await asyncio.to_thread(_send_via_smtp, to, subject, html, text)
        return "smtp"

    if not settings.ALLOW_CONSOLE_EMAIL:
        raise EmailDeliveryError(
            "No email provider is configured. Set RESEND_API_KEY (or SMTP_HOST), "
            "or set ALLOW_CONSOLE_EMAIL=true to print codes to the log for "
            "local testing."
        )

    logger.warning(
        "EMAIL NOT SENT - no provider configured. Would deliver to %s:\n"
        "  Subject: %s\n%s",
        to,
        subject,
        text,
    )
    return "console"


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
def verification_email(code: str, username: str) -> tuple[str, str, str]:
    """Subject, HTML body and plain-text body for a verification code."""
    subject = f"{code} is your Bangladesh Crime Monitor verification code"

    text = (
        f"Hello {username},\n\n"
        f"Your verification code is: {code}\n\n"
        f"It expires in 15 minutes and can be used once.\n\n"
        f"If you did not create an account on Bangladesh Crime Monitor, you "
        f"can ignore this message - no account will be activated without this "
        f"code.\n\n"
        f"Bangladesh Crime Monitor\n"
        f"An open-source public safety research archive.\n"
    )

    html = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#09090b;
               font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
               color:#e4e4e7;">
    <div style="max-width:520px;margin:0 auto;background:#18181b;
                border:1px solid #3f3f46;border-radius:12px;padding:28px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;
                text-transform:uppercase;color:#71717a;">
        Bangladesh Crime Monitor
      </p>
      <h1 style="margin:0 0 18px;font-size:19px;color:#fafafa;">
        Verify your email address
      </h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#a1a1aa;">
        Hello {username}, use this code to finish creating your account.
      </p>
      <div style="margin:0 0 18px;padding:16px;border-radius:10px;
                  background:#09090b;border:1px solid #3f3f46;text-align:center;">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
                     font-size:30px;letter-spacing:.32em;color:#fb7185;">
          {code}
        </span>
      </div>
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#a1a1aa;">
        The code expires in 15 minutes and can be used once.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;
                border-top:1px solid #27272a;padding-top:14px;">
        If you did not create an account, ignore this message - nothing will be
        activated without the code. This is an automated message; replies are
        not monitored.
      </p>
    </div>
  </body>
</html>"""

    return subject, html, text


def describe_backend() -> str:
    """Human-readable delivery status, surfaced on the health endpoint."""
    backend = _active_backend()
    if backend == "console":
        return "console (no provider configured)"
    return backend
