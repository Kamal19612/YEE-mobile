-- Couche 1 — Auth : users + refresh_tokens
-- Remplace wp_users + user_meta (app_email_verified, app_account_deactivated, app_2fa_enabled)
-- et wp_app_refresh_tokens.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                           VARCHAR(254) NOT NULL,
    password_hash                   VARCHAR(255) NOT NULL,
    display_name                    VARCHAR(60)  NOT NULL,
    email_verified                  BOOLEAN      NOT NULL DEFAULT FALSE,
    account_deactivated             BOOLEAN      NOT NULL DEFAULT FALSE,
    two_factor_enabled              BOOLEAN      NOT NULL DEFAULT FALSE,
    is_site_admin                   BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verification_token_hash   CHAR(64),
    email_verification_expires_at   TIMESTAMPTZ,
    password_reset_token_hash       CHAR(64),
    password_reset_expires_at       TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email_verification_token_hash
    ON users (email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;

CREATE INDEX idx_users_password_reset_token_hash
    ON users (password_reset_token_hash)
    WHERE password_reset_token_hash IS NOT NULL;

CREATE TABLE refresh_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users (id),
    token_hash   CHAR(64)     NOT NULL,
    family_id    UUID         NOT NULL,
    user_agent   VARCHAR(255),
    ip_address   VARCHAR(45),
    remember_me  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ  NOT NULL,
    used_at      TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
