import { ButtonLink } from "@/components/Button/Button";
import { site } from "@/lib/site";
import styles from "./Hero.module.css";

// PLACEHOLDER: swap for a real photo from the client (then consider next/image).
const HERO_IMAGE = "https://placehold.co/1600x900/b23a62/fff0f5.png?text=+";

export default function Hero() {
  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `url(${HERO_IMAGE})` }}
    >
      <div className={styles.overlay}>
        <h1 className={styles.title}>{site.name}</h1>
        <p className={styles.tagline}>{site.tagline}</p>
        <div className={styles.actions}>
          <ButtonLink href="/#booking">Book now</ButtonLink>
          <ButtonLink href="/#services" variant="secondary">
            See services
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
