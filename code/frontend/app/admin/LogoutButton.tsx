"use client";

import { useState } from "react";
import styles from "@/styles/AdminLogin.module.css";

/** Signs out through the API. The CSRF token proves the click came from this site. */
export default function LogoutButton({ csrfToken }: { csrfToken: string }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    }).catch(() => undefined);
    // Full page load, so no copy of the admin page stays in the browser's
    // memory after signing out (the Back button can't show it again).
    window.location.replace("/admin/login");
  }

  return (
    <button
      className={styles.button}
      type="button"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
