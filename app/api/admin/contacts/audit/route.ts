import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getAllSubscribers, getAllContactSyncStates, upsertContactSyncState } from '@/lib/db';
import { getResendClient } from '@/lib/resend-contacts';
import { computeExpectedContactValues } from '@/lib/contact-sync';
import contactProperties from '@/newsletters/contact-properties';
import { BROADCAST_CONTACT_PROPERTIES } from '@/lib/resend-broadcasts';

interface Diff {
  field: string;
  expected: string;
  actual: string;
}

interface ContactAuditResult {
  subscriberId: string;
  email: string;
  firstName: string;
  status: 'in_sync' | 'out_of_sync' | 'never_synced' | 'missing_in_resend' | 'error';
  syncedAt?: string;
  diffs: Diff[];
  expectedValues: Record<string, string>;
  errorMessage?: string;
}

/** All property keys that are tracked for comparison. */
const ALL_PROPERTY_KEYS = [
  'first_name',
  'last_name',
  'neon_id',
  ...Object.keys(contactProperties),
  ...Object.values(BROADCAST_CONTACT_PROPERTIES).map(e => e.key),
];

/**
 * GET /api/admin/contacts/audit
 *
 * Two modes:
 * - Default (no query param): local-only comparison against contact_sync_state.
 *   No Resend API calls. Instant.
 * - ?backfill=true: calls Resend API per contact to verify and populate
 *   contact_sync_state. Slow but seeds the DB for future local audits.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backfill = request.nextUrl.searchParams.get('backfill') === 'true';

  try {
    if (backfill) {
      return await runBackfillAudit();
    }
    return await runLocalAudit();
  } catch (error) {
    console.error('[admin/contacts/audit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Local-only audit: compare subscriber data against contact_sync_state.
 * No Resend API calls — uses the local snapshot of what was last synced.
 */
