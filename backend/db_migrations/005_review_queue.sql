-- 005_review_queue.sql
--
-- A staging lane for machine-extracted historical records.
--
-- Why
-- ---
-- The live pipeline collects from feeds published hours ago, against a
-- lexicon tuned over months. The historical backfill reaches back three years
-- through the Wayback Machine, through a much wider gate, and its first run
-- surfaced two records with unresolvable locations, several political stories
-- that are not asset-protection events, and a bail hearing on a case from
-- years earlier. That is an acceptable error rate for material a human will
-- look at, and not for material published unseen.
--
-- So backfilled records land in a queue instead of the feed. They become
-- public only when approved. This is a deliberate asymmetry: a live record
-- that is wrong gets corrected through the corrections route within days
-- because it is current and someone notices, while a wrong record dated 2023
-- can sit unchallenged indefinitely.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Where a record came from
-- ---------------------------------------------------------------------------
ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS collection_mode VARCHAR(20) NOT NULL DEFAULT 'live';

ALTER TABLE crime_incidents
    DROP CONSTRAINT IF EXISTS ck_collection_mode;

ALTER TABLE crime_incidents
    ADD CONSTRAINT ck_collection_mode CHECK (
        collection_mode IN ('live', 'backfill')
    );

-- ---------------------------------------------------------------------------
-- 2. Review state
--
-- 'approved' is the default so the entire existing live archive stays
-- visible without a bulk update. Only the backfill writes 'unreviewed', and
-- it does so explicitly.
-- ---------------------------------------------------------------------------
ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved';

ALTER TABLE crime_incidents
    DROP CONSTRAINT IF EXISTS ck_review_status;

ALTER TABLE crime_incidents
    ADD CONSTRAINT ck_review_status CHECK (
        review_status IN ('unreviewed', 'approved', 'rejected')
    );

ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Free-text rather than a foreign key to users: a review may be recorded by
-- a process (a bulk approve, a migration) that is not a user row, and the
-- audit value is in knowing what decided, not in joining to it.
ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(120);

ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS review_note TEXT;

-- ---------------------------------------------------------------------------
-- 3. Indexes
--
-- The public feed now filters on review_status on every query, and the
-- review queue orders by collection_mode + status.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_incidents_review
    ON crime_incidents (review_status, incident_date DESC);

CREATE INDEX IF NOT EXISTS ix_incidents_queue
    ON crime_incidents (collection_mode, review_status, incident_date DESC);

-- ---------------------------------------------------------------------------
-- 4. Move the records already backfilled into the queue
--
-- These were posted before this table had a queue to post into. Identified
-- by the gap between when the incident happened and when the row was
-- written: the live pipeline ingests within hours, so a row describing an
-- incident more than 60 days before its own creation came from the backfill.
-- ---------------------------------------------------------------------------
UPDATE crime_incidents
SET collection_mode = 'backfill',
    review_status   = 'unreviewed',
    reviewed_at     = NULL,
    reviewed_by     = NULL
WHERE collection_mode = 'live'
  AND created_at - incident_date > INTERVAL '60 days';

COMMIT;
