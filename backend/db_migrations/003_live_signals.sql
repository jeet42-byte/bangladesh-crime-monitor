-- ==========================================================================
--  Migration 003 - live social signals and verification levels
--
--  Run after 002_auth.sql:
--      psql "$DATABASE_URL" -f backend/db_migrations/003_live_signals.sql
--
--  Idempotent.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Widen the source vocabulary
--
--    'telegram_channel' is the only social platform that turned out to be
--    reachable without authentication. Facebook, Instagram, X, Reddit and
--    LinkedIn all refuse unauthenticated automated access; the enum keeps
--    their values so historical rows stay valid if any becomes usable again.
-- --------------------------------------------------------------------------
ALTER TABLE crime_incidents DROP CONSTRAINT IF EXISTS ck_source_platform;

ALTER TABLE crime_incidents
    ADD CONSTRAINT ck_source_platform CHECK (
        source_platform IN (
            'news_portal',
            'police_report',
            'facebook_public',
            'telegram_channel'
        )
    );


-- --------------------------------------------------------------------------
-- 2. Verification level
--
--    Distinct from source_confidence, which describes *who published it*.
--    This describes *how well corroborated the claim is*:
--
--      unverified   - a single social/live post, nothing else supports it
--      single_source- one editorial or official source
--      corroborated - independently reported by a second source
--
--    A live signal must never be presented as an established incident, so the
--    UI keys off this column rather than inferring from the platform.
-- --------------------------------------------------------------------------
ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20)
        NOT NULL DEFAULT 'single_source';

ALTER TABLE crime_incidents DROP CONSTRAINT IF EXISTS ck_verification_level;
ALTER TABLE crime_incidents
    ADD CONSTRAINT ck_verification_level CHECK (
        verification_level IN ('unverified', 'single_source', 'corroborated')
    );

COMMENT ON COLUMN crime_incidents.verification_level IS
    'How well corroborated the claim is, as distinct from who published it. '
    'Live social signals enter as unverified and are promoted only when an '
    'independent source reports the same incident.';

-- Existing rows: news and police reporting is single-source by definition,
-- and nothing in the archive predates this column as a social signal.
UPDATE crime_incidents
   SET verification_level = 'single_source'
 WHERE verification_level IS NULL;


-- --------------------------------------------------------------------------
-- 3. Where the signal came from, for credibility display
--
--    e.g. 'prothomalo' for t.me/prothomalo. Kept separate from source_url so
--    the UI can show provenance without parsing a link.
-- --------------------------------------------------------------------------
ALTER TABLE crime_incidents
    ADD COLUMN IF NOT EXISTS source_handle VARCHAR(120);

COMMENT ON COLUMN crime_incidents.source_handle IS
    'Channel or account identifier the signal came from, for provenance.';


-- --------------------------------------------------------------------------
-- 4. Indexes for the live feed
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_incidents_verification
    ON crime_incidents (verification_level, incident_date DESC);

-- The live strip asks "what arrived in the last few hours", which is a
-- created_at question, not an incident_date one.
CREATE INDEX IF NOT EXISTS idx_incidents_created
    ON crime_incidents (created_at DESC);


-- --------------------------------------------------------------------------
-- 5. Refresh the BI view to carry the new columns
--
--    CREATE OR REPLACE cannot add a column in the middle of a view's column
--    list - PostgreSQL rejects it as a rename - so the view is dropped and
--    rebuilt. It holds no data of its own, so nothing is lost.
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_powerbi_directquery;

CREATE VIEW vw_powerbi_directquery AS
SELECT
    ci.id::text                                        AS incident_id,
    ci.fir_or_gd,
    ci.title,
    ci.narrative,
    ci.crime_category,
    COALESCE(array_to_string(ci.penal_code_tags, ' | '), '')
                                                       AS penal_code_tags_flat,
    COALESCE(array_length(ci.penal_code_tags, 1), 0)    AS penal_code_tag_count,

    ci.incident_date,
    (ci.incident_date AT TIME ZONE 'Asia/Dhaka')        AS incident_datetime_bst,
    (ci.incident_date AT TIME ZONE 'Asia/Dhaka')::date  AS incident_date_bst,
    EXTRACT(YEAR   FROM ci.incident_date AT TIME ZONE 'Asia/Dhaka')::int
                                                       AS incident_year,
    EXTRACT(MONTH  FROM ci.incident_date AT TIME ZONE 'Asia/Dhaka')::int
                                                       AS incident_month,
    TO_CHAR(ci.incident_date AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM')
                                                       AS incident_year_month,
    EXTRACT(ISODOW FROM ci.incident_date AT TIME ZONE 'Asia/Dhaka')::int
                                                       AS incident_iso_weekday,
    TRIM(TO_CHAR(ci.incident_date AT TIME ZONE 'Asia/Dhaka', 'Day'))
                                                       AS incident_weekday_name,
    EXTRACT(HOUR   FROM ci.incident_date AT TIME ZONE 'Asia/Dhaka')::int
                                                       AS incident_hour,

    ci.thana_name,
    ci.district,
    j.division,
    ci.latitude::float8                                AS latitude,
    ci.longitude::float8                               AS longitude,

    ci.source_platform,
    ci.source_handle,
    ci.verification_level,
    CASE ci.source_platform
        WHEN 'police_report'    THEN 'Official'
        WHEN 'news_portal'      THEN 'Verified News'
        WHEN 'telegram_channel' THEN 'Live Signal'
        WHEN 'facebook_public'  THEN 'Public Social'
        ELSE 'Unclassified'
    END                                                AS source_tier,
    ci.source_url,
    ci.source_confidence,
    (ci.source_confidence >= 80)                       AS is_verified_source,
    (ci.verification_level = 'corroborated')           AS is_corroborated,

    CASE ci.crime_category
        WHEN 'Homicide'   THEN 5
        WHEN 'Robbery'    THEN 4
        WHEN 'Extortion'  THEN 4
        WHEN 'Assault'    THEN 3
        WHEN 'Narcotics'  THEN 3
        WHEN 'Cybercrime' THEN 2
        WHEN 'Fraud'      THEN 2
        WHEN 'Theft'      THEN 2
        ELSE 1
    END                                                AS severity_weight,

    ci.raw_content_hash,
    ci.created_at,
    EXTRACT(EPOCH FROM (NOW() - ci.incident_date)) / 86400.0
                                                       AS age_days
FROM crime_incidents ci
LEFT JOIN jurisdictions j ON j.thana_name = ci.thana_name;


DO $verify$
DECLARE
    n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM crime_incidents;
    RAISE NOTICE 'Live-signal schema ready. crime_incidents: % rows.', n;
END
$verify$;
