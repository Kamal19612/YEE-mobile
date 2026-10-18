-- Couche 3 — Feed : posts, likes, comments, media, link previews

CREATE TABLE link_previews (
    id            BIGSERIAL PRIMARY KEY,
    url_hash      CHAR(64)     NOT NULL,
    url           TEXT         NOT NULL,
    preview_type  VARCHAR(20)  NOT NULL DEFAULT 'website',
    title         TEXT,
    description   TEXT,
    image_url     TEXT,
    site_name     TEXT,
    video_id      TEXT,
    embed_url     TEXT,
    fetch_failed  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_link_previews_url_hash UNIQUE (url_hash)
);

CREATE TABLE posts (
    id               BIGSERIAL PRIMARY KEY,
    author_id        UUID         NOT NULL REFERENCES users (id),
    group_id         UUID,
    content          TEXT         NOT NULL DEFAULT '',
    link_preview_id  BIGINT       REFERENCES link_previews (id),
    likes_count      INTEGER      NOT NULL DEFAULT 0,
    comments_count   INTEGER      NOT NULL DEFAULT 0,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_feed_global ON posts (id DESC)
    WHERE deleted_at IS NULL AND group_id IS NULL;
CREATE INDEX idx_posts_author ON posts (author_id, id DESC)
    WHERE deleted_at IS NULL AND group_id IS NULL;
CREATE INDEX idx_posts_group ON posts (group_id, id DESC)
    WHERE deleted_at IS NULL AND group_id IS NOT NULL;

CREATE TABLE post_likes (
    post_id     BIGINT       NOT NULL REFERENCES posts (id),
    user_id     UUID         NOT NULL REFERENCES users (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT       NOT NULL REFERENCES posts (id),
    author_id   UUID         NOT NULL REFERENCES users (id),
    content     TEXT         NOT NULL,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post ON post_comments (post_id, id DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE post_media (
    id            BIGSERIAL PRIMARY KEY,
    post_id       BIGINT       NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    media_type    VARCHAR(10)  NOT NULL,
    url           TEXT         NOT NULL,
    storage_path  TEXT,
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT chk_post_media_type CHECK (media_type IN ('image', 'audio'))
);

CREATE INDEX idx_post_media_post ON post_media (post_id, sort_order);
