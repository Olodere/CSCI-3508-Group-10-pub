import type { RequestHandler } from "express";
import { ApiError } from "./error";

export interface RateLimitOptions {
  /** How long one window lasts, in milliseconds. */
  windowMs: number;
  /** How many requests one IP address may make per window. */
  max: number;
  /** Shown to the visitor when they go over the limit. */
  message: string;
}

/**
 * Simple per-IP rate limit, kept in memory (fixed window).
 *
 * Good enough for one API server. If the API ever runs on several servers,
 * move the counts into Postgres like admin_login_attempts.
 * Only the IP address is stored, never anything from the request body.
 */
export function rateLimit({
  windowMs,
  max,
  message,
}: RateLimitOptions): RequestHandler & { reset(): void } {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const handler: RequestHandler = (req, res, next) => {
    const now = Date.now();

    // Drop expired entries now and then so the map can't grow forever.
    if (hits.size > 10_000) {
      for (const [key, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(key);
      }
    }

    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      next(ApiError.rateLimited(message));
      return;
    }
    next();
  };

  return Object.assign(handler, { reset: () => hits.clear() });
}
