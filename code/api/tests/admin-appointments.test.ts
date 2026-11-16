// Integration tests for the owner's appointment list (FR-12, NFR-03).
// GET /api/admin/appointments
//
// Needs the dev database (make dev-setup in code/db); skipped otherwise.
// Uses far-future dates (2031) and @test.invalid emails, and removes its own
// rows afterwards. Like admin-auth.test.ts, it resets admin users and
// sessions, so run `npm run admin:create` again after testing.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { closePool, pool } from "../src/db/pool";
import { hashPassword } from "../src/auth/password";

const EMAIL = "owner@example.com";
const PASSWORD = "correct-horse-battery";
const URL = "/api/admin/appointments";

const dbReady = await pool
  .query("SELECT 1 FROM session, appointments, salon_settings LIMIT 0")
  .then(
    () => true,
    () => false,
  );

const app = createApp();

afterAll(async () => {
  if (dbReady) await removeTestAppointments();
  await closePool();
});

async function removeTestAppointments() {
  await pool.query(
    "DELETE FROM appointments WHERE customer_email::text LIKE '%@test.invalid'",
  );
}

/** Inserts one in-salon appointment for the first active service. */
async function addAppointment(opts: {
  start: string; // ISO time with Z
  name: string;
  status?: "booked" | "cancelled";
}): Promise<{ id: string; token: string }> {
  const { rows } = await pool.query<{ id: string; cancellation_token: string }>(
    `INSERT INTO appointments
       (service_id, appointment_type, customer_name, customer_email,
        customer_phone, service_price_cents, start_time, end_time,
        status, cancelled_at, cancelled_by)
     SELECT s.id, 'in_salon', $2, $3, '303-555-0100', s.price_cents,
            $1::timestamptz, $1::timestamptz + interval '45 minutes',
            $4::appointment_status,
            CASE WHEN $4 = 'cancelled' THEN now() END,
            CASE WHEN $4 = 'cancelled' THEN 'customer'::actor_type END
       FROM services s WHERE s.is_active ORDER BY s.id LIMIT 1
     RETURNING id, cancellation_token`,
    [
      opts.start,
      opts.name,
      `${opts.name.toLowerCase().replace(/\s+/g, ".")}@test.invalid`,
      opts.status ?? "booked",
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("No active service to book; run the seed first.");
  return { id: row.id, token: row.cancellation_token };
}

async function signedInAgent() {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/admin/login")
    .send({ email: EMAIL, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

describe.skipIf(!dbReady)("admin appointments (needs database)", () => {
  let early: { id: string; token: string };
  let late: { id: string; token: string };
  let cancelled: { id: string; token: string };
  let lateEvening: { id: string; token: string };

  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD);
    await removeTestAppointments();
    await pool.query("DELETE FROM admin_login_attempts");
    await pool.query("DELETE FROM session");
    await pool.query("DELETE FROM admin_users");
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, full_name)
       VALUES ($1, $2, 'Salon Owner')`,
      [EMAIL, hash],
    );
    // The salon's time zone is America/Denver (UTC-6 on these dates).
    late = await addAppointment({
      start: "2031-03-10T20:00:00Z",
      name: "Late Customer",
    });
    early = await addAppointment({
      start: "2031-03-10T16:00:00Z",
      name: "Early Customer",
    });
    cancelled = await addAppointment({
      start: "2031-03-10T18:00:00Z",
      name: "Cancelled Customer",
      status: "cancelled",
    });
    // 03:30 UTC on 12 March is 21:30 on 11 March in Denver.
    lateEvening = await addAppointment({
      start: "2031-03-12T03:30:00Z",
      name: "Evening Customer",
    });
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM admin_login_attempts");
  });

  it("is blocked when signed out (401)", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("lists booked appointments in the range, ordered by start time", async () => {
    const agent = await signedInAgent();
    const res = await agent.get(`${URL}?from=2031-03-10&to=2031-03-10`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      from: "2031-03-10",
      to: "2031-03-10",
      status: "booked",
    });
    expect(res.body.appointments.map((a: { id: string }) => a.id)).toEqual([
      early.id,
      late.id,
    ]);
    const first = res.body.appointments[0];
    expect(first).toMatchObject({
      customerName: "Early Customer",
      customerEmail: "early.customer@test.invalid",
      customerPhone: "303-555-0100",
      appointmentType: "in_salon",
      status: "booked",
      startTime: "2031-03-10T16:00:00.000Z",
      endTime: "2031-03-10T16:45:00.000Z",
      travelFeeCents: 0,
    });
    expect(typeof first.serviceName).toBe("string");
    expect(first.servicePriceCents).toBeGreaterThan(0);
  });

  it("never returns the customer's cancellation token", async () => {
    const agent = await signedInAgent();
    const res = await agent.get(
      `${URL}?from=2031-03-01&to=2031-03-31&status=all`,
    );
    expect(res.status).toBe(200);
    for (const appt of [early, late, cancelled, lateEvening]) {
      expect(res.text).not.toContain(appt.token);
    }
    expect(res.text).not.toMatch(/cancellation_?token/i);
  });

  it("filters by status: booked by default, or cancelled, or all", async () => {
    const agent = await signedInAgent();
    const ids = async (status?: string) => {
      const q = status ? `&status=${status}` : "";
      const res = await agent.get(`${URL}?from=2031-03-10&to=2031-03-10${q}`);
      expect(res.status).toBe(200);
      return res.body.appointments.map((a: { id: string }) => a.id);
    };
    expect(await ids()).not.toContain(cancelled.id);
    expect(await ids("cancelled")).toEqual([cancelled.id]);
    expect(await ids("all")).toEqual([early.id, cancelled.id, late.id]);
  });

  it("uses the salon's time zone for dates", async () => {
    const agent = await signedInAgent();
    const on11 = await agent.get(`${URL}?from=2031-03-11&to=2031-03-11`);
    const on12 = await agent.get(`${URL}?from=2031-03-12&to=2031-03-12`);
    expect(on11.body.appointments.map((a: { id: string }) => a.id)).toEqual([
      lateEvening.id,
    ]);
    expect(on12.body.appointments).toEqual([]);
  });

  it("defaults to today through 30 days ahead, in salon time", async () => {
    const agent = await signedInAgent();
    const res = await agent.get(URL);
    expect(res.status).toBe(200);
    const { rows } = await pool.query<{ today: string; plus30: string }>(
      `SELECT to_char((now() AT TIME ZONE timezone)::date, 'YYYY-MM-DD') AS today,
              to_char((now() AT TIME ZONE timezone)::date + 30, 'YYYY-MM-DD') AS plus30
         FROM salon_settings WHERE id = 1`,
    );
    expect(res.body.from).toBe(rows[0]?.today);
    expect(res.body.to).toBe(rows[0]?.plus30);
    expect(res.body.status).toBe("booked");
  });

  it.each([
    ["a date that does not exist", "from=2031-02-30"],
    ["a badly formatted date", "from=03/10/2031"],
    ["'from' after 'to'", "from=2031-03-12&to=2031-03-10"],
    ["a range longer than 366 days", "from=2031-01-01&to=2032-06-01"],
    ["an unknown status", "status=deleted"],
    ["SQL in a parameter", "status=booked'%20OR%201=1--"],
  ])("rejects %s with 422", async (_label, query) => {
    const agent = await signedInAgent();
    const res = await agent.get(`${URL}?${query}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("is never cached", async () => {
    const agent = await signedInAgent();
    const res = await agent.get(URL);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("blocks a deactivated owner (403)", async () => {
    const agent = await signedInAgent();
    await pool.query(
      "UPDATE admin_users SET is_active = FALSE WHERE email = $1",
      [EMAIL],
    );
    try {
      const res = await agent.get(URL);
      expect(res.status).toBe(403);
    } finally {
      await pool.query(
        "UPDATE admin_users SET is_active = TRUE WHERE email = $1",
        [EMAIL],
      );
    }
  });
});
