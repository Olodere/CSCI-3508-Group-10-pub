import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/admin-session";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export const STATUS_FILTERS = ["booked", "cancelled", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type AdminAppointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: "booked" | "cancelled" | "completed" | "no_show";
  appointmentType: "in_salon" | "at_home";
  serviceName: string | null;
  isCustomRequest: boolean;
  customRequestDescription: string | null;
  serviceAddress: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  servicePriceCents: number;
  travelFeeCents: number;
  travelFeeRuleName: string | null;
  adminNotes: string | null;
};

export type AppointmentList = {
  from: string;
  to: string;
  status: string;
  appointments: AdminAppointment[];
};

/**
 * Loads the owner's appointments from GET /api/admin/appointments by
 * forwarding this visitor's session cookie. The API checks the session
 * itself; returns null if it says the visitor is not signed in.
 */
export async function getAdminAppointments(
  status: StatusFilter,
): Promise<AppointmentList | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  const res = await fetch(
    `${API_URL}/api/admin/appointments?status=${encodeURIComponent(status)}`,
    {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookie.value)}`,
      },
      cache: "no-store",
    },
  );
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Loading appointments failed (${res.status})`);
  return (await res.json()) as AppointmentList;
}
