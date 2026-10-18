-- La double authentification n'est pas proposée.
-- V16 a créé la table ; on la retire. La colonne users.two_factor_enabled
-- reste, inutilisée par la connexion.

DROP TABLE IF EXISTS user_two_factor;
