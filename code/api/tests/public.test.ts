import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/db/pool";

// needs the dev database running (make dev-setup in code/db)
describe("GET /api/services", () => {
  it("returns the active services", async () => {
    const res = await request(createApp()).get("/api/services");
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBeGreaterThan(0);
    expect(res.body.services[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      priceCents: expect.any(Number),
      durationMinutes: expect.any(Number),
    });
  });
});

// yyyy-mm-dd for a day some number of days from now
function dayFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// next wednesday at least two days out (the salon is open wednesdays)
function nextWednesday(): string {
  let n = 2;
  while (new Date(dayFromNow(n)).getUTCDay() !== 3) n++;
  return dayFromNow(n);
}

describe("GET /api/availability", () => {
  const app = createApp();

  it("returns open slots for a working day", async () => {
    const date = nextWednesday();
    const res = await request(app).get(
      `/api/availability?date=${date}&serviceId=1`,
    );
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(date);
    expect(res.body.slots.length).toBeGreaterThan(0);
    const first = res.body.slots[0];
    expect(new Date(first.end) > new Date(first.start)).toBe(true);
  });

  it("returns no slots more than 30 days ahead", async () => {
    const res = await request(app).get(
      `/api/availability?date=${dayFromNow(40)}&serviceId=1`,
    );
    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([]);
  });

  it("rejects a date that is not yyyy-mm-dd", async () => {
    const res = await request(app).get(
      "/api/availability?date=tomorrow&serviceId=1",
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_INPUT");
  });

  it("rejects a past date", async () => {
    const res = await request(app).get(
      "/api/availability?date=2020-01-01&serviceId=1",
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_INPUT");
  });

  it("returns 404 for a service that does not exist", async () => {
    const res = await request(app).get(
      `/api/availability?date=${dayFromNow(3)}&serviceId=999999`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/appointments", () => {
  const app = createApp();
  const booked: string[] = [];

  // remove the test bookings so the slots open up again
  afterAll(async () => {
    await pool.query("DELETE FROM appointments WHERE id = ANY($1::uuid[])", [
      booked,
    ]);
  });

  async function lastOpenSlot(): Promise<string> {
    const res = await request(app).get(
      `/api/availability?date=${nextWednesday()}&serviceId=1`,
    );
    return res.body.slots[res.body.slots.length - 1].start;
  }

  function body(startTime: string) {
    return {
      serviceId: 1,
      appointmentType: "in_salon",
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "3035550100",
      startTime,
    };
  }

  it("books an open slot and blocks a second booking", async () => {
    const startTime = await lastOpenSlot();

    const first = await request(app)
      .post("/api/appointments")
      .send(body(startTime));
    expect(first.status).toBe(201);
    booked.push(first.body.id);
    expect(first.body.startTime).toBe(startTime);
    expect(first.body.totalCents).toBe(3500);
    expect(first.body.cancellationToken).toBeTypeOf("string");

    const second = await request(app)
      .post("/api/appointments")
      .send(body(startTime));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("SLOT_TAKEN");
  });

  it("rejects a booking with no customer name", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send({ ...body(await lastOpenSlot()), customerName: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details).toContain("customerName");
  });

  it("rejects a time in the past", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send(body("2020-01-01T17:00:00.000Z"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_INPUT");
  });
});
