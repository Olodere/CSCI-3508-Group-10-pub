// Adds a few sample bookings so the owner dashboard has something to show
// while the public booking API is still being built. Development only.
//
// Usage (from code/api, with the dev database running):
//   npm run sample:appointments            add 3 sample bookings
//   npm run sample:appointments -- --clear remove the sample bookings again
//
// Bookings go through the database's own book_appointment() function, so
// they only land in real open slots, exactly like a customer booking would.
// Sample customers use emails like sample.ava@example.com.

import "dotenv/config";
import pg from "pg";

const SAMPLES = [
  { name: "Ava Martinez", phone: "303-555-0101" },
  { name: "Ben Carter", phone: "303-555-0102" },
  { name: "Chloe Nguyen", phone: "303-555-0103" },
];
const SAMPLE_EMAIL_PATTERN = "sample.%@example.com";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const databaseUrl =
    process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl)
    fail("ADMIN_DATABASE_URL is not set. Copy .env.example to .env first.");
  if (process.env.NODE_ENV === "production")
    fail("Refusing to add sample data in production.");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (process.argv.includes("--clear")) {
      const { rowCount } = await client.query(
        "DELETE FROM appointments WHERE customer_email::text LIKE $1",
        [SAMPLE_EMAIL_PATTERN],
      );
      console.log(`Removed ${rowCount ?? 0} sample appointment(s).`);
      return;
    }

    const services = await client.query<{
      id: string;
      name: string;
      duration_minutes: number;
    }>(
      "SELECT id, name, duration_minutes FROM services WHERE is_active ORDER BY sort_order, id",
    );
    if (services.rows.length === 0)
      fail("No active services. Run the seed first (make seed).");

    let added = 0;
    for (let day = 1; day <= 14 && added < SAMPLES.length; day++) {
      const sample = SAMPLES[added]!;
      const service = services.rows[added % services.rows.length]!;
      const slot = await client.query<{ slot_start: Date }>(
        `SELECT slot_start FROM available_slots(
           ((now() AT TIME ZONE (SELECT timezone FROM salon_settings WHERE id = 1))::date + $1::int),
           $2::int)
         ORDER BY slot_start OFFSET 2 LIMIT 1`,
        [day, service.duration_minutes],
      );
      const start = slot.rows[0]?.slot_start;
      if (!start) continue; // salon closed that day

      const email = `sample.${sample.name.split(" ")[0]!.toLowerCase()}@example.com`;
      await client.query("SELECT * FROM book_appointment($1, $2, $3, $4, $5)", [
        service.id,
        sample.name,
        email,
        sample.phone,
        start,
      ]);
      console.log(
        `Booked ${service.name} for ${sample.name} at ${start.toISOString()}`,
      );
      added++;
    }
    console.log(
      `Added ${added} sample appointment(s). Sign in at /admin to see them.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
