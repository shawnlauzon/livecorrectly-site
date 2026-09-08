import { Resend } from 'resend';

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
async function ensureNeonIdProperty(): Promise<void> {
  if (neonIdPropertyEnsured) return;

  const client = getResendClient();
  const { error } = await client.contactProperties.create({
    key: 'neon_id',
    type: 'string',
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

/**
 * Create or update a contact in Resend with their Neon subscriber ID as a property.
 * On 409 conflict (contact already exists), falls back to update.
 */
export async function syncContactToResend({
  email,
  firstName,
  lastName,
  subscriberId,
}: {
  email: string;
  firstName: string;
  lastName: string | null;
  subscriberId: string;
}): Promise<void> {
  await ensureNeonIdProperty();
  const client = getResendClient();

  const { error } = await client.contacts.create({
    email,
    firstName,
    ...(lastName && { lastName }),
    properties: { neon_id: subscriberId },
  });

  if (error) {
    // 409 = contact already exists — update instead
    if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
      const { error: updateError } = await client.contacts.update({
        email,
        firstName,
        ...(lastName && { lastName }),
        properties: { neon_id: subscriberId },
      });
      if (updateError) {
        throw new Error(`Failed to update Resend contact ${email}: ${JSON.stringify(updateError)}`);
      }
      console.log(`[resend-contacts] Updated existing contact: ${email}`);
      return;
    }

    throw new Error(`Failed to create Resend contact ${email}: ${JSON.stringify(error)}`);
  }

  console.log(`[resend-contacts] Created contact: ${email}`);
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
