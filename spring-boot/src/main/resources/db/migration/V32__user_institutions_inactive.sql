-- Statut d'affiliation AfrEA : active | inactive
ALTER TABLE user_institutions
    DROP CONSTRAINT IF EXISTS chk_user_institutions_status;

ALTER TABLE user_institutions
    ADD CONSTRAINT chk_user_institutions_status
    CHECK (status IN ('pending', 'active', 'rejected', 'inactive'));
