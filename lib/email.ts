import { Resend } from 'resend';
import { render } from 'react-email';
import { getActiveSubscriberByEmail } from './db';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Check if we can send email to an address.
 * Returns false if the subscriber is not active (unsubscribed, bounced, complained).
 */
export async function canSendTo(email: string): Promise<boolean> {
  const subscriber = await getActiveSubscriberByEmail(email);
  return subscriber !== null;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  unsubToken: string;
}

/**
 * Send an email via Resend. This is the SOLE Resend call site in the codebase.
 *
 * Checks:
 * 1. canSendTo() — skips if subscriber is not active
 * 2. EMAIL_SENDING_ENABLED kill switch — logs and returns if not 'true'
 * 3. Renders React component to HTML
 * 4. Sets List-Unsubscribe headers for one-click unsubscribe (RFC 8058)
 * 5. Calls resend.emails.send()
 */
export async function sendEmail({
  to,
  subject,
  react,
  unsubToken
}: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const sendable = await canSendTo(to);
  if (!sendable) {
    console.log(`[email] Skipping send to ${to}: subscriber not active`);
    return { success: false };
  }

  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${unsubToken}`;

  if (process.env.EMAIL_SENDING_ENABLED !== 'true') {
    console.log(
      `[email] Sending disabled. Would send to=${to} subject="${subject}" unsub=${unsubscribeUrl}`
    );
    return { success: false };
  }

  const from = process.env.EMAIL_FROM ?? 'Live Correctly <hello@livecorrectly.com>';
  const html = await render(react);

  const client = getResend();
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  });

  if (error) {
    console.error(`[email] Failed to send to ${to}:`, error);
    return { success: false };
  }

  console.log(`[email] Sent to=${to} subject="${subject}" id=${data?.id}`);
  return { success: true, id: data?.id };
}
