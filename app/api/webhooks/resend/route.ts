import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByEmailForWebhook, updateEmailStatus, rollBackEmailSeries, recordEmailEvent, lookupEmailSendByResendId, lookupEmailTypeByBroadcastId, getMostRecentEmailSend } from '@/lib/db';
import { extractEmail } from '@/emails/send';
import { unsubscribeContactInResend } from '@/lib/resend-contacts';

/**
 * Resend webhook endpoint.
 * Handles email failure events (bounce, complaint, failed, suppressed)
 * and suppression list changes to update subscriber email status.
 *
 * Signature verification uses HMAC-SHA256 via crypto.subtle (no svix dependency).
 * Resend sends the signature in the `svix-signature` header.
 */

async function verifySignature(
  payload: string,
  headers: Headers
): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] RESEND_WEBHOOK_SECRET not configured');
    return false;
  }

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Resend/Svix signs: "${svix-id}.${svix-timestamp}.${body}"
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  // Secret is prefixed with "whsec_" and base64-encoded after that
  const secretBytes = Uint8Array.from(
    atob(secret.replace('whsec_', '')),
    (c) => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedContent)
  );

  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBytes))
  );

  // svix-signature can contain multiple signatures separated by spaces,
  // each prefixed with "v1,"
  const signatures = svixSignature.split(' ');
  return signatures.some((sig) => {
    const [version, sigValue] = sig.split(',');
    return version === 'v1' && sigValue === computedSignature;
  });
}

interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data: {
    // Email events use `to` (string[]) for recipients
    email_id?: string;
    to?: string[];
    from?: string;
    // Suppression events use `email` (string) for the address
    email?: string;
    origin?: 'bounce' | 'complaint' | 'manual';
    // contact.updated events include unsubscribed status
    unsubscribed?: boolean;
    // Tags echoed back from send-time (set via _sendEmail)
    tags?: Record<string, string>;
    // Present for broadcast emails
    broadcast_id?: string;
    // Click event details
    click?: { link: string; timestamp: string };
  };
}

