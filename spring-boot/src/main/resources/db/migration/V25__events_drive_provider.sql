-- Autorise le fournisseur vidéo Google Drive.

ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_video_provider;
ALTER TABLE events ADD CONSTRAINT chk_events_video_provider CHECK (
    video_provider IS NULL OR video_provider IN ('youtube', 'linkedin', 'drive', 'other')
);
