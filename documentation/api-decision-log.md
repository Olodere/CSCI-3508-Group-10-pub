# API Decision Log — Nail Salon Appointment Scheduler

**Status:** Locked for the project
**Owner:** Backend lead
**Review cadence:** Re-open only if an assumption below is invalidated

This file records *why* each technology choice was made so that future
contributors don't re-litigate them. "Reversible?" indicates whether flipping
the decision later requires touching more than one file.

---

## Runtime & Language

| Decision | Express 4.21.x + TypeScript (strict) + ESM |
|---|---|
| Alternatives considered | Express 5 (new, some middleware still stabilising), Fastify (smaller ecosystem for `connect-pg-simple`), Hono (new) |
| Rationale | Express 4 is the most-tested base for `express-session`, `express-rate-limit`, and `cors`. All of those have official compatibility notes for Express 4. Small project ⇒ stability over novelty. ESM aligns with the Next.js frontend. |
| Reversible? | Express 4 → 5 is a one-file swap (`package.json`) plus re-running the middleware tests when sessions are added. Low risk. |

## Module resolution & tooling

| Decision | `moduleResolution: "bundler"`, no `.js` extensions in imports, `tsx` for dev, `tsup` for build |
|---|---|
| Alternatives considered | `NodeNext` + `.js` extensions + raw `tsc` (standard but noisy), CommonJS (legacy), `tsc + ts-node` (slow startup) |
| Rationale | Matches the frontend's existing style. `.js`-extension friction buys nothing for a project this size. `tsup` bundles once and produces a single `dist/index.js` that Node runs directly. |
| Reversible? | Trivial. `tsup` output is standard ESM. |

## Database access

| Decision | `pg` v8 with a single `Pool`; no ORM, no query builder |
|---|---|
| Alternatives considered | Prisma, Drizzle, Kysely |
| Rationale | The DB schema *is* the invariant layer: `available_slots()` and the `appointments_no_overlap` GiST constraint are the source of truth. An ORM would either hide those or force schema duplication. Raw parameterized SQL keeps the app thin. Kysely (typed SQL builder) was tempting but adds ~1 file of types for every query — out of scope for a v1 with ~20 queries. |
| Reversible? | Yes; a future step could adopt Drizzle alongside, but not planned. |

## Validation

| Decision | Zod at two boundaries: `process.env` (config) and request bodies |
|---|---|
| Rationale | Single dependency, same patterns as many TS projects, and the frontend can reuse the schema if desired. Alternative (`ajv` + JSON Schema) needs two schemas (one TS, one JSON). |
| Reversible? | Trivial. |

## Logging

| Decision | `pino` + `pino-http`, JSON in prod, `pino-pretty` in dev |
|---|---|
| Rationale | Structured logs required for Render's log stream. `redact` config keeps customer PII out of logs *by default* — critical given the booking flow stores email + phone + address. |
| Reversible? | Trivial. |

## Auth (decided now to lock contract)

| Decision | `express-session` + `connect-pg-simple`, cookie HttpOnly + SameSite=Lax + Secure (prod), 24h expiry |
|---|---|
| Alternatives considered | JWT stateless, Auth0, Clerk |
| Rationale | Owner is a single admin. Sessions in Postgres survive Render web-service restarts. No third-party auth service (the requirements explicitly say "One admin does not need a third-party login service"). SameSite=Lax + a double-submit CSRF token covers the single-origin frontend. |
| Reversible? | Swapping to JWT is a contained change; the `requireAdmin` middleware boundary stays. |

## Admin login lockout

| Decision | Per-email (5) and per-IP (20) failure limits over 15 minutes, stored in `admin_login_attempts` (migration 0004). Each attempt is saved *before* the password check, then counted. |
|---|---|
| Alternatives considered | `express-rate-limit` (per IP, in memory) |
| Rationale | In-memory limits reset when Render restarts the service and only count by IP. Counting per email in Postgres protects the owner's account no matter how many IPs are used. Saving before checking closes a race where simultaneous guesses all passed a "fewer than 5 failures?" check (tested in `admin-auth.test.ts`, AT-07). |
| Reversible? | Yes. Contained in `src/auth/lockout.ts`. |

## Frontend reaches the API through a Next.js rewrite (same site)

| Decision | The browser calls `/api/*` on the frontend's own domain; `next.config.ts` forwards it to `API_URL`. |
|---|---|
| Alternatives considered | Browser calls the Render URL directly with CORS `credentials: true` |
| Rationale | Vercel and Render are different sites. Browsers do not send a `SameSite=Lax` cookie on a cross-site `fetch`, so the admin session would silently not work in production. A rewrite keeps everything same-site, so Lax cookies and the CSRF token work without `SameSite=None`. CORS config stays in place and is harmless. |
| Reversible? | Yes. Remove the rewrite and switch the cookie to `SameSite=None; Secure`. |

## Passwords

| Decision | `@node-rs/argon2` (argon2id) |
|---|---|
| Rationale | OWASP-recommended; prebuilt binaries mean no native compilation on Render; argon2 default parameters are safe. Alternative `bcrypt` is fine but heavier to justify. |
| Reversible? | Hash format changes are a one-time migration; not planned. |

## Maps / Travel fee

| Decision | Mapbox Geocoding API for forward-geocode; Haversine for distance |
|---|---|
| Alternatives considered | Google Maps Distance Matrix (paid, driving distance), Mapbox Distance API (paid, driving distance), Nominatim (free but rate-limited) |
| Rationale | Solo tech drives within Aurora, CO. Straight-line distance plus a `max_travel_distance_miles` cap in `salon_settings` is accurate enough and free. Mapbox free tier is 100k/month — the LRU cache makes the *actual* call rate tiny. |
| Base address | `salon_settings.base_address`, geocoded once at process start; the geocoding layer caches `base_lat`/`base_lng` in memory. |
| Reversible? | Swapping to driving-distance later is a single `distanceMiles()` swap in `geoService`. |

## Data validation philosophy

| Decision | Postgres constraints are authoritative; Zod is a *pre-flight* only |
|---|---|
| Rationale | The DB has `CHECK`, `EXCLUDE`, and FK constraints. Zod catches the obvious bad requests early with a 422 instead of a 500. Anything Zod lets through still hits the DB, and the error middleware maps `23P01` / `23514` / `23505` into clean domain codes (see `src/middleware/error.ts`). |
| Reversible? | N/A — this is a rule, not a library. |

## Dev environment

| Decision | `docker compose -f code/db/docker-compose.yml up -d` for Postgres 17.11 |
|---|---|
| Rationale | Already provided in the repo. No new Compose file needed. |
| API default port | `3001` (Next dev server uses `3000`). |
| API default CORS origin | `http://localhost:3000` |

## Error model (frozen for the API contract)

The shape `{ error: { code, message, details?, requestId } }` is stable. Codes are frozen in `src/middleware/error.ts` and mirrored in `documentation/api-contract.md`. Adding a code is allowed; renaming is not.

## Out of scope for this step

- No routes beyond `GET /health`.
- No DB tables beyond what already exists.
- No `.env` committed; `.env.example` only.
- `express-session` and `connect-pg-simple` are **not** added to `package.json` yet — they will be added when sessions are introduced.