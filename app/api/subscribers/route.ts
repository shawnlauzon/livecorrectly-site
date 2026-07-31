import { NextRequest, NextResponse } from 'next/server';
import { createSubscriber, advanceEmailSeries } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/lib/email-subjects';
import { getWelcomeEmail } from '@/lib/welcome-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, first_name, birth_date, birth_time, time_unknown, birth_place, chart } = body;

    if (!email || !first_name || !birth_date || !birth_place || chart == null) {
      return NextResponse.json(
        { error: 'Missing required fields: email, first_name, birth_date, birth_place, chart' },
        { status: 400 }
      );
    }

    const subscriber = await createSubscriber({
      email,
      first_name,
      birth_date,
      birth_time: birth_time ?? null,
      time_unknown: !!time_unknown,
      birth_place,
      chart,
    });

    // Send immediate welcome email for fresh subscribers
    const isFresh = subscriber.seq_position === 0 && subscriber.next_send_at === null;
    if (isFresh && process.env.RESEND_API_KEY) {
      // Set next_send_at to tomorrow so the cron picks up Day 1 —
      // do this regardless of whether the welcome email send succeeds.
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await advanceEmailSeries(subscriber.id, 0, tomorrow);

      try {
        const appUrl = process.env.APP_URL ?? 'https://livecorrectly.com';
        const chartUrl = `${appUrl}/see-your-design/${subscriber.id}`;
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${subscriber.unsub_token}`;
        const chartData = parseChartForEmail(subscriber.chart.chart);
        const subject = getWelcomeSubject(0, subscriber.first_name, chartData);
        const emailComponent = getWelcomeEmail(
          0, subscriber, chartData, unsubscribeUrl, '', chartUrl
        );

        if (emailComponent) {
          const result = await sendEmail({
            to: subscriber.email,
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

    return NextResponse.json({ id: subscriber.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
