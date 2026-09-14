import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { resolveNewsletterHtml } from '@/newsletters/resolve';

/**
 * POST /api/admin/newsletters/preview
 *
 * Resolve Liquid tags in editor HTML for a specific subscriber.
 * Used by the admin newsletter editor's live preview pane.
 *
 * Body: { html: string, subscriberId: string }
 * Returns: { html: string }
 *
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { html, subscriberId, newsletterNumber } = body as {
    html?: string;
    subscriberId?: string;
    newsletterNumber?: number;
  };

  if (!html || !subscriberId) {
    return NextResponse.json(
      { error: 'html and subscriberId are required' },
      { status: 400 },
    );
  }

  const subscriber = await getSubscriberById(subscriberId);
  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  }

  const chartRecord = subscriber.chart?.chart;
  const chart = chartRecord ? parseChartForEmail(chartRecord) : null;

  const resolved = await resolveNewsletterHtml(html, {
    chart,
    mode: 'email',
    firstName: subscriber.first_name,
    lastName: subscriber.last_name ?? '',
    email: subscriber.email,
    subscriberId,
    newsletterNumber: newsletterNumber ?? 0,
  });

  return NextResponse.json({ html: resolved });
}
