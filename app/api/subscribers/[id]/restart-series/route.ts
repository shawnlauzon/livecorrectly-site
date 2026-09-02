import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById, advanceEmailSeries } from '@/lib/db';
import { sendWelcomeEmail, sendAdminNotification, formatEmailRecipient, buildUnsubscribeUrl } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail } from '@/emails/welcome';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Basic UUID format check
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    const subscriber = await getSubscriberById(id);

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    if (subscriber.email_status !== 'active') {
      return NextResponse.json(
        { error: 'Subscriber is not active' },
        { status: 422 }
      );
    }

    // Advance to step 1 so the daily cron picks up Welcome1.
    // Do this first, regardless of whether the immediate email send succeeds.
    await advanceEmailSeries(id, 1);

    // Immediately send Welcome0 (matching the initial signup flow)
    const chartData = parseChartForEmail(subscriber.chart.chart);
    const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
    const chartUrl = `${appUrl}/see-your-design/${subscriber.id}`;
    const emailLabel = 'welcome0';
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);
    const subject = getWelcomeSubject(0, subscriber.first_name, chartData);
    const emailComponent = getWelcomeEmail(
      0, subscriber, chartData, unsubscribeUrl, chartUrl
    );

    if (!emailComponent) {
      return NextResponse.json(
        { error: 'Email template not found' },
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

    if (result.success) {
      console.log(`[restart-series] Sent Welcome0 to ${subscriber.email} (id=${result.id})`);

      // Admin notification — fire-and-forget, failure must never block the restart
      if (process.env.RESEND_API_KEY) {
        sendAdminNotification(subscriber, chartData.type, true).catch((err) => {
          console.error(`[restart-series] Failed to send admin notification for ${subscriber.email}:`, err);
        });
      }

      return NextResponse.json({ ok: true });
    } else {
      console.warn(`[restart-series] Welcome0 not sent to ${subscriber.email}`);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error restarting email series:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
