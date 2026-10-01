import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getNewsletterPublication, updateNewsletterPublication } from '@/lib/db';
import type { NewsletterPublication } from '@/lib/db';
import { nextRegularSendAt } from '@/lib/newsletter/cadence';

function settingsResponse(publication: NewsletterPublication) {
  return {
    name: publication.name,
    sendWeekday: publication.sendWeekday,
    sendTime: publication.sendTime,
    timezone: publication.timezone,
    nextRegularSendAt: nextRegularSendAt(publication)?.toISOString() ?? null,
  };
}

/**
 * GET /api/admin/newsletters/settings
 *
 * Return the newsletter publication's weekly cadence (weekday, time, timezone)
 * plus the next regular send time derived from it.
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

    return NextResponse.json(settingsResponse(publication));
  } catch (error) {
    console.error('[admin/newsletters/settings] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/newsletters/settings
 *
 * Update the newsletter publication's weekly cadence.
 * Accepts: { sendWeekday?: 0-6, sendTime?: "HH:MM", timezone?: string }
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
    const { sendWeekday, sendTime, timezone } = body;

    if (sendWeekday !== undefined && (!Number.isInteger(sendWeekday) || sendWeekday < 0 || sendWeekday > 6)) {
      return NextResponse.json({ error: 'sendWeekday must be an integer 0-6' }, { status: 400 });
    }
    if (sendTime !== undefined && (typeof sendTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime))) {
      return NextResponse.json({ error: 'sendTime must be HH:MM' }, { status: 400 });
    }

    const updated = await updateNewsletterPublication(1, {
      sendWeekday,
      sendTime,
      timezone,
    });

    return NextResponse.json(settingsResponse(updated));
  } catch (error) {
    console.error('[admin/newsletters/settings] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
