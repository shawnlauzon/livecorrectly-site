import React from 'react';
import { getResendClient, ensureNeonIdProperty, ensureChartContactProperties } from './resend-contacts';
import { getNewsletter } from '@/emails/newsletter-loader';
import { NewsletterTemplate } from '@/emails/newsletter-template';
import { getNewsletterSubject } from '@/emails/newsletter';
import { renderEmail } from '@/emails/send';
import { getBroadcast } from '@/emails/broadcast-loader';
import { BroadcastTemplate } from '@/emails/broadcast-template';
import {
  formatMonth,
  formatMonthYear,
  monthsSince,
} from '@/emails/broadcast-config';
import { getBroadcastFileConfig } from '@/emails/broadcast-loader';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import contactProperties from '@/newsletters/contact-properties';
import { buildContactPropertyValues } from '@/newsletters/resolve-contact-vars';
import type { Subscriber } from '@/lib/types/subscriber';

/**
 * Broadcast template variables that require Resend contact properties.
 *
 * This is the single source of truth: to add a new template variable that
 * needs a per-contact property, add one entry here. The broadcast send flow
 * will ensure the property exists and sync computed values to each recipient
 * just before sending — no signup-flow changes or backfill scripts needed.
 */
const BROADCAST_CONTACT_PROPERTIES: Record<
  string,
  {
    key: string;
    compute: (subscriber: Subscriber) => string;
  }
> = {
  signupMonth: {
    key: 'signup_month',
    compute: (s) => formatMonth(s.created_at),
  },
  monthYear: {
    key: 'signup_month_year',
    compute: (s) => formatMonthYear(s.created_at),
  },
  monthsSinceSignup: {
    key: 'months_since_signup',
    compute: (s) => String(monthsSince(s.created_at)),
  },
};

let broadcastPropertiesEnsured = false;

/**
 * Delete all ephemeral segments (newsletter_* and broadcast_*) from Resend.
 *
 * Called before creating a new segment to stay within Resend's segment limit.
 * Resend captures the recipient list at broadcast creation time, so the segment
 * is not needed for delivery after the broadcast is created.
 */
async function cleanupEphemeralSegments(): Promise<void> {
  const client = getResendClient();
  const { data, error } = await client.segments.list();

  if (error || !data) {
    console.warn('[broadcast] Failed to list segments for cleanup:', error);
    return;
  }

  for (const segment of data.data) {
    if (
      segment.name.startsWith('newsletter_') ||
      segment.name.startsWith('broadcast_')
    ) {
      const { error: removeError } = await client.segments.remove(segment.id);
      if (removeError) {
        // Don't let a failed cleanup block the send
        console.warn(
          `[broadcast] Failed to remove ephemeral segment "${segment.name}" (${segment.id}):`,
          removeError,
        );
      } else {
        console.log(
          `[broadcast] Cleaned up ephemeral segment "${segment.name}" (${segment.id})`,
        );
      }
    }
  }
}

/**
 * Sync broadcast-specific contact properties to Resend for each subscriber.
 * Called just before sending a broadcast — ensures properties exist, then
 * computes and updates each subscriber's values.
 */
export async function syncBroadcastContactProperties(
  subscribers: Subscriber[],
): Promise<void> {
  const client = getResendClient();

  // Ensure all property keys exist in Resend (once per process)
  if (!broadcastPropertiesEnsured) {
    // Also ensure neon_id exists (may have been created at signup, but be safe)
    await ensureNeonIdProperty();
    // Ensure chart-derived contact properties exist
    await ensureChartContactProperties();

    for (const entry of Object.values(BROADCAST_CONTACT_PROPERTIES)) {
      const { error } = await client.contactProperties.create({
        key: entry.key,
        type: 'string' as const,
      });
      if (error) {
        if (
          'statusCode' in error &&
          (error as { statusCode: number }).statusCode === 409
        ) {
          // Property already exists — expected
        } else {
          throw new Error(
            `Failed to create ${entry.key} contact property: ${JSON.stringify(error)}`,
          );
        }
      }
    }
    broadcastPropertiesEnsured = true;
  }

  // Compute and sync property values for each subscriber
  for (const subscriber of subscribers) {
    const properties: Record<string, string> = {};
    for (const entry of Object.values(BROADCAST_CONTACT_PROPERTIES)) {
      properties[entry.key] = entry.compute(subscriber);
    }
    // Add chart-derived properties from the contact-properties registry
    if (subscriber.chart?.chart) {
      const chart = parseChartForEmail(subscriber.chart.chart);
      Object.assign(properties, buildContactPropertyValues(chart));
    }

    const { error } = await client.contacts.update({
      email: subscriber.email,
      properties,
    });
    if (error) {
      console.warn(
        `[broadcast] Failed to sync properties for ${subscriber.email}:`,
        error,
      );
    }
  }
}

