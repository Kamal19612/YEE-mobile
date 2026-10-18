-- Événements officiels (curation admin) avec vidéo YouTube / LinkedIn associée.

CREATE TABLE event_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(80)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_categories_slug UNIQUE (slug)
);

CREATE INDEX idx_event_categories_sort ON event_categories (sort_order, name);

INSERT INTO event_categories (slug, name, sort_order) VALUES
    ('webinars', 'Webinaires', 10),
    ('workshops', 'Ateliers', 20),
    ('conferences', 'Conférences', 30),
    ('community', 'Communauté', 40)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(200) NOT NULL,
    slug                VARCHAR(220) NOT NULL,
    category_id         UUID         NOT NULL REFERENCES event_categories (id),
    description         TEXT         NOT NULL DEFAULT '',
    starts_at           TIMESTAMPTZ  NOT NULL,
    video_url           TEXT,
    video_provider      VARCHAR(20),
    video_external_id   VARCHAR(80),
    status              VARCHAR(20)  NOT NULL DEFAULT 'published',
    created_by          UUID         NOT NULL REFERENCES users (id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_events_slug UNIQUE (slug),
    CONSTRAINT chk_events_status CHECK (status IN ('published', 'archived')),
    CONSTRAINT chk_events_video_provider CHECK (
        video_provider IS NULL OR video_provider IN ('youtube', 'linkedin', 'other')
    )
);

CREATE INDEX idx_events_status_starts ON events (status, starts_at DESC);
CREATE INDEX idx_events_category ON events (category_id);
CREATE INDEX idx_events_title ON events (title);

DO $$
BEGIN
  ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_categories FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.event_categories;
  CREATE POLICY yee_api_all ON public.event_categories
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_categories TO yee_api;

  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.events;
  CREATE POLICY yee_api_all ON public.events
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO yee_api;
END $$;
