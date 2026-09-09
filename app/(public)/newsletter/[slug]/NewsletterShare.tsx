'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import styles from './page.module.css';

interface NewsletterShareProps {
  url: string;
  title: string;
  slug: string;
}

export default function NewsletterShare({ url, title, slug }: NewsletterShareProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title });
        track('share_click', { slug, method: 'native' });
      } catch {
        // User cancelled native share — not an error
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      track('share_click', { slug, method: 'clipboard' });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail, analytics should never break UI
    }
  }

  return (
    <button
      type="button"
      className={styles.shareBtn}
      onClick={handleClick}
      aria-label="Share this newsletter"
      title="Share this newsletter"
    >
      {copied ? (
        <span className={styles.shareCopied}>Copied!</span>
      ) : (
        <svg
          className={styles.shareIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  );
}
