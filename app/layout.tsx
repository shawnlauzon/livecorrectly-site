import type { Metadata } from "next";
import { Fraunces, Karla, Cinzel } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import CookieBanner from "@/components/cookie-banner";
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

export const metadata: Metadata = {
  title: "Live Correctly — Human Design",
  description:
    "Advice built for someone else's wiring won't hold. Human Design shows you how yours actually works.",
  openGraph: {
    title: "You've tried it their way. Now do it yours 🚀",
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
      className={`${fraunces.variable} ${karla.variable} ${cinzel.variable}`}
    >
      <body>
        {children}
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script id="ga4-consent-default" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                });
              `}
            </Script>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');

                if (localStorage.getItem('cookie-consent') === 'granted') {
                  gtag('consent', 'update', { analytics_storage: 'granted' });
                }
              `}
            </Script>
          </>
        )}
        <CookieBanner />
      </body>
    </html>
  );
}
