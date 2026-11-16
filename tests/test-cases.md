# Test Cases and Execution Record

Use this file for manual cases and as an index for automated tests. Give each case a stable ID and link it to one or more requirements.

## Test Cycle

| Field | Value |
| --- | --- |
| Project | [Enter project name] |
| Build/version/commit | [Enter identifier] |
| Environment | [Enter operating system, runtime, browser/device, and relevant configuration] |
| Test date(s) | [YYYY-MM-DD] |
| Tester(s) | [Enter names] |

## Detailed Test Cases

Copy this subsection for each case.

### TC-01: Admin login with correct credentials

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-09, NFR-03 |
| Test type | System |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed out |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password) |

**Steps:**

1. Open `http://localhost:3000/admin/login`.
2. Enter the test admin's email (try mixed case, e.g. `Owner@Example.com`) and correct password.
3. Click **Sign in**.

**Expected result:** The browser goes to `/admin` and shows "Signed in as" with the admin's name.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-02: Login rejected with wrong password or unknown email

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-09, NFR-03 |
| Test type | System |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed out |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password); wrong password `wrong-password-123`; unknown email `nobody@example.com` |

**Steps:**

1. Sign in with the correct email and a wrong password.
2. Sign in with an unknown email and any password.
3. Compare the two error messages.

**Expected result:** Both attempts stay on the login page and show the same message, "Invalid email or password.", so the page does not reveal which emails have accounts. The typed email stays in the form.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-03: Admin page blocked when not signed in

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-09, NFR-03 |
| Test type | System |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; no session cookie (private/incognito window) |
| Test data | None |

**Steps:**

1. Open `http://localhost:3000/admin` directly.

**Expected result:** The browser is redirected to `/admin/login`; no admin content is shown.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-04: Admin page blocked with a fake session cookie

| Field | Details |
| --- | --- |
| Related requirement(s) | NFR-03 |
| Test type | Security |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed out |
| Test data | Cookie `session` set to `fake-token` |

**Steps:**

1. In browser DevTools > Application > Cookies, add a cookie named `session` with value `fake-token` for localhost.
2. Open `http://localhost:3000/admin`.

**Expected result:** The browser is redirected to `/admin/login`. A cookie value that does not match a stored session is not accepted.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-05: Sign out ends the session

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-09, NFR-03 |
| Test type | System |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed in |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password) |

**Steps:**

1. While signed in, copy the `session` cookie value from DevTools.
2. Click **Sign out**.
3. Add the copied cookie back in DevTools and open `/admin`.

**Expected result:** Sign out returns to `/admin/login`. Re-using the old cookie value also redirects to the login page, because the session row was deleted from the `session` table.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-06: Expired session is rejected

| Field | Details |
| --- | --- |
| Related requirement(s) | NFR-03 |
| Test type | Integration |
| Priority | Medium |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed in |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password) |

**Steps:**

1. While signed in, run in psql: `UPDATE session SET expire = now() - interval '1 minute';`
2. Reload `/admin`.

**Expected result:** The browser is redirected to `/admin/login`.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-07: Account locked after 5 failed logins

| Field | Details |
| --- | --- |
| Related requirement(s) | NFR-03 |
| Test type | Security |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; `admin_login_attempts` table empty |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password) |

**Steps:**

1. Sign in with the correct email and a wrong password 5 times.
2. Sign in a 6th time with the **correct** password.
3. In psql run: `UPDATE admin_login_attempts SET attempted_at = attempted_at - interval '16 minutes';` (simulates waiting 15 minutes).
4. Sign in again with the correct password.

**Expected result:** Step 2 shows "Too many failed attempts. Please wait 15 minutes and try again." and does not sign in. Step 4 signs in successfully.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-08: Session cookie and stored token are protected

| Field | Details |
| --- | --- |
| Related requirement(s) | NFR-03 |
| Test type | Security |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (includes migration `0004_admin_auth.sql`); test admin created with `npm run admin:create` in `code/api`; API (`npm run dev` in `code/api`) and website (`npm run dev` in `code/frontend`) both running; signed in |
| Test data | Test admin `owner@example.com` / a test password of 12+ characters (not a real password) |

**Steps:**

1. In DevTools, inspect the session cookie's flags.
2. In psql run: `SELECT sid, sess FROM session;` and compare with the cookie value.
3. View the page source of `/admin` and search for `$argon2`.

**Expected result:** The `session` cookie is HttpOnly and SameSite=Lax (and Secure in production). The cookie value is the session id signed with `SESSION_SECRET`, so it differs from the `sid` stored in the database, and a copy of the table alone cannot be turned into a working cookie. The `sess` column holds no password or password hash.

