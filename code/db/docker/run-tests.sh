#!/usr/bin/env bash
# docker/run-tests.sh
# Test runner for the pgTAP suite. Runs inside the `tests` service.
# Applies bootstrap + migrations + seeds, enables pgTAP, then runs
# every tests/*.sql. Shell lives in this file (not in compose YAML)
# so Compose never sees $f.

set -euo pipefail
shopt -s nullglob

echo "==> Applying bootstrap (init.sql)"
psql -v ON_ERROR_STOP=1 --single-transaction -f /work/init.sql

echo "==> Applying migrations"
migrations=(/work/migrations/*.sql)
if (( ${#migrations[@]} == 0 )); then
  echo "ERROR: no migration files found at /work/migrations/*.sql" >&2
  exit 1
fi
for m in "${migrations[@]}"; do
  echo "--> $m"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$m"
done

echo "==> Applying seed data"
psql -v ON_ERROR_STOP=1 --single-transaction -f /work/seeds/baseline.sql

# pgTAP is installed in the test image (postgresql-17-pgtap) but must be
# enabled per database. Enable it outside any transaction so the extension
# persists across every test file's BEGIN...ROLLBACK cycle. This is the
# only place pgtap is enabled; init.sql stays pgtap-free so the same file
# works in the dev/prod stack where the package is absent.
echo "==> Enabling pgTAP extension"
psql -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS pgtap;'

echo "==> Running pgTAP test files"
files=(/work/tests/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "ERROR: no test files found at /work/tests/*.sql" >&2
  exit 1
fi

fail=0
for f in "${files[@]}"; do
  echo "--> $f"
  if ! psql -v ON_ERROR_STOP=1 -f "$f"; then
    echo "FAILED: $f"
    fail=1
  fi
done

exit "$fail"