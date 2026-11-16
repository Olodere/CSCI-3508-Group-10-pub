-- migrate:up

-- Migration: 0001_initial
-- Intent: create the initial schema for the Nail Salon Appointment Scheduler.
-- Forward-only in v1 (see the `migrate:down` block at the bottom).
-- Applied by `make migrate` (dev, via dbmate) and `run-tests.sh` (test, via psql).
-- Do NOT wrap in BEGIN/COMMIT — dbmate and `psql --single-transaction` both
-- provide the transaction.

-- ============================================================
-- Extensions required by the schema
-- ============================================================
-- citext is created in db/init.sql (bootstrap layer). The migration
-- itself depends on it, so init.sql must run first. Documented in README.

-- ============================================================
-- Enum types
-- ============================================================
CREATE TYPE appointment_type   AS ENUM ('in_salon', 'at_home');
CREATE TYPE appointment_status AS ENUM ('booked', 'cancelled', 'completed', 'no_show');
CREATE TYPE availability_override_mode AS ENUM ('block', 'add');
CREATE TYPE actor_type         AS ENUM ('customer', 'admin', 'system');

-- ============================================================
-- Shared trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Admin users
-- ============================================================
CREATE TABLE admin_users (
    id            BIGSERIAL PRIMARY KEY,
    email         CITEXT NOT NULL UNIQUE,
    password_hash TEXT   NOT NULL,
    full_name     TEXT   NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_admin_users_updated
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Services
-- ============================================================
CREATE TABLE services (
    id               BIGSERIAL PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    description      TEXT,
    price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active;
CREATE TRIGGER trg_services_updated
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Travel fee rules
-- ============================================================
CREATE TABLE travel_fee_rules (
    id                 BIGSERIAL PRIMARY KEY,
    name               TEXT NOT NULL UNIQUE,
    fee_cents          INTEGER NOT NULL CHECK (fee_cents >= 0),
    min_distance_miles NUMERIC(6,2) CHECK (min_distance_miles >= 0),
    max_distance_miles NUMERIC(6,2) CHECK (max_distance_miles >= 0),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT travel_fee_range_order CHECK (
        max_distance_miles IS NULL
        OR min_distance_miles IS NULL
        OR max_distance_miles > min_distance_miles
    )
);
CREATE TRIGGER trg_travel_fee_rules_updated
    BEFORE UPDATE ON travel_fee_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Appointments
-- ============================================================
CREATE TABLE appointments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cancellation_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    service_id         BIGINT REFERENCES services(id) ON DELETE RESTRICT,
    is_custom_request  BOOLEAN NOT NULL DEFAULT FALSE,
    custom_request_description TEXT,

    appointment_type   appointment_type NOT NULL,
    service_address    TEXT,

    customer_name      TEXT   NOT NULL,
    customer_email     CITEXT NOT NULL,
    customer_phone     TEXT   NOT NULL,

    service_price_cents INTEGER NOT NULL CHECK (service_price_cents >= 0),
    travel_fee_cents    INTEGER NOT NULL DEFAULT 0 CHECK (travel_fee_cents >= 0),
    travel_fee_rule_id  BIGINT REFERENCES travel_fee_rules(id) ON DELETE SET NULL,
    distance_miles      NUMERIC(6,2) CHECK (distance_miles IS NULL OR distance_miles >= 0),

    start_time         TIMESTAMPTZ NOT NULL,
    end_time           TIMESTAMPTZ NOT NULL,
    status             appointment_status NOT NULL DEFAULT 'booked',
    admin_notes        TEXT,

    cancelled_at       TIMESTAMPTZ,
    cancelled_by       actor_type,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT appointments_time_order CHECK (end_time > start_time),

    CONSTRAINT appointments_address_required_for_home CHECK (
        (appointment_type = 'at_home'  AND service_address IS NOT NULL) OR
        (appointment_type = 'in_salon' AND service_address IS NULL)
    ),

    CONSTRAINT appointments_service_or_custom CHECK (
        service_id IS NOT NULL OR is_custom_request = TRUE
    ),

    CONSTRAINT appointments_custom_request_has_description CHECK (
        NOT is_custom_request OR custom_request_description IS NOT NULL
    ),

    CONSTRAINT appointments_no_travel_fee_for_salon CHECK (
        appointment_type <> 'in_salon' OR travel_fee_cents = 0
    ),

    CONSTRAINT appointments_cancellation_audit CHECK (
        (status = 'cancelled'  AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
     OR (status <> 'cancelled' AND cancelled_at IS NULL     AND cancelled_by IS NULL)
    )
);
CREATE TRIGGER trg_appointments_updated
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE appointments
    ADD CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (tstzrange(start_time, end_time) WITH &&)
    WHERE (status <> 'cancelled');

CREATE INDEX idx_appointments_start_time      ON appointments(start_time);
CREATE INDEX idx_appointments_status          ON appointments(status);
CREATE INDEX idx_appointments_customer_email  ON appointments(customer_email);
CREATE INDEX idx_appointments_status_start    ON appointments(status, start_time);

-- ============================================================
-- Availability
-- ============================================================
CREATE TABLE availability_defaults (
    id          BIGSERIAL PRIMARY KEY,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TIME     NOT NULL,
    end_time    TIME     NOT NULL,
    is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT availability_defaults_time_order CHECK (end_time > start_time),
    CONSTRAINT availability_defaults_unique UNIQUE (day_of_week, start_time, end_time)
);
CREATE INDEX idx_availability_defaults_dow ON availability_defaults(day_of_week);
CREATE TRIGGER trg_availability_defaults_updated
    BEFORE UPDATE ON availability_defaults
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE availability_overrides (
    id            BIGSERIAL PRIMARY KEY,
    override_date DATE NOT NULL,
    mode          availability_override_mode NOT NULL,
    start_time    TIME,
    end_time      TIME,
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT availability_overrides_times CHECK (
        (mode = 'block' AND start_time IS NULL AND end_time IS NULL)
        OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);
CREATE INDEX idx_availability_overrides_date ON availability_overrides(override_date);
CREATE TRIGGER trg_availability_overrides_updated
    BEFORE UPDATE ON availability_overrides
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Salon settings (singleton)
-- ============================================================
CREATE TABLE salon_settings (
    id                          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    salon_name                  TEXT NOT NULL DEFAULT 'Nail Salon',
    base_address                TEXT,
    timezone                    TEXT NOT NULL DEFAULT 'America/Denver',
    max_travel_distance_miles   NUMERIC(6,2) CHECK (max_travel_distance_miles >= 0),
    default_travel_fee_cents    INTEGER NOT NULL DEFAULT 0 CHECK (default_travel_fee_cents >= 0),
    cancellation_deadline_hours INTEGER CHECK (cancellation_deadline_hours >= 0),
    slot_interval_minutes       INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes > 0),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_salon_settings_updated
    BEFORE UPDATE ON salon_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Structural invariant, not seed data: the singleton row must exist for
-- the application to function. Kept in the migration (not seeds/) so it is
-- guaranteed present in every environment including production.
INSERT INTO salon_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- Custom-request reference images
-- ============================================================
CREATE TABLE appointment_images (
    id             BIGSERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    image_url      TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointment_images_appointment ON appointment_images(appointment_id);

-- ============================================================
-- Views
-- ============================================================
CREATE VIEW upcoming_appointments AS
SELECT * FROM appointments
WHERE status = 'booked' AND start_time >= now()
ORDER BY start_time;

CREATE VIEW active_services AS
SELECT * FROM services WHERE is_active ORDER BY sort_order, name;

-- migrate:down

-- Down migrations are intentionally not implemented in v1.
--
--   DROP VIEW IF EXISTS active_services;
--   DROP VIEW IF EXISTS upcoming_appointments;
--   DROP TABLE IF EXISTS appointment_images;
--   DROP TABLE IF EXISTS salon_settings;
--   DROP TABLE IF EXISTS availability_overrides;
--   DROP TABLE IF EXISTS availability_defaults;
--   DROP TABLE IF EXISTS appointments;
--   DROP TABLE IF EXISTS travel_fee_rules;
--   DROP TABLE IF EXISTS services;
--   DROP TABLE IF EXISTS admin_users;
--   DROP FUNCTION IF EXISTS set_updated_at();
--   DROP TYPE IF EXISTS actor_type;
--   DROP TYPE IF EXISTS availability_override_mode;
--   DROP TYPE IF EXISTS appointment_status;
--   DROP TYPE IF EXISTS appointment_type;

SELECT 1;