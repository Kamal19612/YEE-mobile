ALTER TABLE users
    ADD COLUMN account_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_users_account_deleted ON users (account_deleted)
    WHERE account_deleted = TRUE;
