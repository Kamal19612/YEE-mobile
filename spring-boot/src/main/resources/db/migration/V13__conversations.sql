-- Messagerie : conversations DM / groupe, messages, médias, confidentialité

ALTER TABLE users
    ADD COLUMN who_can_message VARCHAR(20) NOT NULL DEFAULT 'friends',
    ADD COLUMN email_pref_messages BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
    ADD CONSTRAINT chk_users_who_can_message
        CHECK (who_can_message IN ('everyone', 'friends', 'nobody'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_subject_type;
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_subject_type
        CHECK (subject_type IS NULL OR subject_type IN ('group', 'institution', 'post', 'conversation'));

CREATE TABLE conversations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(20)  NOT NULL DEFAULT 'dm',
    group_id    UUID         REFERENCES app_groups (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_conversations_type CHECK (type IN ('dm', 'group')),
    CONSTRAINT chk_conversations_group CHECK (
        (type = 'dm' AND group_id IS NULL)
        OR (type = 'group' AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_conversations_group ON conversations (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_conversations_updated ON conversations (updated_at DESC);

CREATE TABLE conversation_participants (
    id               BIGSERIAL PRIMARY KEY,
    conversation_id  UUID         NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    user_id          UUID         NOT NULL REFERENCES users (id),
    last_read_at     TIMESTAMPTZ,
    joined_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants (user_id, conversation_id);

CREATE TABLE conversation_messages (
    id               BIGSERIAL PRIMARY KEY,
    conversation_id  UUID         NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id        UUID         NOT NULL REFERENCES users (id),
    body             TEXT         NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_messages_thread ON conversation_messages (conversation_id, created_at DESC);
CREATE INDEX idx_conversation_messages_sender ON conversation_messages (sender_id);

CREATE TABLE conversation_message_media (
    id            BIGSERIAL PRIMARY KEY,
    message_id    BIGINT       NOT NULL REFERENCES conversation_messages (id) ON DELETE CASCADE,
    media_type    VARCHAR(10)  NOT NULL,
    url           TEXT         NOT NULL,
    storage_path  TEXT,
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT chk_conversation_media_type CHECK (media_type IN ('image', 'audio'))
);

CREATE INDEX idx_conversation_message_media_msg ON conversation_message_media (message_id, sort_order);
