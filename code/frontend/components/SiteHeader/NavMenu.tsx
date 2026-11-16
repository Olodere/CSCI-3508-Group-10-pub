"use client";

import { useId, useState } from "react";
import Link from "next/link";
import styles from "./SiteHeader.module.css";

type NavLink = { href: string; label: string };
type NavMenuProps = { links: readonly NavLink[] };

export default function NavMenu({ links }: NavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();

  return (
    <nav aria-label="Main" className={styles.nav}>
      <button
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className={styles.toggle}
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={styles.bar} aria-hidden="true" />
        <span className={styles.bar} aria-hidden="true" />
        <span className={styles.bar} aria-hidden="true" />
      </button>
      <ul
        id={menuId}
        className={`${styles.links} ${isOpen ? styles.open : ""}`}
      >
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={styles.link}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
