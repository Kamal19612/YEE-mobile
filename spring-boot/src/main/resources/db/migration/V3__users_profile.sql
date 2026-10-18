-- Couche 2 — Profil + follows (compteurs dénormalisés sur users)

ALTER TABLE users
    ADD COLUMN mention_name      VARCHAR(80)  NOT NULL DEFAULT '',
    ADD COLUMN bio               VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN profession        VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN organization      VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN location          VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN social_links_json TEXT         NOT NULL DEFAULT '{}',
    ADD COLUMN avatar_url        TEXT,
    ADD COLUMN cover_url         TEXT,
    ADD COLUMN avatar_storage_path TEXT,
    ADD COLUMN cover_storage_path  TEXT,
    ADD COLUMN followers_count   INTEGER      NOT NULL DEFAULT 0,
    ADD COLUMN following_count   INTEGER      NOT NULL DEFAULT 0,
    ADD COLUMN posts_count       INTEGER      NOT NULL DEFAULT 0,
    ADD COLUMN deactivated_at    TIMESTAMPTZ;

-- Remplir mention_name pour les comptes déjà créés en Couche 1
UPDATE users
SET mention_name = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]+', '-', 'g'))
                 || '-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6)
WHERE mention_name = '' OR mention_name IS NULL;

CREATE UNIQUE INDEX uq_users_mention_name ON users (mention_name) WHERE mention_name <> '';

CREATE TABLE follows (
    id           BIGSERIAL PRIMARY KEY,
    follower_id  UUID         NOT NULL REFERENCES users (id),
    followee_id  UUID         NOT NULL REFERENCES users (id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_follows_follower_followee UNIQUE (follower_id, followee_id),
    CONSTRAINT chk_follows_not_self CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_follows_follower_id ON follows (follower_id);
CREATE INDEX idx_follows_followee_id ON follows (followee_id);
CREATE INDEX idx_follows_created_at ON follows (created_at DESC);
