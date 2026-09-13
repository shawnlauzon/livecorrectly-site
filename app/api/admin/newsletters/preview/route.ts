import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { resolveLiquid } from '@/newsletters/liquid-properties';
import { resolveContactVars } from '@/newsletters/resolve-contact-vars';
import { resolveRelativeLinks } from '@/emails/markdown-renderer';

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
  if (!chartRecord) {
    // No chart data — return HTML with Liquid defaults applied (no chart context)
    let resolved = await resolveLiquid(html, {
      mode: 'email',
      firstName: subscriber.first_name,
      lastName: subscriber.last_name ?? '',
      email: subscriber.email,
    });
    resolved = resolveRelativeLinks(resolved, subscriberId, newsletterNumber ?? 0);
    return NextResponse.json({ html: resolved });
  }

  const chart = parseChartForEmail(chartRecord);
  let resolved = await resolveLiquid(html, {
    chart,
    mode: 'email',
    firstName: subscriber.first_name,
    lastName: subscriber.last_name ?? '',
    email: subscriber.email,
  });

  // Resolve any {{{contact.key}}} patterns remaining in the HTML
  resolved = resolveContactVars(resolved, chart);

  resolved = resolveRelativeLinks(resolved, subscriberId, newsletterNumber ?? 0);

  return NextResponse.json({ html: resolved });
}
