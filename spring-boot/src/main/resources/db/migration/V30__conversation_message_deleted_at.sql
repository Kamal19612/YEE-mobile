-- Soft-delete message (« supprimer pour tous ») — tombstone conservé pour le fil.
ALTER TABLE conversation_messages
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_alive
	ON conversation_messages (conversation_id, created_at DESC)
	WHERE deleted_at IS NULL;
