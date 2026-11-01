-- 007: Public Pulse - aggregated public reaction to viral Bangladeshi videos.
--
-- One row per video, refreshed each time the video is re-analysed. Only
-- aggregates are stored: sentiment shares, emotions, themes and English
-- paraphrases of the main views. Commenter names, channel IDs and verbatim
-- comments are never written here - see app/parsers/pulse_analyzer.py.
--
-- The backend also applies this file at startup (app/db/schema.py), so it
-- does not need to be pasted into Neon by hand. Every statement is
-- idempotent.

CREATE TABLE IF NOT EXISTS pulse_topics (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform           TEXT        NOT NULL DEFAULT 'YouTube',
    video_id           TEXT        NOT NULL UNIQUE,
    url                TEXT        NOT NULL,
    title              TEXT        NOT NULL,
    channel            TEXT,
    published_at       TIMESTAMPTZ,
    discovered_via     TEXT        NOT NULL DEFAULT 'trending',
    view_count         BIGINT,
    like_count         BIGINT,
    comment_count      BIGINT,
    comments_analysed  INTEGER     NOT NULL,
    topic              TEXT        NOT NULL,
    topic_type         TEXT        NOT NULL,
    crime_category     TEXT,
    positive_pct       NUMERIC(5,2) NOT NULL,
    neutral_pct        NUMERIC(5,2) NOT NULL,
    negative_pct       NUMERIC(5,2) NOT NULL,
    emotions           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    stance_authorities TEXT        NOT NULL DEFAULT 'not_discussed',
    themes             JSONB       NOT NULL DEFAULT '[]'::jsonb,
    flags              JSONB       NOT NULL DEFAULT '[]'::jsonb,
    summary            TEXT        NOT NULL,
    key_views          JSONB       NOT NULL DEFAULT '[]'::jsonb,
    history            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    analysed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_pulse_topics_analysed_at ON pulse_topics (analysed_at DESC);
CREATE INDEX IF NOT EXISTS ix_pulse_topics_topic_type ON pulse_topics (topic_type);
