import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById, updateEmailSeries } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Basic UUID format check
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    const subscriber = await getSubscriberById(id);

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    if (subscriber.email_status !== 'active') {
      return NextResponse.json(
        { error: 'Subscriber is not active' },
        { status: 422 }
      );
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await updateEmailSeries(id, 0, tomorrow);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error restarting email series:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
