import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, updateEmailSeries, setWelcomeResendStep } from '@/lib/db';
import { sendWelcomeEmail, formatEmailRecipient, sendAdminNotification, buildUnsubscribeUrl } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail, WELCOME_SERIES_LENGTH } from '@/emails/welcome';
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
    const emailLabel = 'welcome0';
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);
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
      unsubToken: subscriber.unsub_token,
      emailLabel
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send welcome0 email' },
        { status: 500 }
      );
    }

    console.log(`[admin] Sent welcome0 to ${subscriber.email} as part of series restart (id=${result.id})`);

    // Queue Welcome1 for the daily cron.
    // If subscriber is past the welcome series (in newsletter phase), use the
    // resend column to preserve their newsletter position. Otherwise, reset
    // next_step directly (no newsletter position to lose).
    let updated;
    if (subscriber.next_step > WELCOME_SERIES_LENGTH) {
      await setWelcomeResendStep(id, 1);
      // Re-fetch to get the updated row (updateEmailSeries returns it, but
      // setWelcomeResendStep doesn't, so we need a separate fetch)
      const refetched = await getSubscriberById(id);
      updated = refetched ?? subscriber;
    } else {
      updated = await updateEmailSeries(id, 1);
    }

    // Send admin notification
    const hd = hdChart(subscriber.chart.chart);
    const chartType = hd.type() ?? 'Unknown';
    await sendAdminNotification(updated, chartType, true);

    return NextResponse.json({
      ok: true,
      emailId: result.id,
      next_step: updated.next_step,
      welcome_resend_step: updated.welcome_resend_step
    });
  } catch (error) {
    console.error('[admin] Error restarting series:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
