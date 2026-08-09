import { Resend } from 'resend';
import { render } from 'react-email';
import { getActiveSubscriberByEmail } from '../lib/db';
import type { Subscriber } from '../lib/types/subscriber';

/**
 * Render a React Email component to HTML with post-processing.
 *
 * React Email's renderer strips the whitespace between a closing inline tag
 * (</em>, </strong>, </a>) and the next word. This restores it as &nbsp;
 * so the space is always preserved. The regex handles both cases: space
 * already stripped (</em>word) and space present but collapsible (</em> word).
 */
export async function renderEmail(component: React.ReactElement): Promise<string> {
  const html = await render(component);
  return html.replace(/<\/(em|strong|a)>\s*(\w)/g, '</$1>&nbsp;$2');
}

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
 * 2. Renders React component to HTML
 * 3. Sets List-Unsubscribe headers for one-click unsubscribe (RFC 8058)
 * 4. Calls resend.emails.send()
 *
 * Note: The CRON_EMAIL_ENABLED kill switch is checked in the cron route,
 * not here. This function always sends if the subscriber is active and
 * RESEND_API_KEY is set. Omit RESEND_API_KEY in .env.local to prevent
 * sends during local development.
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

  const from = process.env.EMAIL_FROM ?? 'Live Correctly <hello@livecorrectly.com>';
  const html = await renderEmail(react);

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

/**
 * Send a plain-text admin notification when a new subscriber signs up or restarts the series.
 * This bypasses canSendTo() and unsubscribe headers — it's an internal notification,
 * not a marketing email. Failures are logged but should never block registration.
 */
export async function sendAdminNotification(
  subscriber: Subscriber,
  chartType: string,
  isRestart = false
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'Live Correctly <hello@livecorrectly.com>';
  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const adminUrl = `${appUrl}/admin/${subscriber.id}`;

  const subject = isRestart
    ? `Series restarted: ${subscriber.first_name} (${chartType})`
    : `New signup: ${subscriber.first_name} (${chartType})`;

  const bodyPrefix = isRestart
    ? `Series restarted: ${subscriber.first_name} (${subscriber.email})`
    : `New subscriber: ${subscriber.first_name} (${subscriber.email})`;

  const client = getResend();
  const { error } = await client.emails.send({
    from,
    to: from,
    subject,
    text: [
      bodyPrefix,
      `Type: ${chartType}`,
      ``,
      `Admin: ${adminUrl}`,
    ].join('\n'),
  });

  if (error) {
    console.error('[email] Failed to send admin notification:', error);
  } else {
    console.log(`[email] Admin notification sent for ${subscriber.email}`);
  }
}
