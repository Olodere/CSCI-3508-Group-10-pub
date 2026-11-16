import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LOGIN_PATH, requireAdminPage } from "@/lib/admin-session";
import {
  getAdminAppointments,
  STATUS_FILTERS,
  type StatusFilter,
} from "@/lib/admin-appointments";
import LogoutButton from "@/app/admin/LogoutButton";
import AppointmentList from "@/app/admin/AppointmentList";
import styles from "@/styles/AdminDashboard.module.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ status?: string }> };

// The session is read per request, so it must sit behind <Suspense>
// (required because cacheComponents is enabled).
export default function AdminHomePage({ searchParams }: PageProps) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p>Loading…</p>}>
        <AdminDashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AdminDashboard({ searchParams }: PageProps) {
  // Redirects to /admin/login if not signed in.
  const { admin, csrfToken } = await requireAdminPage();

  const requested = (await searchParams).status;
  const status: StatusFilter = STATUS_FILTERS.includes(
    requested as StatusFilter,
  )
    ? (requested as StatusFilter)
    : "booked";

  // The API checks the session again for this request (the real protection).
  const list = await getAdminAppointments(status);
  if (!list) redirect(LOGIN_PATH);

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Admin</h1>
          <p className={styles.muted}>Signed in as {admin.fullName}</p>
        </div>
        <LogoutButton csrfToken={csrfToken} />
      </div>

      <AppointmentList appointments={list.appointments} status={status} />

      {/* Still to come: FR-10 services and prices, FR-11 availability.
          Their data comes from /api/admin/* routes, which the API protects
          with requireAdmin. Send csrfToken as x-csrf-token on changes. */}
    </div>
  );
}
