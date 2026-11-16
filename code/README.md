# Source Code

Place all runnable application source code in this folder. You may create language-appropriate subfolders, but keep the structure simple and document it below. Do not place tests here; use `../tests/`.

## Implementation Summary

**Implemented system:** A Next.js landing page, an Express API with an owner-only admin login (`/admin/login`, `/admin`), and a PostgreSQL database with schema migrations, baseline seed data and pgTAP tests.

**Implemented requirements:** FR-09 and NFR-03 (admin login). [List other requirement IDs, such as FR-01 through FR-08, as they are completed.]

**Known limitations:** The customer booking UI is in progress on a separate branch and is not part of `main`.

## Technology Stack

| Technology | Version | Purpose | Selection reason |
| --- | --- | --- | --- |
| Next.js (App Router) | 16.4 | Frontend web framework | Fast pages on phones; deploys to Vercel in one step |
| React | 19.3 | UI components | [Reason] |
| TypeScript | 5 | Typed JavaScript for the frontend and API | [Reason] |
| Tailwind CSS + CSS modules | 4 | Styling | [Reason] |
| ESLint / Prettier | 9 / 3 | Linting and code formatting | [Reason] |
| PostgreSQL | 17 (Docker image `postgres:17.11-alpine`) | Database | Foreign keys, enums and time-zone-aware times for scheduling |
| Express + TypeScript (ESM) | 4.21 | Backend API in `api/` | One language across the project; simple, testable REST API |
| `pg` (no ORM) | 8 | Database access from the API | The database schema holds the rules (`available_slots()`, overlap constraint); an ORM would hide or duplicate them (`../documentation/api-decision-log.md`) |
| `express-session` + `connect-pg-simple` | 1 / 10 | Admin sessions stored in PostgreSQL | One admin does not need a third-party login service |
| `@node-rs/argon2` | 2 | Password hashing (argon2id) | OWASP-recommended; prebuilt binaries (`../documentation/api-decision-log.md`) |
| Zod | 3 | Validation of environment variables and request bodies | Single dependency for both boundaries (`../documentation/api-decision-log.md`) |
| Vitest / pgTAP | 2 / n/a | API tests / database tests | [Reason] |
| Docker Compose + dbmate | n/a / 2 | Local database and migrations | Already provided in the repo (`../documentation/api-decision-log.md`) |

## Source Structure

```text
code/
|-- db/                   PostgreSQL in Docker (see db/README.md)
|   |-- init.sql          Bootstrap: citext extension (runs once on an empty database)
|   |-- migrations/       Schema, 0001 to 0004 (applied by dbmate)
|   |-- seeds/            baseline.sql seed data
|   |-- tests/            pgTAP tests (001 to 012)
|   |-- docker/           Test image and test runner script
|   |-- docker-compose.yml, docker-compose.test.yml
|   `-- Makefile
|-- api/                  Express + TypeScript API (see api/README.md)
|   |-- src/              App, config, db, auth, middleware, routes
|   |-- scripts/          create-admin.ts (npm run admin:create)
|   `-- tests/            Vitest tests
|-- frontend/             Next.js website (see frontend/README.md)
|   |-- app/              Pages (home, /admin/login, /admin), root layout, global styles
|   |-- components/       Page section components
|   |-- lib/              Server helpers (admin-session.ts, site.ts)
|   |-- styles/           CSS modules for components
|   `-- proxy.ts          Redirects /admin visitors with no session cookie to the login page
`-- README.md
```

| Path | Responsibility | Related requirements |
| --- | --- | --- |
| `db/migrations/` | Database schema for appointments, availability, admin users, sessions and login attempts | [FR-xx] |
| `api/src/routes/admin/` | Admin login, logout and session routes; guard for later admin routes | FR-09, NFR-03 |
| `frontend/app/page.tsx` | Home page that assembles the landing page sections | [FR-xx] |
| `frontend/components/` | Navigation, header, hero, section wrapper, and footer components | [FR-xx] |
| `frontend/app/admin/` | Admin login page and signed-in admin page | FR-09 |

## Prerequisites

- Node.js 20.9 or newer, with npm (required by Next.js 16 and by `code/api`)
- Docker Desktop (runs PostgreSQL and the migration tool)
- `make` for the commands in `code/db`. It is not included with Git Bash; if it is missing, install it or use the `docker compose` equivalents listed in `db/README.md`.

## Setup

Starting from a fresh clone, in a Git Bash terminal. Docker Desktop must be running.

