import * as React from 'react';
import { buildUnsubscribeUrl } from './send';
import { getBroadcast, getBroadcastFileConfig } from './broadcast-loader';
import { BroadcastTemplate } from './broadcast-template';
import {
  buildChartVariables,
  replaceResendContactVars,
} from './markdown-renderer';
import type { EmailChartData } from '../lib/hd-chart/parse-for-email';

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
): {
  element: React.ReactElement;
  subject: string;
  preview: string;
  emailLabel: string;
  from?: string;
} {
  const broadcastConfig = getBroadcastFileConfig(slug);
  if (!broadcastConfig) {
    throw new Error(`Unknown broadcast slug: ${slug}`);
  }

  const emailLabel = slug.replace(/-/g, '_');
  const unsubscribeUrl = buildUnsubscribeUrl(unsubToken, emailLabel);

  // First pass: replace {{appUrl}} and chart variables (double-brace syntax)
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const variables: Record<string, string> = {
    appUrl,
    ...buildChartVariables(chart),
  };

  const broadcast = getBroadcast(slug, variables);
  if (!broadcast) {
    throw new Error(`Broadcast markdown file not found: broadcasts/${slug}.md`);
  }

  // Second pass: replace Resend contact property syntax with actual values
  // for admin preview rendering (in production sends, Resend does this).
  const contactVars: Record<string, string> = {
    first_name: firstName,
    neon_id: subscriberId,
    signup_month: formatMonth(createdAt),
    signup_month_year: formatMonthYear(createdAt),
    months_since_signup: String(monthsSince(createdAt)),
    RESEND_UNSUBSCRIBE_URL: unsubscribeUrl,
  };

  const element = React.createElement(BroadcastTemplate, {
    preview: replaceResendContactVars(broadcast.preview, contactVars),
    bodyHtml: replaceResendContactVars(broadcast.bodyHtml, contactVars),
    unsubscribeUrl,
    postscripts: broadcast.postscripts.map((ps) =>
      replaceResendContactVars(ps, contactVars),
    ),
  });

  return {
    element,
    subject: replaceResendContactVars(broadcast.subject, contactVars),
    preview: replaceResendContactVars(broadcast.preview, contactVars),
    emailLabel,
    from: broadcastConfig.from,
  };
}
