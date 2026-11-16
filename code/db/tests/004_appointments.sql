-- Assertions: 32
-- Covers: table shape, time ordering, address rules, service-or-custom,
--         custom-request description, no travel fee in-salon, cancellation
--         audit, and the exclusion constraint (double-booking).
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(32);

SELECT has_table('public', 'appointments', 'appointments table exists');
SELECT has_pk('public', 'appointments', 'has primary key');
SELECT has_column('public', 'appointments', 'id', 'has id column');
SELECT has_column('public', 'appointments', 'cancellation_token', 'has cancellation_token column');
SELECT has_column('public', 'appointments', 'appointment_type', 'has appointment_type column');
SELECT has_column('public', 'appointments', 'customer_email', 'has customer_email column');
SELECT has_column('public', 'appointments', 'start_time', 'has start_time column');
SELECT has_column('public', 'appointments', 'end_time', 'has end_time column');
SELECT col_type_is('public', 'appointments', 'id', 'uuid', 'id is uuid');
SELECT col_type_is('public', 'appointments', 'start_time', 'timestamp with time zone', 'start_time is timestamptz');
SELECT has_check('public', 'appointments', 'appointments has check constraints');

-- time_order
SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-01-01 10:00:00+00'::timestamptz, '2030-01-01 10:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'end_time = start_time rejected'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-01-01 11:00:00+00'::timestamptz, '2030-01-01 10:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'end_time < start_time rejected'
);

SELECT lives_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-01-01 10:00:00+00'::timestamptz, '2030-01-01 11:00:00+00'::timestamptz)$$,
  'end_time > start_time is allowed'
);

-- address rules
SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'at_home', 'X', 'x@y.com', '1', 3500,
            '2030-02-01 10:00:00+00'::timestamptz, '2030-02-01 11:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'at_home requires service_address'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, service_address, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', '123 Main St', 'X', 'x@y.com', '1', 3500,
            '2030-02-01 10:00:00+00'::timestamptz, '2030-02-01 11:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'in_salon must not have service_address'
);

SELECT lives_ok(
  $$INSERT INTO appointments (service_id, appointment_type, service_address, customer_name, customer_email, customer_phone, service_price_cents, travel_fee_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'at_home', '123 Main St', 'X', 'x@y.com', '1', 3500, 500,
            '2030-02-01 10:00:00+00'::timestamptz, '2030-02-01 11:00:00+00'::timestamptz)$$,
  'at_home with address is allowed'
);

-- service_or_custom
SELECT throws_ok(
  $$INSERT INTO appointments (appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ('in_salon', 'X', 'x@y.com', '1', 0,
            '2030-03-01 10:00:00+00'::timestamptz, '2030-03-01 11:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'no service and not custom is rejected'
);

SELECT lives_ok(
  $$INSERT INTO appointments (is_custom_request, custom_request_description, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES (true, 'almond shape, chrome finish', 'in_salon', 'X', 'x@y.com', '1', 0,
            '2030-03-01 10:00:00+00'::timestamptz, '2030-03-01 11:00:00+00'::timestamptz)$$,
  'custom request without service_id is allowed when described'
);

SELECT throws_ok(
  $$INSERT INTO appointments (is_custom_request, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES (true, 'in_salon', 'X', 'x@y.com', '1', 0,
            '2030-03-02 10:00:00+00'::timestamptz, '2030-03-02 11:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'custom without description is rejected'
);

-- no travel fee in-salon
SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, travel_fee_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500, 500,
            '2030-04-01 10:00:00+00'::timestamptz, '2030-04-01 11:00:00+00'::timestamptz)$$,
  '23514', NULL,
  'in_salon with travel_fee_cents > 0 is rejected'
);

-- cancellation audit
SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, status)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-05-01 10:00:00+00'::timestamptz, '2030-05-01 11:00:00+00'::timestamptz, 'cancelled')$$,
  '23514', NULL,
  'cancelled without cancelled_at/cancelled_by is rejected'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, status, cancelled_at)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-05-02 10:00:00+00'::timestamptz, '2030-05-02 11:00:00+00'::timestamptz, 'cancelled', now())$$,
  '23514', NULL,
  'cancelled without cancelled_by is rejected'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, cancelled_at)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-05-03 10:00:00+00'::timestamptz, '2030-05-03 11:00:00+00'::timestamptz, now())$$,
  '23514', NULL,
  'non-cancelled with cancelled_at is rejected'
);

SELECT lives_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, status, cancelled_at, cancelled_by)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'X', 'x@y.com', '1', 3500,
            '2030-05-04 10:00:00+00'::timestamptz, '2030-05-04 11:00:00+00'::timestamptz, 'cancelled', now(), 'customer')$$,
  'cancelled with cancelled_at and cancelled_by is allowed'
);

-- Double-booking (exclusion constraint, SQLSTATE 23P01)
SELECT lives_ok(
  $$INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ('cccccccc-0000-0000-0000-000000000001',
            (SELECT id FROM services WHERE name = 'Classic Manicure'),
            'in_salon', 'A', 'a@y.com', '1', 3500,
            '2031-06-01 10:00:00+00'::timestamptz, '2031-06-01 11:00:00+00'::timestamptz)$$,
  'insert booked appointment A 10:00–11:00'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'B', 'b@y.com', '1', 3500,
            '2031-06-01 10:30:00+00'::timestamptz, '2031-06-01 11:30:00+00'::timestamptz)$$,
  '23P01', NULL,
  'overlapping booked appointment B rejected (23P01)'
);

SELECT lives_ok(
  $$INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ('cccccccc-0000-0000-0000-000000000002',
            (SELECT id FROM services WHERE name = 'Classic Manicure'),
            'in_salon', 'C', 'c@y.com', '1', 3500,
            '2031-06-01 09:00:00+00'::timestamptz, '2031-06-01 10:00:00+00'::timestamptz)$$,
  'back-to-back appointment C 09:00–10:00 is allowed'
);

SELECT throws_ok(
  $$INSERT INTO appointments (service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ((SELECT id FROM services WHERE name = 'Classic Manicure'), 'in_salon', 'D', 'd@y.com', '1', 3500,
            '2031-06-01 10:00:00+00'::timestamptz, '2031-06-01 11:00:00+00'::timestamptz)$$,
  '23P01', NULL,
  'identical window as active A is rejected (23P01)'
);

SELECT lives_ok(
  $$INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, status, cancelled_at, cancelled_by)
    VALUES ('cccccccc-0000-0000-0000-000000000003',
            (SELECT id FROM services WHERE name = 'Classic Manicure'),
            'in_salon', 'Dc', 'dc@y.com', '1', 3500,
            '2031-06-01 10:00:00+00'::timestamptz, '2031-06-01 11:00:00+00'::timestamptz,
            'cancelled', now(), 'customer')$$,
  'cancelled appointment with same window is allowed (excluded from constraint)'
);

SELECT lives_ok(
  $$UPDATE appointments SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer'
    WHERE id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'cancelling active appointment A succeeds'
);

SELECT lives_ok(
  $$INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
    VALUES ('cccccccc-0000-0000-0000-000000000004',
            (SELECT id FROM services WHERE name = 'Classic Manicure'),
            'in_salon', 'E', 'e@y.com', '1', 3500,
            '2031-06-01 10:00:00+00'::timestamptz, '2031-06-01 11:00:00+00'::timestamptz)$$,
  'new booked appointment E at 10:00–11:00 succeeds after A is cancelled'
);

SELECT * FROM finish();
ROLLBACK;