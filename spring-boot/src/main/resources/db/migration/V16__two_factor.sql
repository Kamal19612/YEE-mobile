-- Secret TOTP et codes de secours. Table séparée : yee_api peut la créer
-- (il ne possède pas la table users, donc pas d'ALTER dessus).
-- Le secret n'est pas hashé : le vérifier exige de le relire. Il ne sort
-- de l'API qu'une fois, pendant l'activation.
-- RLS forcé, même politique que V15 : yee_api lit tout, le métier reste dans Spring.

CREATE TABLE IF NOT EXISTS user_two_factor (
    user_id         UUID PRIMARY KEY,
    pending_secret  TEXT,
    secret          TEXT,
    backup_hashes   TEXT,
    last_step       BIGINT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_two_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_two_factor FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS yee_api_all ON user_two_factor;
CREATE POLICY yee_api_all ON user_two_factor
    FOR ALL TO yee_api
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_two_factor TO yee_api;
