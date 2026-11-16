-- Assertions: 8
-- Covers: FK to appointments, ON DELETE CASCADE.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(8);

SELECT has_table('public', 'appointment_images', 'table exists');
SELECT has_pk('public', 'appointment_images', 'has primary key');
SELECT has_column('public', 'appointment_images', 'appointment_id', 'has appointment_id');
SELECT has_column('public', 'appointment_images', 'image_url', 'has image_url');
SELECT has_fk('public', 'appointment_images', 'appointment_images has a foreign key');

SELECT throws_ok(
  $$INSERT INTO appointment_images (appointment_id, image_url)
    VALUES ('99999999-9999-9999-9999-999999999999', 'http://example.com/x.jpg')$$,
  '23503', NULL,
  'inserting an image for a nonexistent appointment is rejected'
);

INSERT INTO appointments (id, service_id, appointment_type, customer_name, customer_email, customer_phone, service_price_cents, start_time, end_time)
VALUES ('ffffffff-0000-0000-0000-000000000001',
        (SELECT id FROM services WHERE name = 'Classic Manicure'),
        'in_salon', 'X', 'x@y.com', '1', 3500,
        '2032-01-01 10:00:00+00'::timestamptz, '2032-01-01 11:00:00+00'::timestamptz);

SELECT lives_ok(
  $$INSERT INTO appointment_images (appointment_id, image_url)
    VALUES ('ffffffff-0000-0000-0000-000000000001', 'http://example.com/img.jpg')$$,
  'insert image for an existing appointment succeeds'
);

DELETE FROM appointments WHERE id = 'ffffffff-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM appointment_images WHERE appointment_id = 'ffffffff-0000-0000-0000-000000000001'),
  0,
  'ON DELETE CASCADE removes images when the appointment is deleted'
);

SELECT * FROM finish();
ROLLBACK;