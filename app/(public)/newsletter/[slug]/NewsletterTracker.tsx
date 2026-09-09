'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

interface NewsletterTrackerProps {
  slug: string;
  issue: number;
  personalized: boolean;
}

export default function NewsletterTracker({ slug, issue, personalized }: NewsletterTrackerProps) {
  useEffect(() => {
    track('newsletter_view', { slug, issue, personalized });
  }, [slug, issue, personalized]);

  return null;
}
