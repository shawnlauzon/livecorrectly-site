import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { updateSubscriberChart } from '@/lib/db';

/**
 * PATCH /api/admin/subscribers/[id]/update-chart
 *
 * Replaces the subscriber's chart JSONB with a freshly generated one.
 * Used after the admin refreshes a chart from the Maia API.
 *
 * Auth: Bearer <ADMIN_PASSWORD>
 * Body: { chart: ChartRecord }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.chart) {
      return NextResponse.json(
        { error: 'Missing chart in request body' },
        { status: 400 }
      );
    }

    const updated = await updateSubscriberChart(id, body.chart);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[admin] Error updating chart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
