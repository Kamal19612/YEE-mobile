-- Réponses à un commentaire (un seul niveau : parent = commentaire racine).
ALTER TABLE post_comments
    ADD COLUMN parent_id BIGINT REFERENCES post_comments (id);

CREATE INDEX idx_post_comments_parent ON post_comments (parent_id, id ASC)
    WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

CREATE INDEX idx_post_comments_roots ON post_comments (post_id, id DESC)
    WHERE deleted_at IS NULL AND parent_id IS NULL;
