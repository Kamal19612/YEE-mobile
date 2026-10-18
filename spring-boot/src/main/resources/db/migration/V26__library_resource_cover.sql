-- Couverture page 1 générée à l’upload (aperçu léger sans télécharger le PDF).
ALTER TABLE library_resources
	ADD COLUMN IF NOT EXISTS cover_storage_path TEXT,
	ADD COLUMN IF NOT EXISTS cover_mime_type VARCHAR(100);
