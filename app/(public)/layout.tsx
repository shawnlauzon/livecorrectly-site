import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import CookieBanner from "@/components/cookie-banner";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <Script id="ga4-consent-default" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_personalization: 'denied',
                ad_user_data: 'denied',
              });
            `}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
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
    </>
  );
}
