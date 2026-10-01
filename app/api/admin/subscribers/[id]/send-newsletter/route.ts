import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById, getNewsletterPublication } from '@/lib/db';
import { buildUnsubscribeUrl } from '@/lib/email/send';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { getNewsletterIssueNumbers } from '@/lib/newsletter/email';
import { getNewsletterIssue } from '@/lib/newsletter/email-loader';
import { renderNewsletterEmail } from '@/lib/newsletter/email-template';
import { sendPrerenderedBroadcast } from '@/lib/resend/broadcasts';
import { getNoteForSend } from '@/lib/newsletter/notes';

/**
 * POST /api/admin/subscribers/[id]/send-newsletter
 *
 * Manually send a specific newsletter email to a subscriber.
 * Does NOT advance next_step — manual sends
 * are independent of the automated series.
 * Includes today's note (publication timezone), if there is one.
 *
 * Body: { step: N } (newsletter number, matches next_step)
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function POST(
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

    const body = await request.json();
    const step = body.step;
    const newsletterNumbers = await getNewsletterIssueNumbers();

    if (typeof step !== 'number' || !newsletterNumbers.includes(step)) {
      return NextResponse.json(
        { error: `step must be one of [${newsletterNumbers.join(', ')}]` },
        { status: 400 }
      );
    }

    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    if (subscriber.email_status !== 'active') {
      return NextResponse.json(
        { error: `Cannot send to subscriber with email_status "${subscriber.email_status}"` },
        { status: 422 }
      );
    }

    const chart = parseChartForEmail(subscriber.chart.chart);
    const emailLabel = `newsletter_${step}`;
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, emailLabel);

    // Resolve Liquid conditionals with subscriber's chart data
    const newsletter = await getNewsletterIssue(step, subscriber.first_name, chart, subscriber.id);
    if (!newsletter) {
      return NextResponse.json(
        { error: `Failed to build newsletter for step ${step}` },
        { status: 500 }
      );
    }

    const subject = newsletter.subject;

    const publication = await getNewsletterPublication(1);
    const note = publication
      ? (await getNoteForSend(1, new Date(), publication.timezone))?.body
      : undefined;

    const html = renderNewsletterEmail({
      bodyHtml: newsletter.bodyHtml,
      unsubscribeUrl,
      ps: newsletter.ps,
      preview: newsletter.preview,
      note,
    });

    const { broadcastId } = await sendPrerenderedBroadcast({
      name: `Admin: Newsletter #${step} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → ${subscriber.email}`,
      html,
      subject,
      subscriber,
    });

    console.log(`[admin] Manually sent newsletter #${step} to ${subscriber.email} (broadcast=${broadcastId})`);
    return NextResponse.json({ ok: true, step, broadcastId });
  } catch (error) {
    console.error('[admin] Error sending newsletter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
