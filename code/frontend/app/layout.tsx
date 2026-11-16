import type { Metadata } from "next";
import { Lato, Prata, Qwitcher_Grypen } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const prata = Prata({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

const qwitcher = Qwitcher_Grypen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` }, // a /book page's tab shows "Book | Nails By Jensine"
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${prata.variable} ${qwitcher.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
