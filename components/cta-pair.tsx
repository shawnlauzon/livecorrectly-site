'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { FREE_CALL_URL } from '@/lib/offers';

/**
 * Main button + small line under it, shared by the hero and closing CTA.
 * New visitors: get their design (free), or book a free call.
 * Subscribers (`chartHref` set): work with me, or go back to their design.
 */
export default function CtaPair({
  chartHref,
  location,
  subClassName,
}: {
  chartHref?: string;
  location: string;
  subClassName?: string;
}) {
  if (chartHref) {
    return (
      <>
        <Link
          className="btn"
          href="/work-with-me"
          onClick={() => track('work_with_me_click', { location })}
        >
          Work with me
        </Link>
        <p className={subClassName}>
          Or go back to{' '}
          <Link
            className="link"
            href={chartHref}
            onClick={() => track('your_chart_click', { location })}
          >
            your design
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Link
        className="btn"
        href="/see-your-design"
        onClick={() => track('cta_click', { location })}
      >
        See how you&rsquo;re designed (free)
      </Link>
      <p className={subClassName}>
        Prefer to talk first?{' '}
        <a
          className="link"
          href={FREE_CALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('book_consultation_click', { location })}
        >
          Book a free 15-minute call
        </a>
      </p>
    </>
  );
}
