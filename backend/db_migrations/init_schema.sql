-- ==========================================================================
--  Bangladesh Crime Monitor - initial schema
--  Target: Neon Serverless PostgreSQL 16
--  Run with:  psql "$DATABASE_URL" -f backend/db_migrations/init_schema.sql
--
--  This script is idempotent: it can be re-run safely against an existing
--  database without destroying data.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostGIS gives us real geospatial indexing (GiST over geography points).
-- If PostGIS is not enabled on the project the CREATE below fails, so it is
-- wrapped: the rest of the schema does not depend on it.
DO $ext$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS postgis;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS unavailable (%). Continuing without geometry columns.', SQLERRM;
    END;
END
$ext$;

-- Trigram index support for fast ILIKE '%term%' free-text search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ==========================================================================
-- 1. jurisdictions - police thana (station) reference table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS jurisdictions (
    thana_id    SERIAL PRIMARY KEY,
    division    VARCHAR(50)   NOT NULL,
    district    VARCHAR(50)   NOT NULL,
    thana_name  VARCHAR(100)  NOT NULL UNIQUE,
    latitude    NUMERIC(9,6)  NOT NULL,
    longitude   NUMERIC(9,6)  NOT NULL
);

COMMENT ON TABLE  jurisdictions IS
    'Police station (thana) reference set. Coordinates are approximate jurisdiction centroids, used to place an incident on the map when reporting gives no street-level address.';
COMMENT ON COLUMN jurisdictions.thana_name IS
    'Canonical English thana name. Aliases and Bengali spellings are normalised in app/utils/thana_coordinates.py before reaching this table.';


-- ==========================================================================
-- 2. crime_incidents - the fact table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS crime_incidents (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- First Information Report / General Diary reference, when the source
    -- actually quotes one. Frequently absent in press reporting.
    fir_or_gd          VARCHAR(100),

    title              TEXT          NOT NULL,
    narrative          TEXT          NOT NULL,

    -- Homicide | Robbery | Assault | Narcotics | Cybercrime | Fraud |
    -- Extortion | Theft | Other
    crime_category     VARCHAR(50)   NOT NULL,

    -- e.g. ARRAY['Penal Code 302', 'Cyber Security Act 2023']
    penal_code_tags    TEXT[],

    incident_date      TIMESTAMPTZ   NOT NULL,

    thana_name         VARCHAR(100)  NOT NULL,
    district           VARCHAR(50)   NOT NULL DEFAULT 'Dhaka',
    latitude           NUMERIC(9,6)  NOT NULL,
    longitude          NUMERIC(9,6)  NOT NULL,

    -- 'news_portal' | 'facebook_public' | 'police_report'
    source_platform    VARCHAR(50)   NOT NULL,
    source_url         TEXT          NOT NULL,

    -- Official: 95, News: 80, Social media: 55 (see /methodology)
    source_confidence  INT           NOT NULL,

    -- SHA-256( incident_date_iso | normalised_thana | normalised_title )
    -- Enforces idempotent re-ingestion: the cron job can replay the same
    -- window indefinitely without creating duplicate rows.
    raw_content_hash   VARCHAR(64)   NOT NULL UNIQUE,

    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_crime_category CHECK (
        crime_category IN ('Homicide','Robbery','Assault','Narcotics',
                           'Cybercrime','Fraud','Extortion','Theft','Other')
    ),
    CONSTRAINT ck_source_platform CHECK (
        source_platform IN ('news_portal','facebook_public','police_report')
    ),
    CONSTRAINT ck_source_confidence CHECK (
        source_confidence BETWEEN 0 AND 100
    ),
    -- Bounding box of Bangladesh; rejects obviously bad geocodes.
    CONSTRAINT ck_latitude  CHECK (latitude  BETWEEN 20.5 AND 26.7),
    CONSTRAINT ck_longitude CHECK (longitude BETWEEN 88.0 AND 92.7)
);

COMMENT ON TABLE crime_incidents IS
    'One row per distinct reported incident, derived from public open-source reporting. Rows record allegations as reported, not adjudicated outcomes.';


-- ==========================================================================
-- 3. Indexes
-- ==========================================================================

-- Primary feed access path: newest-first, optionally narrowed to one thana.
CREATE INDEX IF NOT EXISTS idx_incidents_date_thana
    ON crime_incidents (incident_date DESC, thana_name);

-- Category facet / bar-chart aggregation.
CREATE INDEX IF NOT EXISTS idx_incidents_category
    ON crime_incidents (crime_category);

