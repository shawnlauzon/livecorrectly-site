import React from 'react';
import { getResendClient } from './resend-contacts';
import { getNewsletter } from '@/emails/newsletter-loader';
import { NewsletterTemplate } from '@/emails/newsletter-template';
import { getNewsletterSubject } from '@/emails/newsletter';
import { renderEmail } from '@/emails/send';

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
export async function renderNewsletterForBroadcast(newsletterNumber: number): Promise<{
  html: string;
  subject: string;
}> {
  // Use Resend template vars as subscriber values so they survive into the HTML
  const resendFirstName = '{{{contact.first_name|there}}}';
  const resendSubscriberId = '{{{contact.properties.neon_id}}}';

  const newsletter = getNewsletter(newsletterNumber, resendFirstName, resendSubscriberId);
  if (!newsletter) {
    throw new Error(`Newsletter ${newsletterNumber} not found`);
  }

  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
  const webUrl = newsletter.slug
    ? `${appUrl}/newsletter/${newsletter.slug}`
    : null;

  const component = React.createElement(NewsletterTemplate, {
    preview: newsletter.preview,
    bodyHtml: newsletter.bodyHtml,
    image: newsletter.image,
    chart: null,
    unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
    number: newsletter.number,
    webUrl,
    ps: newsletter.ps,
    subscriberId: resendSubscriberId,
    slug: newsletter.slug,
  });

  const html = await renderEmail(component);

  // Subject also needs Resend template vars for firstName
  const subject = getNewsletterSubject(newsletterNumber, resendFirstName, resendSubscriberId);

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
  const segmentName = `newsletter_${newsletterNumber}_${Date.now()}`;

  // 1. Create ephemeral segment
  const { data: segmentData, error: segmentError } = await client.segments.create({
    name: segmentName,
  });
  if (segmentError || !segmentData) {
    throw new Error(`Failed to create segment "${segmentName}": ${JSON.stringify(segmentError)}`);
  }
  const segmentId = segmentData.id;

  try {
    // 2. Add contacts to segment
    let contactCount = 0;
    for (const email of subscriberEmails) {
      const { error } = await client.contacts.segments.add({
        email,
        segmentId,
      });
      if (error) {
        // Contact may not exist in Resend yet — log and skip
        console.warn(`[broadcast] Failed to add ${email} to segment ${segmentId}:`, error);
        continue;
      }
      contactCount++;
    }

    if (contactCount === 0) {
      throw new Error(`No contacts could be added to segment for newsletter ${newsletterNumber}`);
    }

    // 3. Render HTML
    const { html, subject } = await renderNewsletterForBroadcast(newsletterNumber);

    // 4. Create + send broadcast
    const from = process.env.EMAIL_FROM_MARKETING ?? 'Shawn Lauzon <updates@livecorrectly.com>';
    const replyTo = process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';

    const { data: broadcastData, error: broadcastError } = await client.broadcasts.create({
      name: `Newsletter #${newsletterNumber}`,
      segmentId,
      from,
      replyTo,
      subject,
      html,
      send: true,
    });

    if (broadcastError || !broadcastData) {
      throw new Error(`Failed to create broadcast for newsletter ${newsletterNumber}: ${JSON.stringify(broadcastError)}`);
    }

    console.log(`[broadcast] Sent newsletter #${newsletterNumber} as broadcast ${broadcastData.id} to ${contactCount} contacts via segment ${segmentId}`);

    return {
      segmentId,
      broadcastId: broadcastData.id,
      contactCount,
    };
  } catch (err) {
    // Clean up the segment on failure before re-throwing
    await cleanupSegment(segmentId);
    throw err;
  }
}

/**
 * Delete an ephemeral segment. Logs errors but does not throw —
 * orphaned segments are harmless, just clutter the Resend dashboard.
 */
export async function cleanupSegment(segmentId: string): Promise<void> {
  try {
    const client = getResendClient();
    const { error } = await client.segments.remove(segmentId);
    if (error) {
      console.error(`[broadcast] Failed to clean up segment ${segmentId}:`, error);
    } else {
      console.log(`[broadcast] Cleaned up segment ${segmentId}`);
    }
  } catch (err) {
    console.error(`[broadcast] Error cleaning up segment ${segmentId}:`, err);
  }
}
