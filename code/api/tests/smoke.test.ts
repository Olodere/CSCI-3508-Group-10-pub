import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("responds with a JSON status body", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    // 200 when the dev DB is up; 503 when it is not. Both are valid
    // states for the smoke test — the point is that the wiring works.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.stringMatching(/^(ok|error)$/),
    });
    expect(res.headers["x-request-id"]).toBeTypeOf("string");
  });
});

describe("404 fallback", () => {
  it("returns a structured error for unknown routes", async () => {
    const app = createApp();
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});