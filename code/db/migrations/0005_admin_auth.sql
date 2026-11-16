-- migrate:up

-- Migration: 0004_admin_auth
-- Intent: tables for admin login (FR-09, NFR-03).
--   * session              - express-session store used by connect-pg-simple
--   * admin_login_attempts - per-email / per-IP lockout after repeated failures
-- Do NOT wrap in BEGIN/COMMIT: dbmate and `psql --single-transaction` both
-- provide the transaction.

-- ============================================================
-- Sessions (connect-pg-simple)
-- ============================================================
-- Column names and types follow connect-pg-simple's table.sql so the library
-- can read and write it unchanged. `expire` is timestamptz rather than the
-- library's plain timestamp, so expiry does not depend on the server time zone.
-- The cookie holds the session id SIGNED with SESSION_SECRET, so a copy of
-- this table alone cannot be turned into a working cookie.
CREATE TABLE session (
    sid    VARCHAR     NOT NULL PRIMARY KEY,
    sess   JSON        NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_session_expire ON session (expire);

-- ============================================================
-- Login attempts (lockout / rate limiting)
-- ============================================================
-- One row per attempt. Each attempt is saved BEFORE the password is checked,
-- then counted, so simultaneous requests cannot slip past the limit.
-- Old rows are deleted by the API; any row can be deleted at any time.
CREATE TABLE admin_login_attempts (
    id           BIGSERIAL   PRIMARY KEY,
    email        CITEXT      NOT NULL,
    ip_address   TEXT,
    succeeded    BOOLEAN     NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_login_attempts_email_time
    ON admin_login_attempts (email, attempted_at);
CREATE INDEX idx_admin_login_attempts_ip_time
    ON admin_login_attempts (ip_address, attempted_at);

-- migrate:down
-- Forward-only in v1. To roll back manually:
--   DROP TABLE IF EXISTS admin_login_attempts;
--   DROP TABLE IF EXISTS session;

SELECT 1;
