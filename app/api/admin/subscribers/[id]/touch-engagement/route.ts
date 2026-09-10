import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, recordEmailEvent } from '@/lib/db';

/**
 * POST /api/admin/subscribers/[id]/touch-engagement
 *
 * Manually records engagement (e.g. subscriber replied to an email).
 * Creates a manual_engagement event in email_events.
 *
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    await recordEmailEvent({
      subscriberId: id,
      eventType: 'manual_engagement',
      emailType: 'admin_touch',
    });

    console.log(
      `[admin] Manual engagement touch for ${subscriber.email} (subscriber ${id})`
    );

    return NextResponse.json({ ok: true, occurred_at: new Date().toISOString() });
  } catch (error) {
    console.error('[admin] Error touching engagement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
