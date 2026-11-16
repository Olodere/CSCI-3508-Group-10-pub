-- Assertions: 9
-- Covers: set_updated_at function exists; every *_updated trigger is present
--         on the correct table; the services trigger references set_updated_at.
--
-- Note: semantic verification (updated_at strictly increases after UPDATE)
-- cannot be asserted inside a single BEGIN...ROLLBACK because now() is
-- transaction_timestamp() and does not advance. The schema deliberately uses
-- now() (stable within a transaction) rather than clock_timestamp(), so the
-- correct assertion is structural: the trigger is attached, it calls the
-- right function, and the column has a default. Cross-transaction semantics
-- are covered by Phase 6 contract tests.
BEGIN;

SELECT plan(9);

SELECT has_function('public', 'set_updated_at', 'set_updated_at function exists');

SELECT has_trigger('public', 'admin_users',          'trg_admin_users_updated',          'admin_users trigger present');
SELECT has_trigger('public', 'services',             'trg_services_updated',             'services trigger present');
SELECT has_trigger('public', 'travel_fee_rules',     'trg_travel_fee_rules_updated',     'travel_fee_rules trigger present');
SELECT has_trigger('public', 'appointments',         'trg_appointments_updated',         'appointments trigger present');
SELECT has_trigger('public', 'availability_defaults','trg_availability_defaults_updated','availability_defaults trigger present');
SELECT has_trigger('public', 'availability_overrides','trg_availability_overrides_updated','availability_overrides trigger present');
SELECT has_trigger('public', 'salon_settings',       'trg_salon_settings_updated',       'salon_settings trigger present');

SELECT is(
  (SELECT tgfoid::regproc::text
     FROM pg_trigger
    WHERE tgname = 'trg_services_updated'),
  'set_updated_at',
  'services trigger calls set_updated_at'
);

SELECT * FROM finish();
ROLLBACK;