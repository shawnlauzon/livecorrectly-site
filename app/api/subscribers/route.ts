import { NextRequest, NextResponse } from 'next/server';
import { createSubscriber, advanceEmailSeries, recordEmailSend } from '@/lib/db';
import { sendWelcomeEmail, sendAdminNotification, formatEmailRecipient, buildUnsubscribeUrl } from '@/lib/email/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getWelcomeSubject } from '@/lib/email/subjects';
import { getWelcomeEmail } from '@/lib/email/welcome';
import { syncContactToResend } from '@/lib/resend/contacts';
import { isCheckoutSessionId, findOffer, isPayFirst } from '@/lib/offers';
import { confirmPurchase } from '@/lib/email/purchase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, first_name, last_name, birth_input, chart } = body;
    // Sent by the post-purchase form (the guide's thank-you page, or a pay-first offer's).
    // offer_id says which pay-first offer was bought; without it, it's the guide.
    let guidePurchase: { sessionId: string | null; offerId?: string; offerName?: string } | undefined;
    if (body.guide_purchase) {
      guidePurchase = {
        sessionId: isCheckoutSessionId(body.guide_purchase.session_id) ? body.guide_purchase.session_id : null,
      };
      const rawOfferId = body.guide_purchase.offer_id;
      if (rawOfferId !== undefined) {
        const offer = typeof rawOfferId === 'string' ? findOffer(rawOfferId) : undefined;
        if (offer && isPayFirst(offer)) {
          guidePurchase.offerId = offer.id;
          guidePurchase.offerName = offer.name;
        } else {
          // Still sign the person up, but don't confirm a purchase we can't identify
          console.error(`[subscribe] Unknown or not pay-first offer_id ${JSON.stringify(rawOfferId)}; treating as a plain signup`);
          guidePurchase = undefined;
        }
      }
    }

    if (!email || !first_name || !birth_input || chart == null) {
      return NextResponse.json(
        { error: 'Missing required fields: email, first_name, birth_input, chart' },
        { status: 400 }
      );
    }

    if (!birth_input.date || !birth_input.city || !birth_input.country) {
      return NextResponse.json(
        { error: 'birth_input must include date, city, and country' },
        { status: 400 }
      );
    }

    const subscriber = await createSubscriber({
      email,
      first_name,
      last_name: last_name ?? null,
      birth_input: {
        date: birth_input.date,
        time: birth_input.time ?? null,
        timeUnknown: !!birth_input.timeUnknown,
        city: birth_input.city,
        country: birth_input.country,
      },
      chart,
    });

    // Parse chart once — used for both Resend contact sync and welcome email
    const chartData = parseChartForEmail(subscriber.chart.chart);

    // Sync contact to Resend for newsletter targeting — fire-and-forget, must not block signup
    if (process.env.RESEND_API_KEY) {
      syncContactToResend({
        email: subscriber.email,
        firstName: subscriber.first_name,
        lastName: subscriber.last_name,
        subscriberId: subscriber.id,
        chart: chartData,
      }).catch((err) => {
        console.error(`[subscribe] Failed to sync contact to Resend for ${subscriber.email}:`, err);
      });
    }

    // Welcome1 (immediate signup email) is active.
    // The daily drip (welcome2-3) is separately controlled by CRON_EMAIL_ENABLED.
    const WELCOME_SERIES_ENABLED = true;

    // Send immediate welcome email for fresh subscribers
    const isFresh = subscriber.next_step === 1;
    if (WELCOME_SERIES_ENABLED && isFresh && process.env.RESEND_API_KEY) {
      // Advance to step 2 (welcome1 sent) so the daily cron picks up Day 1 —
      // do this regardless of whether the welcome email send succeeds.
      await advanceEmailSeries(subscriber.id, 2);

      try {
        const appUrl = process.env.APP_URL ?? 'https://www.livecorrectly.com';
        const chartUrl = `${appUrl}/see-your-design/${subscriber.id}`;
        const emailLabel = 'welcome1';
        const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);
        const subject = getWelcomeSubject(1);
        const emailComponent = getWelcomeEmail(
          1, subscriber, chartData, unsubscribeUrl, chartUrl
        );

        if (emailComponent) {
          const result = await sendWelcomeEmail({
            to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
            subject,
            react: emailComponent,
            unsubToken: subscriber.unsub_token,
            emailLabel
          });
          if (result.success) {
            console.log(`[subscribe] Sent welcome email to ${subscriber.email} (id=${result.id})`);
            recordEmailSend({
              subscriberId: subscriber.id,
              emailType: 'welcome_1',
              category: 'welcome',
              resendEmailId: result.id,
            }).catch((err) => {
              console.error(`[subscribe] Failed to record email send for ${subscriber.email}:`, err);
            });
          } else {
            console.warn(`[subscribe] Welcome email not sent to ${subscriber.email} (subscriber may not be active)`);
          }
        }
      } catch (emailError) {
        // Welcome email failure should not fail registration — subscriber is already created
        // and next_step is already advanced so the drip series will still start.
        console.error(`[subscribe] Failed to send welcome email to ${subscriber.email}:`, emailError);
      }
    }

    // Admin notification — fire-and-forget, failure must never block registration
    if (isFresh && process.env.RESEND_API_KEY) {
      sendAdminNotification(
        subscriber,
        chartData.type,
        false,
        guidePurchase && { sessionId: guidePurchase.sessionId, offerName: guidePurchase.offerName },
      ).catch((err) => {
        console.error(`[subscribe] Failed to send admin notification for ${subscriber.email}:`, err);
      });
    }

    // Tell a guide buyer it's on the way. The admin notice above already covers Shawn.
    if (guidePurchase?.sessionId && process.env.RESEND_API_KEY) {
      await confirmPurchase({
        subscriber,
        sessionId: guidePurchase.sessionId,
        notifyAdmin: !isFresh,
        ...(guidePurchase.offerId && { offerId: guidePurchase.offerId }),
      }).catch((err) => {
        console.error(`[subscribe] Failed to confirm guide purchase for ${subscriber.email}:`, err);
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
