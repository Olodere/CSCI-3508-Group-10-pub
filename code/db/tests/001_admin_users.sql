-- Assertions: 15
-- Covers: table shape, citext email, uniqueness (case-sensitive + case-insensitive),
--         NOT NULL constraints, defaults.
-- Note: throws_ok uses the 4-arg form (sql, errcode, NULL, description) because
-- the installed pgTAP treats the 3-arg form's 3rd argument as an expected message.
BEGIN;

SELECT plan(15);

SELECT has_table('public', 'admin_users', 'admin_users table exists');
SELECT has_pk('public', 'admin_users', 'admin_users has a primary key');
SELECT has_column('public', 'admin_users', 'id', 'has id column');
SELECT has_column('public', 'admin_users', 'email', 'has email column');
SELECT has_column('public', 'admin_users', 'password_hash', 'has password_hash column');
SELECT has_column('public', 'admin_users', 'full_name', 'has full_name column');
SELECT col_type_is('public', 'admin_users', 'email', 'citext', 'email is citext');
SELECT col_not_null('public', 'admin_users', 'email', 'email is NOT NULL');
SELECT col_not_null('public', 'admin_users', 'password_hash', 'password_hash is NOT NULL');
SELECT col_not_null('public', 'admin_users', 'full_name', 'full_name is NOT NULL');
SELECT col_has_default('public', 'admin_users', 'is_active', 'is_active has default');
SELECT col_has_default('public', 'admin_users', 'created_at', 'created_at has default');

SELECT lives_ok(
  $$INSERT INTO admin_users (email, password_hash, full_name) VALUES ('first@example.com', 'hash', 'First')$$,
  'can insert a valid admin'
);

SELECT throws_ok(
  $$INSERT INTO admin_users (email, password_hash, full_name) VALUES ('first@example.com', 'hash', 'Dup')$$,
  '23505', NULL,
  'duplicate email rejected with unique_violation'
);

SELECT throws_ok(
  $$INSERT INTO admin_users (email, password_hash, full_name) VALUES ('FIRST@EXAMPLE.COM', 'hash', 'CaseDup')$$,
  '23505', NULL,
  'citext makes the uniqueness check case-insensitive'
);

SELECT * FROM finish();
ROLLBACK;