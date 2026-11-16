import Section from "@/components/Section/Section";
import BookingForm from "@/components/Booking/BookingForm";
import { getServices } from "@/lib/api";

// Server component: loads the service list on the server and hands it to the
// interactive form as a prop. Wrap in <Suspense> on the page.
export default async function BookingSection() {
  const result = await getServices();

  return (
    <Section id="booking" title="Book an appointment" variant="alt">
      {result.ok ? (
        <BookingForm services={result.data} />
      ) : (
        <p role="alert">Sorry, booking is unavailable right now.</p>
      )}
    </Section>
  );
}
