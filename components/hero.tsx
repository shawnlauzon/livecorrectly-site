'use client';

import { useState } from 'react';
import Image from 'next/image';
import Wrap from './wrap';
import CtaPair from './cta-pair';
import styles from './hero.module.css';

let hasAnimated = false;

/** `chartHref` is set for returning subscribers (remembered id) — they get "Work with me", with their design as the small link. */
export default function Hero({ chartHref }: { chartHref?: string }) {
  const [skipAnimation] = useState(() => {
    // Track only in the browser: the page is server-rendered per request, and a
    // flag flipped on the server would persist across requests and mismatch hydration.
    if (typeof window === 'undefined') return false;
    if (hasAnimated) return true;
    hasAnimated = true;
    return false;
  });

  const done = skipAnimation ? ` ${styles.done}` : '';

  return (
    <section className={styles.hero}>
      <Wrap className={styles.grid}>
        <div className={styles.copy}>
          <p className="eyebrow">Human Design</p>

          <ul
            className={styles.advice}
            aria-label="Common advice that didn't fit"
          >
            <li className={`${styles.adviceLine} ${styles.strike1}${done}`}>
              Post five times a week.
            </li>
            <li className={`${styles.adviceLine} ${styles.strike2}${done}`}>
              You just need more discipline.
            </li>
            <li className={`${styles.adviceLine} ${styles.strike3}${done}`}>
              Be consistent.
            </li>
          </ul>

          <h1 className={styles.h1}>
            You&rsquo;ve tried it their way.
            <span className={styles.turnClip}>
              <span className={`${styles.turn}${done}`}>Now do it yours.</span>
            </span>
          </h1>

          <p className={styles.lede}>
            You&apos;ve spent enough time listening to what everyone else
            thinks. You&apos;re ready to try something different. Learn how
            you&mdash;specifically YOU&mdash;are designed for success.
          </p>

          <div className={styles.ctaGroup}>
            <CtaPair chartHref={chartHref} location="hero" subClassName={styles.ctaSub} />
          </div>
        </div>

        <div className={styles.photo}>
          <Image
            src="/hero-photo.jpg"
            alt="A person jumping with a smiley-face balloon"
            fill
            sizes="(max-width: 56rem) 100vw, 45vw"
            priority
          />
        </div>
      </Wrap>
    </section>
  );
}