1. Database (starts PostgreSQL on port 5432, applies migrations, loads seed data):

   ```text
   cd code/db
   make dev-setup
   ```

2. API:

   ```text
   cd code/api
   npm install
   cp .env.example .env
   npm run admin:create
   ```

   `npm run admin:create` asks for the owner's email, full name and password, and creates the admin account. Run it again with the same email to reset that password. The database from step 1 must be running first.

3. Frontend:

   ```text
   cd code/frontend
   npm install
   ```

   No `.env.local` is needed for local development; `API_URL` defaults to `http://localhost:3001`.

## Run the Application

Start the API and the frontend in two terminals (the database from Setup must be running):

```text
cd code/api
npm run dev
```

```text
cd code/frontend
npm run dev
```

Expected result: the API listens on http://localhost:3001 (`/health` returns `"status": "ok"`). The frontend terminal shows a local URL (normally http://localhost:3000), and opening it shows the Nail Salon landing page with navigation, header, and footer. `/admin/login` signs in with the account created by `npm run admin:create`.

## Configuration

| Setting | Required | Example or allowed values | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` (api) | Yes | `postgres://myuser:mypassword@127.0.0.1:5432/nailsalon?sslmode=disable` | PostgreSQL connection string. On Render, use the Postgres service's Internal Connection String |
| `SESSION_SECRET` (api) | Yes | At least 32 characters; `openssl rand -base64 32` | Signs the session cookie |
| `PORT` (api) | No | `3001` (default) | Port the API listens on |
| `NODE_ENV` (api) | No | `development` (default), `test`, `production` | Runtime mode |
| `LOG_LEVEL` (api) | No | `info` (default) | Log verbosity |
| `CORS_ORIGIN` (api) | No | `http://localhost:3000` (default) | Frontend origin allowed by the API's CORS settings. In production, the Vercel URL |
| `MAPS_API_KEY` (api) | No | (empty) | Mapbox token; optional until travel-fee quoting is implemented |
| `API_URL` (frontend) | No | `http://localhost:3001` (default) | Where the frontend's `/api/*` rewrite (`next.config.ts`) forwards requests to the Express API. Set in `code/frontend/.env.local` if the API is elsewhere. **In production, set `API_URL` in Vercel's environment variables to the API's public URL.** Rewrites are built at build time, so redeploy after changing it |

The API settings go in `code/api/.env` (copy from `.env.example`). The frontend setting goes in `code/frontend/.env.local` (see `frontend/.env.example`). Neither file is committed.

## Implementation Evidence

| Requirement ID | Feature | Main source location | How to demonstrate it |
| --- | --- | --- | --- |
| FR-01 | [Feature] | `[relative/path]` | [Steps and expected result] |
| FR-09 | Admin login | `api/src/routes/admin/auth.ts`, `frontend/app/admin/` | Follow Setup, open http://localhost:3000/admin/login, sign in; the browser goes to `/admin`. See TC-01 to TC-08 in `../tests/test-cases.md` |

## Error Handling and Quality

[Describe input validation, exceptions/errors, logging, security checks, and reviews.]

The frontend uses ESLint (`npm run lint`) for static analysis and Prettier (`npm run format`, `npm run format:check`) for consistent formatting. Run both from `code/frontend/` before committing. The API has the same scripts plus `npm run typecheck`; run them from `code/api/`.

## Run Tests

Automated tests live next to the code they test (`api/tests/`, `db/tests/`); manual test cases are in `../tests/test-cases.md`. The frontend has no automated tests yet.

API (Vitest), from `code/api`, with the database from Setup running:

```text
npm test
```

`tests/admin-auth.test.ts` is skipped if the database or migrations are missing, and it deletes all admin users, sessions and login attempts, so run `npm run admin:create` again afterwards.

Database (pgTAP), from `code/db` (needs Docker; uses its own temporary database):

```text
make test
```

## Build or Package

```text
cd code/frontend
npm run build
npm run start
```

```text
cd code/api
npm run build
npm start
```

## Source Code Appendix

Before submission, follow `../documentation/appendix/README.md` to copy all application and test source code into one or more plain-text appendix files.

### Implementation Checklist

- [ ] Required features are complete and trace to requirements.
- [ ] A new user can set up and run the system using this README.
- [ ] Code is readable, consistently formatted, and appropriately documented.
- [ ] Inputs, errors, and failure conditions are handled.
- [ ] Dependencies and configuration are documented without exposing secrets.
- [ ] Build output, dependencies, and unrelated files are not committed.
- [ ] The plain-text source appendix matches the final application and test source code.
