// The ONLY file components use to talk to the backend.
// Each function calls the Express API (code/api) and returns an ApiResult,
// so components never deal with fetch(), status codes or thrown errors.
// Endpoints and field names follow documentation/api-contract.md.

import type {
  ApiErrorCode,
  ApiResult,
  AppointmentConfirmation,
  Availability,
  CreateAppointmentRequest,
  Service,
} from "@/types/booking";

// ── Helpers ──────────────────────────────────────────────

// In the browser, call "/api/..." on this same site; next.config.ts forwards
// it to the API. On the server (server components) there is no "same site",
// so use the API's full address.
function apiUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  return `${process.env.API_URL ?? "http://localhost:3001"}${path}`;
}

// <T> lets one helper work for any kind of data.
function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function fail<T>(code: ApiErrorCode, message: string): ApiResult<T> {
  return { ok: false, error: { code, message } };
}

const KNOWN_CODES: ApiErrorCode[] = [
  "BAD_INPUT",
  "NOT_FOUND",
  "SLOT_TAKEN",
  "VALIDATION_FAILED",
  "OUT_OF_RANGE",
  "RATE_LIMITED",
  "INTERNAL",
];

const NETWORK_MESSAGE =
  "We couldn't reach the salon. Check your connection and try again.";
const SERVER_MESSAGE = "Something went wrong on our side. Please try again.";

/**
 * fetch() + JSON + error handling in one place.
 * Never throws: a failed request becomes { ok: false, error }.
 */
async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    return fail("NETWORK_ERROR", NETWORK_MESSAGE);
  }

  const body: unknown = await res.json().catch(() => null);

  if (res.ok) {
    if (body === null) return fail("INTERNAL", SERVER_MESSAGE);
    return ok(body as T);
  }

  // Error shape: { error: { code, message, details, requestId } }
  const error = (body as { error?: { code?: string; message?: string } })
    ?.error;
  if (res.status >= 500 || !error) return fail("INTERNAL", SERVER_MESSAGE);

  const code = KNOWN_CODES.includes(error.code as ApiErrorCode)
    ? (error.code as ApiErrorCode)
    : "BAD_INPUT";
  return fail(code, error.message ?? SERVER_MESSAGE);
}

// ── GET /api/services ────────────────────────────────────

export async function getServices(): Promise<ApiResult<Service[]>> {
  const result = await request<{ services: Service[] }>("/api/services");
  if (!result.ok) return result;
  // [...array] copies it first, so sorting doesn't change the original.
  const sorted = [...result.data.services].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return ok(sorted);
}

// ── GET /api/availability?date=…&serviceId=… ─────────────

export async function getAvailability(
  date: string, // "YYYY-MM-DD"
  serviceId: number | null, // null = custom request
): Promise<ApiResult<Availability>> {
  // "en-CA" formats dates as YYYY-MM-DD, so the strings compare correctly.
  // (The API checks this too; this just saves a trip.)
  const today = new Date().toLocaleDateString("en-CA");
  if (date < today) return fail("BAD_INPUT", "Please pick a future date.");
  if (serviceId === null) {
    return fail("VALIDATION_FAILED", "Please pick a service.");
  }

  const query = new URLSearchParams({ date, serviceId: String(serviceId) });
  return request<Availability>(`/api/availability?${query}`);
}

// ── POST /api/appointments ───────────────────────────────

export async function createAppointment(
  req: CreateAppointmentRequest,
): Promise<ApiResult<AppointmentConfirmation>> {
  return request<AppointmentConfirmation>("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