export async function POST(request: NextRequest) {
  const payload = await request.text();

  const valid = await verifySignature(payload, request.headers);
  if (!valid) {
    console.error('[webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Resend echoes `to` as sent — may include display name ("Name <email>").
  // Extract the bare email address for DB lookup.
  const rawRecipient = event.data?.to?.[0];
  const recipientEmail = rawRecipient ? extractEmail(rawRecipient) : undefined;

  switch (event.type) {
    case 'email.bounced': {
      if (recipientEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(recipientEmail);
        if (subscriber) {
          await updateEmailStatus(subscriber.id, 'bounced');
          console.log(
            `[webhook] Bounced: ${recipientEmail} (subscriber ${subscriber.id})`
          );
          try {
            await unsubscribeContactInResend(recipientEmail);
          } catch (err) {
            console.error(`[webhook] Failed to sync bounce to Resend for ${recipientEmail}:`, err);
          }
        }
      }
      break;
    }

    case 'email.complained': {
      if (recipientEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(recipientEmail);
        if (subscriber) {
          await updateEmailStatus(subscriber.id, 'complained');
          console.log(
            `[webhook] Complained: ${recipientEmail} (subscriber ${subscriber.id})`
          );
          try {
            await unsubscribeContactInResend(recipientEmail);
          } catch (err) {
            console.error(`[webhook] Failed to sync complaint to Resend for ${recipientEmail}:`, err);
          }
        }
      }
      break;
    }

    case 'email.failed': {
      if (recipientEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(recipientEmail);
        if (subscriber) {
          await updateEmailStatus(subscriber.id, 'failed');
          await rollBackEmailSeries(subscriber.id);
          console.log(
            `[webhook] Failed: ${recipientEmail} (subscriber ${subscriber.id}), rolled back next_step`
          );
        }
      }
      break;
    }

    case 'email.suppressed':
    case 'suppression.added': {
      // email.suppressed uses data.to[], suppression.added uses data.email
      const rawSuppressed = event.data?.email;
      const suppressedEmail = rawSuppressed ? extractEmail(rawSuppressed) : recipientEmail;
      if (suppressedEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(suppressedEmail);
        if (subscriber) {
          await updateEmailStatus(subscriber.id, 'suppressed');
          console.log(
            `[webhook] ${event.type}: ${suppressedEmail} (subscriber ${subscriber.id})`
          );
        }
      }
      break;
    }

    case 'suppression.removed': {
      const rawRemoved = event.data?.email;
      const removedEmail = rawRemoved ? extractEmail(rawRemoved) : undefined;
      if (removedEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(removedEmail);
        if (subscriber && subscriber.email_status === 'suppressed') {
          await updateEmailStatus(subscriber.id, 'active');
          console.log(
            `[webhook] Suppression removed, reactivated: ${removedEmail} (subscriber ${subscriber.id})`
          );
        }
      }
      break;
    }

    case 'email.clicked':
    case 'email.opened': {
      if (recipientEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(recipientEmail);
        if (subscriber) {
          // Determine email_type from tags (transactional) or broadcast_id (broadcast)
          let emailType: string | null = null;
          let emailSendId: string | undefined;

          // Check tags first (set by _sendEmail for transactional emails)
          if (event.data.tags?.email_type) {
            emailType = event.data.tags.email_type;
          }

          // Try resend_email_id lookup
          if (!emailType && event.data.email_id) {
            const send = await lookupEmailSendByResendId(event.data.email_id);
            if (send) {
              emailType = send.email_type;
              emailSendId = send.id;
            }
          }

          // Try broadcast_id lookup
          if (!emailType && event.data.broadcast_id) {
            emailType = await lookupEmailTypeByBroadcastId(event.data.broadcast_id);
          }

          if (emailType) {
            const eventType = event.type === 'email.clicked' ? 'click' : 'open';
            const linkUrl = event.type === 'email.clicked' ? event.data.click?.link : undefined;
            await recordEmailEvent({
              subscriberId: subscriber.id,
              eventType,
              emailType,
              emailSendId,
              linkUrl,
              resendEmailId: event.data.email_id,
              occurredAt: event.created_at ? new Date(event.created_at) : undefined,
            });
          }

          console.log(
            `[webhook] ${event.type}: ${recipientEmail} (subscriber ${subscriber.id}, email_type=${emailType ?? 'unknown'})`
          );
        }
      }
      break;
    }

    case 'contact.updated': {
      // When a subscriber unsubscribes via their email client's built-in button
      // (e.g. Yahoo Mail), Resend marks the contact as unsubscribed and fires
      // this webhook. Our /api/unsubscribe endpoint is never hit in that flow.
      if (event.data.unsubscribed === true && event.data.email) {
        const contactEmail = extractEmail(event.data.email);
        const subscriber = await getSubscriberByEmailForWebhook(contactEmail);
        if (subscriber) {
          if (subscriber.email_status === 'active') {
            await updateEmailStatus(subscriber.id, 'unsubscribed');

            // Record unsubscribe event — infer email_type from most recent send
            const recentSend = await getMostRecentEmailSend(subscriber.id);
            await recordEmailEvent({
              subscriberId: subscriber.id,
              eventType: 'unsubscribe',
              emailType: recentSend?.email_type ?? 'unknown',
              occurredAt: event.created_at ? new Date(event.created_at) : undefined,
            });

            console.log(
              `[webhook] contact.updated: unsubscribed ${contactEmail} (subscriber ${subscriber.id})`
            );
          } else {
            // Don't downgrade bounced/complained/suppressed to unsubscribed
            console.log(
              `[webhook] contact.updated: ${contactEmail} already ${subscriber.email_status}, skipping`
            );
          }
        }
      }
      break;
    }

    // Acknowledge other events without action
    // case 'email.delivered':
    // case 'email.delivery_delayed': (transient — no status change)
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
