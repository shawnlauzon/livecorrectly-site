import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '@/emails/welcome';

/**
 * POST /api/admin/subscribers/[id]/send-welcome
 *
 * Manually send a specific welcome series email to a subscriber.
 * Does NOT advance next_step or modify next_send_at — manual sends
 * are independent of the automated series.
 *
 * Body: { step: 0-3 }
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Parse and validate body
    const body = await request.json();
    const step = body.step;

    if (typeof step !== 'number' || step < 0 || step > WELCOME_SERIES_LENGTH) {
      return NextResponse.json(
        { error: `step must be a number between 0 and ${WELCOME_SERIES_LENGTH}` },
        { status: 400 }
      );
    }

    // Fetch subscriber
    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Check email status
    if (subscriber.email_status !== 'active') {
      return NextResponse.json(
        { error: `Cannot send to subscriber with email_status "${subscriber.email_status}"` },
        { status: 422 }
      );
    }

    // Build and send the email
    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getWelcomeSubject(step, subscriber.first_name, chart);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const chartUrl = `${appUrl}/see-your-design/${id}`;
    const emailComponent = getWelcomeEmail(step, subscriber, chart, unsubscribeUrl, chartUrl);

    if (!emailComponent) {
      return NextResponse.json(
        { error: `Failed to build email for step ${step}` },
        { status: 500 }
      );
    }

    const result = await sendWelcomeEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject,
      react: emailComponent,
      unsubToken: subscriber.unsub_token
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log(`[admin] Manually sent welcome step ${step} to ${subscriber.email} (id=${result.id})`);
    return NextResponse.json({ ok: true, step, emailId: result.id });
  } catch (error) {
    console.error('[admin] Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
