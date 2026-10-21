import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { setNewsletterIssueOneOff } from '@/lib/db';
import { clearNewsletterIssueCache } from '@/lib/newsletter/loader';

/**
 * POST /api/admin/newsletters/[number]/one-off
 *
 * Body: { oneOff: boolean }
 *
 * Make an unsent issue a one-off (sent once to a chosen segment, outside the
 * series) or a series issue. The issue moves to the end of the other range, so
 * this returns its new number. Returns 409 if the issue (or a later series
 * issue that would be renumbered) has sends or schedule history, or an
 * engagement conditional refers to the issue's number.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number: numStr } = await params;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 1) {
    return NextResponse.json({ error: 'Invalid newsletter number' }, { status: 400 });
  }

  // A missing or malformed JSON body is a normal client error, not worth
  // logging: treat it as no value so it falls through to the 400 below.
  const body = await request.json().catch(() => null);
  const oneOff = body?.oneOff;
  if (typeof oneOff !== 'boolean') {
    return NextResponse.json({ error: 'oneOff must be true or false' }, { status: 400 });
  }

  try {
    const result = await setNewsletterIssueOneOff(num, oneOff);
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }
    if ('blocked' in result) {
      return NextResponse.json({ error: result.blocked }, { status: 409 });
    }
    clearNewsletterIssueCache();
    return NextResponse.json({ ok: true, number: result.number });
  } catch (error) {
    console.error(`[admin/newsletters/${num}/one-off] POST error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
