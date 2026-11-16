-- ============================================================
-- Nail Salon Appointment Scheduler — Bootstrap
-- ============================================================
-- Runs once per empty $PGDATA via /docker-entrypoint-initdb.d.
-- All schema DDL lives in migrations/. All reference data lives in seeds/.

CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- Application role 
-- ------------------------------------------------------------
-- CREATE ROLE nailsalon_app LOGIN PASSWORD :'app_password';
-- GRANT CONNECT ON DATABASE nailsalon TO nailsalon_app;
-- GRANT USAGE ON SCHEMA public TO nailsalon_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nailsalon_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nailsalon_app;