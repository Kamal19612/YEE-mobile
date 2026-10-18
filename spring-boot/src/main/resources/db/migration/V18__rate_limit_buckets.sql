-- Compteur de débit partagé entre les instances de l'API.
-- Même règle que V15 : RLS forcé, seule la politique yee_api ouvre les lignes.

CREATE TABLE rate_limit_buckets (
    bucket_key   VARCHAR(160) PRIMARY KEY,
    hits         INTEGER      NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS yee_api_all ON rate_limit_buckets;
CREATE POLICY yee_api_all ON rate_limit_buckets
    FOR ALL TO yee_api
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rate_limit_buckets TO yee_api;
