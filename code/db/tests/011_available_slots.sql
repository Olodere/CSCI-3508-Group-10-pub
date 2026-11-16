-- Assertions: 14
-- Covers: default-window slot generation, appointment exclusion, block
--         override, add override, cancelled-appointment exclusion, timezone
--         handling (winter vs summer), DST spring-forward, custom
--         slot_interval, last-slot boundary, input validation.
--
-- Reference dates:
--   2030-01-15  Tuesday, Denver is MST (UTC-7)
--   2030-07-16  Tuesday, Denver is MDT (UTC-6)
--   2030-03-10  Sunday,  DST spring-forward (02:00 MST -> 03:00 MDT)
-- All dates are far in the future so the suite never depends on now().
BEGIN;

SELECT plan(14);

-- ==================================================================
-- Case 1: Tuesday default window, no bookings, no overrides.
-- 09:00-17:00 MST = 16:00-00:00 UTC. 60-min service, 30-min interval.
-- Slot starts: 16:00, 16:30, ..., 23:00 UTC -> 15 slots.
-- ==================================================================
SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60, 30)),
    15,
    'default Tuesday, 60-min service, 30-min interval -> 15 slots'
);

SELECT is(
    (SELECT slot_start FROM available_slots('2030-01-15'::date, 60, 30)
     ORDER BY slot_start LIMIT 1),
    '2030-01-15 16:00:00+00'::timestamptz,
    'first slot is 09:00 MST = 16:00 UTC'
);

SELECT is(
    (SELECT slot_end FROM available_slots('2030-01-15'::date, 60, 30)
     ORDER BY slot_start DESC LIMIT 1),
    '2030-01-16 00:00:00+00'::timestamptz,
    'last slot ends exactly at 17:00 MST = 00:00 UTC next day'
);

-- ==================================================================
-- Case 2: one booked appointment 10:00-11:00 MST = 17:00-18:00 UTC.
-- Removes 09:30, 10:00, and 10:30 slots (all overlap the booked window
-- because slots are 60 min). 15 - 3 = 12.
-- ==================================================================
INSERT INTO appointments (id, service_id, appointment_type, customer_name,
                          customer_email, customer_phone, service_price_cents,
                          start_time, end_time)
VALUES ('11111111-0000-0000-0000-000000000001',
        (SELECT id FROM services WHERE name = 'Classic Manicure'),
        'in_salon', 'Test', 'test@example.com', '555-0001', 3500,
        '2030-01-15 17:00:00+00'::timestamptz,
        '2030-01-15 18:00:00+00'::timestamptz);

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60, 30)),
    12,
    'booked 10:00-11:00 MST removes three 60-min slots (09:30, 10:00, 10:30)'
);

DELETE FROM appointments;

-- ==================================================================
-- Case 3: block override 12:00-13:00 MST. Removes 11:30, 12:00, 12:30.
-- ==================================================================
INSERT INTO availability_overrides (override_date, mode, start_time, end_time)
VALUES ('2030-01-15', 'block', '12:00', '13:00');

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60, 30)),
    12,
    'block 12:00-13:00 removes three 60-min slots (11:30, 12:00, 12:30)'
);

DELETE FROM availability_overrides;

-- ==================================================================
-- Case 4: add override 18:00-20:00 MST (outside default window).
-- Contributes 18:00, 18:30, 19:00 slots (19:30 would end after 20:00).
-- 15 + 3 = 18.
-- ==================================================================
INSERT INTO availability_overrides (override_date, mode, start_time, end_time)
VALUES ('2030-01-15', 'add', '18:00', '20:00');

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60, 30)),
    18,
    'add 18:00-20:00 contributes three extra slots'
);

DELETE FROM availability_overrides;

-- ==================================================================
-- Case 5: cancelled appointment does NOT remove slots.
-- ==================================================================
INSERT INTO appointments (id, service_id, appointment_type, customer_name,
                          customer_email, customer_phone, service_price_cents,
                          start_time, end_time, status, cancelled_at, cancelled_by)
VALUES ('11111111-0000-0000-0000-000000000002',
        (SELECT id FROM services WHERE name = 'Classic Manicure'),
        'in_salon', 'Test', 'test@example.com', '555-0002', 3500,
        '2030-01-15 17:00:00+00'::timestamptz,
        '2030-01-15 18:00:00+00'::timestamptz,
        'cancelled', now(), 'customer');

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60, 30)),
    15,
    'cancelled appointment does not reduce slot count'
);

DELETE FROM appointments;

-- ==================================================================
-- Case 6a: winter timezone check (2030-01-15, MST).
-- ==================================================================
SELECT is(
    (SELECT slot_start FROM available_slots('2030-01-15'::date, 60, 30)
     ORDER BY slot_start LIMIT 1),
    '2030-01-15 16:00:00+00'::timestamptz,
    'winter: 09:00 MST = 16:00 UTC'
);

-- ==================================================================
-- Case 6b: summer timezone check (2030-07-16, MDT).
-- ==================================================================
SELECT is(
    (SELECT slot_start FROM available_slots('2030-07-16'::date, 60, 30)
     ORDER BY slot_start LIMIT 1),
    '2030-07-16 15:00:00+00'::timestamptz,
    'summer: 09:00 MDT = 15:00 UTC'
);

-- ==================================================================
-- Case 7: DST spring-forward. 2030-03-10 is a Sunday; DST begins at
-- 02:00 MST, clocks jump to 03:00 MDT. Add override 01:00-04:00 local
-- = 08:00-10:00 UTC (2 hours of UTC, not 3, because 02:00-03:00 local
-- does not exist). 30-min duration, 30-min interval.
-- Slots: 08:00, 08:30, 09:00, 09:30 UTC -> 4 slots.
-- Wall-clock 02:00 and 02:30 never appear.
-- ==================================================================
INSERT INTO availability_overrides (override_date, mode, start_time, end_time)
VALUES ('2030-03-10', 'add', '01:00', '04:00');

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-03-10'::date, 30, 30)),
    4,
    'spring-forward day: 4 slots across the 2-hour UTC window'
);

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-03-10'::date, 30, 30)
     WHERE slot_start AT TIME ZONE 'America/Denver'
           = '2030-03-10 02:00:00'::timestamp),
    0,
    'spring-forward day: no slot starts at local 02:00 (skipped hour)'
);

DELETE FROM availability_overrides;

-- ==================================================================
-- Case 8: salon_settings.slot_interval_minutes = 60. With no explicit
-- 3rd argument, the function uses the setting. 09:00, 10:00, ..., 16:00
-- -> 8 slots.
-- ==================================================================
UPDATE salon_settings SET slot_interval_minutes = 60 WHERE id = 1;

SELECT is(
    (SELECT count(*)::int FROM available_slots('2030-01-15'::date, 60)),
    8,
    'salon_settings.slot_interval_minutes = 60 yields 8 hourly slots'
);

UPDATE salon_settings SET slot_interval_minutes = 30 WHERE id = 1;

-- ==================================================================
-- Case 9: input validation.
-- ==================================================================
SELECT throws_ok(
    $$ SELECT * FROM available_slots('2030-01-15'::date, 0, 30) $$,
    '22023', NULL,
    'zero duration raises invalid_parameter_value (22023)'
);

SELECT throws_ok(
    $$ SELECT * FROM available_slots('2030-01-15'::date, 60, -1) $$,
    '22023', NULL,
    'negative slot interval raises invalid_parameter_value (22023)'
);

SELECT * FROM finish();
ROLLBACK;