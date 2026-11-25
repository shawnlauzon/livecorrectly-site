import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import ChartForm from "@/components/chart-form";
import RememberSubscriber from "@/components/remember-subscriber";
import PurchaseReport from "@/components/purchase-report";
import TrackedLink from "@/components/tracked-link";
import { getSubscriberById } from "@/lib/db";
import { findOffer, isCheckoutSessionId, isPayFirst } from "@/lib/offers";
import { isSubscriberId } from "@/lib/subscriber-cookie";
import { getRememberedSubscriberId } from "@/lib/subscriber-cookie-server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Thank you — Live Correctly",
  robots: { index: false },
};

/**
 * Where Stripe sends people after they pay for a pay-first offer
 * (redirect set on the Payment Link:
 * /work-with-me/thanks?offer=<id>&session_id={CHECKOUT_SESSION_ID}).
 * Known subscriber: they pick a time on the offer's unpaid Google Calendar
 * schedule. Anyone else gives birth details first (the guide needs them).
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
          <h1 className={styles.h1}>Thank you for your payment.</h1>
          <p className={styles.lede}>
            I&rsquo;ll email you about next steps, including a link to pick a time for our
            conversation.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  // An email link's ?s= wins (checked against the database); then the remember-me cookie.
  const subscriberParam = isSubscriberId(params.s) ? params.s : null;
  const fromLink = subscriberParam ? await getSubscriberById(subscriberParam) : null;
  const rememberedId = fromLink ? null : await getRememberedSubscriberId();
  const subscriber = fromLink ?? (rememberedId ? await getSubscriberById(rememberedId) : null);

  return (
    <>
      {fromLink && <RememberSubscriber id={fromLink.id} />}
      {sessionId && (
        <PurchaseReport
          sessionId={sessionId}
          item={{ id: offer.id, name: offer.name, price: offer.price }}
          subscriberId={subscriber?.id}
          offerId={subscriber ? offer.id : undefined}
        />
      )}
      <SiteNav subscriberId={subscriber?.id} />
      <main className={styles.page}>
        <p className="eyebrow">Thank you</p>
        {subscriber ? (
          <>
            <h1 className={styles.h1}>Now pick a time for our conversation.</h1>
            <p className={styles.lede}>
              Your personalized guide will be in your inbox within 24 hours. Book our
              conversation whenever it suits you.
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
            {/* The link email goes out with the purchase report, which needs a session. */}
            {sessionId && (
              <p className={styles.note}>
                I&rsquo;ve also emailed you this link, so you can book later.
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className={styles.h1}>One more step.</h1>
            <p className={styles.lede}>
              To write your personalized guide, I need your birth details. Then you can pick a
              time for our conversation.
            </p>
            <ChartForm purchase={{ sessionId, offer: { id: offer.id, scheduleUrl } }} />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
