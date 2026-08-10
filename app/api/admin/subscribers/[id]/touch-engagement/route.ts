import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, touchEngagement } from '@/lib/db';

/**
 * POST /api/admin/subscribers/[id]/touch-engagement
 *
 * Manually records engagement (e.g. subscriber replied to an email).
 * Updates last_engaged_at to now().
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

    await touchEngagement(id);

    console.log(
      `[admin] Manual engagement touch for ${subscriber.email} (subscriber ${id})`
    );

    return NextResponse.json({ ok: true, last_engaged_at: new Date().toISOString() });
  } catch (error) {
    console.error('[admin] Error touching engagement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
