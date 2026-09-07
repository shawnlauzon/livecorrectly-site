import * as React from 'react';
import { Reengagement } from './reengagement';
import { RestartNotice } from './restart-notice';
import { buildUnsubscribeUrl } from './send';

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

/** Returns just the month name, e.g. "March" */
export function formatMonth(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'long',
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

interface BroadcastConfig {
  subject: string | ((props: { month: string }) => string);
  preview: string;
  component: React.ComponentType<BroadcastEmailProps>;
  /** Custom From header. When set, the broadcast cron uses _sendEmail() directly. */
  from?: string;
  /** Only send to subscribers at this next_step value. */
  nextStepFilter?: number;
}

export const BROADCASTS: Record<string, BroadcastConfig> = {
  'reengagement-2026-08': {
    subject: 'I sent you five emails last year and then disappeared',
    preview: "Let's begin again",
    component: Reengagement,
  },
  'restart-notice-2026-09': {
    subject: ({ month }) => `Your chart from ${month}`,
    preview: 'There was supposed to be more after it.',
    component: RestartNotice,
    from: 'Shawn Lauzon (Fractal Human Design) <shawn@livecorrectly.com>',
    nextStepFilter: 0,
  },
};

export type BroadcastSlug = keyof typeof BROADCASTS;

export interface BroadcastEmailProps {
  firstName: string;
  monthYear: string;
  monthsSinceSignup: number;
  month: string;
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
): { element: React.ReactElement; subject: string; preview: string; emailLabel: string; from?: string } {
  const broadcast = BROADCASTS[slug];
  if (!broadcast) {
    throw new Error(`Unknown broadcast slug: ${slug}`);
  }

  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const monthYear = formatMonthYear(createdAt);
  const month = formatMonth(createdAt);
  const monthsSinceSignup = monthsSince(createdAt);
  const emailLabel = slug.replace(/-/g, '_');
  const unsubscribeUrl = buildUnsubscribeUrl(unsubToken, emailLabel);
  const chartUrl = `${appUrl}/see-your-design/${subscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=${emailLabel}`;

  const element = React.createElement(broadcast.component, {
    firstName,
    monthYear,
    month,
    monthsSinceSignup,
    chartUrl,
    unsubscribeUrl,
  });

  const subject = typeof broadcast.subject === 'function'
    ? broadcast.subject({ month })
    : broadcast.subject;

  return {
    element,
    subject,
    preview: broadcast.preview,
    emailLabel,
    from: broadcast.from,
  };
}
