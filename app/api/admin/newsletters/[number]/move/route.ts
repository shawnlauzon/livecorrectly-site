import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { swapNewsletterIssues } from '@/lib/db';
import { clearNewsletterIssueCache } from '@/lib/newsletter/loader';
import { WELCOME_SERIES_LENGTH } from '@/lib/email/welcome';

/**
 * POST /api/admin/newsletters/[number]/move
 *
 * Body: { direction: 'up' | 'down' }
 *
 * Swap an unsent issue with the issue just before or after it. Returns the
 * issue's new number. Returns 409 if either issue has sends or schedule
 * history, or an engagement conditional refers to either number.
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
  if (isNaN(num) || num <= WELCOME_SERIES_LENGTH) {
    return NextResponse.json({ error: 'Invalid newsletter number' }, { status: 400 });
  }

  // A missing or malformed JSON body is a normal client error, not worth
  // logging: treat it as no direction so it falls through to the 400 below.
  const body = await request.json().catch(() => null);
  const direction = body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    return NextResponse.json({ error: "direction must be 'up' or 'down'" }, { status: 400 });
  }

  const target = direction === 'up' ? num - 1 : num + 1;
  if (target <= WELCOME_SERIES_LENGTH) {
    return NextResponse.json({ error: "Can't move into the welcome series" }, { status: 400 });
  }

  try {
    const result = await swapNewsletterIssues(num, target);
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }
    if (result !== 'swapped') {
      return NextResponse.json({ error: result.blocked }, { status: 409 });
    }
    clearNewsletterIssueCache();
    return NextResponse.json({ ok: true, number: target });
  } catch (error) {
    console.error(`[admin/newsletters/${num}/move] POST error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
