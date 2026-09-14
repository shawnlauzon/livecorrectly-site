import { getResendClient, ensureNeonIdProperty, ensureChartContactProperties } from './resend-contacts';
import { getNewsletterIssue } from '@/emails/newsletter-loader';
import { loadNewsletterIssue } from '@/newsletters/loader';
import { replaceVariables as replaceVars } from '@/emails/template-variables';
import { renderNewsletterEmail } from '@/emails/newsletter-template';
import { getNewsletterSubject } from '@/emails/newsletter';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { buildContactPropertyValues } from '@/newsletters/resolve';
import { upsertContactSyncState } from '@/lib/db';
import type { Subscriber } from '@/lib/types/subscriber';

let contactPropertiesEnsured = false;

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
 * Sync contact properties to Resend for each subscriber.
 * Ensures neon_id and chart-derived properties exist, then computes and
 * updates each subscriber's values.
 */
export async function syncContactProperties(
  subscribers: Subscriber[],
): Promise<void> {
  const client = getResendClient();

  // Ensure all property keys exist in Resend (once per process)
  if (!contactPropertiesEnsured) {
    await ensureNeonIdProperty();
    await ensureChartContactProperties();
    contactPropertiesEnsured = true;
  }

  // Compute and sync property values for each subscriber
  for (const subscriber of subscribers) {
    const properties: Record<string, string> = {};
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
    } else {
      // Record sync state with the chart properties just sent
      try {
        await upsertContactSyncState(subscriber.id, properties);
      } catch (syncErr) {
        // Don't let sync state recording failure block the send
        console.warn(
          `[broadcast] Failed to record sync state for ${subscriber.email}:`,
          syncErr instanceof Error ? syncErr.message : syncErr,
        );
      }
    }
  }
}

/**
 * Send pre-rendered HTML as a broadcast to a single subscriber.
 *
 * Used by admin manual sends: the newsletter is rendered with the subscriber's
 * real data (including personalized content for types like #4/#5), then sent
 * as a broadcast-of-one so Resend tracks opens and clicks.
 */
export async function sendPrerenderedBroadcast(opts: {
  name: string;
  html: string;
  subject: string;
  subscriber: Subscriber;
}): Promise<{ segmentId: string; broadcastId: string }> {
  const { name, html, subject, subscriber } = opts;

  // Sync contact properties for this subscriber
  await syncContactProperties([subscriber]);

  const client = getResendClient();

  // Clean up stale ephemeral segments to stay within Resend's segment limit
  await cleanupEphemeralSegments();

  const segmentName = `newsletter_admin_${Date.now()}`;

  // Create ephemeral segment
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

  // Add subscriber to segment
  const { error: addError } = await client.contacts.segments.add({
    email: subscriber.email,
    segmentId,
  });
  if (addError) {
    throw new Error(
      `Failed to add ${subscriber.email} to segment ${segmentId}: ${JSON.stringify(addError)}`,
    );
  }

  // Determine from/replyTo (same logic as sendNewsletterBroadcast)
  const broadcastDomain = process.env.EMAIL_DOMAIN_BROADCAST;
  const from = broadcastDomain
    ? `Shawn Lauzon <shawn@${broadcastDomain}>`
    : process.env.EMAIL_FROM_MARKETING ??
      'Shawn Lauzon <updates@livecorrectly.com>';
  const replyTo = broadcastDomain
    ? undefined
    : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';

  // Create + send broadcast
  const { data: broadcastData, error: broadcastError } =
    await client.broadcasts.create({
      name,
      segmentId,
      from,
      replyTo,
      subject,
      html,
      send: true,
    });

  if (broadcastError || !broadcastData) {
    throw new Error(
      `Failed to create broadcast "${name}": ${JSON.stringify(broadcastError)}`,
    );
  }

  console.log(
    `[broadcast] Sent "${name}" as broadcast ${broadcastData.id} to ${subscriber.email} via segment ${segmentId}`,
  );

  return { segmentId, broadcastId: broadcastData.id };
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

  const newsletter = await getNewsletterIssue(
    newsletterNumber,
    resendFirstName,
    null,
    resendSubscriberId,
  );
  if (!newsletter) {
    throw new Error(`Newsletter ${newsletterNumber} not found`);
  }

  const html = renderNewsletterEmail({
    bodyHtml: newsletter.bodyHtml,
    unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
    ps: newsletter.ps,
  });

  // Subject also needs Resend template vars for firstName
  const subject = await getNewsletterSubject(
    newsletterNumber,
    resendFirstName,
    resendSubscriberId,
  );

  return { html, subject };
}

/**
 * Render a newsletter for broadcast delivery using custom HTML.
 *
 * Used when the newsletter contains Liquid conditional blocks that have been
 * extracted and replaced with Resend contact property placeholders. The custom
 * HTML has {{{contact.nl_NN_sN|}}} in place of the Liquid blocks.
 *
 * Mirrors renderNewsletterForBroadcast but processes provided HTML instead
 * of loading from the standard path.
 */
export async function renderNewsletterForBroadcastWithHtml(
  newsletterNumber: number,
  customHtml: string,
): Promise<{
  html: string;
  subject: string;
}> {
  const resendFirstName = '{{{FIRST_NAME|there}}}';
  const resendSubscriberId = '{{{contact.neon_id}}}';

  // Load the newsletter for metadata (subject, preview, ps)
  const raw = await loadNewsletterIssue(newsletterNumber);
  if (!raw) {
    throw new Error(`Newsletter ${newsletterNumber} not found`);
  }

  // Build the variable map — matches the non-Liquid path in renderNewsletterForBroadcast
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const chartUrl = `${appUrl}/see-your-design/${resendSubscriberId}?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_${newsletterNumber}`;
  const vars: Record<string, string> = {
    firstName: resendFirstName,
    appUrl,
    chartUrl,
  };

  const subject = replaceVars(raw.subject, vars);
  const bodyHtml = replaceVars(customHtml, vars);
  const ps = raw.rawPs.map(p => replaceVars(p.trim(), vars));

  const html = renderNewsletterEmail({
    bodyHtml,
    unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
    ps,
  });

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
