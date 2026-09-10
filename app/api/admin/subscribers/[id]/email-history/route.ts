import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getEmailSendsForSubscriber, getEmailEventsForSubscriber } from '@/lib/db';

/**
 * GET /api/admin/subscribers/[id]/email-history
 *
 * Returns email sends and events for a subscriber.
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [sends, events] = await Promise.all([
    getEmailSendsForSubscriber(id),
    getEmailEventsForSubscriber(id),
  ]);

  return NextResponse.json({ sends, events });
}
