-- Assertions: 6
-- Covers: active_services filters inactive; upcoming_appointments excludes
--         cancelled and past appointments.
BEGIN;

SELECT plan(6);

SELECT has_view('public', 'upcoming_appointments', 'upcoming_appointments view exists');
SELECT has_view('public', 'active_services', 'active_services view exists');

-- Fixtures: an inactive service (local to this file; 002's insert rolls back),
-- plus four appointments covering the view's filter logic.
INSERT INTO services (name, price_cents, duration_minutes, is_active)
VALUES ('Inactive Svc', 100, 10, false);

INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
VALUES
  ('22222222-2222-2222-2222-222222222222', (SELECT id FROM services WHERE name = 'Classic Manicure'),
   'in_salon', 'A', 'a@x.com', '1', 3500, now() + interval '1 day', now() + interval '1 day 1 hour'),
  ('33333333-3333-3333-3333-333333333333', (SELECT id FROM services WHERE name = 'Classic Manicure'),
   'in_salon', 'B', 'b@x.com', '1', 3500, now() + interval '2 days', now() + interval '2 days 1 hour'),
  ('55555555-5555-5555-5555-555555555555', (SELECT id FROM services WHERE name = 'Classic Manicure'),
   'in_salon', 'C', 'c@x.com', '1', 3500, now() - interval '1 day', now() - interval '1 day' + interval '1 hour');

INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time, status, cancelled_at, cancelled_by)
VALUES ('44444444-4444-4444-4444-444444444444', (SELECT id FROM services WHERE name = 'Classic Manicure'),
        'in_salon', 'D', 'd@x.com', '1', 3500, now() + interval '3 days', now() + interval '3 days 1 hour',
        'cancelled', now(), 'customer');

SELECT is(
  (SELECT count(*)::int FROM active_services WHERE name = 'Inactive Svc'),
  0,
  'active_services excludes inactive rows'
);

SELECT is(
  (SELECT count(*)::int FROM upcoming_appointments WHERE id = '44444444-4444-4444-4444-444444444444'),
  0,
  'upcoming_appointments excludes cancelled rows'
);

SELECT is(
  (SELECT count(*)::int FROM upcoming_appointments WHERE id = '55555555-5555-5555-5555-555555555555'),
  0,
  'upcoming_appointments excludes past rows'
);

SELECT is(
  (SELECT count(*)::int FROM upcoming_appointments
    WHERE id IN ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')),
  2,
  'upcoming_appointments includes future booked rows'
);

SELECT * FROM finish();
ROLLBACK;