-- Assertions: 11
-- Covers: appointment booking, pricing, availability, and cancellation.

BEGIN;

SELECT plan(11);

-- Book a Classic Manicure on Tuesday at 9:00 AM Denver time.
SELECT lives_ok(
    $$
    CREATE TEMP TABLE test_booking AS
    SELECT *
    FROM book_appointment(
        (SELECT id FROM services WHERE name = 'Classic Manicure'),
        'Booking Test',
        'bookingtest@example.com',
        '555-0100',
        '2030-01-15 16:00:00+00'::timestamptz
    )
    $$,
    'active service can be booked at an available time'
);

SELECT is(
    (SELECT count(*)::int FROM test_booking),
    1,
    'booking returns one confirmation'
);

SELECT is(
    (SELECT service_price_cents FROM test_booking),
    3500,
    'booking uses the service price'
);

SELECT is(
    (SELECT travel_fee_cents FROM test_booking),
    0,
    'in-salon booking has no travel fee'
);

SELECT is(
    (SELECT total_cents FROM test_booking),
    3500,
    'total equals service price plus travel fee'
);

SELECT is(
    (SELECT end_time - start_time FROM test_booking),
    INTERVAL '45 minutes',
    'appointment end time uses the service duration'
);

-- Cancel using the returned appointment ID and cancellation token.
SELECT lives_ok(
    $$
    SELECT * FROM cancel_appointment(
        (SELECT id FROM test_booking),
        (SELECT cancellation_token FROM test_booking)
    )
    $$,
    'customer can cancel with the correct token'
);

SELECT is(
    (SELECT status::text FROM appointments
     WHERE id = (SELECT id FROM test_booking)),
    'cancelled',
    'cancellation updates appointment status'
);

SELECT ok(
    (SELECT cancelled_at IS NOT NULL FROM appointments
     WHERE id = (SELECT id FROM test_booking)),
    'cancellation timestamp is recorded'
);

SELECT throws_ok(
    $$
    SELECT * FROM cancel_appointment(
        (SELECT id FROM test_booking),
        '00000000-0000-0000-0000-000000000000'::uuid
    )
    $$,
    'P0001', NULL,
    'incorrect cancellation token is rejected'
);

SELECT throws_ok(
    $$
    SELECT * FROM book_appointment(
        999999,
        'Booking Test',
        'bookingtest@example.com',
        '555-0100',
        '2030-01-15 16:00:00+00'::timestamptz
    )
    $$,
    'P0002', NULL,
    'nonexistent service is rejected'
);

SELECT * FROM finish();

ROLLBACK;
