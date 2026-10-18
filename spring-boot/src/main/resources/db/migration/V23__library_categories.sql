-- Catégories dynamiques pour la bibliothèque (CRUD admin).

CREATE TABLE library_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(80)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_library_categories_slug UNIQUE (slug)
);

CREATE INDEX idx_library_categories_sort ON library_categories (sort_order, name);

-- Seed des catégories historiques (si absentes).
INSERT INTO library_categories (slug, name, sort_order) VALUES
    ('guides', 'Guides', 10),
    ('manuals', 'Manuels', 20),
    ('toolkits', 'Boîtes à outils', 30),
    ('templates', 'Modèles', 40),
    ('training', 'Formations', 50)
ON CONFLICT (slug) DO NOTHING;

-- Passe library_resources.category (slug) → category_id (FK).
ALTER TABLE library_resources
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES library_categories (id);

UPDATE library_resources r
SET category_id = c.id
FROM library_categories c
WHERE r.category_id IS NULL
  AND r.category = c.slug;

-- Ressources orphelines → catégorie Guides (créée ci-dessus).
UPDATE library_resources
SET category_id = (SELECT id FROM library_categories WHERE slug = 'guides' LIMIT 1)
WHERE category_id IS NULL;

ALTER TABLE library_resources
    ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE library_resources
    DROP CONSTRAINT IF EXISTS chk_library_resources_category;

DROP INDEX IF EXISTS idx_library_resources_status_cat;

ALTER TABLE library_resources
    DROP COLUMN IF EXISTS category;

CREATE INDEX idx_library_resources_status_cat
    ON library_resources (status, category_id);

DO $$
BEGIN
  ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.library_categories FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.library_categories;
  CREATE POLICY yee_api_all ON public.library_categories
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.library_categories TO yee_api;
END $$;
