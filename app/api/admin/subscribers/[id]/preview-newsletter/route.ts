import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { renderEmail } from '@/emails/send';
import { getNewsletterEmail, getNewsletterSubject, getNewsletterNumbers } from '@/emails/newsletter';
import { getNewsletter } from '@/emails/newsletter-loader';

/**
 * GET /api/admin/subscribers/[id]/preview-newsletter?step=1
 *
 * Renders a newsletter email as HTML for admin preview.
 * Returns the full rendered HTML along with the subject line and preview text.
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function GET(
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

    const stepParam = request.nextUrl.searchParams.get('step');
    if (stepParam === null) {
      return NextResponse.json({ error: 'step query param is required' }, { status: 400 });
    }

    const step = parseInt(stepParam, 10);
    const newsletterNumbers = getNewsletterNumbers();

    if (isNaN(step) || !newsletterNumbers.includes(step)) {
      return NextResponse.json(
        { error: `step must be one of [${newsletterNumbers.join(', ')}]` },
        { status: 400 }
      );
    }

    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getNewsletterSubject(step, subscriber.first_name, subscriber.id);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;

    const emailComponent = getNewsletterEmail(step, subscriber, chart, unsubscribeUrl);
    if (!emailComponent) {
      return NextResponse.json({ error: `No newsletter template for step ${step}` }, { status: 400 });
    }

    const newsletter = getNewsletter(step, subscriber.first_name, subscriber.id);
    const preview = newsletter?.preview ?? '';
    const html = await renderEmail(emailComponent);

    return NextResponse.json({ subject, preview, html, newsletterNumbers });
  } catch (error) {
    console.error('[admin] Error rendering newsletter preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
