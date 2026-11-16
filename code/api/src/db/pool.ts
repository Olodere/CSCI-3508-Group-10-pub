import pg from "pg";
import { env } from "../config";
import { logger } from "../logger";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected PG pool error");
});

export type DbHealth =
  | { ok: true; version: string }
  | { ok: false; error: string };

export async function checkDbHealth(): Promise<DbHealth> {
  try {
    const { rows } = await pool.query<{ version: string }>(
      "SELECT version() AS version",
    );
    return { ok: true, version: rows[0]?.version ?? "unknown" };
  } catch (err) {
    // Log the real cause server-side; never leak it to the client.
    logger.error({ err }, "Database health check failed");
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}