import type { ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = {
  id?: string;
  /** Shown as the section's <h2>. */
  title?: string;
  /** "alt" uses the white surface color, to separate neighboring sections. */
  variant?: "default" | "alt";
  children: ReactNode;
};

export default function Section({
  id,
  title,
  variant = "default",
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`${styles.section} ${variant === "alt" ? styles.alt : ""}`}
    >
      <div className={styles.content}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {children}
      </div>
    </section>
  );
}
