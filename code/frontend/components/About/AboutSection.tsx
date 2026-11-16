import Section from "@/components/Section/Section";
import { site } from "@/lib/site";
import styles from "./AboutSection.module.css";

// TEMPLATE: replace the text and photo with the owner's own.
const ABOUT_IMAGE = "https://placehold.co/600x600/ffd1dc/4a2c32.png?text=Photo";

export default function AboutSection() {
  return (
    <Section id="about" title="About">
      <div className={styles.layout}>
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${ABOUT_IMAGE})` }}
          role="img"
          aria-label="Placeholder photo of the nail technician"
        />
        <div className={styles.text}>
          <p>
            Hi, I&apos;m the artist behind {site.name}. I&apos;ve been doing
            nails for [X] years and love creating sets that fit your style, from
            clean everyday gel to detailed Gel-X designs.
          </p>
          <p>
            I&apos;m a one-person studio in {site.area}, so every appointment
            gets my full attention. Come to me in-salon, or I can come to you.
          </p>
        </div>
      </div>
    </Section>
  );
}
