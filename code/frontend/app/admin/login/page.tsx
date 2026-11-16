import type { Metadata } from "next";
import LoginForm from "@/app/admin/login/LoginForm";
import styles from "@/styles/AdminLogin.module.css";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
