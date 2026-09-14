import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getNewsletterPublication, updateNewsletterPublication } from '@/lib/db';

/**
 * GET /api/admin/newsletters/settings
 *
 * Return the newsletter publication settings (schedule, cadence, timezone).
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

  try {
    const publication = await getNewsletterPublication(1);
    if (!publication) {
      return NextResponse.json({ error: 'Newsletter publication not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: publication.name,
      nextSendAt: publication.nextSendAt,
      intervalDays: publication.intervalDays,
      timezone: publication.timezone,
    });
  } catch (error) {
    console.error('[admin/newsletters/settings] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/newsletters/settings
 *
 * Update the newsletter publication settings.
 * Accepts: { nextSendAt?: string | null, intervalDays?: number, timezone?: string }
 */
export async function PUT(request: NextRequest) {
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
    const { nextSendAt, intervalDays, timezone } = body;

    const updated = await updateNewsletterPublication(1, {
      nextSendAt,
      intervalDays,
      timezone,
    });

    return NextResponse.json({
      name: updated.name,
      nextSendAt: updated.nextSendAt,
      intervalDays: updated.intervalDays,
      timezone: updated.timezone,
    });
  } catch (error) {
    console.error('[admin/newsletters/settings] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
