-- UPDATE users SET email_verified = true WHERE email = 'elise@gmail.com';

UPDATE users
SET is_site_admin = TRUE,
    updated_at = NOW()
WHERE email = 'ouedraogokkamal@gmail.com';