/**
 * Render a newsletter for broadcast delivery.
 *
 * Template variables are replaced with Resend triple-brace template syntax
 * ({{{...}}}) so Resend substitutes per-contact values at send time.
 * Triple braces survive React Email rendering because curly braces are not
 * HTML-special characters — they appear as-is in the output HTML.
 *
 * chart is null because broadcast newsletters have no inline personalization.
 */
export async function renderNewsletterForBroadcast(
  newsletterNumber: number,
): Promise<{
  html: string;
  subject: string;
}> {
  // Use Resend template vars as subscriber values so they survive into the HTML.
  // Resend contact properties use lowercase dot syntax: {{{contact.key}}}.
  const resendFirstName = '{{{FIRST_NAME|there}}}';
  const resendSubscriberId = '{{{contact.neon_id}}}';

  const newsletter = getNewsletter(
    newsletterNumber,
    resendFirstName,
    resendSubscriberId,
  );
  if (!newsletter) {
    throw new Error(`Newsletter ${newsletterNumber} not found`);
  }

  const component = React.createElement(NewsletterTemplate, {
    preview: newsletter.preview,
    bodyHtml: newsletter.bodyHtml,
    image: newsletter.image,
    chart: null,
    unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
    number: newsletter.number,
    ps: newsletter.ps,
  });

  const html = await renderEmail(component);

  // Subject also needs Resend template vars for firstName
  const subject = getNewsletterSubject(
    newsletterNumber,
    resendFirstName,
    resendSubscriberId,
  );

  return { html, subject };
}

/**
 * Send a newsletter as a Resend broadcast.
 *
 * 1. Create an ephemeral segment
 * 2. Add each subscriber email to it (skip failures — contact may not exist)
 * 3. Render the newsletter HTML with Resend template vars
 * 4. Create + send the broadcast
 * 5. Return identifiers; caller handles next_step advancement
 */
export async function sendNewsletterBroadcast(
  newsletterNumber: number,
  subscriberEmails: string[],
): Promise<{ segmentId: string; broadcastId: string; contactCount: number }> {
  const client = getResendClient();

  // Clean up stale ephemeral segments to stay within Resend's segment limit
  await cleanupEphemeralSegments();

  const segmentName = `newsletter_${newsletterNumber}_${Date.now()}`;

  // 1. Create ephemeral segment
  const { data: segmentData, error: segmentError } =
    await client.segments.create({
      name: segmentName,
    });
  if (segmentError || !segmentData) {
    throw new Error(
      `Failed to create segment "${segmentName}": ${JSON.stringify(segmentError)}`,
    );
  }
  const segmentId = segmentData.id;

  // 2. Add contacts to segment
  let contactCount = 0;
  for (const email of subscriberEmails) {
    const { error } = await client.contacts.segments.add({
      email,
      segmentId,
    });
    if (error) {
      // Contact may not exist in Resend yet — log and skip
      console.warn(
        `[broadcast] Failed to add ${email} to segment ${segmentId}:`,
        error,
      );
      continue;
    }
    contactCount++;
  }

  if (contactCount === 0) {
    throw new Error(
      `No contacts could be added to segment for newsletter ${newsletterNumber}`,
    );
  }

  // 3. Render HTML
  const { html, subject } =
    await renderNewsletterForBroadcast(newsletterNumber);

  // 4. Create + send broadcast
  const broadcastDomain = process.env.EMAIL_DOMAIN_BROADCAST;
  const from = broadcastDomain
    ? `Shawn Lauzon <shawn@${broadcastDomain}>`
    : process.env.EMAIL_FROM_MARKETING ??
      'Shawn Lauzon <updates@livecorrectly.com>';
  // When using domain override, from is already shawn@ so no replyTo needed
  const replyTo = broadcastDomain
    ? undefined
    : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';

  const { data: broadcastData, error: broadcastError } =
    await client.broadcasts.create({
      name: `Newsletter #${newsletterNumber}`,
      segmentId,
      from,
      replyTo,
      subject,
      html,
      send: true,
    });

  if (broadcastError || !broadcastData) {
    throw new Error(
      `Failed to create broadcast for newsletter ${newsletterNumber}: ${JSON.stringify(broadcastError)}`,
    );
  }

  console.log(
    `[broadcast] Sent newsletter #${newsletterNumber} as broadcast ${broadcastData.id} to ${contactCount} contacts via segment ${segmentId}`,
  );

  return {
    segmentId,
    broadcastId: broadcastData.id,
    contactCount,
  };
}

