-- Assertions: 4
-- Covers: customer information validation and duplicate availability slots.

BEGIN;

SELECT plan(4);

-- Blank customer name should be rejected.
SELECT throws_ok(
  $$INSERT INTO appointments (
      service_id, appointment_type, customer_name, customer_email,
      customer_phone, service_price_cents, start_time, end_time
    )
    VALUES (
      (SELECT id FROM services WHERE name = 'Classic Manicure'),
      'in_salon', '   ', 'test1@example.com', '1234567890', 3500,
      '2032-01-01 10:00:00+00'::timestamptz,
      '2032-01-01 11:00:00+00'::timestamptz
    )$$,
  '23514', NULL,
  'blank customer name is rejected'
);

-- Blank customer email should be rejected.
SELECT throws_ok(
  $$INSERT INTO appointments (
      service_id, appointment_type, customer_name, customer_email,
      customer_phone, service_price_cents, start_time, end_time
    )
    VALUES (
      (SELECT id FROM services WHERE name = 'Classic Manicure'),
      'in_salon', 'Test Customer', '   ', '1234567890', 3500,
      '2032-01-02 10:00:00+00'::timestamptz,
      '2032-01-02 11:00:00+00'::timestamptz
    )$$,
  '23514', NULL,
  'blank customer email is rejected'
);

-- Blank customer phone should be rejected.
SELECT throws_ok(
  $$INSERT INTO appointments (
      service_id, appointment_type, customer_name, customer_email,
      customer_phone, service_price_cents, start_time, end_time
    )
    VALUES (
      (SELECT id FROM services WHERE name = 'Classic Manicure'),
      'in_salon', 'Test Customer', 'test3@example.com', '   ', 3500,
      '2032-01-03 10:00:00+00'::timestamptz,
      '2032-01-03 11:00:00+00'::timestamptz
    )$$,
  '23514', NULL,
  'blank customer phone is rejected'
);

-- Add an extra window matching the regular Tuesday schedule.
-- The available_slots function should return identical slots only once.
INSERT INTO availability_overrides (
    override_date, mode, start_time, end_time, reason
)
VALUES (
    '2032-01-06', 'add', '09:00', '17:00',
    'Testing duplicate availability slots'
);

SELECT is(
  (
    SELECT COUNT(*)::integer
    FROM (
      SELECT slot_start, slot_end
      FROM available_slots('2032-01-06', 45)
      GROUP BY slot_start, slot_end
      HAVING COUNT(*) > 1
    ) AS duplicate_slots
  ),
  0,
  'identical availability slots are not returned more than once'
);

SELECT * FROM finish();

ROLLBACK;