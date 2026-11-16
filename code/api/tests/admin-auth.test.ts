// Integration tests for admin login (FR-09, NFR-03).
//
// These need the dev database with migrations applied (make dev-setup in
// code/db). If the database or the 0004 tables are missing, the whole file
// is SKIPPED rather than failing, so `npm test` still works without Docker.
//
// WARNING: these tests delete all admin users, sessions and login attempts.
// Run them against a dev/test database, never a real one.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import cookieSignature from "cookie-signature";
import { createApp } from "../src/app";
import { closePool, pool } from "../src/db/pool";
import { hashPassword } from "../src/auth/password";
import { env } from "../src/config";

const EMAIL = "owner@example.com";
const PASSWORD = "correct-horse-battery";

const dbReady = await pool
  .query("SELECT 1 FROM session, admin_login_attempts LIMIT 0")
  .then(
    () => true,
    () => false,
  );

const app = createApp();
let passwordHash: string;

afterAll(async () => {
  await closePool();
});

// ---------- helpers ----------

function sessionCookie(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith("session="));
}

function login(email = EMAIL, password = PASSWORD) {
  return request(app).post("/api/admin/login").send({ email, password });
}

/** Logs in with a cookie-keeping agent; returns the agent and CSRF token. */
async function signedInAgent() {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/admin/login")
    .send({ email: EMAIL, password: PASSWORD });
  expect(res.status).toBe(200);
  return { agent, csrfToken: res.body.csrfToken as string, res };
}

