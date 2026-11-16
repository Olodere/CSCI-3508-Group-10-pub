
-- Tests for the nailsalon_app database role.

BEGIN;

SELECT plan(15);

-- The application role should exist and should not be a superuser.
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'nailsalon_app'
        AND rolcanlogin
        AND NOT rolsuper
    ),
    'application role exists, can log in, and is not a superuser'
);

-- Database and schema access.
SELECT ok(
    has_database_privilege('nailsalon_app', 'nailsalon', 'CONNECT'),
    'application role can connect to the database'
);

SELECT ok(
    has_schema_privilege('nailsalon_app', 'public', 'USAGE'),
    'application role can use the public schema'
);

-- Services and travel fees.
SELECT ok(
    has_table_privilege('nailsalon_app', 'services', 'SELECT,INSERT,UPDATE'),
    'application can read and manage services'
);

SELECT ok(
    NOT has_table_privilege('nailsalon_app', 'services', 'DELETE'),
    'application cannot delete services'
);

SELECT ok(
    has_table_privilege('nailsalon_app', 'travel_fee_rules', 'SELECT,INSERT,UPDATE'),
    'application can read and manage travel fees'
);

-- Appointments.
SELECT ok(
    has_table_privilege('nailsalon_app', 'appointments', 'SELECT,INSERT,UPDATE'),
    'application can read, create, and update appointments'
);

SELECT ok(
    NOT has_table_privilege('nailsalon_app', 'appointments', 'DELETE'),
    'application cannot delete appointments'
);

-- Availability and salon settings.
SELECT ok(
    has_table_privilege('nailsalon_app', 'availability_defaults', 'SELECT,INSERT,UPDATE,DELETE'),
    'application can manage weekly availability'
);

SELECT ok(
    has_table_privilege('nailsalon_app', 'availability_overrides', 'SELECT,INSERT,UPDATE,DELETE'),
    'application can manage date-specific availability'
);

SELECT ok(
    has_table_privilege('nailsalon_app', 'salon_settings', 'SELECT,UPDATE'),
    'application can read and update salon settings'
);

-- Administrator account restrictions.
SELECT ok(
    has_column_privilege('nailsalon_app', 'admin_users', 'password_hash', 'SELECT'),
    'application can read password hashes for login verification'
);

SELECT ok(
    has_column_privilege('nailsalon_app', 'admin_users', 'last_login_at', 'UPDATE'),
    'application can update administrator last-login time'
);

SELECT ok(
    NOT has_column_privilege('nailsalon_app', 'admin_users', 'password_hash', 'UPDATE'),
    'application cannot change administrator password hashes'
);

-- Availability function.
SELECT ok(
    has_function_privilege(
        'nailsalon_app',
        'available_slots(date,integer,integer)',
        'EXECUTE'
    ),
    'application can execute the available_slots function'
);

SELECT * FROM finish();

ROLLBACK;
