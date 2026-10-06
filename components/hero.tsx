'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Wrap from './wrap';
import styles from './hero.module.css';
import { track } from '@/lib/analytics';

let hasAnimated = false;

/** `chartHref` is set for returning subscribers (remembered id) — the CTA goes to their chart. */
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
            <Link className="btn" href={chartHref ?? '/see-your-design'}
              onClick={() => track(chartHref ? 'your_chart_click' : 'cta_click', { location: 'hero' })}
            >
              See how you&rsquo;re designed
            </Link>
            <p className={styles.ctaSub}>
              Already have your chart, or want more depth?{' '}
              <a
                className="link"
                href={process.env.NEXT_PUBLIC_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('book_consultation_click', { location: 'hero' })}
              >
                Book a conversation
              </a>
            </p>
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