/**
 * Render a broadcast markdown template for Resend Broadcast API delivery.
 *
 * The markdown files contain Resend contact property syntax directly
 * (e.g. {{{contact.first_name|there}}}), so this function only replaces
 * the {{appUrl}} variable. Resend substitutes contact properties at send time.
 */
export async function renderBroadcastForBroadcastApi(slug: string): Promise<{
  html: string;
  subject: string;
  preview: string;
}> {
  const broadcastConfig = getBroadcastFileConfig(slug);
  if (!broadcastConfig) {
    throw new Error(`Unknown broadcast slug: ${slug}`);
  }

  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';

  // Only appUrl needs replacing — contact properties use Resend syntax
  // directly in the markdown and are interpolated by Resend at send time.
  const variables: Record<string, string> = {
    appUrl,
  };

  const broadcast = getBroadcast(slug, variables);
  if (!broadcast) {
    throw new Error(`Broadcast markdown file not found: broadcasts/${slug}.md`);
  }

  const component = React.createElement(BroadcastTemplate, {
    preview: broadcast.preview,
    bodyHtml: broadcast.bodyHtml,
    unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
    postscripts: broadcast.postscripts,
  });

  const html = await renderEmail(component);

  return { html, subject: broadcast.subject, preview: broadcast.preview };
}

/**
 * Send a broadcast campaign email via the Resend Broadcast API.
 *
 * 1. Sync broadcast-specific contact properties (just-in-time)
 * 2. Create an ephemeral segment
 * 3. Add subscriber emails to it
 * 4. Render HTML with Resend template vars
 * 5. Create + send the broadcast
 * 6. Return identifiers; caller handles recordBroadcastSend()
 */
export async function sendBroadcastViaBroadcastApi(
  slug: string,
  subscribers: Subscriber[],
  options?: { from?: string; replyTo?: string },
): Promise<{ segmentId: string; broadcastId: string; contactCount: number }> {
  // 1. Sync computed properties to each recipient before sending
  await syncBroadcastContactProperties(subscribers);

  const client = getResendClient();

  // Clean up stale ephemeral segments to stay within Resend's segment limit
  await cleanupEphemeralSegments();

  const segmentName = `broadcast_${slug}_${Date.now()}`;

  // 2. Create ephemeral segment
  const { data: segmentData, error: segmentError } =
    await client.segments.create({
      name: segmentName,
    });
  if (segmentError || !segmentData) {
    throw new Error(
      `Failed to create segment "${segmentName}": ${JSON.stringify(segmentError)}`,
    );
  }
  const segmentId = segmentData.id;

  // 3. Add contacts to segment
  let contactCount = 0;
  for (const subscriber of subscribers) {
    const { error } = await client.contacts.segments.add({
      email: subscriber.email,
      segmentId,
    });
    if (error) {
      // Contact may not exist in Resend yet — log and skip
      console.warn(
        `[broadcast] Failed to add ${subscriber.email} to segment ${segmentId}:`,
        error,
      );
      continue;
    }
    contactCount++;
  }

  if (contactCount === 0) {
    throw new Error(
      `No contacts could be added to segment for broadcast ${slug}`,
    );
  }

  // 4. Render HTML
  const { html, subject } = await renderBroadcastForBroadcastApi(slug);

  // 5. Create + send broadcast
  // Caller overrides (options.from/replyTo) and per-broadcast config take priority.
  // When the domain override is used (and no caller/config from override),
  // from is already shawn@ so no separate replyTo is needed.
  const sendConfig = getBroadcastFileConfig(slug);
  const broadcastDomainForApi = process.env.EMAIL_DOMAIN_BROADCAST;
  const hasCallerFrom = !!(options?.from ?? sendConfig?.from);
  const from =
    options?.from ??
    sendConfig?.from ??
    (broadcastDomainForApi
      ? `Shawn Lauzon <shawn@${broadcastDomainForApi}>`
      : process.env.EMAIL_FROM_MARKETING ??
        'Shawn Lauzon <updates@livecorrectly.com>');
  const replyTo =
    options?.replyTo ??
    (hasCallerFrom || !broadcastDomainForApi
      ? process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>'
      : undefined);

  const { data: broadcastData, error: broadcastError } =
    await client.broadcasts.create({
      name: `Broadcast: ${slug}`,
      segmentId,
      from,
      replyTo,
      subject,
      html,
      send: true,
    });

  if (broadcastError || !broadcastData) {
    throw new Error(
      `Failed to create broadcast for ${slug}: ${JSON.stringify(broadcastError)}`,
    );
  }

  console.log(
    `[broadcast] Sent broadcast "${slug}" as ${broadcastData.id} to ${contactCount} contacts via segment ${segmentId}`,
  );

  return {
    segmentId,
    broadcastId: broadcastData.id,
    contactCount,
  };
}