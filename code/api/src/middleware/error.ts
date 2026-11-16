import type { ErrorRequestHandler } from "express";
import { logger } from "../logger";

export type ErrorCode =
  | "SLOT_TAKEN"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "DUPLICATE"
  | "BAD_INPUT"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "OUT_OF_RANGE"
  | "FK_IN_USE"
  | "PAST_DEADLINE"
  | "ALREADY_CANCELLED"
  | "RATE_LIMITED"
  | "INTERNAL";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static slotTaken(): ApiError {
    return new ApiError(
      409,
      "SLOT_TAKEN",
      "This time slot is no longer available.",
    );
  }
  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(422, "VALIDATION_FAILED", message, details);
  }
  static duplicate(message = "Duplicate value.", details?: unknown): ApiError {
    return new ApiError(409, "DUPLICATE", message, details);
  }
  static notFound(message = "Not found."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static unauthorized(message = "Authentication required."): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Forbidden."): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static rateLimited(message: string): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }
  static badInput(message: string): ApiError {
    return new ApiError(400, "BAD_INPUT", message);
  }
  static outOfRange(message: string): ApiError {
    return new ApiError(422, "OUT_OF_RANGE", message);
  }
  static internal(message = "Internal server error."): ApiError {
    return new ApiError(500, "INTERNAL", message);
  }
}

interface PgErrorShape {
  code?: string;
  constraint?: string;
  hint?: string;
  message?: string;
}

/**
 * Maps Postgres error codes into the frozen API error model.
 * Never leak `err.stack` or SQL text to the client; `details` is safe.
 *
 * If `err` is already an `ApiError`, it is returned unchanged so that
 * call sites can throw `ApiError` directly and have it survive the
 * error-handling pipeline intact (same identity, same fields).
 */
export function mapPgError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const e = (err ?? {}) as PgErrorShape;

  switch (e.code) {
    case "23P01":
      if (
        e.hint === "slot_taken" ||
        e.constraint === "appointments_no_overlap"
      ) {
        return ApiError.slotTaken();
      }
      return new ApiError(409, "CONFLICT", "Resource conflict.");
    case "23514":
      return ApiError.validation(e.message ?? "Constraint violation.");
    case "23505":
      return ApiError.duplicate("Duplicate value.", {
        constraint: e.constraint,
      });
    case "23503":
      return new ApiError(
        409,
        "FK_IN_USE",
        "Record is referenced by other data.",
      );
    case "22023":
      return ApiError.badInput(e.message ?? "Invalid input.");
    case "P0002":
      return ApiError.notFound();
    case "28P01":
      return ApiError.internal("Database authentication failed.");
    default:
      return ApiError.internal(e.message ?? "Unknown error.");
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next;
  // mapPgError() preserves ApiError instances, so no branch is needed.
  const apiErr = mapPgError(err);

  if (apiErr.status >= 500) {
    logger.error({ err, reqId: req.id }, "Unhandled error");
  } else {
    logger.warn({ code: apiErr.code, reqId: req.id }, apiErr.message);
  }

  res.status(apiErr.status).json({
    error: {
      code: apiErr.code,
      message: apiErr.message,
      details: apiErr.details ?? null,
      requestId: req.id,
    },
  });
};