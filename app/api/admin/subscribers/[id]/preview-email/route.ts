import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject, getWelcomePreview } from '@/emails/subjects';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { renderEmail } from '@/emails/send';

/**
 * GET /api/admin/subscribers/[id]/preview-email?step=0
 *
 * Renders a welcome email as HTML for admin preview.
 * Returns the full rendered HTML along with the subject line.
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
    if (isNaN(step) || step < 0 || step > WELCOME_SERIES_LENGTH) {
      return NextResponse.json(
        { error: `step must be between 0 and ${WELCOME_SERIES_LENGTH}` },
        { status: 400 }
      );
    }

    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getWelcomeSubject(step, subscriber.first_name, chart);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const chartUrl = `${appUrl}/see-your-design/${id}`;

    const emailComponent = getWelcomeEmail(step, subscriber, chart, unsubscribeUrl, chartUrl);
    if (!emailComponent) {
      return NextResponse.json({ error: `No email template for step ${step}` }, { status: 400 });
    }

    const preview = getWelcomePreview(step, subscriber.first_name, chart);
    const html = await renderEmail(emailComponent);

    return NextResponse.json({ subject, preview, html });
  } catch (error) {
    console.error('[admin] Error rendering email preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