-- The UNIQUE constraint on raw_content_hash already builds a B-tree index.
-- This named index is declared explicitly so the deduplication access path
-- is self-documenting and survives future relaxation of the constraint.
CREATE INDEX IF NOT EXISTS idx_incidents_content_hash
    ON crime_incidents (raw_content_hash);

-- Source-platform facet (All / Verified News / Public Social).
CREATE INDEX IF NOT EXISTS idx_incidents_source_platform
    ON crime_incidents (source_platform, incident_date DESC);

-- Free-text search in the archive explorer.
CREATE INDEX IF NOT EXISTS idx_incidents_title_trgm
    ON crime_incidents USING GIN (title gin_trgm_ops);

-- Penal-code tag containment queries: penal_code_tags @> ARRAY['Penal Code 302']
CREATE INDEX IF NOT EXISTS idx_incidents_penal_tags
    ON crime_incidents USING GIN (penal_code_tags);


-- --------------------------------------------------------------------------
-- 3b. Geospatial columns + GiST indexes (only when PostGIS is installed)
-- --------------------------------------------------------------------------
DO $geo$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN

        -- A generated column keeps geography in lock-step with lat/lon with
        -- no trigger and no application-side maintenance.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'crime_incidents' AND column_name = 'geom'
        ) THEN
            EXECUTE $ddl$
                ALTER TABLE crime_incidents
                ADD COLUMN geom geography(Point, 4326)
                GENERATED ALWAYS AS (
                    ST_SetSRID(
                        ST_MakePoint(longitude::float8, latitude::float8),
                        4326
                    )::geography
                ) STORED
            $ddl$;
        END IF;

        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_incidents_geom
                 ON crime_incidents USING GIST (geom)';

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'jurisdictions' AND column_name = 'geom'
        ) THEN
            EXECUTE $ddl$
                ALTER TABLE jurisdictions
                ADD COLUMN geom geography(Point, 4326)
                GENERATED ALWAYS AS (
                    ST_SetSRID(
                        ST_MakePoint(longitude::float8, latitude::float8),
                        4326
                    )::geography
                ) STORED
            $ddl$;
        END IF;

        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jurisdictions_geom
                 ON jurisdictions USING GIST (geom)';

        RAISE NOTICE 'PostGIS geography columns and GiST indexes ready.';
    ELSE
        RAISE NOTICE 'PostGIS not installed; skipping geometry columns.';
    END IF;
END
$geo$;


