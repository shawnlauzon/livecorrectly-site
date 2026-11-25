import type { Metadata } from "next";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import ChartForm from "@/components/chart-form";
import RememberSubscriber from "@/components/remember-subscriber";
import PurchaseReport from "@/components/purchase-report";
import { getSubscriberById } from "@/lib/db";
import { isCheckoutSessionId, STARTER } from "@/lib/offers";
import { isSubscriberId } from "@/lib/subscriber-cookie";
import { getGuideBuyerId, getRememberedSubscriberId } from "@/lib/subscriber-cookie-server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Thank you — Live Correctly",
  robots: { index: false },
};

/**
 * Where Stripe sends people after they buy the guide
 * (redirect set on the Payment Link: /guide/thanks?session_id={CHECKOUT_SESSION_ID}).
 * Known subscriber: nothing else to do. Anyone else: the normal chart form.
 */
export default async function GuideThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId = isCheckoutSessionId(params.session_id) ? params.session_id : null;

  // An email link's ?s= wins (checked against the database); then the buyer noted
  // by /guide/buy on the way to Stripe; then the remember-me cookie.
  const subscriberParam = isSubscriberId(params.s) ? params.s : null;
  const fromLink = subscriberParam ? await getSubscriberById(subscriberParam) : null;
  const rememberedId = fromLink
    ? null
    : ((await getGuideBuyerId()) ?? (await getRememberedSubscriberId()));
  const subscriber = fromLink ?? (rememberedId ? await getSubscriberById(rememberedId) : null);

  return (
    <>
      {fromLink && <RememberSubscriber id={fromLink.id} />}
      {sessionId && (
        <PurchaseReport
          sessionId={sessionId}
          item={{ id: STARTER.id, name: STARTER.name, price: STARTER.price }}
          subscriberId={subscriber?.id}
        />
      )}
      <SiteNav subscriberId={subscriber?.id} />
      <main className={styles.page}>
        <p className="eyebrow">Thank you</p>
        {subscriber ? (
          <>
            <h1 className={styles.h1}>You&rsquo;ll have your guide within 24 hours.</h1>
            <p className={styles.lede}>
              I already have your birth details, so there&rsquo;s nothing else
              to do.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.h1}>One more step.</h1>
            <p className={styles.lede}>
              To write your guide I need your birth details. It&rsquo;ll be in
              your inbox within 24 hours of sending them.
            </p>
            <ChartForm purchase={{ sessionId }} />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
