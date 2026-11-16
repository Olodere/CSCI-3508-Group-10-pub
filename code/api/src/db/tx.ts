import type { PoolClient } from "pg";
import { pool } from "./pool";

/**
 * Runs `fn` inside a single Postgres transaction on a pooled client.
 * Commits on resolve, rolls back on throw, always releases the client.
 *
 * Use this for any request that mutates more than one row, or that reads
 * after writing and must observe its own writes.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch((rollbackErr) => {
      console.error("Rollback failed:", rollbackErr);
    });
    throw err;
  } finally {
    client.release();
  }}