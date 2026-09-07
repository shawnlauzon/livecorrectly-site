'use client';

import { useCallback, useState } from 'react';
import styles from './page.module.css';

interface ShareLinkProps {
  /** The clean URL to share (no ?s= param) */
  url: string;
}

export default function ShareLink({ url }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — fall back to no-op
    }
  }, [url]);

  return (
    <p className={styles.shareLink}>
      Want to share this article?{' '}
      <button type="button" onClick={handleCopy} className={styles.shareLinkButton}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </p>
  );
}
