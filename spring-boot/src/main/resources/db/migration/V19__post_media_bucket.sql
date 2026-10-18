-- Les médias d'un groupe private ou secret vont dans group-post-media,
-- qui n'est pas servi comme fichier public. Les lignes déjà là restent
-- dans post-media : l'API refuse de les exposer tant que le groupe n'est
-- pas public.
--
-- ADD COLUMN exige d'être propriétaire de la table. Après V15, si le JDBC
-- est déjà yee_api, transférer une fois en postgres :
--   ALTER TABLE post_media OWNER TO yee_api;
-- (ou toutes les tables public sauf flyway_schema_history).

ALTER TABLE post_media
    ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(40) NOT NULL DEFAULT 'post-media';
