// Shapes of the data the API sends and receives.
// Field names match documentation/api-contract.md exactly.

export type Service = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  sortOrder: number;
};

export type AppointmentType = "in_salon" | "at_home";

export type TimeSlot = {
  start: string; // UTC ISO, e.g. "2030-01-15T16:00:00.000Z"
  end: string;
};

// GET /api/availability
export type Availability = {
  date: string; // "YYYY-MM-DD"
  serviceId: number | null;
  slots: TimeSlot[];
};

// POST /api/appointments (request body)
export type CreateAppointmentRequest = {
  serviceId: number | null;
  isCustomRequest: boolean;
  customRequestDescription: string | null;
  appointmentType: AppointmentType;
  serviceAddress: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startTime: string; // UTC ISO
};

// POST /api/appointments (201 response)
export type AppointmentConfirmation = {
  id: string;
  cancellationToken: string;
  startTime: string;
  endTime: string;
  servicePriceCents: number;
  travelFeeCents: number;
  totalCents: number;
};

export type ApiErrorCode =
  | "BAD_INPUT"
  | "NOT_FOUND"
  | "SLOT_TAKEN"
  | "VALIDATION_FAILED"
  | "OUT_OF_RANGE"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NETWORK_ERROR"; // frontend-only: the request itself failed

export type ApiError = { code: ApiErrorCode; message: string };

// Every API function returns one of these two shapes.
export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; error: ApiError };