**Actual result:** [Record what happened during execution.]

**Status:** Not run

**Evidence:** [Screenshot in `evidence/`, or log reference.]

**Notes/defect:** [Enter defect ID and details, or None.]

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| [YYYY-MM-DD] | [Identifier] | [Name] | [Pass/Fail/Blocked] | [Reference] |

---

### TC-09: Service list shows active services with prices

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-02 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | The 5 seeded services in `code/db/seeds/baseline.sql` |

**Steps:**

1. Run `curl -s http://localhost:3001/api/services`.

**Expected result:** 200 with a `services` list. Each service has `id`, `name`, `description`, `priceCents`, `durationMinutes` and `sortOrder`, in `sortOrder` order.

**Actual result:** Returned the 5 seeded services in order, starting with Classic Manicure (3500 cents, 45 minutes). Automated test AT-11 also passed.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`GET /api/services`)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-10: Open time slots are returned for a working day

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-05 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | Date `2026-11-18` (a Wednesday, open 9:00 to 17:00 salon time); service 1 (Classic Manicure, 45 minutes) |

**Steps:**

1. Run `curl -s "http://localhost:3001/api/availability?date=2026-11-18&serviceId=1"`.

**Expected result:** 200 with the same `date` and `serviceId` and a list of `slots`. Each slot has a UTC `start` and `end` 45 minutes apart, inside the salon's hours.

**Actual result:** Returned 45-minute slots every 30 minutes, the first from `2026-11-18T16:00:00.000Z` to `2026-11-18T16:45:00.000Z` (9:00 AM in Denver). Automated test AT-12 also passed.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`GET /api/availability` › returns open slots for a working day)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-11: No slots are offered more than 30 days ahead

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-05 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | A date 40 days after today; service 1 |

**Steps:**

1. Request `/api/availability` with a date 40 days from today and `serviceId=1`.

**Expected result:** 200 with an empty `slots` list.

**Actual result:** The automated test got 200 with `slots: []`.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`GET /api/availability` › returns no slots more than 30 days ahead)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-12: Availability rejects a bad date, a past date and an unknown service

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-05 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | `date=tomorrow`; `date=2020-01-01`; `serviceId=999999` |

**Steps:**

1. Request `/api/availability?date=tomorrow&serviceId=1`.
2. Request `/api/availability?date=2020-01-01&serviceId=1`.
3. Request `/api/availability` with a date 3 days from today and `serviceId=999999`.

**Expected result:** Steps 1 and 2 return 400 with error code `BAD_INPUT`. Step 3 returns 404 with error code `NOT_FOUND`.

**Actual result:** The automated tests got 400 `BAD_INPUT` for the bad date and the past date, and 404 `NOT_FOUND` for the unknown service.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`GET /api/availability` › the three reject/404 tests)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-13: A client can book an open slot without an account

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-06, FR-14 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | Service 1; the last open slot on the next Wednesday; customer `Test Customer`, `test@example.com`, `3035550100` |

**Steps:**

1. Get the open slots from `/api/availability` and pick one `start` time.
2. Send `POST /api/appointments` with `serviceId`, `appointmentType: "in_salon"`, the customer name, email and phone, and that `startTime`.

**Expected result:** 201 with `id`, `cancellationToken`, `startTime`, `endTime`, `servicePriceCents`, `travelFeeCents` and `totalCents`. No login and no payment step.

**Actual result:** The automated test got 201. `startTime` matched the chosen slot, `totalCents` was 3500 and a cancellation token was returned.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`POST /api/appointments` › books an open slot and blocks a second booking)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-14: The same slot cannot be booked twice

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-13, NFR-04 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | The slot booked in TC-13 |

**Steps:**

1. Send the same `POST /api/appointments` request from TC-13 again.

**Expected result:** 409 with error code `SLOT_TAKEN`. The first booking is unchanged.

**Actual result:** The automated test got 409 `SLOT_TAKEN` on the second request.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`POST /api/appointments` › books an open slot and blocks a second booking)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

### TC-15: Booking rejects missing details and past times

| Field | Details |
| --- | --- |
| Related requirement(s) | FR-06 |
| Test type | Integration (API and database) |
| Priority | High |
| Preconditions | Database set up with `make dev-setup` in `code/db` (migrations through `0007_appointment_functions.sql`, seed data loaded); API running (`npm run dev` in `code/api`) |
| Test data | A valid booking body with `customerName: ""`; a valid body with `startTime: "2020-01-01T17:00:00.000Z"` |

**Steps:**

1. Send `POST /api/appointments` with a blank customer name.
2. Send `POST /api/appointments` with a start time in the past.

