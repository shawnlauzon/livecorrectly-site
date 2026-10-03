'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getAdminPassword } from '@/lib/admin-client-auth';
import styles from './AdminEditLink.module.css';

interface AdminEditLinkProps {
  href: string;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/**
 * Edit (pencil) link into /admin, shown only when an admin password is stored
 * in this browser. Presence is enough — it's a shortcut, and the editor itself
 * enforces auth on every API call. Renders nothing on the server so the static
 * page is identical for every visitor.
 */
export default function AdminEditLink({ href }: AdminEditLinkProps) {
  const isAdmin = useSyncExternalStore(
    subscribe,
    () => getAdminPassword() !== null,
    () => false,
  );

  if (!isAdmin) return null;

  return (
    <Link href={href} className={styles.edit} aria-label="Edit" title="Edit">
      <svg
        className={styles.icon}
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
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </Link>
  );
}
