# API Contract — Nail Salon Appointment Scheduler

**Status:** Locked
**Version:** 1.0
**Base URL (dev):** `http://localhost:3001`
**Base URL (prod):** Render public URL, reached through the frontend's `/api/*` rewrite (set via `API_URL` on the frontend)

---

## Global conventions

- **Content type:** `application/json` for all request and response bodies.
- **No account required** on public endpoints (`/api/services`, `/api/availability`, `/api/appointments*`, `/api/travel-fee/*`).
- **Admin endpoints** (`/api/admin/*`) require a valid session cookie set by `POST /api/admin/login`.
- **Request IDs:** every response carries `x-request-id`. Clients may send one; the server will echo it. Include it in any bug report.
- **Timestamps** are ISO-8601 UTC (`2025-11-08T15:00:00.000Z`). The API *does not* convert to local time; the frontend does.
- **Money** is integer **cents** everywhere (`3500` = $35.00). No floats.
- **Dates** are ISO local calendar dates (`2030-01-15`). Times sent to `/api/availability` are derived server-side.

## Error model (stable — codes are frozen)

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "This time slot is no longer available.",
    "details": null,
    "requestId": "…"
  }
}
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_INPUT` | Malformed or logically invalid input (e.g., past time). |
| 401 | `UNAUTHORIZED` | Admin route, no session, or bad credentials. |
| 403 | `FORBIDDEN` | Admin session exists but account is inactive. |
| 404 | `NOT_FOUND` | Unknown resource or token. |
| 409 | `SLOT_TAKEN` | The requested start time was booked between availability check and insert. |
| 409 | `CONFLICT` | Generic conflict (non-overlap 23P01). |
| 409 | `DUPLICATE` | UNIQUE violation (e.g., duplicate service name). |
| 409 | `FK_IN_USE` | DELETE blocked by an FK RESTRICT. |
| 422 | `VALIDATION_FAILED` | Zod / CHECK constraint rejection. `details` lists field paths. |
| 422 | `OUT_OF_RANGE` | At-home address beyond `max_travel_distance_miles`. |
| 422 | `PAST_DEADLINE` | Cancellation past `cancellation_deadline_hours`. |
| 422 | `ALREADY_CANCELLED` | Cancel called on an already-cancelled appointment. |
| 429 | `RATE_LIMITED` | Too many failed admin logins for this email (5) or IP address (20) in 15 minutes; or more than 10 booking attempts (or 120 service/availability reads per minute) from one IP address. |
| 500 | `INTERNAL` | Unhandled server error. Do not retry blindly. |

---

## Public endpoints

### `GET /health`

Infra health. **No auth.** Never returns 5xx for business errors; only 503 when the DB is unreachable.

**200 OK**
```json
{ "status": "ok", "db": "ok", "version": "PostgreSQL 17.11 …", "timestamp": "2025-11-08T15:00:00.000Z" }
```

**503 Service Unavailable**
```json
{ "status": "degraded", "db": "error", "version": null, "timestamp": "…" }
```

### `GET /api/settings/public`

Only public-safe fields from `salon_settings`.

**200 OK**
```json
{
  "salonName": "Nails By Jensine",
  "baseAddress": "…Aurora, CO…",
  "timezone": "America/Denver",
  "maxTravelDistanceMiles": 20,
  "cancellationDeadlineHours": 24,
  "slotIntervalMinutes": 30
}
```

### `GET /api/services`

Uses the `active_services` view.

**200 OK**
```json
{
  "services": [
    { "id": 1, "name": "Classic Manicure", "description": "…", "priceCents": 3500, "durationMinutes": 45, "sortOrder": 10 }
  ]
}
```

### `GET /api/availability?date=YYYY-MM-DD&serviceId=N`

Calls `available_slots(date, duration, interval)`.

**200 OK**
```json
{
  "date": "2030-01-15",
  "serviceId": 1,
  "slots": [ { "start": "2030-01-15T16:00:00.000Z", "end": "2030-01-15T16:45:00.000Z" } ]
}
```

**400 `BAD_INPUT`** if `date` is malformed or in the past.

### `POST /api/travel-fee/quote`

Client sends an address; server geocodes and returns a fee. The client **must not** submit its own fee to `/api/appointments` — the booking endpoint re-quotes internally.

**Request**
```json
{ "address": "1600 Broadway, Denver, CO" }
```

**200 OK**
```json
{ "inRange": true, "distanceMiles": 8.3, "feeCents": 1000, "ruleId": 2 }
```

**422 `OUT_OF_RANGE`** if the address is beyond `max_travel_distance_miles`.
**400 `BAD_INPUT`** if the address is empty or un-geocodable.

### `POST /api/appointments`

**Request**
```json
{
  "serviceId": 1,
  "isCustomRequest": false,
  "customRequestDescription": null,
  "appointmentType": "in_salon",
  "serviceAddress": null,
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "customerPhone": "3035550100",
  "startTime": "2030-01-15T17:00:00.000Z"
}
```

Rules (all enforced server-side, mirrored by DB CHECKs):
- `appointmentType` ∈ `in_salon | at_home`.
- `at_home` requires `serviceAddress`; `in_salon` forbids it.
- Either `serviceId` OR (`isCustomRequest: true` AND `customRequestDescription` non-empty).
- `startTime` must be in the future.
- `travel_fee_cents`, `travel_fee_rule_id`, and `distance_miles` are **server-computed** for `at_home` and ignored if sent.

**201 Created**
```json
{
  "id": "5f3e…-…-…",
  "cancellationToken": "…uuid…",
  "startTime": "2030-01-15T17:00:00.000Z",
  "endTime":   "2030-01-15T17:45:00.000Z",
  "servicePriceCents": 3500,
  "travelFeeCents": 0,
  "totalCents": 3500
}
```

**409 `SLOT_TAKEN`** — the time was taken between availability fetch and insert.

### `GET /api/appointments/cancel/:token`

Lookup-only. Never mutates. Used by the confirmation page to display the appointment before the user confirms cancellation.

**200 OK**
```json
{
  "cancellable": true,
  "reason": null,
  "appointment": { "id": "…", "startTime": "…", "endTime": "…", "serviceName": "…", "status": "booked" }
}
```

**404 `NOT_FOUND`** if the token is unknown.
If not cancellable, `cancellable: false` and `reason` is one of `PAST_DEADLINE`, `ALREADY_CANCELLED`, `IN_THE_PAST` — HTTP 200 either way.

### `POST /api/appointments/cancel/:token`

Calls `cancel_appointment(token, 'customer')`.

**200 OK** — same body as `GET`, plus `appointment.status = "cancelled"`.

**404 `NOT_FOUND`**, **422 `PAST_DEADLINE`**, **422 `ALREADY_CANCELLED`**.

---

## Admin endpoints

All require a valid session cookie. Missing/invalid → `401 UNAUTHORIZED`. Inactive account → `403 FORBIDDEN`. All state-changing routes (`POST`, `PATCH`, `DELETE`) require the CSRF header `x-csrf-token` matching the value issued at login.

### `POST /api/admin/login`

**Request**
```json
{ "email": "owner@example.com", "password": "…" }
```

**200 OK** + `Set-Cookie: session=…; HttpOnly; SameSite=Lax; Path=/` (+ `Secure` in production)
```json
{ "admin": { "id": 1, "email": "owner@example.com", "fullName": "…" }, "csrfToken": "…" }
```
The client sends `csrfToken` back as the `x-csrf-token` header on every admin `POST`/`PATCH`/`DELETE`. A new session id is issued on every login. Sessions last 24 hours.

*(Changed from v1.0, which said `204 No Content` while also returning a JSON body. A 204 response cannot carry a body, so login returns 200.)*

**401 `UNAUTHORIZED`** for a wrong password, unknown email, or inactive account (one message for all, so the response never reveals which emails have accounts).
**422 `VALIDATION_FAILED`** if the body is missing or not JSON.
**429 `RATE_LIMITED`** after 5 failed attempts for the email (or 20 from one IP) in 15 minutes. A successful login resets the email's count.

### `POST /api/admin/logout`

Send `x-csrf-token`. **204 No Content**. Deletes the session row and clears the cookie.
Not signed in → still `204`. Signed in but missing/wrong CSRF token → **403 `FORBIDDEN`** (so another website cannot sign the owner out).

### `GET /api/admin/session`

*(Added.)* Who is signed in, plus the CSRF token again so a reloaded page can keep making changes.

**200 OK** `{ "admin": { "id": 1, "email": "…", "fullName": "…" }, "csrfToken": "…" }`
**401 `UNAUTHORIZED`** not signed in or session expired. **403 `FORBIDDEN`** account inactive.

### `GET /api/admin/appointments?from=&to=&status=`

`from`/`to` are inclusive dates (`YYYY-MM-DD`) in the salon's time zone; they default to today and today + 30 days, and may span at most 366 days. `status` is `booked` (default), `cancelled`, `completed`, `no_show` or `all`. Results are ordered by start time (at most 500). The response never includes `cancellation_token`.

**422 `VALIDATION_FAILED`** for an invalid date, `from` after `to`, a range over 366 days, or an unknown `status`. **401 / 403** as for every admin route.

**200 OK**
```json
{
  "from": "2026-11-16", "to": "2026-12-16", "status": "booked",
  "appointments": [
    { "id": "…", "startTime": "…", "endTime": "…", "status": "booked",
      "customerName": "…", "customerEmail": "…", "customerPhone": "…",
      "appointmentType": "at_home", "serviceName": "Gel Manicure",
      "isCustomRequest": false, "customRequestDescription": null,
      "serviceAddress": "123 Main St",
      "servicePriceCents": 5000, "travelFeeCents": 1000,
      "travelFeeRuleName": "Nearby (5–10 mi)", "adminNotes": null }
  ]
}
```

### `PATCH /api/admin/appointments/:id`

**Request** `{ "adminNotes"?: string, "status"?: "cancelled" }`
Only these two fields are mutable. `status: "cancelled"` requires no `cancelled_at`/`cancelled_by` in the body — the server fills them via `cancel_appointment(id, 'admin')`.

### `GET | POST | PATCH | DELETE /api/admin/services[/:id]`

- `POST` body: `{ name, description?, priceCents, durationMinutes, sortOrder? }`
- `PATCH` body: same fields, all optional.
- `DELETE` = soft delete (`is_active = false`), always succeeds.
- Attempting to `POST` a duplicate name → `409 DUPLICATE`.

### `GET | POST | DELETE /api/admin/availability/defaults[/:id]`

`POST` body: `{ dayOfWeek, startTime, endTime }` (times `HH:MM`).
`DELETE` is hard delete. Attempting a duplicate → `409 DUPLICATE`.

### `GET | POST | DELETE /api/admin/availability/overrides[/:id]`

`POST` body: `{ overrideDate, mode: "block"|"add", startTime?, endTime?, reason? }`.
Rules: `mode: "block"` with no times = full-day block; `mode: "add"` requires times. Mirrors `availability_overrides` CHECKs.

### `GET | POST | PATCH | DELETE /api/admin/travel-fee-rules[/:id]`

`POST` body: `{ name, feeCents, minDistanceMiles, maxDistanceMiles? }`.

### `GET | PATCH /api/admin/settings`

`PATCH` body: any subset of `{ salonName, baseAddress, timezone, maxTravelDistanceMiles, cancellationDeadlineHours, slotIntervalMinutes }`.

---

## Pagination & limits

None. The salon has one technician; endpoints return the full (small) result set. If `appointments` ever needs paging, add `?limit=&offset=` later without breaking the shape.

## Versioning

The path prefix `/api` is the version boundary. If a breaking change is ever needed, mount `/api/v2` in a new branch — never mutate `/api` semantics.