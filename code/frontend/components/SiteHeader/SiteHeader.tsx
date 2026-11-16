import Link from "next/link";
import { navLinks, site } from "@/lib/site";
import styles from "./SiteHeader.module.css";
import NavMenu from "./NavMenu";

export default function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        {site.name}
      </Link>
      <NavMenu links={navLinks} />
    </header>
  );
}
