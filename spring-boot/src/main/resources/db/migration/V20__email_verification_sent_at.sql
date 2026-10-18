-- Horodatage du dernier e-mail de confirmation, pour imposer un délai
-- avant un nouvel envoi. Les comptes déjà en attente : le lien avait été
-- émis 24 h avant email_verification_expires_at.

ALTER TABLE users
    ADD COLUMN email_verification_sent_at TIMESTAMPTZ;

UPDATE users
SET email_verification_sent_at = email_verification_expires_at - INTERVAL '1 day'
WHERE email_verified = FALSE
  AND email_verification_expires_at IS NOT NULL;
