import Link from "next/link";
import { navLinks, site } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <nav aria-label="Footer">
        <ul className={styles.links}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={styles.link}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <a
        href={site.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        Follow {site.instagram} on Instagram
      </a>

      <div className={styles.bottom}>
        <p className={styles.small}>
          &copy; <CopyrightYear /> {site.name}
        </p>
        <Link href="/admin/login" className={styles.small}>
          Owner login
        </Link>
      </div>
    </footer>
  );
}

// Cached so the year is captured in the prerendered page (needed because
// cacheComponents is on in next.config.ts).
async function CopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}
