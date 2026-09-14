import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, getNewsletterEngagement } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { resolveNewsletterHtml } from '@/newsletters/resolve';
import type { EngagementData } from '@/newsletters/resolve';
import { renderNewsletterEmail } from '@/emails/newsletter-template';

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
  const { html, subscriberId, newsletterNumber, postscripts } = body as {
    html?: string;
    subscriberId?: string;
    newsletterNumber?: number;
    postscripts?: string[];
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

  // Load engagement data for newsletter conditionals (opened/sent checks)
  const engagementMap = await getNewsletterEngagement(subscriberId);
  const engagement: EngagementData = { newsletters: engagementMap };

  const resolved = await resolveNewsletterHtml(html, {
    chart,
    mode: 'email',
    firstName: subscriber.first_name,
    lastName: subscriber.last_name ?? '',
    email: subscriber.email,
    subscriberId,
    newsletterNumber: newsletterNumber ?? 0,
    engagement,
  });

  const chromed = renderNewsletterEmail({
    bodyHtml: resolved,
    unsubscribeUrl: '#',
    ps: postscripts?.filter(Boolean) ?? [],
  });

  return NextResponse.json({ html: chromed });
}
