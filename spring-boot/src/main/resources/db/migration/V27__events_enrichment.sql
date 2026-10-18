-- Enrichit les événements : lieu, période, couverture photo, rapport unique, galerie visuelle.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) NOT NULL DEFAULT 'online',
    ADD COLUMN IF NOT EXISTS join_url TEXT,
    ADD COLUMN IF NOT EXISTS venue_address TEXT,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cover_type VARCHAR(10),
    ADD COLUMN IF NOT EXISTS cover_storage_bucket VARCHAR(64),
    ADD COLUMN IF NOT EXISTS cover_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS cover_mime_type VARCHAR(100);

UPDATE events SET ends_at = starts_at WHERE ends_at IS NULL;
ALTER TABLE events ALTER COLUMN ends_at SET NOT NULL;

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_location_type;
ALTER TABLE events ADD CONSTRAINT chk_events_location_type CHECK (
    location_type IN ('online', 'in_person')
);

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_cover_type;
ALTER TABLE events ADD CONSTRAINT chk_events_cover_type CHECK (
    cover_type IS NULL OR cover_type IN ('photo', 'video')
);

-- Couverture vidéo : réutilise video_* existant. Si une URL vidéo est déjà présente, marque cover_type.
UPDATE events
SET cover_type = 'video'
WHERE cover_type IS NULL
  AND video_url IS NOT NULL
  AND video_url <> '';

CREATE TABLE IF NOT EXISTS event_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL DEFAULT '',
    storage_bucket      VARCHAR(64)  NOT NULL,
    storage_path        TEXT         NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    byte_size           BIGINT       NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_reports_event UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS event_visuals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    storage_bucket      VARCHAR(64)  NOT NULL,
    storage_path        TEXT         NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    byte_size           BIGINT       NOT NULL,
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_visuals_event ON event_visuals (event_id, sort_order, created_at);

DO $$
BEGIN
  ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_reports FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.event_reports;
  CREATE POLICY yee_api_all ON public.event_reports
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_reports TO yee_api;

  ALTER TABLE public.event_visuals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_visuals FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.event_visuals;
  CREATE POLICY yee_api_all ON public.event_visuals
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_visuals TO yee_api;
END $$;
