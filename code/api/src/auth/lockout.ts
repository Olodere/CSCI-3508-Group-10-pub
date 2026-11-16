import { pool } from "../db/pool";

// After this many failed attempts for one email inside the window, that
// email is locked until the window passes. A successful login resets it.
export const MAX_FAILED_PER_EMAIL = 5;
// A looser limit per IP address stops one machine from trying many emails.
export const MAX_FAILED_PER_IP = 20;
export const LOCKOUT_WINDOW_MINUTES = 15;

/**
 * Saves a login attempt BEFORE the password is checked, then decides whether
 * it may go ahead.
 *
 * Why save first: checking the password takes a moment. If failures were
 * only counted afterwards, an attacker could send 100 guesses at the same
 * instant and all 100 would pass the "fewer than 5 failures?" check before
 * any failure was saved. Saving first means the 6th saved attempt always
 * sees at least 6 rows and is refused, however many arrive at once.
 *
 * A refused attempt's row is removed again, so refused attempts do not
 * extend the lockout forever.
 */
export async function beginLoginAttempt(
  email: string,
  ip: string | null,
): Promise<{ attemptId: string; locked: boolean }> {
  const { rows: inserted } = await pool.query<{ id: string }>(
    `INSERT INTO admin_login_attempts (email, ip_address, succeeded)
     VALUES ($1, $2, FALSE)
     RETURNING id`,
    [email, ip],
  );
  const attemptId = inserted[0]!.id;

  // $1 is cast to citext so the email match ignores upper/lower case.
  const { rows } = await pool.query<{ email_fails: number; ip_fails: number }>(
    `SELECT
       -- failures for this email since the later of: window start, last success
       (SELECT count(*)::int FROM admin_login_attempts a
         WHERE a.email = $1::citext AND NOT a.succeeded
           AND a.attempted_at > GREATEST(
                 now() - make_interval(mins => $3),
                 COALESCE((SELECT max(attempted_at) FROM admin_login_attempts
                            WHERE email = $1::citext AND succeeded), '-infinity'))
       ) AS email_fails,
       -- failures from this IP inside the window
       (SELECT count(*)::int FROM admin_login_attempts a
         WHERE $2::text IS NOT NULL AND a.ip_address = $2 AND NOT a.succeeded
           AND a.attempted_at > now() - make_interval(mins => $3)
       ) AS ip_fails`,
    [email, ip, LOCKOUT_WINDOW_MINUTES],
  );
  // Both counts include this attempt, so "more than the limit" means locked.
  const { email_fails, ip_fails } = rows[0]!;
  const locked =
    email_fails > MAX_FAILED_PER_EMAIL || ip_fails > MAX_FAILED_PER_IP;

  if (locked) {
    await pool.query("DELETE FROM admin_login_attempts WHERE id = $1", [
      attemptId,
    ]);
  }
  return { attemptId, locked };
}

/** Marks an attempt as successful, which resets the email's failure count. */
export async function markAttemptSucceeded(attemptId: string): Promise<void> {
  await pool.query(
    `UPDATE admin_login_attempts
        SET succeeded = TRUE, attempted_at = now()
      WHERE id = $1`,
    [attemptId],
  );
}

/** Forgets attempts older than a day so the table stays small. */
export async function pruneOldAttempts(): Promise<void> {
  await pool.query(
    "DELETE FROM admin_login_attempts WHERE attempted_at < now() - interval '1 day'",
  );
}
