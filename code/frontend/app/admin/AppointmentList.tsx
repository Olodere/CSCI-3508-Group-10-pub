import Link from "next/link";
import {
  STATUS_FILTERS,
  type AdminAppointment,
  type StatusFilter,
} from "@/lib/admin-appointments";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import styles from "@/styles/AdminDashboard.module.css";

const FILTER_LABELS: Record<StatusFilter, string> = {
  booked: "Upcoming",
  cancelled: "Cancelled",
  all: "All",
};

/** Groups appointments under a heading per day (salon time). */
// Website bookings store 10 digits ("3035550199"); show them as 303-555-0199.
function formatPhone(phone: string) {
  const m = /^(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : phone;
}

function byDay(appointments: AdminAppointment[]) {
  const days = new Map<string, AdminAppointment[]>();
  for (const a of appointments) {
    const day = formatDate(a.startTime);
    days.set(day, [...(days.get(day) ?? []), a]);
  }
  return [...days.entries()];
}

export default function AppointmentList({
  appointments,
  status,
}: {
  appointments: AdminAppointment[];
  status: StatusFilter;
}) {
  return (
    <section aria-labelledby="appointments-heading" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 id="appointments-heading" className={styles.heading}>
          Appointments
        </h2>
        <nav aria-label="Filter appointments" className={styles.filters}>
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "booked" ? "/admin" : `/admin?status=${f}`}
              className={styles.filter}
              aria-current={f === status ? "page" : undefined}
            >
              {FILTER_LABELS[f]}
            </Link>
          ))}
        </nav>
      </div>
      <p className={styles.muted}>Next 30 days, salon time.</p>

      {appointments.length === 0 ? (
        <p className={styles.empty}>No appointments to show.</p>
      ) : (
        byDay(appointments).map(([day, items]) => (
          <div key={day} className={styles.day}>
            <h3 className={styles.dayHeading}>{day}</h3>
            <ul className={styles.list}>
              {items.map((a) => (
                <li key={a.id} className={styles.item}>
                  <div className={styles.time}>
                    {formatTime(a.startTime)}
                    <span className={styles.muted}>
                      {" "}
                      to {formatTime(a.endTime)}
                    </span>
                  </div>
                  <div className={styles.details}>
                    <strong>
                      {a.serviceName ??
                        (a.isCustomRequest ? "Custom request" : "Service")}
                    </strong>
                    {a.status !== "booked" && (
                      <span className={styles.badge}>
                        {a.status.replace("_", " ")}
                      </span>
                    )}
                    <div>{a.customerName}</div>
                    <div className={styles.contact}>
                      <a href={`tel:${a.customerPhone}`}>{formatPhone(a.customerPhone)}</a>
                      {" · "}
                      <a href={`mailto:${a.customerEmail}`}>
                        {a.customerEmail}
                      </a>
                    </div>
                    {a.appointmentType === "at_home" && a.serviceAddress && (
                      <div className={styles.muted}>
                        At home: {a.serviceAddress}
                      </div>
                    )}
                    {a.customRequestDescription && (
                      <div className={styles.muted}>
                        Request: {a.customRequestDescription}
                      </div>
                    )}
                  </div>
                  <div className={styles.price}>
                    {formatPrice(a.servicePriceCents + a.travelFeeCents)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
