-- Assertions: 12
-- Covers: mode-dependent time rules.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(12);

SELECT has_table('public', 'availability_overrides', 'table exists');
SELECT has_pk('public', 'availability_overrides', 'has primary key');
SELECT has_column('public', 'availability_overrides', 'override_date', 'has override_date');
SELECT has_column('public', 'availability_overrides', 'mode', 'has mode');
SELECT has_column('public', 'availability_overrides', 'start_time', 'has start_time');
SELECT has_column('public', 'availability_overrides', 'end_time', 'has end_time');

SELECT lives_ok(
  $$INSERT INTO availability_overrides (override_date, mode) VALUES ('2030-01-01', 'block')$$,
  'block with NULL times (full-day) is allowed'
);

SELECT lives_ok(
  $$INSERT INTO availability_overrides (override_date, mode, start_time, end_time) VALUES ('2030-01-02', 'block', '12:00', '13:00')$$,
  'block with time range is allowed'
);

SELECT throws_ok(
  $$INSERT INTO availability_overrides (override_date, mode, start_time) VALUES ('2030-01-03', 'block', '12:00')$$,
  '23514', NULL,
  'block with only start_time is rejected'
);

SELECT throws_ok(
  $$INSERT INTO availability_overrides (override_date, mode) VALUES ('2030-01-04', 'add')$$,
  '23514', NULL,
  'add without times is rejected'
);

SELECT lives_ok(
  $$INSERT INTO availability_overrides (override_date, mode, start_time, end_time) VALUES ('2030-01-05', 'add', '18:00', '20:00')$$,
  'add with a valid range is allowed'
);

SELECT throws_ok(
  $$INSERT INTO availability_overrides (override_date, mode, start_time, end_time) VALUES ('2030-01-06', 'add', '20:00', '18:00')$$,
  '23514', NULL,
  'add with end <= start is rejected'
);

SELECT * FROM finish();
ROLLBACK;