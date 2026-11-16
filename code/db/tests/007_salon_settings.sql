-- Assertions: 12
-- Covers: singleton (id = 1) CHECK, defaults, seed presence.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(12);

SELECT has_table('public', 'salon_settings', 'table exists');
SELECT has_pk('public', 'salon_settings', 'has primary key');
SELECT has_column('public', 'salon_settings', 'id', 'has id');
SELECT has_column('public', 'salon_settings', 'salon_name', 'has salon_name');
SELECT has_column('public', 'salon_settings', 'timezone', 'has timezone');
SELECT has_column('public', 'salon_settings', 'slot_interval_minutes', 'has slot_interval_minutes');
SELECT col_has_check('public', 'salon_settings', 'id', 'id has CHECK (singleton)');
SELECT col_has_default('public', 'salon_settings', 'timezone', 'timezone has default');
SELECT col_has_default('public', 'salon_settings', 'slot_interval_minutes', 'slot_interval_minutes has default');

SELECT throws_ok(
  $$INSERT INTO salon_settings (id, salon_name) VALUES (2, 'Other')$$,
  '23514', NULL,
  'id != 1 is rejected by the singleton CHECK'
);

SELECT lives_ok(
  $$INSERT INTO salon_settings (id) VALUES (1) ON CONFLICT DO NOTHING$$,
  'singleton insert is idempotent'
);

SELECT is(
  (SELECT count(*)::int FROM salon_settings),
  1,
  'exactly one singleton row exists'
);

SELECT * FROM finish();
ROLLBACK;