-- ==========================================================================
-- 4. Seed: Dhaka Metropolitan Police - 50 thanas
--    Coordinates are approximate jurisdiction centroids (WGS84).
-- ==========================================================================
INSERT INTO jurisdictions (division, district, thana_name, latitude, longitude) VALUES
    ('Dhaka', 'Dhaka', 'Ramna',                    23.739500, 90.395800),
    ('Dhaka', 'Dhaka', 'Dhanmondi',                23.745900, 90.376300),
    ('Dhaka', 'Dhaka', 'Kotwali',                  23.708800, 90.407400),
    ('Dhaka', 'Dhaka', 'Motijheel',                23.728100, 90.418900),
    ('Dhaka', 'Dhaka', 'Lalbagh',                  23.717800, 90.388400),
    ('Dhaka', 'Dhaka', 'Sutrapur',                 23.708300, 90.421700),
    ('Dhaka', 'Dhaka', 'Tejgaon',                  23.759600, 90.393100),
    ('Dhaka', 'Dhaka', 'Tejgaon Industrial Area',  23.766700, 90.404100),
    ('Dhaka', 'Dhaka', 'Mirpur Model',             23.806300, 90.368200),
    ('Dhaka', 'Dhaka', 'Mohammadpur',              23.766000, 90.358600),
    ('Dhaka', 'Dhaka', 'Gulshan',                  23.792300, 90.414300),
    ('Dhaka', 'Dhaka', 'Banani',                   23.793900, 90.401000),
    ('Dhaka', 'Dhaka', 'Cantonment',               23.816900, 90.397300),
    ('Dhaka', 'Dhaka', 'Demra',                    23.712500, 90.492600),
    ('Dhaka', 'Dhaka', 'Sabujbagh',                23.741300, 90.436800),
    ('Dhaka', 'Dhaka', 'Uttara East',              23.869900, 90.401200),
    ('Dhaka', 'Dhaka', 'Uttara West',              23.874500, 90.383400),
    ('Dhaka', 'Dhaka', 'Badda',                    23.780900, 90.425800),
    ('Dhaka', 'Dhaka', 'Kafrul',                   23.797700, 90.383600),
    ('Dhaka', 'Dhaka', 'Khilgaon',                 23.750600, 90.428300),
    ('Dhaka', 'Dhaka', 'Shahbagh',                 23.738700, 90.395300),
    ('Dhaka', 'Dhaka', 'New Market',               23.733500, 90.384700),
    ('Dhaka', 'Dhaka', 'Hazaribagh',               23.732400, 90.365500),
    ('Dhaka', 'Dhaka', 'Kamrangirchar',            23.712300, 90.372100),
    ('Dhaka', 'Dhaka', 'Chawkbazar',               23.716800, 90.396200),
    ('Dhaka', 'Dhaka', 'Bangshal',                 23.719400, 90.407600),
    ('Dhaka', 'Dhaka', 'Kadamtali',                23.700200, 90.437200),
    ('Dhaka', 'Dhaka', 'Shyampur',                 23.693100, 90.434200),
    ('Dhaka', 'Dhaka', 'Wari',                     23.717600, 90.418200),
    ('Dhaka', 'Dhaka', 'Gendaria',                 23.708400, 90.428700),
    ('Dhaka', 'Dhaka', 'Jatrabari',                23.710800, 90.446900),
    ('Dhaka', 'Dhaka', 'Turag',                    23.868100, 90.363500),
    ('Dhaka', 'Dhaka', 'Pallabi',                  23.823500, 90.365200),
    ('Dhaka', 'Dhaka', 'Rupnagar',                 23.822800, 90.354800),
    ('Dhaka', 'Dhaka', 'Shah Ali',                 23.804700, 90.354600),
    ('Dhaka', 'Dhaka', 'Darus Salam',              23.786400, 90.351700),
    ('Dhaka', 'Dhaka', 'Bhashantek',               23.822100, 90.386400),
    ('Dhaka', 'Dhaka', 'Vatara',                   23.803600, 90.428900),
    ('Dhaka', 'Dhaka', 'Khilkhet',                 23.828900, 90.420700),
    ('Dhaka', 'Dhaka', 'Sherebangla Nagar',        23.768200, 90.377800),
    ('Dhaka', 'Dhaka', 'Adabor',                   23.771800, 90.352600),
    ('Dhaka', 'Dhaka', 'Dakshinkhan',              23.874100, 90.418700),
    ('Dhaka', 'Dhaka', 'Uttarkhan',                23.879800, 90.428400),
    ('Dhaka', 'Dhaka', 'Airport',                  23.845200, 90.404500),
    ('Dhaka', 'Dhaka', 'Rampura',                  23.760800, 90.421400),
    ('Dhaka', 'Dhaka', 'Hatirjheel',               23.756300, 90.406800),
    ('Dhaka', 'Dhaka', 'Shahjahanpur',             23.737700, 90.421900),
    ('Dhaka', 'Dhaka', 'Mugda',                    23.735400, 90.437500),
    ('Dhaka', 'Dhaka', 'Paltan',                   23.734900, 90.412700),
    ('Dhaka', 'Dhaka', 'Kalabagan',                23.748900, 90.383900)
ON CONFLICT (thana_name) DO UPDATE
    SET division  = EXCLUDED.division,
        district  = EXCLUDED.district,
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;


-- ==========================================================================
-- 5. vw_powerbi_directquery
--    Flattened, BI-friendly projection. Power BI DirectQuery does not fold
--    PostgreSQL arrays or UUIDs cleanly, so this view:
--      * casts id to text,
--      * flattens penal_code_tags into a delimited string,
--      * pre-expands the date dimension in Asia/Dhaka (BST, UTC+6),
--      * exposes a numeric severity weight for bubble sizing.
-- ==========================================================================
CREATE OR REPLACE VIEW vw_powerbi_directquery AS
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
    CASE ci.source_platform
        WHEN 'police_report'   THEN 'Official'
        WHEN 'news_portal'     THEN 'Verified News'
        WHEN 'facebook_public' THEN 'Public Social'
        ELSE 'Unclassified'
    END                                                AS source_tier,
    ci.source_url,
    ci.source_confidence,
    (ci.source_confidence >= 80)                       AS is_verified_source,

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

COMMENT ON VIEW vw_powerbi_directquery IS
    'Denormalised projection for Power BI DirectQuery / Tableau / Metabase: no arrays, no UUIDs, date dimension pre-expanded in Asia/Dhaka (BST).';


-- ==========================================================================
-- 6. Verification
-- ==========================================================================
DO $verify$
DECLARE
    n_thanas INT;
BEGIN
    SELECT COUNT(*) INTO n_thanas FROM jurisdictions;
    RAISE NOTICE 'Schema ready. jurisdictions seeded: % rows.', n_thanas;
END
$verify$;
