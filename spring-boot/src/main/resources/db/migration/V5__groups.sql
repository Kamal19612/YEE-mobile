-- Couche 4 — Groups + memberships

CREATE TABLE app_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(120) NOT NULL,
    slug                VARCHAR(140) NOT NULL,
    description         TEXT         NOT NULL DEFAULT '',
    cover_url           TEXT,
    cover_storage_path  TEXT,
    visibility          VARCHAR(20)  NOT NULL,
    members_count       INTEGER      NOT NULL DEFAULT 0,
    created_by          UUID         NOT NULL REFERENCES users (id),
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_groups_slug UNIQUE (slug),
    CONSTRAINT chk_app_groups_visibility CHECK (visibility IN ('public', 'private', 'secret'))
);

CREATE INDEX idx_app_groups_name ON app_groups (name);
CREATE INDEX idx_app_groups_created_at ON app_groups (created_at DESC);

CREATE TABLE group_members (
    id          BIGSERIAL PRIMARY KEY,
    group_id    UUID         NOT NULL REFERENCES app_groups (id),
    user_id     UUID         NOT NULL REFERENCES users (id),
    status      VARCHAR(20)  NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'member',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_members_group_user UNIQUE (group_id, user_id),
    CONSTRAINT chk_group_members_status CHECK (status IN ('active', 'pending', 'invited', 'banned')),
    CONSTRAINT chk_group_members_role CHECK (role IN ('member', 'moderator', 'admin'))
);

CREATE INDEX idx_group_members_user ON group_members (user_id);
CREATE INDEX idx_group_members_group_status ON group_members (group_id, status);
