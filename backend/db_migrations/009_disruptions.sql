-- 009: Live disruptions - blockades, hartals, rallies, clashes, closures.
--
-- Short-lived by nature: each row carries expires_at and the API serves
-- only rows that have not expired. Reports of the same disruption from
-- several outlets update one row (see app/api/v1/disruptions.py).
-- Applied at startup (app/db/schema.py).

CREATE TABLE IF NOT EXISTS disruptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT        NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'ongoing',
    title        TEXT        NOT NULL,
    place        TEXT        NOT NULL,
    district     TEXT        NOT NULL,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    starts_at    TIMESTAMPTZ NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    sources      JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_disruptions_expires_at ON disruptions (expires_at DESC);
