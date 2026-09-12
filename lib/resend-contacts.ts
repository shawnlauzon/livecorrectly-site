import { Resend } from 'resend';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import contactProperties from '@/newsletters/contact-properties';
import { buildContactPropertyValues } from '@/newsletters/resolve-contact-vars';
import { upsertContactSyncState } from '@/lib/db';

/**
 * Resend contact management — separate from emails/send.ts (the sole
 * resend.emails.send() call site). This module handles contacts,
 * segments, and broadcasts through its own Resend instance.
 */

let resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

let neonIdPropertyEnsured = false;

/**
 * Ensure the neon_id contact property exists in Resend.
 * Called once per process before the first contact sync.
 * 409 (already exists) is expected and harmless.
 */
export async function ensureNeonIdProperty(): Promise<void> {
  if (neonIdPropertyEnsured) return;

  const client = getResendClient();
  const { error } = await client.contactProperties.create({
    key: 'neon_id',
    type: 'string' as const,
  });
  if (error) {
    if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
      // Property already exists — expected
    } else {
      throw new Error(`Failed to create neon_id contact property: ${JSON.stringify(error)}`);
    }
  }

  neonIdPropertyEnsured = true;
}

let chartPropertiesEnsured = false;

/**
 * Ensure chart-derived contact properties exist in Resend.
 * Iterates the contact-properties registry and creates each key as a
 * string-typed contact property. Called once per process.
 * 409 (already exists) is expected and harmless.
 */
export async function ensureChartContactProperties(): Promise<void> {
  if (chartPropertiesEnsured) return;

  const client = getResendClient();
  for (const key of Object.keys(contactProperties)) {
    const { error } = await client.contactProperties.create({
      key,
      type: 'string' as const,
    });
    if (error) {
      if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
        // Property already exists — expected
      } else {
        throw new Error(`Failed to create ${key} contact property: ${JSON.stringify(error)}`);
      }
    }
  }

  chartPropertiesEnsured = true;
}

/**
 * Create or update a contact in Resend with their Neon subscriber ID as a property.
 * Broadcast-specific properties (signup_month, etc.) are synced just-in-time by
 * the broadcast send flow — not here at signup time.
 * On 409 conflict (contact already exists), falls back to update.
 */
export async function syncContactToResend({
  email,
  firstName,
  lastName,
  subscriberId,
  chart,
}: {
  email: string;
  firstName: string;
  lastName: string | null;
  subscriberId: string;
  chart?: EmailChartData;
}): Promise<void> {
  await ensureNeonIdProperty();
  if (chart) {
    await ensureChartContactProperties();
  }
  const client = getResendClient();

  const properties: Record<string, string> = {
    neon_id: subscriberId,
    ...(chart ? buildContactPropertyValues(chart) : {}),
  };

  const { error } = await client.contacts.create({
    email,
    firstName,
    ...(lastName && { lastName }),
    properties,
  });

  if (error) {
    // 409 = contact already exists — update instead
    if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
      const { error: updateError } = await client.contacts.update({
        email,
        firstName,
        ...(lastName && { lastName }),
        properties,
      });
      if (updateError) {
        throw new Error(`Failed to update Resend contact ${email}: ${JSON.stringify(updateError)}`);
      }
      console.log(`[resend-contacts] Updated existing contact: ${email}`);
      // Record sync state with the values just sent
      const syncValues: Record<string, string> = {
        first_name: firstName,
        last_name: lastName ?? '',
        ...properties,
      };
      await upsertContactSyncState(subscriberId, syncValues);
      return;
    }

    throw new Error(`Failed to create Resend contact ${email}: ${JSON.stringify(error)}`);
  }

  console.log(`[resend-contacts] Created contact: ${email}`);
  // Record sync state with the values just sent
  const syncValues: Record<string, string> = {
    first_name: firstName,
    last_name: lastName ?? '',
    ...properties,
  };
  await upsertContactSyncState(subscriberId, syncValues);
}

/**
 * Mark a contact as unsubscribed in Resend. Failures are logged, not thrown —
 * if Resend is down, the Neon-side unsubscribe still takes effect.
 */
export async function unsubscribeContactInResend(email: string): Promise<void> {
  const client = getResendClient();

  const { error } = await client.contacts.update({
    email,
    unsubscribed: true,
  });

  if (error) {
    console.error(`[resend-contacts] Failed to unsubscribe contact ${email} in Resend:`, error);
    return;
  }

  console.log(`[resend-contacts] Unsubscribed contact in Resend: ${email}`);
}
