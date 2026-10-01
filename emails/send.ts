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

// Domain-level override: when set, constructs the from address using
// the specified domain. When unset, the existing EMAIL_FROM_* → hardcoded
// default chain is unchanged.
const TRANSACTIONAL_DOMAIN = process.env.EMAIL_DOMAIN_TRANSACTIONAL;

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
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
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
 * @internal Use sendWelcomeEmail() or sendTransactionalEmail() instead.
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

  // Derive Resend tags from emailLabel for dashboard segmentation
  const tags: { name: string; value: string }[] = [];
  if (emailLabel) {
    tags.push({ name: 'email_type', value: emailLabel });
    const category = emailLabel.startsWith('welcome') ? 'welcome'
      : emailLabel.startsWith('newsletter') ? 'newsletter'
      : 'broadcast';
    tags.push({ name: 'category', value: category });
  }

  const client = getResend();
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    ...(replyTo && { replyTo }),
    ...(tags.length > 0 && { tags }),
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
  const from = TRANSACTIONAL_DOMAIN
    ? `Shawn Lauzon <shawn@${TRANSACTIONAL_DOMAIN}>`
    : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  return _sendEmail({ ...options, from });
}

/**
 * Send a transactional/system email.
 * When domain override is set: From shawn@TRANSACTIONAL (no replyTo needed).
 * Otherwise: From notifications@ with reply-to shawn@.
 */
export async function sendTransactionalEmail(options: SendEmailOptions) {
  const from = TRANSACTIONAL_DOMAIN
    ? `Shawn Lauzon <shawn@${TRANSACTIONAL_DOMAIN}>`
    : process.env.EMAIL_FROM_NOTIFICATIONS ?? 'Live Correctly <notifications@livecorrectly.com>';
  // When using domain override, from is already shawn@ so no replyTo needed
  const replyTo = TRANSACTIONAL_DOMAIN
    ? undefined
    : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  return _sendEmail({ ...options, from, replyTo });
}

export interface InboundReply {
  /** Original sender, as received ("Name <email>" or bare address). */
  from: string;
  subject: string;
  html: string | null;
  text: string | null;
  headers: Record<string, string> | null;
  /** Base64-encoded attachment content. */
  attachments: { filename: string; content: string }[];
}

function adminMailbox(): string {
  return process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
}

/**
 * Display name for the forward's From header: the sender's name, or their bare
 * address when they have none. Quotes, angle brackets and control characters are
 * stripped so the value is safe inside a quoted display name.
 */
function senderDisplayName(from: string): string {
  const lt = from.lastIndexOf('<');
  const name = (lt === -1 ? '' : from.slice(0, lt))
    .replace(/["<>\\]|[\u0000-\u001f]/g, '')
    .trim();
  return name || extractEmail(from);
}

/**
 * Whether an inbound message should be forwarded to the admin mailbox.
 * Skips mail from the admin mailbox itself (prevents forward loops) and
 * auto-generated mail (out-of-office, bounces; RFC 3834 Auto-Submitted).
 */
export function shouldForwardReply(reply: Pick<InboundReply, 'from' | 'headers'>): boolean {
  if (extractEmail(reply.from).toLowerCase() === extractEmail(adminMailbox()).toLowerCase()) {
    return false;
  }
  const autoSubmitted = Object.entries(reply.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'auto-submitted'
  )?.[1];
  return !autoSubmitted || autoSubmitted.trim().toLowerCase() === 'no';
}

/**
 * Forward an inbound reply (received by Resend on the broadcast domain) to the
 * admin's real mailbox so it looks like a message sent directly to them:
 * original subject and body, the sender's name as the From display name, and
 * Reply-To set to the sender so replying from the mail client answers them.
 * The From *address* must stay on a verified domain (it cannot be the sender's).
 *
 * Bypasses canSendTo() and unsubscribe headers: the recipient is the admin, not
 * a subscriber, and the sender may not be a subscriber at all. Sent from the
 * system sender (never the receiving domain) so the forward cannot loop back
 * into Resend inbound.
 */
export async function forwardInboundReply(
  reply: InboundReply
): Promise<{ success: boolean; id?: string }> {
  if (!shouldForwardReply(reply)) {
    console.log(`[email] Not forwarding reply from ${extractEmail(reply.from)} (loop guard / auto-generated)`);
    return { success: false };
  }

  const systemSender = TRANSACTIONAL_DOMAIN
    ? `shawn@${TRANSACTIONAL_DOMAIN}`
    : extractEmail(process.env.EMAIL_FROM_NOTIFICATIONS ?? 'notifications@livecorrectly.com');
  const from = `"${senderDisplayName(reply.from)}" <${systemSender}>`;

  const client = getResend();
  const { data, error } = await client.emails.send({
    from,
    to: adminMailbox(),
    replyTo: reply.from,
    subject: reply.subject,
    ...(reply.html ? { html: reply.html } : { text: reply.text ?? '' }),
    ...(reply.attachments.length > 0 && { attachments: reply.attachments }),
  });

  if (error) {
    console.error(`[email] Failed to forward reply from ${extractEmail(reply.from)}:`, error);
    return { success: false };
  }

  console.log(`[email] Forwarded reply from ${extractEmail(reply.from)} id=${data?.id}`);
  return { success: true, id: data?.id };
}

/**
 * Send a plain-text admin notification when a new subscriber signs up or restarts the series.
 * This bypasses canSendTo() and unsubscribe headers — it's an internal notification,
 * not a marketing email. Failures are logged but should never block registration.
 * When domain override is set: From shawn@TRANSACTIONAL (no replyTo needed).
 * Otherwise: From notifications@ with reply-to shawn@.
 */
export async function sendAdminNotification(
  subscriber: Subscriber,
  chartType: string,
  isRestart = false
): Promise<void> {
  const from = TRANSACTIONAL_DOMAIN
    ? `Shawn Lauzon <shawn@${TRANSACTIONAL_DOMAIN}>`
    : process.env.EMAIL_FROM_NOTIFICATIONS ?? 'Live Correctly <notifications@livecorrectly.com>';
  // When using domain override, from is already shawn@ so no replyTo needed
  const replyTo = TRANSACTIONAL_DOMAIN
    ? undefined
    : process.env.EMAIL_FROM ?? 'Shawn Lauzon <shawn@livecorrectly.com>';
  const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
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
