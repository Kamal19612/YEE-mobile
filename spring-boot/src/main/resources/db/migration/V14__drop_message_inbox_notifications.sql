-- Les messages ne doivent plus apparaître dans l'inbox Notifications
-- (seul l'onglet Messagerie porte le badge).
DELETE FROM notifications WHERE type = 'new_message';
