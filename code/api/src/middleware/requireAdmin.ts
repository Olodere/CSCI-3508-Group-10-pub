import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { pool } from "../db/pool";
import { ApiError } from "./error";

export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** True if the request's x-csrf-token header matches the one issued at login. */
export function hasValidCsrfToken(req: Request): boolean {
  const expected = req.session?.csrfToken;
  const sent = req.get(CSRF_HEADER);
  if (!expected || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  // Constant-time compare so the token can't be guessed byte by byte.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Guard for every /api/admin/* route except login and logout.
 *
 *   adminRouter.use(requireAdmin);
 *   adminRouter.get("/appointments", async (req, res) => {
 *     // req.admin is the signed-in owner: { id, email, fullName }
 *   });
 *
 * Per documentation/api-contract.md:
 *   - no session, or the account no longer exists  -> 401 UNAUTHORIZED
 *   - account deactivated                            -> 403 FORBIDDEN
 *   - POST/PATCH/DELETE without a matching x-csrf-token -> 403 FORBIDDEN
 *
 * The account is re-read from the database on every request, so
 * deactivating it takes effect immediately.
 */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const adminId = req.session?.adminId;
    if (!adminId) throw ApiError.unauthorized();

    const { rows } = await pool.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
    }>(
      "SELECT id, email, full_name, is_active FROM admin_users WHERE id = $1",
      [adminId],
    );
    const row = rows[0];
    if (!row) throw ApiError.unauthorized();
    if (!row.is_active) throw ApiError.forbidden("This account is inactive.");

    if (!SAFE_METHODS.has(req.method) && !hasValidCsrfToken(req)) {
      throw ApiError.forbidden("Missing or invalid CSRF token.");
    }

    req.admin = {
      id: Number(row.id),
      email: row.email,
      fullName: row.full_name,
    };
    next();
  } catch (err) {
    next(err);
  }
};
