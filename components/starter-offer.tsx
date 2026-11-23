'use client';

import Wrap from './wrap';
import { track } from '@/lib/analytics';
import { STARTER } from '@/lib/offers';
import styles from './starter-offer.module.css';

/**
 * Homepage band for the Starter guide: one click to Stripe, delivered by email.
 * Until the Stripe link is set, the button opens an email to Shawn instead.
 */
export default function StarterOffer() {
  const buyUrl = STARTER.buyUrl;

  return (
    <section className={styles.section}>
      <Wrap className={styles.inner}>
        <div className={styles.copy}>
          <p className="eyebrow">Start here</p>
          <h2 className={styles.h2}>Your personalized guide to living correctly</h2>
          <p className={styles.body}>
            How you&rsquo;re built: how you make decisions, how you work best,
            and what wears you out. Written for you, in your inbox within 24
            hours.
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
        </div>
      </Wrap>
    </section>
  );
}
