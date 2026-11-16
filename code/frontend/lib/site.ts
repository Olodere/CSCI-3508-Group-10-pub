// Single source of truth for the salon's basic info and the site's nav links.

export const site = {
  name: "Nails By Jensine",
  tagline: "Gel-X and gel nails in Aurora, CO",
  description:
    "Gel-X and gel manicures in Aurora, CO, in-salon or at your home. Book online in minutes.",
  area: "Aurora, CO",
  instagram: "@nails_by_jensine",
  instagramUrl: "https://www.instagram.com/nails_by_jensine/",
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#booking", label: "Booking" },
  { href: "/#contact", label: "Contact" },
] as const;
