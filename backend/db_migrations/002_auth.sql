-- ==========================================================================
--  Bangladesh Crime Monitor - authentication schema (migration 002)
--
--  Run after init_schema.sql:
--      psql "$DATABASE_URL" -f backend/db_migrations/002_auth.sql
--
--  Idempotent: safe to re-run.
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;


-- ==========================================================================
-- 1. users
-- ==========================================================================
CREATE TABLE IF NOT EXISTS users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- citext gives case-insensitive uniqueness without a functional index,
    -- so Ahnaf@example.com and ahnaf@example.com cannot both register.
    email              CITEXT        NOT NULL UNIQUE,
    username           CITEXT        NOT NULL UNIQUE,

    -- Argon2id digest. Never a plaintext or reversible value.
    password_hash      TEXT          NOT NULL,

    -- 'owner'  - the site operator
    -- 'member' - a registered, email-verified account
    role               VARCHAR(20)   NOT NULL DEFAULT 'member',

    is_verified        BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Optional public-facing description, used for the ownership block.
    display_name       VARCHAR(120),
    credentials        TEXT,

    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    verified_at        TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,

    -- Throttles credential stuffing against a single account.
    failed_login_count INT           NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,

    CONSTRAINT ck_users_role CHECK (role IN ('owner', 'member')),
    CONSTRAINT ck_users_username CHECK (
        char_length(username) BETWEEN 3 AND 32
        AND username ~ '^[A-Za-z0-9_.-]+$'
    ),
    CONSTRAINT ck_users_email CHECK (position('@' IN email) > 1)
);

COMMENT ON TABLE users IS
    'Registered accounts. Guests are not represented here - guest access is '
    'unauthenticated and stores nothing.';
COMMENT ON COLUMN users.password_hash IS
    'Argon2id digest produced by app/core/security.py. The application never '
    'stores, logs or transmits the plaintext password.';

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);


-- ==========================================================================
-- 2. email_verification_codes
--
--    One-time codes for address verification. The code itself is stored as a
--    SHA-256 digest: a database leak must not hand an attacker live codes.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    code_hash    VARCHAR(64)   NOT NULL,
    purpose      VARCHAR(30)   NOT NULL DEFAULT 'verify_email',

    expires_at   TIMESTAMPTZ   NOT NULL,
    consumed_at  TIMESTAMPTZ,
    attempts     INT           NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_evc_purpose CHECK (
        purpose IN ('verify_email', 'password_reset')
    )
);

CREATE INDEX IF NOT EXISTS idx_evc_user_purpose
    ON email_verification_codes (user_id, purpose, consumed_at);
CREATE INDEX IF NOT EXISTS idx_evc_expires
    ON email_verification_codes (expires_at);

COMMENT ON COLUMN email_verification_codes.code_hash IS
    'SHA-256 of the 6-digit code. The plaintext exists only in the email.';


-- ==========================================================================
-- 3. auth_attempts
--
--    Rate-limiting ledger, keyed by IP and by target identifier. Kept in the
--    database rather than in process memory because Render restarts the
--    container freely and an in-memory limiter resets to zero with it.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS auth_attempts (
    id          BIGSERIAL PRIMARY KEY,
    bucket      VARCHAR(80)   NOT NULL,   -- e.g. 'login:1.2.3.4' or 'register:ip'
    occurred_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_bucket
    ON auth_attempts (bucket, occurred_at DESC);


-- ==========================================================================
-- 4. Housekeeping helper
--
--    Called opportunistically by the API so expired codes and stale rate-limit
--    rows do not accumulate against Neon's 0.5 GB free tier.
-- ==========================================================================
CREATE OR REPLACE FUNCTION prune_auth_ephemera() RETURNS void AS $prune$
BEGIN
    DELETE FROM email_verification_codes
     WHERE expires_at < NOW() - INTERVAL '1 day';

    DELETE FROM auth_attempts
     WHERE occurred_at < NOW() - INTERVAL '1 day';
END;
$prune$ LANGUAGE plpgsql;


DO $verify$
DECLARE
    n_users INT;
BEGIN
    SELECT COUNT(*) INTO n_users FROM users;
    RAISE NOTICE 'Auth schema ready. users: % rows.', n_users;
END
$verify$;
