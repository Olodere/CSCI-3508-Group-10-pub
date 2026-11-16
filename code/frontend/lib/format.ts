// Formatting helpers. The API sends UTC times; we always show salon time.

const TIME_ZONE = "America/Denver";

// Built once and reused.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});

/** 4500 → "$45.00" */
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}

/** "2030-01-15T21:30:00.000Z" → "2:30 PM" (Denver time) */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "2030-01-15T21:30:00.000Z" → "Tuesday, January 15" (Denver time) */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** 45 → "45 min", 60 → "1 hr", 75 → "1 hr 15 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}
