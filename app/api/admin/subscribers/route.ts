import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getAllSubscribers, getLastEngagementBatch, getUnsubFromBatch } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract password from "Bearer <password>" format
    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subscribers + engagement/unsub data in parallel
    const [subscribers, engagementMap, unsubFromMap] = await Promise.all([
      getAllSubscribers(),
      getLastEngagementBatch(),
      getUnsubFromBatch(),
    ]);

    // Convert Maps to plain objects for JSON serialization
    const engagement: Record<string, string> = Object.fromEntries(engagementMap);
    const unsubFrom: Record<string, string> = Object.fromEntries(unsubFromMap);

    return NextResponse.json({ subscribers, engagement, unsubFrom });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