**Expected result:** Step 1 returns 422 `VALIDATION_FAILED` and `details` names `customerName`. Step 2 returns 400 `BAD_INPUT`. No appointment is created.

**Actual result:** The automated tests got 422 `VALIDATION_FAILED` with `customerName` in `details`, and 400 `BAD_INPUT` for the past time.

**Status:** Pass

**Evidence:** `evidence/api-vitest-run-2026-11-15.txt` (`POST /api/appointments` › the two reject tests)

**Notes/defect:** None.

**Execution history:**

| Run date | Build/commit | Tester | Result | Evidence/defect |
| --- | --- | --- | --- | --- |
| 2026-11-15 | `4358fd3` | Sohrab Sanjideh | Pass | `evidence/api-vitest-run-2026-11-15.txt` |

---

## Automated Test Index

Run from `code/api` with the dev database up (`make dev-setup` in `code/db`): `npm test`.
Without a database, the admin-auth file is skipped instead of failing.

| Test ID/name | File and test name | Related requirement(s) | What it verifies |
| --- | --- | --- | --- |
| AT-01 | `code/api/tests/admin-auth.test.ts` › AT-01 login with correct credentials | FR-09 | Login returns the admin and a CSRF token, sets the cookie; email is case-insensitive; `/api/admin/session` works; passwords stored as argon2id (TC-01) |
| AT-02 | › AT-02 login rejected | FR-09, NFR-03 | Wrong password and unknown email give the same 401; empty body 422; inactive account 401; HTML form posts rejected (TC-02) |
| AT-03/04 | › AT-03 / AT-04 admin routes blocked | FR-09, NFR-03 | No cookie, made-up cookie, or cookie signed with the wrong secret gives 401; deactivated account gives 403 (TC-03, TC-04) |
| AT-05 | › AT-05 sign out ends the session | FR-09 | Logout deletes the session row and the old cookie stops working (TC-05) |
| AT-06 | › AT-06 expired session is rejected | FR-09 | Expired session gives 401; sessions last 24 hours (TC-06) |
| AT-07 | › AT-07 lockout after 5 failed logins | NFR-03 | 6th attempt refused with 429; case-insensitive; resets on success; ends after 15 min; **bursts of 30 simultaneous guesses never get more than 5 password checks** (TC-07) |
| AT-08 | › AT-08 cookie and stored session are protected | NFR-03 | HttpOnly, SameSite=Lax, Path=/; cookie signed with SESSION_SECRET; new session id at login (no session fixation); no hash in responses; `Cache-Control: no-store` (TC-08) |
| AT-09 | › AT-09 CSRF protection on changes | NFR-03 | Logout without or with a wrong `x-csrf-token` is refused and the session survives |
| AT-10 | › AT-10 requireAdmin guard | FR-09, NFR-03 | A stand-in admin route returns 401 when signed out, 403 without CSRF on POST, and gets `req.admin` when signed in |
| AT-11 | `code/api/tests/public.test.ts` › GET /api/services | FR-02 | The service list returns the active services with price and duration (TC-09) |
| AT-12 | › GET /api/availability | FR-05 | Open slots for a working day; none more than 30 days ahead; bad or past date gives 400; unknown service gives 404 (TC-10 to TC-12) |
| AT-13 | › POST /api/appointments | FR-06, FR-13, NFR-04 | Booking returns 201 with a confirmation; a second booking of the same time gives 409 `SLOT_TAKEN`; blank name gives 422; past time gives 400 (TC-13 to TC-15) |
| AT-14 | `code/api/tests/admin-appointments.test.ts` | FR-12, NFR-03 | Owner's appointment list: 401 signed out, 403 deactivated; booked appointments in range ordered by time; status filter (booked/cancelled/all); salon time zone for dates; defaults to today + 30 days; 422 for bad dates, ranges, statuses and SQL-like input; never returns the cancellation token; `Cache-Control: no-store` |
| AT-15 | `code/api/tests/public-security.test.ts` | NFR-03, NFR-04 | Booking security: name over 100 characters, HTML or digits, email over 254 characters, and bad phones give 422 and save nothing; common phone formats stored as 10 digits; errors never echo email or phone; 11th booking attempt per IP in 15 min and 121st read per minute give 429 `RATE_LIMITED`; a script can't book a whole day; a website booking shows on the owner's list without the cancellation token |

## Execution Summary

| Status | Count |
| --- | ---: |
| Pass | [Number] |
| Fail | [Number] |
| Blocked | [Number] |
| Not run | [Number] |
| **Total** | [Number] |

**Summary and next actions:** [Explain failures, retesting, and remaining risks. Transfer final conclusions to `../documentation/04-testing-report.md`.]
