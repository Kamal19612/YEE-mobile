-- Couche 5 — Institutions (arbre 3 niveaux) + référents + affiliations

CREATE TABLE institutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES institutions (id),
    type            VARCHAR(20)  NOT NULL,
    name            VARCHAR(160) NOT NULL,
    slug            VARCHAR(180) NOT NULL,
    description     TEXT         NOT NULL DEFAULT '',
    members_count   INTEGER      NOT NULL DEFAULT 0,
    created_by      UUID         NOT NULL REFERENCES users (id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_institutions_slug UNIQUE (slug),
    CONSTRAINT chk_institutions_type CHECK (type IN ('continent', 'country', 'local'))
);

CREATE INDEX idx_institutions_parent ON institutions (parent_id);
CREATE INDEX idx_institutions_type ON institutions (type);
CREATE INDEX idx_institutions_name ON institutions (name);

CREATE TABLE institution_referents (
    id              BIGSERIAL PRIMARY KEY,
    institution_id  UUID         NOT NULL REFERENCES institutions (id),
    user_id         UUID         NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_institution_referents UNIQUE (institution_id, user_id)
);

CREATE INDEX idx_institution_referents_user ON institution_referents (user_id);

CREATE TABLE user_institutions (
    id              BIGSERIAL PRIMARY KEY,
    institution_id  UUID         NOT NULL REFERENCES institutions (id),
    user_id         UUID         NOT NULL REFERENCES users (id),
    status          VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_institutions UNIQUE (institution_id, user_id),
    CONSTRAINT chk_user_institutions_status CHECK (status IN ('pending', 'active', 'rejected'))
);

CREATE INDEX idx_user_institutions_user_status ON user_institutions (user_id, status);
CREATE INDEX idx_user_institutions_institution_status ON user_institutions (institution_id, status);
