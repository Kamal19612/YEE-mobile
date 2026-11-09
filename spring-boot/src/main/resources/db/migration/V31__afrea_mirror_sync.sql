-- Miroir AfrEA → AED : colonnes sync + tables de journal.
-- Additive / non destructive. Comptes existants : external_id NULL, status backfillé.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS languages VARCHAR(255),
    ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS membership_expires_on DATE,
    ADD COLUMN IF NOT EXISTS membership_yee BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill status depuis les booléens legacy (avant contrainte CHECK).
UPDATE users
SET status = CASE
    WHEN account_deleted = TRUE OR account_deactivated = TRUE THEN 'DESACTIVE'
    WHEN email_verified = TRUE THEN 'ACTIF'
    ELSE 'ACTIF'
END
WHERE status IS NULL OR status = 'ACTIF';

-- Réappliquer le CASE pour les comptes déjà désactivés qui auraient le DEFAULT ACTIF.
UPDATE users
SET status = 'DESACTIVE'
WHERE (account_deleted = TRUE OR account_deactivated = TRUE)
  AND status <> 'DESACTIVE';

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_status;
ALTER TABLE users
    ADD CONSTRAINT chk_users_status
    CHECK (status IN ('A_VERIFIER', 'VERIFIE', 'ACTIF', 'DESACTIVE'));

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_membership_type;
ALTER TABLE users
    ADD CONSTRAINT chk_users_membership_type
    CHECK (
        membership_type IS NULL
        OR membership_type IN ('individual', 'vope_member', 'inst_member')
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_external_id
    ON users (external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_last_synced_at ON users (last_synced_at);
CREATE INDEX IF NOT EXISTS idx_users_membership_yee ON users (membership_yee)
    WHERE membership_yee = TRUE;

-- ---------------------------------------------------------------------------
-- institutions
-- ---------------------------------------------------------------------------
ALTER TABLE institutions
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS creation_status VARCHAR(20) NOT NULL DEFAULT 'CREEE';

-- Institutions déjà en base = créées localement.
UPDATE institutions
SET creation_status = 'CREEE'
WHERE creation_status IS NULL OR creation_status = 'CREEE';

ALTER TABLE institutions
    DROP CONSTRAINT IF EXISTS chk_institutions_creation_status;
ALTER TABLE institutions
    ADD CONSTRAINT chk_institutions_creation_status
    CHECK (creation_status IN ('PENDING', 'CREEE', 'REJETEE'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_institutions_external_id
    ON institutions (external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_creation_status
    ON institutions (creation_status);

-- ---------------------------------------------------------------------------
-- sync_log / sync_state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
    id              BIGSERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ  NOT NULL,
    ended_at        TIMESTAMPTZ,
    status          VARCHAR(20)  NOT NULL,
    created_count   INTEGER      NOT NULL DEFAULT 0,
    updated_count   INTEGER      NOT NULL DEFAULT 0,
    skipped_count   INTEGER      NOT NULL DEFAULT 0,
    error_count     INTEGER      NOT NULL DEFAULT 0,
    summary_json    TEXT         NOT NULL DEFAULT '{}',
    error_details   TEXT         NOT NULL DEFAULT '',
    CONSTRAINT chk_sync_log_status CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log (started_at DESC);

CREATE TABLE IF NOT EXISTS sync_state (
    id              SMALLINT PRIMARY KEY DEFAULT 1,
    last_sync_at    TIMESTAMPTZ,
    lock_owner      VARCHAR(64),
    lock_acquired_at TIMESTAMPTZ,
    CONSTRAINT chk_sync_state_singleton CHECK (id = 1)
);

INSERT INTO sync_state (id, last_sync_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS (même pattern que V28 / V24)
DO $$
BEGIN
  ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sync_log FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.sync_log;
  CREATE POLICY yee_api_all ON public.sync_log
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sync_log TO yee_api;
  GRANT USAGE, SELECT, UPDATE ON SEQUENCE sync_log_id_seq TO yee_api;

  ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sync_state FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.sync_state;
  CREATE POLICY yee_api_all ON public.sync_state
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sync_state TO yee_api;
END $$;
