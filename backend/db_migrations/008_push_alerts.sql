-- 008: Area alerts delivered as Web Push notifications.
--
-- A subscription is a browser's push endpoint plus the area it asked about.
-- No name, email or account: the endpoint is an opaque URL issued by the
-- browser's push service, and deleting it is the whole of unsubscribing.
--
-- app_settings holds the server's VAPID key pair, generated on first use so
-- deployment needs no extra secret. Applied at startup (app/db/schema.py).

CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint         TEXT        NOT NULL UNIQUE,
    p256dh           TEXT        NOT NULL,
    auth             TEXT        NOT NULL,
    label            TEXT        NOT NULL,
    lat              DOUBLE PRECISION NOT NULL,
    lon              DOUBLE PRECISION NOT NULL,
    radius_km        DOUBLE PRECISION NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_notified_at TIMESTAMPTZ
);
