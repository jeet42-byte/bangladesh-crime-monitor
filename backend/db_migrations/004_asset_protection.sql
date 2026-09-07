-- 004_asset_protection.sql
--
-- Adds two non-criminal incident categories.
--
-- Why a crime archive is growing non-crime categories
-- ---------------------------------------------------
-- The asset-protection backfill measured this directly: of 33 gated
-- articles, 23 were rejected by the extractor's `is_crime_report` gate, and
-- roughly two-thirds of those rejections were the events that matter most to
-- the question the archive is now being asked.
--
--     1 killed, 30 injured as fire breaks out at RFL Industrial Park
--     12 injured in boiler explosion at Gazipur factory
--     12 workers burnt in Chattogram shipyard explosion
--     Fire guts 19 shops in Madaripur market
--     17 factories in Ashulia declare holiday amid unrest
--     After transport strike, work abstention threatens to slow Ctg Port
--
-- None of those are crimes. All of them are asset-protection incidents:
-- business interruption does not care whether a fire was arson or a boiler,
-- and a site closed by unrest is closed either way. Forcing them through a
-- crime taxonomy meant either discarding them or filing them as 'Other',
-- and 'Other' is where analysis goes to die.
--
-- So the taxonomy widens rather than the definition of "crime" being
-- stretched. Both new categories are clearly labelled as non-criminal in the
-- UI, because conflating an industrial accident with an offence would be a
-- worse error than omitting it.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Widen the category constraint
-- ---------------------------------------------------------------------------
ALTER TABLE crime_incidents
    DROP CONSTRAINT IF EXISTS ck_crime_category;

ALTER TABLE crime_incidents
    ADD CONSTRAINT ck_crime_category CHECK (
        crime_category IN (
            -- Criminal offences
            'Homicide', 'Robbery', 'Assault', 'Narcotics',
            'Cybercrime', 'Fraud', 'Extortion', 'Theft',
            -- Non-criminal security incidents (asset protection)
            'Industrial Accident', 'Labour Unrest',
            'Other'
        )
    );

-- ---------------------------------------------------------------------------
-- 2. Rebuild the BI view so the new categories carry a severity weight
--
-- CREATE OR REPLACE cannot change a column's expression when the column list
-- is unchanged in shape but the CASE differs, and it cannot reorder columns,
-- so the view is dropped and recreated - the same approach 003 had to take.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_powerbi_directquery;

CREATE VIEW vw_powerbi_directquery AS
SELECT
    ci.id,
    ci.title,
    ci.narrative,
    ci.crime_category,
    ci.penal_code_tags,
    ci.fir_or_gd,
    ci.incident_date,
    (ci.incident_date AT TIME ZONE 'Asia/Dhaka')::date  AS incident_date_bst,
    EXTRACT(HOUR FROM ci.incident_date AT TIME ZONE 'Asia/Dhaka')
                                                        AS incident_hour_bst,
    ci.thana_name,
    ci.district,
    j.division,
    ci.latitude,
    ci.longitude,
    ci.source_platform,
    ci.source_handle,
    ci.verification_level,
    ci.source_url,
    ci.source_confidence,
    (ci.source_confidence >= 80)                        AS is_verified_source,
    (ci.verification_level = 'corroborated')            AS is_corroborated,

    -- True for the criminal categories only. Lets a report separate offences
    -- from accidents and disruption without hard-coding the enum.
    (ci.crime_category NOT IN ('Industrial Accident', 'Labour Unrest'))
                                                        AS is_criminal_offence,

    CASE ci.crime_category
        WHEN 'Homicide'            THEN 5
        WHEN 'Robbery'             THEN 4
        WHEN 'Extortion'           THEN 4
        WHEN 'Industrial Accident' THEN 4
        WHEN 'Assault'             THEN 3
        WHEN 'Narcotics'           THEN 3
        WHEN 'Labour Unrest'       THEN 3
        WHEN 'Cybercrime'          THEN 2
        WHEN 'Fraud'               THEN 2
        WHEN 'Theft'               THEN 2
        ELSE 1
    END                                                 AS severity_weight,

    ci.raw_content_hash,
    ci.created_at,
    EXTRACT(EPOCH FROM (NOW() - ci.incident_date)) / 86400.0
                                                        AS age_days
FROM crime_incidents ci
LEFT JOIN jurisdictions j ON j.thana_name = ci.thana_name;

COMMIT;
