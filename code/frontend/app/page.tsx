import { Suspense } from "react";
import AboutSection from "@/components/About/AboutSection";
import BookingSection from "@/components/Booking/BookingSection";
import ContactSection from "@/components/Contact/ContactSection";
import Footer from "@/components/Footer/Footer";
import Hero from "@/components/Hero/Hero";
import ServicesSection from "@/components/Services/ServicesSection";
import SiteHeader from "@/components/SiteHeader/SiteHeader";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <Hero />
        <Suspense
          fallback={<p className={styles.loading}>Loading services…</p>}
        >
          <ServicesSection />
        </Suspense>
        <AboutSection />
        <Suspense fallback={<p className={styles.loading}>Loading booking…</p>}>
          <BookingSection />
        </Suspense>
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
