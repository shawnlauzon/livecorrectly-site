import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById, touchEngagement } from '@/lib/db';

export async function GET(
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

    // Fire-and-forget: record chart page visit as engagement (skip for admin previews)
    const isPreview = _request.nextUrl.searchParams.get('preview') === 'true';
    if (!isPreview) {
      touchEngagement(id).catch((err) => {
        console.error(`[engagement] Failed to touch engagement for ${id}:`, err);
      });
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
