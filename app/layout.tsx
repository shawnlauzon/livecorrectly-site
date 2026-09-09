import type { Metadata } from "next";
import { Fraunces, Karla, Cinzel, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-narrative",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Live Correctly — Human Design",
  description:
    "Advice built for someone else's wiring won't hold. Human Design shows you how yours actually works.",
  openGraph: {
    title: "You've tried it their way. Now do it yours",
    description:
      "Advice built for someone else's wiring won't hold. Human Design shows you how yours actually works.",
  },
  twitter: {
    card: "summary",
    title: "Live Correctly — Human Design",
    description:
      "Advice built for someone else's wiring won't hold. Human Design shows you how yours actually works.",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${cinzel.variable} ${sourceSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
