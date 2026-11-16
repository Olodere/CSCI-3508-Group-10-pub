# Nail Salon API

Express + TypeScript backend. Talks to the PostgreSQL database in `code/db/`.

## Requirements

- Node **20.9+**
- Docker Desktop (for local Postgres), and `make` for the `code/db` commands. `make` is not bundled with Git Bash; see `code/db/README.md` for the `docker compose` equivalents.

## First-time setup

```bash
# 1. Start Postgres, apply migrations (incl. 0004_admin_auth) and seed data
#    (from the repo root; Docker Desktop must be running)
(cd code/db && make dev-setup)

# 2. Install API dependencies
cd code/api
npm install

# 3. Create your env
cp .env.example .env

# 4. Create the salon owner's admin account (there is no sign-up page)
npm run admin:create

# 5. Boot the API
npm run dev
```

`GET http://localhost:3001/health` should return:

```json
{ "status": "ok", "db": "ok", "version": "PostgreSQL 17.11 …", "timestamp": "…" }
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | `tsx watch` — auto-reload on file changes |
| `npm run build` | `tsup` — bundles to `dist/index.js` |
| `npm start` | Runs `dist/index.js` (after build) |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run admin:create` | Create the owner's admin account, or reset its password (signs out its sessions) |
| `npm run sample:appointments` | Dev only: book 3 sample appointments in open slots (`-- --clear` removes them) |

## Layout

```
src/
├── index.ts              # bootstrap: bind port, handle signals
├── app.ts                # Express app factory (testable)
├── config.ts             # zod-validated env
├── logger.ts             # pino, with PII redaction
├── db/
│   ├── pool.ts           # pg Pool + health check
│   └── tx.ts             # withTransaction helper
├── middleware/
│   ├── error.ts          # PG → API error mapping
│   ├── requestIdHeader.ts # x-request-id response header
│   ├── rateLimit.ts      # per-IP rate limit for public routes
│   ├── requestLog.ts     # requestId + pino-http
│   └── requireAdmin.ts   # guard for /api/admin/* (session + CSRF)
├── auth/
│   ├── password.ts       # argon2id hash/verify
│   ├── session.ts        # express-session stored in Postgres
│   └── lockout.ts        # failed-login limits
├── types/express.d.ts    # req.admin, session fields
└── routes/
    ├── health.ts         # GET /health
    ├── public.ts         # services, availability, booking
    └── admin/
        ├── index.ts      # /api/admin router: login/logout, then requireAdmin
        ├── auth.ts       # POST login, POST logout, GET session
        └── appointments.ts # GET /api/admin/appointments (owner's list)
scripts/
├── create-admin.ts       # npm run admin:create
└── sample-appointments.ts # npm run sample:appointments (dev only)
```

## Admin routes and security

Every new admin route goes in `src/routes/admin/index.ts` **after**
`adminRouter.use(requireAdmin)`. That line gives you, for free:

- `401` if not signed in, `403` if the account is inactive
- `403` on `POST`/`PATCH`/`DELETE` unless the `x-csrf-token` header matches
  the token returned by login (or `GET /api/admin/session`)
- `req.admin` = `{ id, email, fullName }` of the signed-in owner

Logins are limited to 5 failures per email (20 per IP) in 15 minutes.
Details: `documentation/api-contract.md` and `api-decision-log.md`.

Public routes (`src/routes/public.ts`): `GET /api/services`,
`GET /api/availability`, `POST /api/appointments`. They are rate limited per
IP (10 booking attempts per 15 minutes, 120 reads per minute; 429
`RATE_LIMITED`). `/api/admin/*` has login and the appointment list
(`GET /api/admin/appointments`). The list never
returns a booking's `cancellation_token`, which belongs to the customer only.

## Environment

See `.env.example`. On Render, set `DATABASE_URL` to the **Internal Connection
String** of the Postgres service, not the External one.

## Contract & decisions

- `documentation/api-contract.md` — request/response shapes, error codes
- `documentation/api-decision-log.md` — why each choice was made

## Current scope

`/health`, admin login (`/api/admin/login`, `/logout`, `/session`) and the
owner's appointment list (`/api/admin/appointments`).
Booking routes come once `book_appointment` / `cancel_appointment` exist.

## Tests

`npm test` runs everything (`tests/smoke.test.ts`, `tests/errors.test.ts`, `tests/admin-auth.test.ts`, `tests/admin-appointments.test.ts`, `tests/public.test.ts`, `tests/public-security.test.ts`). The database test files need the dev database
with migrations applied (`make dev-setup` in `code/db`); without it, that file
is skipped. Test files run one at a time (`fileParallelism: false`) because
they share these tables. **They delete all admin users, sessions and login attempts**, so
recreate your account with `npm run admin:create` afterwards.