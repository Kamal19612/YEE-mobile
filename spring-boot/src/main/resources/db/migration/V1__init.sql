-- Couche 0 : migration initiale vide.
-- Les tables métier (users, refresh_tokens, ...) arriveront dès la Couche 1.
-- Flyway doit quand même pouvoir s'appliquer pour valider la connexion Postgres/Supabase.

SELECT 1;
