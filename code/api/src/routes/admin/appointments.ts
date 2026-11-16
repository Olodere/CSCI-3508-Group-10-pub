import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { ApiError } from "../../middleware/error";

// Owner-only view of bookings (FR-12, NFR-03).
// Mounted under /api/admin AFTER requireAdmin, so every request here is
// already signed in and active. Customer contact details are private, which
// is why this lives behind the admin login and responses are never cached.
export const appointmentsRouter = Router();

/** Longest date range one request may ask for, to keep responses small. */
export const MAX_RANGE_DAYS = 366;
/** Safety cap on rows returned (one technician, so normally far fewer). */
export const MAX_ROWS = 500;

const STATUSES = [
  "booked",
  "cancelled",
  "completed",
  "no_show",
  "all",
] as const;

// "YYYY-MM-DD" that is also a real calendar date (rejects 2026-02-30).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Not a real date.");

const listQuery = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    status: z.enum(STATUSES).default("booked"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "'from' must be on or before 'to'.",
    path: ["to"],
  })
  .refine(
    (q) =>
      !q.from ||
      !q.to ||
      (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 <= MAX_RANGE_DAYS,
    {
      message: `Date range can be at most ${MAX_RANGE_DAYS} days.`,
      path: ["to"],
    },
  );

type AppointmentRow = {
  id: string;
  start_time: Date;
  end_time: Date;
  status: string;
  appointment_type: string;
  service_name: string | null;
  is_custom_request: boolean;
  custom_request_description: string | null;
  service_address: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_price_cents: number;
  travel_fee_cents: number;
  travel_fee_rule_name: string | null;
  admin_notes: string | null;
};

/**
 * GET /api/admin/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD&status=booked
 *
 * Dates are inclusive and in the salon's time zone. Defaults: from = today,
 * to = from + 30 days, status = booked ("all" returns every status).
 * 200 { from, to, status, appointments: [...] } ordered by start time.
 * 401/403 from requireAdmin. 422 VALIDATION_FAILED for bad query values.
 *
 * Deliberately never selects cancellation_token: that secret belongs to the
 * customer alone, and the owner cancels through admin routes instead.
 */
appointmentsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.issues[0]?.message ?? "Invalid filter.",
        parsed.error.issues.map((i) => i.path.join(".")),
      );
    }
    const { from, to, status } = parsed.data;

    // 1) Work out the date range in the salon's time zone.
    const range = await pool.query<{ tz: string; from: string; to: string }>(
      `SELECT tz,
              to_char(d_from, 'YYYY-MM-DD') AS "from",
              to_char(COALESCE($2::date, d_from + 30), 'YYYY-MM-DD') AS "to"
         FROM (SELECT timezone AS tz,
                      COALESCE($1::date, (now() AT TIME ZONE timezone)::date) AS d_from
                 FROM salon_settings WHERE id = 1) s`,
      [from ?? null, to ?? null],
    );
    const bounds = range.rows[0];
    if (!bounds) throw ApiError.internal("Salon settings are missing.");

    // 2) Fetch the appointments that start inside that range.
    const { rows } = await pool.query<AppointmentRow>(
      `SELECT a.id, a.start_time, a.end_time, a.status, a.appointment_type,
              s.name AS service_name, a.is_custom_request,
              a.custom_request_description, a.service_address,
              a.customer_name, a.customer_email, a.customer_phone,
              a.service_price_cents, a.travel_fee_cents,
              r.name AS travel_fee_rule_name, a.admin_notes
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         LEFT JOIN travel_fee_rules r ON r.id = a.travel_fee_rule_id
        WHERE (a.start_time AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
          AND ($4::text = 'all' OR a.status::text = $4::text)
        ORDER BY a.start_time
        LIMIT ${MAX_ROWS}`,
      [bounds.tz, bounds.from, bounds.to, status],
    );

    res.json({
      from: bounds.from,
      to: bounds.to,
      status,
      appointments: rows.map((a) => ({
        id: a.id,
        startTime: a.start_time.toISOString(),
        endTime: a.end_time.toISOString(),
        status: a.status,
        appointmentType: a.appointment_type,
        serviceName: a.service_name,
        isCustomRequest: a.is_custom_request,
        customRequestDescription: a.custom_request_description,
        serviceAddress: a.service_address,
        customerName: a.customer_name,
        customerEmail: a.customer_email,
        customerPhone: a.customer_phone,
        servicePriceCents: a.service_price_cents,
        travelFeeCents: a.travel_fee_cents,
        travelFeeRuleName: a.travel_fee_rule_name,
        adminNotes: a.admin_notes,
      })),
    });
  } catch (err) {
    next(err);
  }
});
