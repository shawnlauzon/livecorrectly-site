import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import RememberSubscriber from "@/components/remember-subscriber";
import { getSubscriberById } from "@/lib/db";
import { isSubscriberId } from "@/lib/subscriber-cookie";
import { getRememberedSubscriberId } from "@/lib/subscriber-cookie-server";
import {
  BLACK_FRIDAY,
  currentPrice,
  FREE_CALL_URL,
  GUIDE_VALUE,
  OFFER_GROUPS,
  isPayFirst,
  offerBuyUrl,
  type Offer,
} from "@/lib/offers";
import OfferLink from "./OfferLink";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Work with me — Live Correctly",
  description:
    "Ways to work with Shawn Lauzon: one conversation, a deeper dive, your year ahead, your next ten years, or the person you keep clashing with.",
};

export default async function WorkWithMePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  // An email link's ?s= wins (checked against the database); otherwise the cookie.
  const subscriberParam = isSubscriberId(resolvedSearchParams.s) ? resolvedSearchParams.s : null;
  const fromLink = subscriberParam ? await getSubscriberById(subscriberParam) : null;
  const subscriberId = fromLink?.id ?? (await getRememberedSubscriberId());

  return (
    <>
      {fromLink && <RememberSubscriber id={fromLink.id} />}
      <SiteNav subscriberId={subscriberId ?? undefined} />
      <main className={styles.page}>
        <p className="eyebrow">Work with me</p>
        <h1 className={styles.h1}>Start with what you&rsquo;re dealing with.</h1>
        <p className={styles.lede}>
          You tell me what you&rsquo;re wrestling with, and I tell you what your
          design says about it. Pick the one that fits where you are.
        </p>

        {OFFER_GROUPS.map((group) => (
          <section key={group.id} className={styles.group} aria-labelledby={group.id}>
            <h2 id={group.id} className={styles.h2}>
              {group.heading}
            </h2>
            <p className={styles.problem}>{group.problem}</p>
            {group.quote && (
              <blockquote className={styles.quote}>
                <p>&ldquo;{group.quote.text}&rdquo;</p>
                <cite className={styles.cite}>&mdash; {group.quote.name}</cite>
              </blockquote>
            )}
            <ul className={styles.offers}>
              {group.offers.map((offer) => (
                <OfferItem
                  key={offer.id}
                  offer={offer}
                  subscriberId={subscriberId}
                  salePrice={
                    offer.id === BLACK_FRIDAY.offerId
                      ? BLACK_FRIDAY.price
                      : undefined
                  }
                />
              ))}
            </ul>
            {group.dateDependent && (
              <p className={styles.groupNote}>
                {subscriberId ? (
                  <>Not sure where you are? I&rsquo;ll email you when your dates come up.</>
                ) : (
                  <>
                    Not sure where you are?{" "}
                    <Link className="link" href="/see-your-design">
                      See how you&rsquo;re designed
                    </Link>
                    , and I&rsquo;ll email you when your dates come up.
                  </>
                )}
              </p>
            )}
          </section>
        ))}

        <section className={styles.group} aria-labelledby="coaching">
          <h2 id="coaching" className={styles.h2}>
            Over a few months
          </h2>
          <p className={styles.description}>
            Coaching over three, six or twelve months, for when you want someone
            alongside you while things change.
          </p>
          <p className={styles.groupNote}>
            <OfferLink className="link" href={FREE_CALL_URL} offerId="coaching" free>
              Book a free 15-minute call
            </OfferLink>
          </p>
        </section>

        <p className={styles.closing}>
          Not sure which fits?{" "}
          <OfferLink className="link" href={FREE_CALL_URL} offerId="not_sure" free>
            Book a free 15-minute call
          </OfferLink>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function OfferItem({
  offer,
  subscriberId,
  salePrice,
}: {
  offer: Offer;
  subscriberId: string | null;
  salePrice?: number;
}) {
  const includes = [
    offer.guides === 1 &&
      `Includes your personalized guide to living correctly ($${GUIDE_VALUE} value)`,
    offer.guides > 1 &&
      `Includes a personalized guide to living correctly for each of you ($${GUIDE_VALUE * offer.guides} value)`,
    offer.includesFollowUp && "Includes a 30-minute follow-up",
  ].filter(Boolean) as string[];

  return (
    <li id={offer.id} className={styles.offer}>
      <div className={styles.offerHead}>
        <h3 className={styles.h3}>{offer.name}</h3>
        <p className={styles.price}>
          {salePrice != null ? (
            <>
              <s className={styles.oldPrice}>${offer.price}</s> ${salePrice}
              <span className={styles.saleNote}> through {BLACK_FRIDAY.endsOn}</span>
            </>
          ) : (
            <>${offer.price}</>
          )}
        </p>
      </div>
      <p className={styles.description}>{offer.description}</p>
      {offer.details && <p className={styles.details}>{offer.details}</p>}
      {includes.length > 0 && (
        <ul className={styles.includes}>
          {includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        {isPayFirst(offer) ? (
          <OfferLink
            className={styles.book}
            href={offerBuyUrl(offer, subscriberId)}
            offerId={offer.id}
            checkout={{ name: offer.name, price: currentPrice(offer) }}
          >
            {offer.cta}
          </OfferLink>
        ) : offer.bookingUrl ? (
          <OfferLink className={styles.book} href={offer.bookingUrl} offerId={offer.id}>
            {offer.cta}
          </OfferLink>
        ) : (
          <OfferLink className={styles.book} href={FREE_CALL_URL} offerId={offer.id} free>
            Ask me about this
          </OfferLink>
        )}
        {offer.offerFreeCall && (offer.bookingUrl || isPayFirst(offer)) && (
          <OfferLink className="link" href={FREE_CALL_URL} offerId={offer.id} free>
            Or book a free 15-minute call first
          </OfferLink>
        )}
      </div>
    </li>
  );
}
