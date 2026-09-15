import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getNewsletterSegments } from '@/lib/db';
import { getResendClient } from '@/lib/resend-contacts';

/**
 * GET /api/admin/newsletters/segment/contacts?segmentId=<db-id>
 *
 * Fetch the contacts belonging to a persistent audience segment from Resend.
 * Returns the list of emails (and names if available) in the segment.
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

  const segmentId = request.nextUrl.searchParams.get('segmentId');
  if (!segmentId || isNaN(Number(segmentId))) {
    return NextResponse.json({ error: 'segmentId query param required' }, { status: 400 });
  }

  try {
    const segments = await getNewsletterSegments(1);
    const segment = segments.find(s => s.id === Number(segmentId));

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const client = getResendClient();
    const { data, error } = await client.contacts.list({
      segmentId: segment.resendSegmentId,
    });

    if (error || !data) {
      console.error('[segment/contacts] Failed to list contacts from Resend:', error);
      return NextResponse.json(
        { error: `Failed to fetch segment contacts: ${JSON.stringify(error)}` },
        { status: 500 },
      );
    }

    const contacts = (data.data ?? []).map((c) => ({
      email: c.email ?? '',
      firstName: c.first_name ?? '',
      lastName: c.last_name ?? null,
    }));

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('[segment/contacts] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
