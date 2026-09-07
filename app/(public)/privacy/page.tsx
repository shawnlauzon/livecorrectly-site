import type { Metadata } from "next";
import SiteFooter from "@/components/site-footer";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Live Correctly",
  description: "How Live Correctly collects and uses your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <main className={styles.page}>
        <h1 className={styles.h1}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: August 18, 2026</p>

        <div className={styles.body}>
          <h2 className={styles.h2}>Who we are</h2>
          <p>
            Live Correctly is a Human Design practice operated by Lauzon
            Consulting LLC, based in Austin, TX. You can reach us at{" "}
            <a href="mailto:shawn@livecorrectly.com">
              shawn@livecorrectly.com
            </a>
            .
          </p>

          <h2 className={styles.h2}>What data we collect</h2>
          <p>We collect two types of information:</p>
          <ul>
            <li>
              <strong>Form submissions.</strong> When you generate your free
              chart, we store your name, email address, birth details, and the
              resulting chart data in our database (hosted on Neon). This is used
              to display your chart and, if you opt in, to send you a welcome
              email series.
            </li>
            <li>
              <strong>Analytics cookies.</strong> With your consent, we use
              Google Analytics 4 (GA4) to understand how visitors use this site.
              GA4 sets cookies including <code>_ga</code> and{" "}
              <code>_ga_*</code> to distinguish unique visitors and track
              sessions. No analytics cookies are set until you click
              &quot;Accept&quot; on the cookie banner.
            </li>
          </ul>

          <h2 className={styles.h2}>How we use your data</h2>
          <ul>
            <li>
              <strong>Chart generation.</strong> Your birth details are sent to
              the Maia Mechanics API to calculate your Human Design chart. The
              result is stored so you can view it.
            </li>
            <li>
              <strong>Email communication.</strong> If you provide your email, we
              may send you a short welcome series about your chart. Every email
              includes an unsubscribe link. We use Resend as our email provider.
            </li>
            <li>
              <strong>Analytics.</strong> Aggregated, anonymized analytics data
              helps us understand which pages are visited and how the site is
              used. We do not sell or share this data with third parties beyond
              Google Analytics.
            </li>
          </ul>

          <h2 className={styles.h2}>Cookies</h2>
          <p>
            We use Google Consent Mode v2. By default, analytics cookies are
            blocked until you grant consent via the cookie banner.
          </p>
          <ul>
            <li>
              <code>_ga</code> — Distinguishes unique visitors. Expires after 2
              years.
            </li>
            <li>
              <code>_ga_*</code> — Maintains session state. Expires after 2
              years.
            </li>
            <li>
              <code>cookie-consent</code> — Your cookie preference, stored in
              localStorage (not a cookie). No expiration.
            </li>
          </ul>

          <h2 className={styles.h2}>Your rights</h2>
          <ul>
            <li>
              <strong>Opt out of analytics.</strong> Click &quot;Decline&quot; on
              the cookie banner, or clear your browser&apos;s cookies and
              localStorage to reset your choice.
            </li>
            <li>
              <strong>Unsubscribe from emails.</strong> Every email includes an
              unsubscribe link. You can also email us directly to be removed.
            </li>
            <li>
              <strong>Data deletion.</strong> To request deletion of your data,
              email{" "}
              <a href="mailto:shawn@livecorrectly.com">
                shawn@livecorrectly.com
              </a>
              .
            </li>
          </ul>

          <h2 className={styles.h2}>Third-party services</h2>
          <ul>
            <li>
              <strong>Google Analytics 4</strong> — website analytics
            </li>
            <li>
              <strong>Vercel</strong> — hosting and deployment
            </li>
            <li>
              <strong>Neon</strong> — database hosting
            </li>
            <li>
              <strong>Resend</strong> — email delivery
            </li>
            <li>
              <strong>Maia Mechanics</strong> — Human Design chart calculation
            </li>
          </ul>

          <h2 className={styles.h2}>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted
            on this page with an updated date.
          </p>

          <h2 className={styles.h2}>Contact</h2>
          <p>
            Lauzon Consulting LLC
            <br />
            Austin, TX
            <br />
            <a href="mailto:shawn@livecorrectly.com">
              shawn@livecorrectly.com
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
