# Database — Nail Salon Appointment Scheduler

PostgreSQL 17. All schema, seed data, and pgTAP tests for the project.

## Three-layer model

| Layer | Location | Applied | Re-runnable | Idempotent within file |
|---|---|---|---|---|
| Bootstrap | `init.sql` | once per empty `$PGDATA` | yes (uses `IF NOT EXISTS`) | yes |
| Migrations | `migrations/*.sql` | via `make migrate` (dev) or `run-tests.sh` (test) | yes (dbmate tracks; test DB is fresh) | no, and does not need to be |
| Seeds | `seeds/*.sql` | via `make seed` (dev) or `run-tests.sh` (test) | yes (uses `ON CONFLICT DO NOTHING`) | yes |

Migrations run in **lexical order**. Every file in `migrations/` must be prefixed with a zero-padded integer (`0001_`, `0002_`, …). Down migrations are out of scope for v1 — forward-only.

## Workflows

### First-time dev setup

```bash
make up           # start postgres:17.11-alpine, apply init.sql (citext extension)
make migrate      # run all migrations via dbmate (creates schema_migrations table)
make seed         # apply seeds/baseline.sql
# or, in one shot:
make dev-setup
```

Run these from `code/db`. They need Docker Desktop running and `make`, which is not bundled with Git Bash. Without `make`, run the same Docker commands the Makefile uses (from `code/db`):

```bash
docker compose -p nailsalon_dev -f docker-compose.yml up -d db
docker compose -p nailsalon_dev -f docker-compose.yml run --rm migrate
docker compose -p nailsalon_dev -f docker-compose.yml exec -T db psql -v ON_ERROR_STOP=1 --single-transaction -U myuser -d nailsalon -f /seeds/baseline.sql
```

The dev database listens on `localhost:5432` (user `myuser`, password `mypassword`, database `nailsalon`, from `docker-compose.yml`; development only).

### Other commands

| Command | What it does |
|---|---|
| `make psql` | Open a psql shell on the dev database |
| `make down` | Stop the dev stack, keep data |
| `make nuke` | Stop the dev stack **and delete its data volume** (then run `make dev-setup` again) |
| `make test` | Run all pgTAP tests (`tests/*.sql`) in a throwaway database from a clean stack |

Migrations so far: `0001_initial`, `0002_available_slots`, `0003_database_improvements`, `0004_admin_auth` (the `session` and `admin_login_attempts` tables used by the API's admin login).

## Available slots

The function

    public.available_slots(p_date date, p_duration_minutes integer, p_slot_interval integer DEFAULT NULL)
    RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)

is the single source of truth for "which appointment slots are bookable on
date D." Customer booking UI and admin schedule view both call it, so
availability rules live in exactly one place.

- **Inputs.** `p_date` is the local day to query. `p_duration_minutes` is the
  service duration. `p_slot_interval` is the step between slot starts; when
  NULL it defaults to `salon_settings.slot_interval_minutes`.
- **Output.** Ordered `(slot_start, slot_end)` rows in UTC (`timestamptz`).
- **Semantics.**
  - Candidate windows = `availability_defaults` for the day-of-week
    ∪ `availability_overrides` with `mode='add'` for that date.
  - Subtractive filters = `availability_overrides` with `mode='block'`
    ∪ `appointments` where `status <> 'cancelled'`.
  - A full-day block (`mode='block'` with NULL times) removes every slot on
    the date, including slots contributed by `add` overrides
    ("block wins").
  - All times are interpreted in `salon_settings.timezone`; DST is handled by
    Postgres's `AT TIME ZONE` semantics.
  - Past slots are NOT filtered; callers should pass `p_date >= today`.
- **Errors.** Raises SQLSTATE `22023` (`invalid_parameter_value`) when
  `p_duration_minutes <= 0`, when the effective slot interval is `<= 0`,
  or when `salon_settings (id=1)` is missing.
- **Test file.** `db/tests/011_available_slots.sql` — 14 assertions covering
  the default grid, appointment exclusion, block/add overrides, cancelled
  exclusion, winter/summer timezone offsets, DST spring-forward, and input
  validation.