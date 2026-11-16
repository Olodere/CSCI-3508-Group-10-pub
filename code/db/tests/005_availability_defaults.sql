-- Assertions: 13
-- Covers: day_of_week 0..6, end_time > start_time, unique (dow, start, end).
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(13);

SELECT has_table('public', 'availability_defaults', 'availability_defaults table exists');
SELECT has_pk('public', 'availability_defaults', 'has primary key');
SELECT has_column('public', 'availability_defaults', 'day_of_week', 'has day_of_week');
SELECT has_column('public', 'availability_defaults', 'start_time', 'has start_time');
SELECT has_column('public', 'availability_defaults', 'end_time', 'has end_time');
SELECT has_column('public', 'availability_defaults', 'is_active', 'has is_active');

SELECT throws_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (7, '09:00', '17:00')$$,
  '23514', NULL,
  'day_of_week = 7 is rejected'
);

SELECT throws_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (-1, '09:00', '17:00')$$,
  '23514', NULL,
  'day_of_week = -1 is rejected'
);

SELECT lives_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (0, '09:00', '17:00')$$,
  'day_of_week = 0 (Sunday) is allowed'
);

SELECT throws_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (1, '10:00', '10:00')$$,
  '23514', NULL,
  'end_time = start_time is rejected'
);

SELECT throws_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (1, '10:00', '09:00')$$,
  '23514', NULL,
  'end_time < start_time is rejected'
);

SELECT lives_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (1, '09:00', '17:00')$$,
  'end_time > start_time is allowed'
);

SELECT throws_ok(
  $$INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES (2, '09:00', '17:00')$$,
  '23505', NULL,
  'duplicate (dow, start, end) is rejected (seed already has Tue 09:00–17:00)'
);

SELECT * FROM finish();
ROLLBACK;