async function runLocalAudit() {
  const allSubscribers = await getAllSubscribers();
  const activeSubscribers = allSubscribers.filter(
    s => s.email_status === 'active' || s.email_status === 'failed',
  );
  const syncStates = await getAllContactSyncStates();

  const results: ContactAuditResult[] = activeSubscribers.map(subscriber => {
    const expected = computeExpectedContactValues(subscriber);
    const syncState = syncStates.get(subscriber.id);

    if (!syncState) {
      return {
        subscriberId: subscriber.id,
        email: subscriber.email,
        firstName: subscriber.first_name,
        status: 'never_synced',
        diffs: [],
        expectedValues: expected,
      };
    }

    const diffs: Diff[] = [];
    for (const key of ALL_PROPERTY_KEYS) {
      const expectedValue = expected[key] ?? '';
      const actualValue = syncState.syncedValues[key] ?? '';
      if (expectedValue !== actualValue) {
        diffs.push({
          field: key,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }

    return {
      subscriberId: subscriber.id,
      email: subscriber.email,
      firstName: subscriber.first_name,
      status: diffs.length === 0 ? 'in_sync' : 'out_of_sync',
      syncedAt: syncState.syncedAt,
      diffs,
      expectedValues: expected,
    };
  });

  const summary = {
    total: results.length,
    inSync: results.filter(r => r.status === 'in_sync').length,
    outOfSync: results.filter(r => r.status === 'out_of_sync').length,
    neverSynced: results.filter(r => r.status === 'never_synced').length,
    missing: 0,
    errors: 0,
  };

  return NextResponse.json({
    summary,
    results,
    propertyKeys: ALL_PROPERTY_KEYS,
    mode: 'local',
  });
}

/**
 * Backfill audit: call Resend API per contact to verify what's actually
 * in Resend, populate contact_sync_state, and return diffs.
 *
 * Also calls contacts.list() to detect contacts in Resend that are not
 * tracked locally (orphan contacts without a Neon subscriber).
 */
async function runBackfillAudit() {
  const allSubscribers = await getAllSubscribers();
  const activeSubscribers = allSubscribers.filter(
    s => s.email_status === 'active' || s.email_status === 'failed',
  );

  const client = getResendClient();
  const CONCURRENCY = 10;

  const results: ContactAuditResult[] = [];

  // Collect all subscriber emails for the orphan detection later
  const subscriberEmails = new Set(activeSubscribers.map(s => s.email.toLowerCase()));

  // Process subscribers in batches of CONCURRENCY.
  // Resend rate limit: 10 requests/second. We send CONCURRENCY requests
  // per batch then pause 1.1s to stay under the limit.
  for (let i = 0; i < activeSubscribers.length; i += CONCURRENCY) {
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    const batch = activeSubscribers.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (subscriber): Promise<ContactAuditResult> => {
        try {
          const { data, error } = await client.contacts.get({ email: subscriber.email });

          if (error || !data) {
            if (error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
              return {
                subscriberId: subscriber.id,
                email: subscriber.email,
                firstName: subscriber.first_name,
                status: 'missing_in_resend',
                diffs: [],
                expectedValues: computeExpectedContactValues(subscriber),
              };
            }
            return {
              subscriberId: subscriber.id,
              email: subscriber.email,
              firstName: subscriber.first_name,
              status: 'error',
              diffs: [],
              expectedValues: computeExpectedContactValues(subscriber),
              errorMessage: error ? JSON.stringify(error) : 'No data returned',
            };
          }

          // Extract string values from Resend's typed property format
          const rawProps = data.properties ?? {};
          const resendValues: Record<string, string> = {
            first_name: data.first_name ?? '',
            last_name: data.last_name ?? '',
          };
          for (const [key, prop] of Object.entries(rawProps)) {
            resendValues[key] = String(prop.value);
          }

          // Backfill: record what Resend actually has into contact_sync_state
          try {
            await upsertContactSyncState(subscriber.id, resendValues);
          } catch (syncErr) {
            console.warn(
              `[audit/backfill] Failed to record sync state for ${subscriber.email}:`,
              syncErr instanceof Error ? syncErr.message : syncErr,
            );
          }

          // Compare against expected values
          const expected = computeExpectedContactValues(subscriber);
          const diffs: Diff[] = [];
          for (const key of ALL_PROPERTY_KEYS) {
            const expectedValue = expected[key] ?? '';
            const actualValue = resendValues[key] ?? '';
            if (expectedValue !== actualValue) {
              diffs.push({
                field: key,
                expected: expectedValue,
                actual: actualValue,
              });
            }
          }

          return {
            subscriberId: subscriber.id,
            email: subscriber.email,
            firstName: subscriber.first_name,
            status: diffs.length === 0 ? 'in_sync' : 'out_of_sync',
            diffs,
            expectedValues: expected,
          };
        } catch (err) {
          return {
            subscriberId: subscriber.id,
            email: subscriber.email,
            firstName: subscriber.first_name,
            status: 'error',
            diffs: [],
            expectedValues: computeExpectedContactValues(subscriber),
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );
    results.push(...batchResults);
  }

  // Use contacts.list() to detect orphan contacts in Resend not tracked in Neon
  const untrackedEmails: string[] = [];
  try {
    const { data: listData, error: listError } = await client.contacts.list();
    if (!listError && listData?.data) {
      for (const contact of listData.data) {
        if (contact.email && !subscriberEmails.has(contact.email.toLowerCase())) {
          untrackedEmails.push(contact.email);
        }
      }
    }
  } catch (listErr) {
    // Non-fatal — orphan detection is informational
    console.warn('[audit/backfill] Failed to list Resend contacts:', listErr);
  }

  const summary = {
    total: results.length,
    inSync: results.filter(r => r.status === 'in_sync').length,
    outOfSync: results.filter(r => r.status === 'out_of_sync').length,
    neverSynced: 0,
    missing: results.filter(r => r.status === 'missing_in_resend').length,
    errors: results.filter(r => r.status === 'error').length,
  };

  return NextResponse.json({
    summary,
    results,
    propertyKeys: ALL_PROPERTY_KEYS,
    mode: 'backfill',
    untrackedEmails,
  });
}
