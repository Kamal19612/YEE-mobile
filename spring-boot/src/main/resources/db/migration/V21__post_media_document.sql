-- Documents PDF dans le fil (media_type = document).
ALTER TABLE post_media
    DROP CONSTRAINT IF EXISTS chk_post_media_type;

ALTER TABLE post_media
    ADD CONSTRAINT chk_post_media_type
        CHECK (media_type IN ('image', 'audio', 'document'));

ALTER TABLE post_media
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS byte_size BIGINT;
