// Security tests for the public booking routes (NFR-03, NFR-04).
//   - rate limits (a script can't fill the calendar)
//   - size and format limits on name, email and phone
//   - a website booking reaches the owner's list, without the cancellation token
//
// Needs the dev database (make dev-setup in code/db); skipped otherwise.
// Books times in the next few weeks with @security-test.example emails and
// deletes them afterwards. Like admin-auth.test.ts, it replaces the owner
// account, so run `npm run admin:create` again after testing.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { closePool, pool } from "../src/db/pool";
import { hashPassword } from "../src/auth/password";
import { bookingLimiter, readLimiter } from "../src/routes/public";

const DOMAIN = "@security-test.example";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PASSWORD = "correct-horse-battery";

const dbReady = await pool
  .query("SELECT 1 FROM appointments, services, session LIMIT 0")
  .then(
    () => true,
    () => false,
  );

const app = createApp();

async function removeTestBookings() {
  await pool.query(
    "DELETE FROM appointments WHERE customer_email::text LIKE $1",
    [`%${DOMAIN}`],
  );
}

afterAll(async () => {
  if (dbReady) await removeTestBookings();
  await closePool();
});

// yyyy-mm-dd for the first given weekday (0 = Sunday) at least `minDays` out
function nextDay(weekday: number, minDays: number): string {
  for (let n = minDays; ; n++) {
    const d = new Date(Date.now() + n * 86_400_000);
    if (d.getUTCDay() === weekday) return d.toISOString().slice(0, 10);
  }
}

async function openSlots(date: string): Promise<string[]> {
  const res = await request(app).get(
    `/api/availability?date=${date}&serviceId=1`,
  );
  expect(res.status).toBe(200);
  return res.body.slots.map((s: { start: string }) => s.start);
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: 1,
    appointmentType: "in_salon",
    customerName: "Jane Doe",
    customerEmail: `jane${DOMAIN}`,
    customerPhone: "3035550100",
    startTime: "2000-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function book(b: Record<string, unknown>) {
  return request(app).post("/api/appointments").send(b);
}

async function countTestBookings(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    "SELECT count(*) AS n FROM appointments WHERE customer_email::text LIKE $1",
    [`%${DOMAIN}`],
  );
  return Number(rows[0]?.n ?? 0);
}

describe.skipIf(!dbReady)("public booking security (needs database)", () => {
  beforeEach(async () => {
    bookingLimiter.reset();
    readLimiter.reset();
    await removeTestBookings();
  });

  describe("SEC-01 input limits on POST /api/appointments", () => {
    it.each([
      [
        "a 101-character name",
        { customerName: "A".repeat(101) },
        "customerName",
      ],
      [
        "a name with HTML",
        { customerName: "<script>x</script>" },
        "customerName",
      ],
      ["a name with digits", { customerName: "Jane 123" }, "customerName"],
      [
        "an email over 254 characters",
        { customerEmail: `${"a".repeat(250)}${DOMAIN}` },
        "customerEmail",
      ],
      [
        "a phone with letters",
        { customerPhone: "not a phone" },
        "customerPhone",
      ],
      ["a phone with 7 digits", { customerPhone: "555-0100" }, "customerPhone"],
      [
        "a phone over 20 characters",
        { customerPhone: "3".repeat(21) },
        "customerPhone",
      ],
    ])("rejects %s with 422 and saves nothing", async (_label, bad, field) => {
      const [slot] = await openSlots(nextDay(3, 3));
      const res = await book(body({ startTime: slot, ...bad }));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.details).toContain(field);
      expect(await countTestBookings()).toBe(0);
    });

    it("accepts common phone formats and stores 10 digits", async () => {
      const slots = await openSlots(nextDay(4, 3));
      const formats = ["(303) 555-0100", "303.555.0100", "+1 303 555 0100"];
      for (const [i, phone] of formats.entries()) {
        // every other slot, so 45-minute bookings don't overlap
        const res = await book(
          body({
            startTime: slots[i * 2],
            customerPhone: phone,
            customerEmail: `phone${i}${DOMAIN}`,
          }),
        );
        expect(res.status, phone).toBe(201);
        const { rows } = await pool.query<{ customer_phone: string }>(
          "SELECT customer_phone FROM appointments WHERE id = $1",
          [res.body.id],
        );
        expect(rows[0]?.customer_phone).toBe("3035550100");
      }
    });

    it("error responses never echo the customer's email or phone", async () => {
      const res = await book(
        body({ customerName: "", customerPhone: "303-555-0177" }),
      );
      expect(res.status).toBe(422);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(DOMAIN);
      expect(text).not.toContain("0177");
    });
  });

  describe("SEC-02 rate limits", () => {
    it("the 11th booking attempt from one IP in 15 minutes gives 429", async () => {
      // Invalid bodies still count, so nothing is saved while testing this.
      for (let i = 0; i < 10; i++) {
        const res = await book(body({ customerName: "" }));
        expect(res.status).toBe(422);
      }
      const res = await book(body({ customerName: "" }));
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("RATE_LIMITED");
      expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    });

    it("a script can no longer book a whole day", async () => {
      const slots = await openSlots(nextDay(5, 3));
      let saved = 0;
      for (const [i, start] of slots.entries()) {
        const res = await book(
          body({ startTime: start, customerEmail: `bot${i}${DOMAIN}` }),
        );
        if (res.status === 201) saved++;
        if (res.status === 429) break;
      }
      expect(saved).toBeLessThanOrEqual(10);
      expect(await openSlots(nextDay(5, 3))).not.toHaveLength(0);
    });

    it("the 121st read in one minute gives 429", async () => {
      for (let i = 0; i < 120; i++) {
        const res = await request(app).get("/api/services");
        expect(res.status).toBe(200);
      }
      const res = await request(app).get("/api/services");
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("RATE_LIMITED");
    });
  });

  describe("SEC-03 a website booking reaches the owner's list", () => {
    beforeAll(async () => {
      const hash = await hashPassword(OWNER_PASSWORD);
      await pool.query("DELETE FROM admin_users WHERE email = $1", [
        OWNER_EMAIL,
      ]);
      await pool.query(
        `INSERT INTO admin_users (email, password_hash, full_name)
         VALUES ($1, $2, 'Salon Owner')`,
        [OWNER_EMAIL, hash],
      );
      await pool.query("DELETE FROM admin_login_attempts");
    });

    it("shows the booking with the customer's details but no cancellation token", async () => {
      const day = nextDay(2, 3);
      const [start] = await openSlots(day);
      const made = await book(
        body({ startTime: start, customerPhone: "(303) 555-0100" }),
      );
      expect(made.status).toBe(201);

      const agent = request.agent(app);
      const login = await agent
        .post("/api/admin/login")
        .send({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
      expect(login.status).toBe(200);

      const res = await agent
        .get("/api/admin/appointments")
        .query({ from: day, to: day });
      expect(res.status).toBe(200);
      const found = res.body.appointments.find(
        (a: { id: string }) => a.id === made.body.id,
      );
      expect(found).toMatchObject({
        startTime: start,
        status: "booked",
        customerName: "Jane Doe",
        customerEmail: `jane${DOMAIN}`,
        customerPhone: "3035550100",
        serviceName: "Classic Manicure",
      });
      expect(found.cancellationToken).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(
        made.body.cancellationToken,
      );
    });
  });
});
