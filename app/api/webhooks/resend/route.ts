import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByEmailForWebhook, updateEmailStatus } from '@/lib/db';

/**
 * Resend webhook endpoint.
 * Handles bounce and complaint events to update subscriber email status.
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
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    // Other fields vary by event type
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

  const recipientEmail = event.data?.to?.[0];

  switch (event.type) {
    case 'email.bounced': {
      if (recipientEmail) {
        const subscriber = await getSubscriberByEmailForWebhook(recipientEmail);
        if (subscriber) {
          await updateEmailStatus(subscriber.id, 'bounced');
          console.log(
            `[webhook] Bounced: ${recipientEmail} (subscriber ${subscriber.id})`
          );
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
        }
      }
      break;
    }

    // Acknowledge other events without action
    // case 'email.delivered':
    // case 'email.opened':
    // case 'email.clicked':
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
