-- 006_harm_categories.sql
--
-- Adds three offence categories: Sexual Violence, Domestic Violence and
-- Human Trafficking.
--
-- Until now the extractor had to file rape and sexual harassment under
-- Assault, dowry abuse under Assault or Other, and trafficking under Other.
-- The archive's own category breakdown therefore could not show gender-based
-- violence at all - the harms Bangladeshi reporting most consistently flags
-- as under-counted were the ones its taxonomy erased. Online harassment and
-- sextortion stay under Cybercrime, where the Cyber view breaks them down.
--
-- Rollout order does not matter: the scraper maps the new categories back to
-- their pre-006 equivalents (models.LEGACY_CATEGORY_FALLBACK) if a backend
-- that has not been redeployed rejects them. Run this, redeploy the API, and
-- new categories start landing on the next ingest run.
--
-- Idempotent: safe to re-run. Rebuilds vw_powerbi_directquery exactly as 004
-- left it, with severity weights for the new categories.

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
            -- Gender-based and exploitation offences (006)
            'Sexual Violence', 'Domestic Violence', 'Human Trafficking',
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
        WHEN 'Sexual Violence'     THEN 4
        WHEN 'Human Trafficking'   THEN 4
        WHEN 'Robbery'             THEN 4
        WHEN 'Extortion'           THEN 4
        WHEN 'Industrial Accident' THEN 4
        WHEN 'Domestic Violence'   THEN 3
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
