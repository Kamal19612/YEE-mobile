-- Couche 6 — Notifications (type seul en base ; actor/subject résolus à la lecture)

CREATE TABLE notifications (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES users (id),
    type          VARCHAR(64)  NOT NULL,
    actor_id      UUID         REFERENCES users (id),
    subject_type  VARCHAR(20),
    subject_id    VARCHAR(64),
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notifications_subject_type
        CHECK (subject_type IS NULL OR subject_type IN ('group', 'institution', 'post'))
);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE is_read = FALSE;
