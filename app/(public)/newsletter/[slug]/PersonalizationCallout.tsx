'use client';

import Link from "next/link";
import { track } from "@/lib/analytics";
import ChartLinkRequest from "@/components/chart-link-request";
import styles from "./page.module.css";

interface PersonalizationCalloutProps {
  /** Career design of the sample chart the issue was rendered against */
  sampleCareerDesign: string;
  /** Issue being read — an emailed link brings the subscriber back here */
  slug: string;
}

export default function PersonalizationCallout({ sampleCareerDesign, slug }: PersonalizationCalloutProps) {
  return (
    <aside className={styles.callout}>
      <p>
        <strong>You&rsquo;re reading the example version.</strong>{' '}
        Each issue is personalized to the reader&rsquo;s Human Design. The{' '}
        <mark className="sample-value">highlighted</mark> parts are written for a
        sample {sampleCareerDesign}.
      </p>
      <p>
        <Link
          href="/see-your-design"
          onClick={() => track('cta_click', { location: 'newsletter_sample_banner' })}
        >
          Get your free chart
        </Link>{' '}
        to get yours.
      </p>
      <p>
        Already have one?{' '}
        <ChartLinkRequest location="newsletter_sample_banner" slug={slug} />
      </p>
    </aside>
  );
}
