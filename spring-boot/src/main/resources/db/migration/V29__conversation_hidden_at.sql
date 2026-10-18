-- Masquer une discussion « pour moi » sans la supprimer pour l’autre partie.
ALTER TABLE conversation_participants
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_visible
    ON conversation_participants (user_id, conversation_id)
    WHERE hidden_at IS NULL;
