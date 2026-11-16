-- migrate:up

-- Allow the API to track failed admin login attempts.
GRANT SELECT, INSERT, UPDATE, DELETE
ON admin_login_attempts TO nailsalon_app;

-- Allow the API to generate login attempt IDs.
GRANT USAGE, SELECT
ON SEQUENCE admin_login_attempts_id_seq TO nailsalon_app;

-- Allow connect-pg-simple to manage admin sessions.
GRANT SELECT, INSERT, UPDATE, DELETE
ON session TO nailsalon_app;

-- migrate:down
-- Intentionally left empty. Permissions are not automatically reversed.
