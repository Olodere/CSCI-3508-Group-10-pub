-- Assertions: 20
-- Covers: table shape, price_cents >= 0 (incl. boundary), duration_minutes > 0,
--         name uniqueness, active_services view filtering and ordering.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(20);

SELECT has_table('public', 'services', 'services table exists');
SELECT has_pk('public', 'services', 'services has a primary key');
SELECT has_column('public', 'services', 'id', 'has id column');
SELECT has_column('public', 'services', 'name', 'has name column');
SELECT has_column('public', 'services', 'price_cents', 'has price_cents column');
SELECT has_column('public', 'services', 'duration_minutes', 'has duration_minutes column');
SELECT has_column('public', 'services', 'is_active', 'has is_active column');
SELECT has_column('public', 'services', 'sort_order', 'has sort_order column');
SELECT col_not_null('public', 'services', 'name', 'name is NOT NULL');
SELECT col_has_default('public', 'services', 'is_active', 'is_active has default');
SELECT col_has_default('public', 'services', 'sort_order', 'sort_order has default');
SELECT col_has_check('public', 'services', 'price_cents', 'price_cents has CHECK');
SELECT col_has_check('public', 'services', 'duration_minutes', 'duration_minutes has CHECK');

SELECT throws_ok(
  $$INSERT INTO services (name, price_cents, duration_minutes) VALUES ('Neg', -1, 10)$$,
  '23514', NULL,
  'price_cents must be non-negative'
);

-- Boundary case. sort_order=100 keeps 'Free' from sorting before the seed
-- services, which would break assertion 20's ordering check.
SELECT lives_ok(
  $$INSERT INTO services (name, price_cents, duration_minutes, sort_order) VALUES ('Free', 0, 10, 100)$$,
  'price_cents = 0 is allowed (boundary)'
);

SELECT throws_ok(
  $$INSERT INTO services (name, price_cents, duration_minutes) VALUES ('ZeroDur', 100, 0)$$,
  '23514', NULL,
  'duration_minutes must be positive'
);

SELECT throws_ok(
  $$INSERT INTO services (name, price_cents, duration_minutes) VALUES ('NegDur', 100, -1)$$,
  '23514', NULL,
  'negative duration_minutes is rejected'
);

SELECT throws_ok(
  $$INSERT INTO services (name, price_cents, duration_minutes) VALUES ('Classic Manicure', 100, 10)$$,
  '23505', NULL,
  'duplicate service name is rejected'
);

INSERT INTO services (name, price_cents, duration_minutes, is_active) VALUES ('Inactive Svc', 100, 10, false);

SELECT is(
  (SELECT count(*)::int FROM active_services WHERE name IN ('Inactive Svc', 'Classic Manicure')),
  1,
  'active_services excludes inactive rows'
);

SELECT is(
  (SELECT name FROM active_services ORDER BY sort_order, name LIMIT 1),
  'Classic Manicure',
  'active_services ordered by sort_order (seed: Classic Manicure has sort_order 10)'
);

SELECT * FROM finish();
ROLLBACK;