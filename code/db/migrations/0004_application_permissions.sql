-- migrate:up
-- Migration: Application database permissions
-- The application connects as nailsalon_app instead of myuser.
-- myuser remains responsible for database setup and migrations.

-- Create the application role if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'nailsalon_app'
    ) THEN
        CREATE ROLE nailsalon_app LOGIN;
    END IF;
END
$$;

-- Allow the application to connect to the database.
GRANT CONNECT ON DATABASE nailsalon TO nailsalon_app;
GRANT USAGE ON SCHEMA public TO nailsalon_app;

-- Services: customers can view services; admin can manage them.
GRANT SELECT, INSERT, UPDATE ON services TO nailsalon_app;

-- Travel fees: admin can manage fee settings.
GRANT SELECT, INSERT, UPDATE ON travel_fee_rules TO nailsalon_app;

-- Appointments: customers can book; admin can manage bookings.
-- No DELETE permission so appointment history is preserved.
GRANT SELECT, INSERT, UPDATE ON appointments TO nailsalon_app;

-- Availability: admin can manage weekly hours and date overrides.
GRANT SELECT, INSERT, UPDATE, DELETE
ON availability_defaults TO nailsalon_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON availability_overrides TO nailsalon_app;

-- Salon settings: application can read and update settings.
GRANT SELECT, UPDATE ON salon_settings TO nailsalon_app;

-- Appointment images: application can view and add images.
GRANT SELECT, INSERT ON appointment_images TO nailsalon_app;

-- Admin accounts: allow login lookups, but restrict account changes.
GRANT SELECT (
    id,
    email,
    password_hash,
    full_name,
    is_active,
    last_login_at
) ON admin_users TO nailsalon_app;

GRANT UPDATE (last_login_at)
ON admin_users TO nailsalon_app;

-- Allow inserts into tables that use BIGSERIAL IDs.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
TO nailsalon_app;

-- Allow the application to use the availability function.
GRANT EXECUTE ON FUNCTION
    available_slots(date, integer, integer)
TO nailsalon_app;

-- Allow access to the public-facing services view.
GRANT SELECT ON active_services TO nailsalon_app;

-- migrate:down

-- Intentionally left empty. Permissions are not automatically revered.

SELECT 1;
