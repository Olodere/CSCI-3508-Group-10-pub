import type { RequestHandler } from "express";

/**
 * Echoes the request ID assigned by `requestLog` back to the client as
 * the `x-request-id` response header.
 *
 * MUST run after `requestLog`, which sets `req.id`. If a client supplies
 * `x-request-id` on the request, `requestLog` preserves it; otherwise
 * `requestLog` generates a UUID and that value is echoed here.
 */
export const requestIdHeader: RequestHandler = (req, res, next) => {
  if (req.id !== undefined) {
    res.setHeader("x-request-id", String(req.id));
  }
  next();
};