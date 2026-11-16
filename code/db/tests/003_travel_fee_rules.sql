-- Assertions: 13
-- Covers: fee_cents >= 0, travel_fee_range_order CHECK, name uniqueness.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description).
BEGIN;

SELECT plan(13);

SELECT has_table('public', 'travel_fee_rules', 'travel_fee_rules table exists');
SELECT has_pk('public', 'travel_fee_rules', 'has primary key');
SELECT has_column('public', 'travel_fee_rules', 'fee_cents', 'has fee_cents');
SELECT has_column('public', 'travel_fee_rules', 'min_distance_miles', 'has min_distance_miles');
SELECT has_column('public', 'travel_fee_rules', 'max_distance_miles', 'has max_distance_miles');
SELECT col_not_null('public', 'travel_fee_rules', 'name', 'name is NOT NULL');
SELECT col_has_check('public', 'travel_fee_rules', 'fee_cents', 'fee_cents has CHECK');

SELECT throws_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('NegFee', -1, 0, 5)$$,
  '23514', NULL,
  'negative fee is rejected'
);

SELECT throws_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('Inverted', 500, 10, 5)$$,
  '23514', NULL,
  'max < min is rejected'
);

SELECT throws_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('EqualRange', 500, 5, 5)$$,
  '23514', NULL,
  'max = min is rejected (must be strictly greater)'
);

SELECT lives_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('ValidRange', 500, 0, 5)$$,
  'max > min is allowed'
);

SELECT lives_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('OpenEnded', 500, 20, NULL)$$,
  'max_distance_miles NULL is allowed (open-ended)'
);

SELECT throws_ok(
  $$INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES ('Local (0–5 mi)', 500, 0, 5)$$,
  '23505', NULL,
  'duplicate name is rejected'
);

SELECT * FROM finish();
ROLLBACK;