describe.skipIf(!dbReady)("admin auth (needs database)", () => {
  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM admin_login_attempts");
    await pool.query("DELETE FROM session");
    await pool.query("DELETE FROM admin_users");
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, full_name)
       VALUES ($1, $2, 'Salon Owner')`,
      [EMAIL, passwordHash],
    );
  });

  describe("AT-01 login with correct credentials (TC-01)", () => {
    it("returns the admin and a CSRF token, and sets the session cookie", async () => {
      const res = await login();
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.admin).sort()).toEqual([
        "email",
        "fullName",
        "id",
      ]);
      expect(res.body.admin.email).toBe(EMAIL);
      expect(res.body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(sessionCookie(res)).toBeDefined();
    });

    it("treats the email case-insensitively and trims spaces", async () => {
      expect((await login("  Owner@Example.COM ")).status).toBe(200);
    });

    it("GET /api/admin/session works with the cookie and returns the same CSRF token", async () => {
      const { agent, csrfToken } = await signedInAgent();
      const res = await agent.get("/api/admin/session");
      expect(res.status).toBe(200);
      expect(res.body.admin.fullName).toBe("Salon Owner");
      expect(res.body.csrfToken).toBe(csrfToken);
    });

    it("stores the password as argon2id", () => {
      expect(passwordHash.startsWith("$argon2id$")).toBe(true);
    });
  });

  describe("AT-02 login rejected (TC-02)", () => {
    it("wrong password and unknown email give the same 401", async () => {
      const wrong = await login(EMAIL, "not-the-password");
      const unknown = await login("nobody@example.com", PASSWORD);
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.error.code).toBe("UNAUTHORIZED");
      expect(wrong.body.error.message).toBe(unknown.body.error.message);
      expect(sessionCookie(wrong)).toBeUndefined();
    });

    it("missing fields give 422 VALIDATION_FAILED", async () => {
      const res = await request(app).post("/api/admin/login").send({});
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("an inactive account cannot log in (same 401 message)", async () => {
      await pool.query("UPDATE admin_users SET is_active = FALSE");
      const res = await login();
      expect(res.status).toBe(401);
    });

    it("a plain HTML form post (not JSON) is rejected", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .type("form")
        .send({ email: EMAIL, password: PASSWORD });
      expect(res.status).toBe(422);
      expect(sessionCookie(res)).toBeUndefined();
    });
  });

  describe("AT-03 / AT-04 admin routes blocked without a valid session (TC-03, TC-04)", () => {
    it("no cookie gives 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/admin/session");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("a made-up cookie gives 401", async () => {
      const res = await request(app)
        .get("/api/admin/session")
        .set("Cookie", "session=s%3Amade-up.invalidsignature");
      expect(res.status).toBe(401);
    });

    it("a real session id signed with the WRONG secret gives 401", async () => {
      const { res } = await signedInAgent();
      const signed = decodeURIComponent(
        sessionCookie(res)!.split(";")[0]!.split("=")[1]!,
      );
      const sid = signed.slice(2, signed.lastIndexOf("."));
      const forged =
        "s:" +
        cookieSignature.sign(sid, "attacker-guessed-secret-xxxxxxxxxxxxx");
      const attempt = await request(app)
        .get("/api/admin/session")
        .set("Cookie", `session=${encodeURIComponent(forged)}`);
      expect(attempt.status).toBe(401);
    });

    it("a deactivated account's existing session gets 403 FORBIDDEN", async () => {
      const { agent } = await signedInAgent();
      await pool.query("UPDATE admin_users SET is_active = FALSE");
      const res = await agent.get("/api/admin/session");
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("AT-05 sign out ends the session (TC-05)", () => {
    it("logout deletes the session row and the old cookie stops working", async () => {
      const { agent, csrfToken } = await signedInAgent();
      const res = await agent
        .post("/api/admin/logout")
        .set("x-csrf-token", csrfToken);
      expect(res.status).toBe(204);
      expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
      const { rows } = await pool.query(
        "SELECT count(*)::int AS n FROM session",
      );
      expect(rows[0].n).toBe(0);
      expect((await agent.get("/api/admin/session")).status).toBe(401);
    });

    it("logout when not signed in still returns 204", async () => {
      expect((await request(app).post("/api/admin/logout")).status).toBe(204);
    });
  });

  describe("AT-06 expired session is rejected (TC-06)", () => {
    it("a session past its expiry gives 401", async () => {
      const { agent } = await signedInAgent();
      await pool.query(
        "UPDATE session SET expire = now() - interval '1 minute'",
      );
      expect((await agent.get("/api/admin/session")).status).toBe(401);
    });

    it("sessions last 24 hours", async () => {
      await signedInAgent();
      const { rows } = await pool.query(
        "SELECT extract(epoch FROM expire - now())::int AS seconds FROM session",
      );
      expect(rows[0].seconds).toBeGreaterThan(24 * 3600 - 60);
      expect(rows[0].seconds).toBeLessThanOrEqual(24 * 3600 + 5);
    });
  });

  describe("AT-07 lockout after 5 failed logins (TC-07)", () => {
    it("the 6th attempt is refused with 429 even with the right password", async () => {
      for (let i = 0; i < 5; i++)
        expect((await login(EMAIL, "wrong-password")).status).toBe(401);
      const res = await login();
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("RATE_LIMITED");
      expect(sessionCookie(res)).toBeUndefined();
    });

    it("ignores upper/lower case in the email", async () => {
      for (let i = 0; i < 5; i++) await login(EMAIL, "wrong-password");
      expect((await login(EMAIL.toUpperCase())).status).toBe(429);
    });

    it("a successful login resets the failure count", async () => {
      for (let i = 0; i < 4; i++) await login(EMAIL, "wrong-password");
      expect((await login()).status).toBe(200);
      for (let i = 0; i < 4; i++) await login(EMAIL, "wrong-password");
      expect((await login()).status).toBe(200);
    });

    it("the lockout ends after 15 minutes", async () => {
      for (let i = 0; i < 5; i++) await login(EMAIL, "wrong-password");
      await pool.query(
        "UPDATE admin_login_attempts SET attempted_at = now() - interval '16 minutes'",
      );
      expect((await login()).status).toBe(200);
    });

    it("RACE FIX: bursts of simultaneous guesses never get more than 5 password checks", async () => {
      // With check-then-save, every request in a burst passed the check, so
      // all 90 guesses would be tested. Now the total must stay at 5 or fewer.
      let checked = 0;
      for (let burst = 0; burst < 3; burst++) {
        const results = await Promise.all(
          Array.from({ length: 30 }, () => login(EMAIL, "wrong-password")),
        );
        for (const r of results) {
          expect([401, 429]).toContain(r.status);
          if (r.status === 401) checked++;
        }
      }
      expect(checked).toBeLessThanOrEqual(5);
      while ((await login(EMAIL, "wrong-password")).status === 401) checked++;
      expect(checked).toBeLessThanOrEqual(5);
      expect((await login()).status).toBe(429);
    }, 60_000);
  });

  describe("AT-08 cookie and stored session are protected (TC-08)", () => {
    it("cookie is HttpOnly, SameSite=Lax, Path=/", async () => {
      const header = sessionCookie(await login())!;
      expect(header).toMatch(/HttpOnly/i);
      expect(header).toMatch(/SameSite=Lax/i);
      expect(header).toMatch(/Path=\//);
    });

    it("the cookie is signed with SESSION_SECRET; the database holds only the unsigned id", async () => {
      const { res } = await signedInAgent();
      const signed = decodeURIComponent(
        sessionCookie(res)!.split(";")[0]!.split("=")[1]!,
      );
      const sid = cookieSignature.unsign(signed.slice(2), env.SESSION_SECRET);
      expect(sid).toBeTruthy();
      const { rows } = await pool.query("SELECT sid FROM session");
      expect(rows).toHaveLength(1);
      expect(rows[0].sid).toBe(sid);
      expect(rows[0].sid).not.toBe(signed);
    });

    it("logging in issues a NEW session id (no session fixation)", async () => {
      const first = await signedInAgent();
      const before = (await pool.query("SELECT sid FROM session")).rows[0].sid;
      const again = await first.agent
        .post("/api/admin/login")
        .send({ email: EMAIL, password: PASSWORD });
      expect(again.status).toBe(200);
      const after = (await pool.query("SELECT sid FROM session")).rows.map(
        (r) => r.sid,
      );
      expect(after).not.toContain(before);
    });

    it("responses never include the password hash and are not cacheable", async () => {
      const res = await login();
      expect(JSON.stringify(res.body)).not.toContain("$argon2");
      expect(res.headers["cache-control"]).toBe("no-store");
    });

    it("the stored session row holds no password or password hash", async () => {
      await signedInAgent();
      const { rows } = await pool.query("SELECT sess FROM session");
      const text = JSON.stringify(rows[0].sess);
      expect(text).not.toContain("argon2");
      expect(text).not.toContain(PASSWORD);
    });
  });

  describe("AT-09 CSRF protection on changes", () => {
    it("logout without the CSRF token is refused and the session survives", async () => {
      const { agent } = await signedInAgent();
      const res = await agent.post("/api/admin/logout");
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect((await agent.get("/api/admin/session")).status).toBe(200);
    });

    it("logout with a wrong CSRF token is refused", async () => {
      const { agent, csrfToken } = await signedInAgent();
      const wrong =
        csrfToken.slice(0, -1) + (csrfToken.endsWith("A") ? "B" : "A");
      expect(
        (await agent.post("/api/admin/logout").set("x-csrf-token", wrong))
          .status,
      ).toBe(403);
    });
  });
});

describe.skipIf(!dbReady)(
  "AT-10 requireAdmin guard for future admin routes",
  () => {
    // A stand-in for a future route such as POST /api/admin/services.
    it("blocks unsigned requests, needs CSRF on POST, and sets req.admin", async () => {
      const express = (await import("express")).default;
      const { adminSession } = await import("../src/auth/session");
      const { requireAdmin } = await import("../src/middleware/requireAdmin");
      const { errorHandler } = await import("../src/middleware/error");
      const { login: loginHandler } = await import("../src/routes/admin/auth");

      const testApp = express();
      testApp.use(express.json());
      testApp.use(adminSession);
      testApp.post("/login", loginHandler);
      testApp.post("/thing", requireAdmin, (req, res) => {
        res.json({ who: req.admin?.email });
      });
      testApp.use(errorHandler);

      expect((await request(testApp).post("/thing")).status).toBe(401);

      const agent = request.agent(testApp);
      const res = await agent
        .post("/login")
        .send({ email: EMAIL, password: PASSWORD });
      expect(res.status).toBe(200);
      expect((await agent.post("/thing")).status).toBe(403);
      const ok = await agent
        .post("/thing")
        .set("x-csrf-token", res.body.csrfToken);
      expect(ok.status).toBe(200);
      expect(ok.body.who).toBe(EMAIL);
    });
  },
);
