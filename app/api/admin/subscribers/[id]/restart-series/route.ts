import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, updateEmailSeries } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient, sendAdminNotification } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail } from '@/emails/welcome';
import hdChart from '@/lib/hd-chart';

/**
 * POST /api/admin/subscribers/[id]/restart-series
 *
 * Restarts the welcome series for a subscriber:
 * 1. Sends welcome0 immediately
 * 2. Sets next_step = 1 (so the daily cron will send day 1 next)
 * 3. Sends admin notification about the restart
 *
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
        { error: `Cannot restart series for subscriber with email_status "${subscriber.email_status}"` },
        { status: 422 }
      );
    }

    // Build and send welcome0
    const chart = parseChartForEmail(subscriber.chart.chart);
    const subject = getWelcomeSubject(0, subscriber.first_name, chart);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
    const chartUrl = `${appUrl}/see-your-design/${id}`;
    const emailComponent = getWelcomeEmail(0, subscriber, chart, unsubscribeUrl, chartUrl);

    if (!emailComponent) {
      return NextResponse.json(
        { error: 'Failed to build welcome0 email' },
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
        { error: 'Failed to send welcome0 email' },
        { status: 500 }
      );
    }

    console.log(`[admin] Sent welcome0 to ${subscriber.email} as part of series restart (id=${result.id})`);

    // Update subscriber to next_step = 1 (daily cron will send day 1 next)
    const updated = await updateEmailSeries(id, 1);

    // Send admin notification
    const hd = hdChart(subscriber.chart.chart);
    const chartType = hd.type() ?? 'Unknown';
    await sendAdminNotification(updated, chartType, true);

    return NextResponse.json({
      ok: true,
      emailId: result.id,
      next_step: updated.next_step
    });
  } catch (error) {
    console.error('[admin] Error restarting series:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
