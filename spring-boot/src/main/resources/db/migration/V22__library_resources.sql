-- Bibliothèque de ressources éditoriales (manuels, guides, boîtes à outils).
-- Contenu géré par les admins site ; lecture réservée aux membres authentifiés.

CREATE TABLE library_resources (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(200) NOT NULL,
    slug                VARCHAR(220) NOT NULL,
    category            VARCHAR(40)  NOT NULL,
    language            VARCHAR(10)  NOT NULL,
    description         TEXT         NOT NULL DEFAULT '',
    storage_bucket      VARCHAR(64)  NOT NULL,
    storage_path        TEXT         NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    byte_size           BIGINT       NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'published',
    created_by          UUID         NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_library_resources_slug UNIQUE (slug),
    CONSTRAINT chk_library_resources_category CHECK (
        category IN ('guides', 'manuals', 'toolkits', 'templates', 'training')
    ),
    CONSTRAINT chk_library_resources_status CHECK (status IN ('published', 'archived'))
);

CREATE INDEX idx_library_resources_status_cat ON library_resources (status, category);
CREATE INDEX idx_library_resources_language ON library_resources (language);
CREATE INDEX idx_library_resources_created_at ON library_resources (created_at DESC);
CREATE INDEX idx_library_resources_title ON library_resources (title);

-- Aligné sur V15 : RLS + droits yee_api pour toute nouvelle table.
DO $$
BEGIN
  ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.library_resources FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.library_resources;
  CREATE POLICY yee_api_all ON public.library_resources
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.library_resources TO yee_api;
END $$;
