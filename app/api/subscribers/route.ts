import { NextRequest, NextResponse } from 'next/server';
import { createSubscriber, advanceEmailSeries } from '@/lib/db';
import { sendEmail, sendAdminNotification, formatEmailRecipient } from '@/emails/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/emails/subjects';
import { getWelcomeEmail } from '@/emails/welcome';

function getTomorrowDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, first_name, last_name, birth_date, birth_time, time_unknown, birth_place, chart } = body;

    if (!email || !first_name || !birth_date || !birth_place || chart == null) {
      return NextResponse.json(
        { error: 'Missing required fields: email, first_name, birth_date, birth_place, chart' },
        { status: 400 }
      );
    }

    const subscriber = await createSubscriber({
      email,
      first_name,
      last_name: last_name ?? null,
      birth_date,
      birth_time: birth_time ?? null,
      time_unknown: !!time_unknown,
      birth_place,
      chart,
    });

    // Welcome0 (immediate signup email) is active.
    // The daily drip (welcome1-3) is separately controlled by CRON_EMAIL_ENABLED.
    const WELCOME_SERIES_ENABLED = true;

    // Send immediate welcome email for fresh subscribers
    const isFresh = subscriber.next_step === 0 && subscriber.next_send_at === null;
    if (WELCOME_SERIES_ENABLED && isFresh && process.env.RESEND_API_KEY) {
      // Advance to step 1 (welcome0 sent) with tomorrow's date so the cron picks up Day 1 —
      // do this regardless of whether the welcome email send succeeds.
      const tomorrow = getTomorrowDate();
      await advanceEmailSeries(subscriber.id, 1, tomorrow);

      const chartData = parseChartForEmail(subscriber.chart.chart);

      try {
        const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
        const chartUrl = `${appUrl}/see-your-design/${subscriber.id}`;
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
        const subject = getWelcomeSubject(0, subscriber.first_name, chartData);
        const emailComponent = getWelcomeEmail(
          0, subscriber, chartData, unsubscribeUrl, chartUrl
        );

        if (emailComponent) {
          const result = await sendEmail({
            to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
            subject,
            react: emailComponent,
            unsubToken: subscriber.unsub_token
          });
          if (result.success) {
            console.log(`[subscribe] Sent welcome email to ${subscriber.email} (id=${result.id})`);
          } else {
            console.warn(`[subscribe] Welcome email not sent to ${subscriber.email} (subscriber may not be active)`);
          }
        }
      } catch (emailError) {
        // Welcome email failure should not fail registration — subscriber is already created
        // and next_send_at is already set so the drip series will still start.
        console.error(`[subscribe] Failed to send welcome email to ${subscriber.email}:`, emailError);
      }
    }

    // Admin notification — fire-and-forget, failure must never block registration
    if (isFresh && process.env.RESEND_API_KEY) {
      const chartData = parseChartForEmail(subscriber.chart.chart);
      sendAdminNotification(subscriber, chartData.type).catch((err) => {
        console.error(`[subscribe] Failed to send admin notification for ${subscriber.email}:`, err);
      });
    }

    return NextResponse.json({ id: subscriber.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
