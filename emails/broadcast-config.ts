import * as React from 'react';
import { buildUnsubscribeUrl } from './send';
import { getBroadcast } from './broadcast-loader';
import { BroadcastTemplate } from './broadcast-template';
import { buildChartVariables } from './markdown-renderer';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';
import type { Subscriber } from '../lib/types/subscriber';

/**
 * Dispatch/control configuration for a broadcast email.
 * Content (subject, preview, body) lives in broadcasts/*.md files.
 */
export interface BroadcastConfig {
  /** Whether the broadcast cron should send this broadcast. */
  enabled: boolean;
  /**
   * Predicate that decides whether a subscriber should receive this broadcast.
   * Called for every active subscriber who hasn't already received it.
   * Return true to include, false to skip.
   */
  filter: (subscriber: Subscriber) => boolean;
  /** Custom From header. When set, the broadcast cron uses _sendEmail() directly. */
  from?: string;
}

export const BROADCASTS: Record<string, BroadcastConfig> = {
  'reengagement-2026-08': {
    enabled: false,
    filter: (s) => new Date(s.created_at) < new Date('2026-08-01'),
  },
  'restart-notice-2026-09': {
    enabled: true,
    filter: (s) =>
      s.next_step === 0 &&
      new Date(s.created_at) < new Date('2026-09-01'),
    from: 'Shawn Lauzon (Fractal Human Design) <shawn@livecorrectly.com>',
  },
};

export type BroadcastSlug = keyof typeof BROADCASTS;

/** Return only broadcasts with enabled: true. */
export function getEnabledBroadcasts(): [string, BroadcastConfig][] {
  return Object.entries(BROADCASTS).filter(([, config]) => config.enabled);
}

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

/**
 * Build the React element, subject, and preview for a broadcast email.
 * Loads content from broadcasts/{slug}.md, renders markdown, replaces variables.
 */
export function buildBroadcastEmail(
  slug: string,
  subscriberId: string,
  firstName: string,
  createdAt: string,
  unsubToken: string,
  chart: EmailChartData,
): { element: React.ReactElement; subject: string; preview: string; emailLabel: string; from?: string } {
  const broadcastConfig = BROADCASTS[slug];
  if (!broadcastConfig) {
    throw new Error(`Unknown broadcast slug: ${slug}`);
  }

  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const emailLabel = slug.replace(/-/g, '_');
  const unsubscribeUrl = buildUnsubscribeUrl(unsubToken, emailLabel);
  const chartUrl = `${appUrl}/see-your-design/${subscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=${emailLabel}`;
  const monthYear = formatMonthYear(createdAt);
  const month = formatMonth(createdAt);
  const monthsSinceSignup = monthsSince(createdAt);

  // Build template variable map
  const variables: Record<string, string> = {
    firstName,
    appUrl,
    chartUrl,
    unsubscribeUrl,
    monthYear,
    month,
    monthsSinceSignup: String(monthsSinceSignup),
    ...buildChartVariables(chart),
  };

  const broadcast = getBroadcast(slug, variables);
  if (!broadcast) {
    throw new Error(`Broadcast markdown file not found: broadcasts/${slug}.md`);
  }

  const element = React.createElement(BroadcastTemplate, {
    preview: broadcast.preview,
    bodyHtml: broadcast.bodyHtml,
    unsubscribeUrl,
    postscripts: broadcast.postscripts,
  });

  return {
    element,
    subject: broadcast.subject,
    preview: broadcast.preview,
    emailLabel,
    from: broadcastConfig.from,
  };
}
