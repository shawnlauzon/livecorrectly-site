'use client';

import Link from 'next/link';
import Wrap from './wrap';
import { track } from '@/lib/analytics';
import { STARTER, findOffer, guideBuyUrl } from '@/lib/offers';
import styles from './starter-offer.module.css';

/**
 * Homepage band for the Starter guide: one click to Stripe, delivered by email.
 * Until the Stripe link is set, the button opens an email to Shawn instead.
 */
export default function StarterOffer({ subscriberId }: { subscriberId?: string | null }) {
  const buyUrl = guideBuyUrl(subscriberId);
  const guided = findOffer('guided');

  return (
    <section className={styles.section}>
      <Wrap className={styles.inner}>
        <div className={styles.copy}>
          <p className="eyebrow">Go further</p>
          <h2 className={styles.h2}>Your personalized guide to living correctly</h2>
          <p className={styles.body}>
            The free version shows you your design. The guide explains it:
            how you make decisions, how you work best, and what wears you out.
            About 30 pages, made to read on your phone. I put each one together
            myself, so it can take up to 24 hours to send it.
          </p>
        </div>
        <div className={styles.buy}>
          <p className={styles.price}>${STARTER.price}</p>
          <a
            className="btn"
            href={buyUrl ?? 'mailto:shawn@livecorrectly.com?subject=Personalized%20guide'}
            {...(buyUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() =>
              track('begin_checkout', {
                currency: 'USD',
                value: STARTER.price,
                items: [{ item_id: STARTER.id, item_name: STARTER.name, price: STARTER.price }],
                location: 'home_starter',
              })
            }
          >
            Get your guide
          </a>
          {/* Known subscribers' birth details are on file; /guide/thanks won't ask again. */}
          {!subscriberId && (
            <p className={styles.note}>
              After you pay, I&rsquo;ll ask for your birth details.
            </p>
          )}
          {guided && (
            <p className={styles.note}>
              Want to talk it through?{' '}
              <Link
                className="link"
                href={`/work-with-me#${guided.id}`}
                onClick={() => track('work_with_me_click', { location: 'home_starter' })}
              >
                One conversation includes the guide. ${guided.price} &rarr;
              </Link>
            </p>
          )}
        </div>
      </Wrap>
    </section>
  );
}
