import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env, isProd, isTest } from "../config";
import { pool } from "../db/pool";

// Name and flags follow documentation/api-contract.md:
//   Set-Cookie: session=...; HttpOnly; SameSite=Lax; Path=/   (+ Secure in prod)
export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h, per the decision log

export const sessionCookieOptions = {
  httpOnly: true, // page JavaScript cannot read it
  sameSite: "lax" as const, // not sent on cross-site form posts
  secure: isProd, // HTTPS only in production (needs `trust proxy` on Render)
  path: "/",
};

const PgStore = connectPgSimple(session);

/**
 * express-session backed by the `session` table (migration 0004), so logins
 * survive API restarts and logging out deletes the row.
 */
export const adminSession = session({
  name: SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET, // signs the cookie; a DB copy alone can't forge one
  store: new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: false, // created by migration 0004
    // Deletes expired rows every 15 minutes. Off in tests so no timer
    // keeps the test process alive.
    pruneSessionInterval: isTest ? false : 15 * 60,
  }),
  resave: false,
  saveUninitialized: false, // no session row until someone logs in
  rolling: false,
  cookie: { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_MS },
});
