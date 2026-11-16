# Tests

Keep automated tests, manual test cases, test data, and non-sensitive evidence in this folder. Summarize final coverage and results in `../documentation/04-testing-report.md`.

## Test Organization

Automated tests live next to the code they test, not in this folder:

```text
code/api/tests/      Vitest tests for the API (smoke, error mapping, admin login)
code/db/tests/       pgTAP tests for the database schema (001 to 012)
tests/
|-- evidence/        Screenshots and curated logs
|-- test-cases.md    Manual test cases (TC-01 to TC-08) and an index of the automated tests
`-- README.md
```

The frontend has no automated tests yet.

Do not commit passwords, API keys, private user information, large generated reports, or environment-specific temporary output.

## Prerequisites

- Node.js 20.9 or newer and npm (API tests)
- Vitest 2 (API) and pgTAP (database)
- Docker Desktop, and `make` for the database commands (`make` is not bundled with Git Bash; see `code/db/README.md`)
- For the API admin-login tests: the dev database running with migrations applied (`make dev-setup` in `code/db`)

## Run All Automated Tests

Run each suite from its own folder:

```text
cd code/db
make test
```

```text
cd code/api
npm install
npm test
```

Expected result: [Describe the success output and expected test count.]

## Run Test Groups

| Test group | Command | Purpose |
| --- | --- | --- |
| Unit | `npm test` in `code/api` | Tests isolated functions (e.g. `tests/errors.test.ts`) |
| Integration | `npm test` in `code/api` (`tests/admin-auth.test.ts`); `make test` in `code/db` | Admin login against a real database; pgTAP tests of the schema, views, triggers and `available_slots()` |
| System/end-to-end | `[Enter command]` | Tests complete user workflows |
| Coverage or quality | `npm run test:coverage`, `npm run lint`, `npm run typecheck` in `code/api`; `npm run lint`, `npm run format:check` in `code/frontend` | Produces coverage or static quality results |

## Test Environment and Data

API tests set their own environment variables (`code/api/vitest.config.ts`) and expect the dev database at `localhost:5432` with the credentials from `code/db/docker-compose.yml`. `tests/admin-auth.test.ts` is skipped if the database or migrations are missing, and **it deletes all admin users, sessions and login attempts**, so run `npm run admin:create` again afterwards. `make test` builds its own temporary database and leaves the dev database untouched. [Explain fixtures and cleanup for manual test cases.]

## Evidence

| Evidence | Location | Notes |
| --- | --- | --- |
| Manual case results | `test-cases.md` | [Enter test cycle/date] |
| Automated result summary | `../documentation/04-testing-report.md` | [Enter version/commit] |
| Screenshots/curated log excerpts | `evidence/[relative/path]` | [Save useful, non-sensitive excerpts as image, Markdown, or `.txt` files] |

## Testing Checklist

- [ ] Every requirement maps to one or more tests.
- [ ] Tests include normal, boundary, invalid, and failure behavior.
- [ ] Expected outcomes are specific and verifiable.
- [ ] Tests are repeatable and independent where practical.
- [ ] Failed tests and known defects are not hidden.
- [ ] Test commands work from a fresh repository copy.
