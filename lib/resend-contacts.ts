import { Resend } from 'resend';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import contactProperties, { buildContactPropertyValues } from '@/newsletters/resolve';
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

/** Cached set of property keys known to exist in Resend (populated once per process). */
let existingPropertyKeys: Set<string> | null = null;

/**
 * Fetch all contact property keys from Resend (once per process).
 * Subsequent calls return the cached set, updated as new properties are created.
 */
async function getExistingPropertyKeys(): Promise<Set<string>> {
  if (existingPropertyKeys) return existingPropertyKeys;

  const client = getResendClient();
  const keys = new Set<string>();

  // Paginate through all properties (max 100 per page)
  let after: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await client.contactProperties.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (error || !data) {
      throw new Error(`Failed to list contact properties: ${JSON.stringify(error)}`);
    }
    for (const prop of data.data) {
      keys.add(prop.key);
    }
    hasMore = data.has_more;
    if (hasMore && data.data.length > 0) {
      after = data.data[data.data.length - 1].id;
    }
  }

  existingPropertyKeys = keys;
  return keys;
}

/**
 * Create a contact property in Resend if it doesn't already exist.
 * Updates the local cache on success.
 */
export async function createPropertyIfMissing(key: string): Promise<void> {
  const keys = await getExistingPropertyKeys();
  if (keys.has(key)) return;

  const client = getResendClient();
  const { error } = await client.contactProperties.create({
    key,
    type: 'string' as const,
  });
  if (error) {
    if ('statusCode' in error && (error as { statusCode: number }).statusCode === 409) {
      // Race condition: created between list and create — harmless
    } else {
      throw new Error(`Failed to create ${key} contact property: ${JSON.stringify(error)}`);
    }
  }

  keys.add(key);
}

/**
 * Delete newsletter section contact properties from Resend.
 * Used when sections are removed from a newsletter — the orphaned properties
 * must be deleted so stale values don't persist on contacts.
 *
 * Finds each property by listing all properties and matching by key,
 * then deletes by ID. Updates the local cache to remove the deleted keys.
 */
export async function deleteNewsletterProperties(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const client = getResendClient();
  const keysToDelete = new Set(keys);

  // List all properties to find the IDs for the keys we want to delete
  const propertyIds: Map<string, string> = new Map();
  let after: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await client.contactProperties.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (error || !data) {
      console.warn('[resend-contacts] Failed to list properties for deletion:', error);
      return;
    }
    for (const prop of data.data) {
      if (keysToDelete.has(prop.key)) {
        propertyIds.set(prop.key, prop.id);
      }
    }
    hasMore = data.has_more;
    if (hasMore && data.data.length > 0) {
      after = data.data[data.data.length - 1].id;
    }
  }

  // Delete each found property
  for (const [key, id] of propertyIds) {
    const { error } = await client.contactProperties.remove(id);
    if (error) {
      console.warn(`[resend-contacts] Failed to delete property "${key}" (${id}):`, error);
    } else {
      console.log(`[resend-contacts] Deleted property "${key}" (${id})`);
      // Remove from local cache
      if (existingPropertyKeys) {
        existingPropertyKeys.delete(key);
      }
    }
  }

  // Warn about keys we couldn't find
  for (const key of keysToDelete) {
    if (!propertyIds.has(key)) {
      console.warn(`[resend-contacts] Property "${key}" not found in Resend — may already be deleted`);
    }
  }
}

let neonIdPropertyEnsured = false;

/**
 * Ensure the neon_id contact property exists in Resend.
 * Called once per process before the first contact sync.
 */
export async function ensureNeonIdProperty(): Promise<void> {
  if (neonIdPropertyEnsured) return;
  await createPropertyIfMissing('neon_id');
  neonIdPropertyEnsured = true;
}

let chartPropertiesEnsured = false;

/**
 * Ensure chart-derived contact properties exist in Resend.
 * Iterates the contact-properties registry and creates each key as a
 * string-typed contact property. Called once per process.
 */
export async function ensureChartContactProperties(): Promise<void> {
  if (chartPropertiesEnsured) return;

  for (const key of Object.keys(contactProperties)) {
    await createPropertyIfMissing(key);
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
