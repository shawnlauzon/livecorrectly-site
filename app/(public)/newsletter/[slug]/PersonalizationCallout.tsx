'use client';

import Link from "next/link";
import { track } from "@/lib/analytics";
import styles from "./page.module.css";

interface PersonalizationCalloutProps {
  /** When true, mentions that personalized advice is available for subscribers */
  hasWebPersonalization?: boolean;
}

export default function PersonalizationCallout({ hasWebPersonalization }: PersonalizationCalloutProps) {
  return (
    <aside className={styles.callout}>
      <p>
        {hasWebPersonalization
          ? 'This article includes personalized advice based on your Human Design type.'
          : 'Subscribers receive this newsletter weekly, customized to their unique Human Design.'}
      </p>
      <p>
        <Link
          href="/see-your-design"
          onClick={() => track('cta_click', { location: 'newsletter_personalization_callout' })}
        >
          Get your free chart
        </Link>{' '}
        to get yours.
      </p>
    </aside>
  );
}
