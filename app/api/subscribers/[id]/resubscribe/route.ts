import { NextRequest, NextResponse } from 'next/server';
import { isSubscriberId } from '@/lib/subscriber-cookie';
import { resubscribe } from '@/lib/email/resubscribe';

/**
 * Resubscribe from the web "Resubscribe" button. The id comes from the visitor's
 * own personalized link or remembered cookie — the same credential that shows
 * them their personalized pages.
 *
 * Answers { ok: true } whether or not anything changed, so it doesn't reveal
 * a subscriber's status.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isSubscriberId(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    await resubscribe(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[resubscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
