import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { ApiError } from "../middleware/error";
import { rateLimit } from "../middleware/rateLimit";

export const publicRouter = Router();

// Per-IP limits so a script can't fill the calendar or hammer the database.
// Exported so tests can reset them.
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  message:
    "Too many booking attempts. Please wait a few minutes and try again.",
});
export const readLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: "Too many requests. Please wait a minute and try again.",
});

// Letters from any language, spaces, and . ' - , only.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’,-]*$/u;

// only in-salon bookings of a listed service for now
const bookingBody = z.object({
  serviceId: z.number().int().positive(),
  appointmentType: z.literal("in_salon"),
  customerName: z.string().trim().min(1).max(100).regex(NAME_PATTERN),
  customerEmail: z.string().trim().toLowerCase().max(254).email(),
  // Accepts "(303) 555-0100", "303.555.0100", "+1 303 555 0100"; stores 10 digits.
  customerPhone: z
    .string()
    .max(20)
    .regex(/^[\d\s().+-]+$/)
    .transform((v) => v.replace(/\D/g, ""))
    .transform((d) => (d.length === 11 && d.startsWith("1") ? d.slice(1) : d))
    .refine((d) => d.length === 10),
  startTime: z.coerce.date(),
});

// list active services for the booking page
publicRouter.get("/services", readLimiter, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, price_cents, duration_minutes, sort_order
         FROM active_services
        ORDER BY sort_order, name`,
    );
    const services = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      description: r.description,
      priceCents: r.price_cents,
      durationMinutes: r.duration_minutes,
      sortOrder: r.sort_order,
    }));
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

// open time slots for a date and service
publicRouter.get("/availability", readLimiter, async (req, res, next) => {
  try {
    const date = String(req.query.date ?? "");
    const serviceId = Number(req.query.serviceId);

    const d = new Date(date);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(d.getTime()) ||
      d.toISOString().slice(0, 10) !== date
    ) {
      throw ApiError.badInput("date must be YYYY-MM-DD.");
    }
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      throw ApiError.badInput("serviceId must be a positive number.");
    }

    // today and the booking limit in the salon time zone
    const days = await pool.query(
      `SELECT (now() AT TIME ZONE timezone)::date::text AS today,
              ((now() AT TIME ZONE timezone)::date + 30)::text AS last_day
         FROM salon_settings
        WHERE id = 1`,
    );
    const { today, last_day } = days.rows[0];
    if (date < today) throw ApiError.badInput("date is in the past.");

    const svc = await pool.query(
      "SELECT duration_minutes FROM active_services WHERE id = $1",
      [serviceId],
    );
    if (svc.rows.length === 0) throw ApiError.notFound("Service not found.");

    // nothing is bookable more than 30 days ahead
    if (date > last_day) {
      res.json({ date, serviceId, slots: [] });
      return;
    }

    const { rows } = await pool.query(
      `SELECT slot_start, slot_end
         FROM available_slots($1::date, $2)
        WHERE slot_start > now()`,
      [date, svc.rows[0].duration_minutes],
    );
    const slots = rows.map((r) => ({
      start: r.slot_start.toISOString(),
      end: r.slot_end.toISOString(),
    }));
    res.json({ date, serviceId, slots });
  } catch (err) {
    next(err);
  }
});

// book an appointment
publicRouter.post("/appointments", bookingLimiter, async (req, res, next) => {
  try {
    const parsed = bookingBody.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation(
        "Booking details are missing or invalid.",
        parsed.error.issues.map((i) => i.path.join(".")),
      );
    }
    const b = parsed.data;

    const { rows } = await pool.query(
      "SELECT * FROM book_appointment($1, $2, $3, $4, $5)",
      [
        b.serviceId,
        b.customerName,
        b.customerEmail,
        b.customerPhone,
        b.startTime,
      ],
    );
    const a = rows[0];
    res.status(201).json({
      id: a.id,
      cancellationToken: a.cancellation_token,
      startTime: a.start_time.toISOString(),
      endTime: a.end_time.toISOString(),
      servicePriceCents: a.service_price_cents,
      travelFeeCents: a.travel_fee_cents,
      totalCents: a.total_cents,
    });
  } catch (err) {
    // the database raises 23P01 when the time is not open
    if ((err as { code?: string }).code === "23P01") {
      next(ApiError.slotTaken());
      return;
    }
    next(err);
  }
});
