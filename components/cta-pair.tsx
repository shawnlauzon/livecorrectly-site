'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { FREE_CALL_URL } from '@/lib/offers';

/**
 * Main button + small line under it, shared by the hero and closing CTA.
 * New visitors: get their design (free), or see ways to work with me.
 * Known subscribers: work with me, or a free 15-minute conversation first.
 */
export default function CtaPair({
  subscriber = false,
  location,
  subClassName,
}: {
  subscriber?: boolean;
  location: string;
  subClassName?: string;
}) {
  if (subscriber) {
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
          Or{' '}
          <a
            className="link"
            href={FREE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('book_consultation_click', { location })}
          >
            book a free 15-minute conversation
          </a>{' '}
          to see how I can help
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
        Want to go deeper?{' '}
        <Link
          className="link"
          href="/work-with-me"
          onClick={() => track('work_with_me_click', { location })}
        >
          See ways to work with me
        </Link>
      </p>
    </>
  );
}
