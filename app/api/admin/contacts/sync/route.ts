import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getAllSubscribers, getSubscriberById } from '@/lib/db';
import { syncContactToResend } from '@/lib/resend-contacts';
import { syncBroadcastContactProperties } from '@/lib/resend-broadcasts';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';

/**
 * POST /api/admin/contacts/sync
 *
 * Force-sync specified subscribers to Resend.
 *
 * Body: { subscriberIds: string[] } or { all: true }
 *
 * For each subscriber:
 * 1. syncContactToResend() — creates/updates the contact with firstName, lastName, neon_id, chart properties
 * 2. syncBroadcastContactProperties() — syncs broadcast-specific properties (signup_month, etc.)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscriberIds, all } = body as {
      subscriberIds?: string[];
      all?: boolean;
    };

    if (!all && (!subscriberIds || subscriberIds.length === 0)) {
      return NextResponse.json(
        { error: 'Provide subscriberIds or { all: true }' },
        { status: 400 },
      );
    }

    let subscribers;
    if (all) {
      const allSubs = await getAllSubscribers();
      subscribers = allSubs.filter(
        s => s.email_status === 'active' || s.email_status === 'failed',
      );
    } else {
      // Fetch each subscriber by ID
      const fetched = await Promise.all(
        subscriberIds!.map(id => getSubscriberById(id)),
      );
      subscribers = fetched.filter(
        (s): s is NonNullable<typeof s> =>
          s !== null && (s.email_status === 'active' || s.email_status === 'failed'),
      );
    }

    let synced = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        const chart = subscriber.chart?.chart
          ? parseChartForEmail(subscriber.chart.chart)
          : undefined;

        await syncContactToResend({
          email: subscriber.email,
          firstName: subscriber.first_name,
          lastName: subscriber.last_name,
          subscriberId: subscriber.id,
          chart,
        });
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[contacts/sync] Failed to sync ${subscriber.email}:`, msg);
        errors.push(`${subscriber.email}: ${msg}`);
      }
    }

    // Sync broadcast-specific properties in bulk
    if (subscribers.length > 0) {
      try {
        await syncBroadcastContactProperties(subscribers);
      } catch (err) {
        console.error('[contacts/sync] Failed to sync broadcast properties:', err);
        errors.push(`Broadcast properties: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      synced,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[admin/contacts/sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
