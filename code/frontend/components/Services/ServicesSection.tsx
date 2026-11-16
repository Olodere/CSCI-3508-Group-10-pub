import { ButtonLink } from "@/components/Button/Button";
import Section from "@/components/Section/Section";
import { getServices } from "@/lib/api";
import { formatDuration, formatPrice } from "@/lib/format";
import styles from "./ServicesSection.module.css";

// Server component: wrap in <Suspense> on the page.
export default async function ServicesSection() {
  const result = await getServices();

  return (
    <Section id="services" title="Services" variant="alt">
      {result.ok ? (
        <ul className={styles.grid}>
          {result.data.map((service) => (
            <li key={service.id} className={styles.card}>
              <h3 className={styles.name}>{service.name}</h3>
              {service.description && (
                <p className={styles.description}>{service.description}</p>
              )}
              <p className={styles.meta}>
                <span className={styles.price}>
                  {formatPrice(service.priceCents)}
                </span>
                <span>{formatDuration(service.durationMinutes)}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert">Sorry, services couldn&apos;t be loaded right now.</p>
      )}
      <div className={styles.cta}>
        <ButtonLink href="/#booking">Book an appointment</ButtonLink>
      </div>
    </Section>
  );
}
