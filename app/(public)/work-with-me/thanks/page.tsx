import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import OfferPurchase from "@/components/offer-purchase";
import TrackedLink from "@/components/tracked-link";
import { findOffer, isCheckoutSessionId, isPayFirst } from "@/lib/offers";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Thank you — Live Correctly",
  robots: { index: false },
};

/**
 * Where Stripe sends people after they pay for a pay-first offer
 * (redirect set on the Payment Link:
 * /work-with-me/thanks?offer=<id>&session_id={CHECKOUT_SESSION_ID}).
 * They pick a time on the offer's unpaid Google Calendar schedule.
 */
export default async function OfferThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const param = typeof params.offer === "string" ? params.offer : undefined;
  const offer = param ? findOffer(param) : undefined;
  const sessionId = isCheckoutSessionId(params.session_id) ? params.session_id : null;
  const scheduleUrl = offer && isPayFirst(offer) ? offer.scheduleUrl : undefined;

  if (!offer || !scheduleUrl) {
    // Without a paid session this is just a stray visit. With one, someone paid:
    // never bounce them away, and leave a signal for Shawn.
    if (!sessionId) redirect("/work-with-me");
    console.error(
      `[work-with-me/thanks] Paid session ${sessionId} has no pay-first offer "${param}": check the Stripe redirect URL and NEXT_PUBLIC_*_GUIDED env vars`,
    );
    return (
      <>
        <SiteNav />
        <main className={styles.page}>
          <p className="eyebrow">Thank you</p>
          <h1 className={styles.h1}>Thanks for booking.</h1>
          <p className={styles.lede}>I&rsquo;ll email you a link to pick your time.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      {sessionId && (
        <OfferPurchase
          sessionId={sessionId}
          offer={{ id: offer.id, name: offer.name, price: offer.price }}
        />
      )}
      <SiteNav />
      <main className={styles.page}>
        <p className="eyebrow">Thank you</p>
        <h1 className={styles.h1}>Now pick your time.</h1>
        <p className={styles.lede}>
          Choose a time for our conversation. You&rsquo;ll get a calendar invite as soon as you book.
        </p>
        <TrackedLink
          href={scheduleUrl}
          event="schedule_click"
          params={{ offer: offer.id }}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
        >
          Pick your time
        </TrackedLink>
        <p className={styles.note}>
          If you lose this page before booking, email{" "}
          <a className="link" href="mailto:shawn@livecorrectly.com">
            shawn@livecorrectly.com
          </a>{" "}
          and I&rsquo;ll send you the link.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
