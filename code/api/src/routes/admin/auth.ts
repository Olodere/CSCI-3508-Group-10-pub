import { randomBytes } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { ApiError } from "../../middleware/error";
import { hasValidCsrfToken } from "../../middleware/requireAdmin";
import { MAX_PASSWORD_LENGTH, verifyPassword } from "../../auth/password";
import {
  beginLoginAttempt,
  markAttemptSucceeded,
  pruneOldAttempts,
} from "../../auth/lockout";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../../auth/session";
import type { AdminIdentity } from "../../types/express";

// One message for every credential failure, so the API never reveals
// whether an email belongs to an admin account.
export const INVALID_CREDENTIALS = "Invalid email or password.";
export const LOCKED_OUT =
  "Too many failed attempts. Please wait 15 minutes and try again.";

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

function regenerate(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve())),
  );
}
function save(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve())),
  );
}
function destroy(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
}

/**
 * POST /api/admin/login   { email, password }
 * 200 { admin, csrfToken }  session cookie set
 * 401 UNAUTHORIZED          wrong email/password or inactive (one message for all)
 * 422 VALIDATION_FAILED     body missing or not an email/password shape
 * 429 RATE_LIMITED          too many failures; wait 15 minutes
 */
export const login: RequestHandler = async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation(
        "Enter your email and password.",
        parsed.error.issues.map((i) => i.path.join(".")),
      );
    }
    const { email, password } = parsed.data;

    // 1. Save the attempt and check the lockout, before any password work.
    const { attemptId, locked } = await beginLoginAttempt(
      email,
      req.ip ?? null,
    );
    if (locked) throw ApiError.rateLimited(LOCKED_OUT);

    // 2. Look up the account and check the password. verifyPassword always
    //    runs, even when the account is missing, so both take the same time.
    const { rows } = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT id, email, full_name, password_hash, is_active
         FROM admin_users WHERE email = $1`,
      [email],
    );
    const user = rows[0];
    const passwordOk = await verifyPassword(
      password,
      user?.password_hash ?? null,
    );
    if (!user || !passwordOk || !user.is_active) {
      // The attempt is already saved as a failure.
      throw ApiError.unauthorized(INVALID_CREDENTIALS);
    }

    // 3. Success. A brand-new session id stops "session fixation", where an
    //    attacker plants a known session id before the owner logs in.
    await markAttemptSucceeded(attemptId);
    await pool.query(
      "UPDATE admin_users SET last_login_at = now() WHERE id = $1",
      [user.id],
    );
    await regenerate(req);
    req.session.adminId = Number(user.id);
    req.session.csrfToken = randomBytes(32).toString("base64url");
    await save(req);
    await pruneOldAttempts();

    const admin: AdminIdentity = {
      id: Number(user.id),
      email: user.email,
      fullName: user.full_name,
    };
    res.status(200).json({ admin, csrfToken: req.session.csrfToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/logout   (send x-csrf-token)
 * 204 session row deleted and cookie cleared
 * 403 FORBIDDEN if signed in but the CSRF token is missing or wrong, so
 *     another website cannot sign the owner out
 */
export const logout: RequestHandler = async (req, res, next) => {
  try {
    if (req.session?.adminId) {
      if (!hasValidCsrfToken(req)) {
        throw ApiError.forbidden("Missing or invalid CSRF token.");
      }
      await destroy(req);
    }
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/session   (behind requireAdmin)
 * 200 { admin, csrfToken }  who is signed in, plus the CSRF token again so a
 *                           reloaded page can keep making changes
 */
export const currentSession: RequestHandler = (req, res) => {
  res.json({ admin: req.admin, csrfToken: req.session.csrfToken });
};
