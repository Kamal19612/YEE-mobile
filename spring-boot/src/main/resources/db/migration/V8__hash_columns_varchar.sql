-- Align hash columns with Hibernate String/VARCHAR mapping (CHAR → VARCHAR).

ALTER TABLE link_previews
    ALTER COLUMN url_hash TYPE VARCHAR(64);

ALTER TABLE refresh_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64);

ALTER TABLE users
    ALTER COLUMN email_verification_token_hash TYPE VARCHAR(64),
    ALTER COLUMN password_reset_token_hash TYPE VARCHAR(64);
