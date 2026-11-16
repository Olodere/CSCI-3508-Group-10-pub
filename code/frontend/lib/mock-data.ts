// MOCK: fake data copied from db/init.sql seed values.
// Deleted in Step 5 when lib/api.ts calls the real API.

import type { Service } from "@/types/booking";

export const mockServices: Service[] = [
  {
    id: 1,
    name: "Classic Manicure",
    description: "Shape, cuticle care, polish.",
    priceCents: 3500,
    durationMinutes: 45,
    sortOrder: 10,
  },
  {
    id: 2,
    name: "Gel Manicure",
    description: "Long-lasting gel polish.",
    priceCents: 5000,
    durationMinutes: 60,
    sortOrder: 20,
  },
  {
    id: 3,
    name: "Classic Pedicure",
    description: "Soak, scrub, shape, polish.",
    priceCents: 4500,
    durationMinutes: 60,
    sortOrder: 30,
  },
  {
    id: 4,
    name: "Gel Pedicure",
    description: "Gel polish pedicure.",
    priceCents: 6000,
    durationMinutes: 75,
    sortOrder: 40,
  },
  {
    id: 5,
    name: "Nail Art",
    description: "Add-on custom nail art.",
    priceCents: 1500,
    durationMinutes: 30,
    sortOrder: 50,
  },
];

type OpenHours = { open: string; close: string };

// Key = day of week (0 = Sunday … 6 = Saturday). Missing day = closed.
// MOCK: seed hours from init.sql, not the client's real start times yet.
export const mockHours: Partial<Record<number, OpenHours>> = {
  2: { open: "09:00", close: "17:00" }, // Tuesday
  3: { open: "09:00", close: "17:00" }, // Wednesday
  4: { open: "09:00", close: "17:00" }, // Thursday
  5: { open: "09:00", close: "17:00" }, // Friday
  6: { open: "10:00", close: "16:00" }, // Saturday
};

export const SLOT_INTERVAL_MIN = 30;
export const CUSTOM_REQUEST_MIN = 60; // MOCK: assumed; open question for the client
