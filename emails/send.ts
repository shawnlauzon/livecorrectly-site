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
 * Format an email recipient in RFC 5322 format.
 * Returns "FirstName LastName <email>" or "FirstName <email>" if last_name is null.
 */
export function formatEmailRecipient(
  firstName: string,
  lastName: string | null,
  email: string
): string {
  const name = lastName ? `${firstName} ${lastName}` : firstName;
  return `${name} <${email}>`;
}

/**
 * Extract email address from either formatted recipient ("Name <email>") or plain email.
 */
export function extractEmail(recipient: string): string {
  const match = recipient.match(/<(.+)>/);
  return match ? match[1] : recipient;
}

/**
 * Build the unsubscribe URL for an email, optionally tagged with the email's campaign label.
 * Used both in List-Unsubscribe headers and in email body footer links.
 */
export function buildUnsubscribeUrl(unsubToken: string, emailLabel?: string): string {
  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const base = `${appUrl}/api/unsubscribe?token=${unsubToken}`;
  return emailLabel ? `${base}&utm_campaign=${encodeURIComponent(emailLabel)}` : base;
}

/**
 * Check if we can send email to an address.
 * Returns false if the subscriber is not active (unsubscribed, bounced, complained).
 * Handles both formatted recipients ("Name <email>") and plain email addresses.
 */
export async function canSendTo(recipient: string): Promise<boolean> {
  const email = extractEmail(recipient);
  const subscriber = await getActiveSubscriberByEmail(email);
  return subscriber !== null;
}

interface _SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  unsubToken: string;
  from: string;
  replyTo?: string;
  emailLabel?: string;
}

/**
 * Internal email send function. This is the SOLE Resend call site in the codebase.
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
 *
 * @internal Use sendWelcomeEmail(), sendMarketingEmail(), or sendTransactionalEmail() instead.
 */
export async function _sendEmail({
  to,
  subject,
  react,
  unsubToken,
  from,
  replyTo,
  emailLabel
}: _SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const sendable = await canSendTo(to);
  if (!sendable) {
    const email = extractEmail(to);
    console.log(`[email] Skipping send to ${email}: subscriber not active`);
    return { success: false };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(unsubToken, emailLabel);
  const html = await renderEmail(react);

  const client = getResend();
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    ...(replyTo && { replyTo }),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  });

  const email = extractEmail(to);
  if (error) {
    console.error(`[email] Failed to send to ${email}:`, error);
    return { success: false };
  }

  console.log(`[email] Sent to=${email} subject="${subject}" id=${data?.id}`);
  return { success: true, id: data?.id };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  unsubToken: string;
  emailLabel?: string;
}

/**
 * Send a welcome series email. Personal relationship-building emails from Shawn.
 * From: Shawn Lauzon <shawn@livecorrectly.com>
 */
export async function sendWelcomeEmail(options: SendEmailOptions) {
  const from = process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  return _sendEmail({ ...options, from });
}

/**
 * Send a broadcast/marketing email. Marketing campaigns with reply-to Shawn.
 * From: Shawn Lauzon <updates@livecorrectly.com>
 * Reply-To: Shawn Lauzon <shawn@livecorrectly.com>
 */
export async function sendMarketingEmail(options: SendEmailOptions) {
  const from = process.env.EMAIL_FROM_MARKETING ?? 'Shawn Lauzon <updates@livecorrectly.com>';
  const replyTo = process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  return _sendEmail({ ...options, from, replyTo });
}

/**
 * Send a transactional/system email. System notifications with reply-to Shawn.
 * From: Live Correctly <notifications@livecorrectly.com>
 * Reply-To: Shawn Lauzon <shawn@livecorrectly.com>
 */
export async function sendTransactionalEmail(options: SendEmailOptions) {
  const from = process.env.EMAIL_FROM_NOTIFICATIONS ?? 'Live Correctly <notifications@livecorrectly.com>';
  const replyTo = process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  return _sendEmail({ ...options, from, replyTo });
}

/**
 * Send a plain-text admin notification when a new subscriber signs up or restarts the series.
 * This bypasses canSendTo() and unsubscribe headers — it's an internal notification,
 * not a marketing email. Failures are logged but should never block registration.
 * Uses transactional configuration: From notifications@, Reply-To shawn@.
 */
export async function sendAdminNotification(
  subscriber: Subscriber,
  chartType: string,
  isRestart = false
): Promise<void> {
  const from = process.env.EMAIL_FROM_NOTIFICATIONS ?? 'Live Correctly <notifications@livecorrectly.com>';
  const replyTo = process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
  const adminUrl = `${appUrl}/admin/${subscriber.id}`;

  const subject = isRestart
    ? `Series restarted: ${subscriber.first_name} (${chartType})`
    : `New signup: ${subscriber.first_name} (${chartType})`;

  const bodyPrefix = isRestart
    ? `Series restarted: ${subscriber.first_name} (${subscriber.email})`
    : `New subscriber: ${subscriber.first_name} (${subscriber.email})`;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('[email] ADMIN_EMAIL not configured, skipping admin notification');
    return;
  }

  const client = getResend();
  const { error } = await client.emails.send({
    from,
    to: adminEmail,
    subject,
    text: [
      bodyPrefix,
      `Type: ${chartType}`,
      ``,
      `Admin: ${adminUrl}`,
    ].join('\n'),
    ...(replyTo && { replyTo }),
  });

  if (error) {
    console.error('[email] Failed to send admin notification:', error);
  } else {
    console.log(`[email] Admin notification sent for ${subscriber.email}`);
  }
}
