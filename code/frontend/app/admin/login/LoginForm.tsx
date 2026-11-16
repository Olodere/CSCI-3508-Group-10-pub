"use client";

import { useState, type FormEvent } from "react";
import styles from "@/styles/AdminLogin.module.css";

type ApiErrorBody = { error?: { message?: string } };

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      // Same-site request: /api/* is forwarded to the Express API.
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });

      if (res.ok) {
        // Full page load (not client-side navigation): Next.js keeps a
        // visited page's state, so a soft navigation left this form stuck
        // on "Signing in…" when the owner signed out and came back.
        window.location.replace("/admin");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
      setError(
        res.status === 422
          ? "Enter your email and password."
          : (body.error?.message ?? "Sign in failed. Please try again."),
      );
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <label className={styles.label}>
        Email
        <input
          className={styles.input}
          type="email"
          name="email"
          autoComplete="username"
          required
        />
      </label>

      <label className={styles.label}>
        Password
        <input
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
