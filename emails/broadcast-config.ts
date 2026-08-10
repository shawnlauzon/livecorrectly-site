import * as React from 'react';
import { Reengagement } from './reengagement';

/**
 * Shared broadcast email configuration
 * Used by both send and preview endpoints to ensure identical output
 */

export function formatMonthYear(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function monthsSince(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return (
    (now.getUTCFullYear() - created.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - created.getUTCMonth())
  );
}

export const BROADCASTS = {
  'reengagement-2026-08': {
    subject: 'I sent you five emails last year and then disappeared',
    preview: "Let's start over",
    component: Reengagement,
  },
} as const;

export type BroadcastSlug = keyof typeof BROADCASTS;

export interface BroadcastEmailProps {
  preview: string;
  firstName: string;
  monthYear: string;
  monthsSinceSignup: number;
  chartUrl: string;
  unsubscribeUrl: string;
}

/**
 * Build the React element for a broadcast email
 * Ensures both preview and send use identical props
 */
export function buildBroadcastEmail(
  slug: BroadcastSlug,
  subscriberId: string,
  firstName: string,
  createdAt: string,
  unsubToken: string,
): { element: React.ReactElement; subject: string; preview: string } {
  const broadcast = BROADCASTS[slug];
  if (!broadcast) {
    throw new Error(`Unknown broadcast slug: ${slug}`);
  }

  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const monthYear = formatMonthYear(createdAt);
  const monthsSinceSignup = monthsSince(createdAt);
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${unsubToken}`;
  const chartUrl = `${appUrl}/see-your-design/${subscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=${slug.replace(/-/g, '_')}`;

  const element = React.createElement(broadcast.component, {
    preview: broadcast.preview,
    firstName,
    monthYear,
    monthsSinceSignup,
    chartUrl,
    unsubscribeUrl,
  });

  return {
    element,
    subject: broadcast.subject,
    preview: broadcast.preview,
  };
}
