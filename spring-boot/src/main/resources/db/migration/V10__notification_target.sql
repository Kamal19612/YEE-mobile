-- Cible secondaire d’une notification (ex. commentId pour post_comment).
ALTER TABLE notifications
    ADD COLUMN target_id VARCHAR(64);
