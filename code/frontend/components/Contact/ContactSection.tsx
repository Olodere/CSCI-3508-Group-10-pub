import { ButtonLink } from "@/components/Button/Button";
import Section from "@/components/Section/Section";
import { site } from "@/lib/site";
import styles from "./ContactSection.module.css";

export default function ContactSection() {
  return (
    <Section id="contact" title="Contact">
      <div className={styles.content}>
        <p>Questions or custom design ideas? Send me a message on Instagram.</p>
        <ButtonLink href={site.instagramUrl} external>
          {site.instagram} on Instagram
        </ButtonLink>
        <p className={styles.area}>Serving {site.area} and nearby areas</p>
      </div>
    </Section>
  );
}
