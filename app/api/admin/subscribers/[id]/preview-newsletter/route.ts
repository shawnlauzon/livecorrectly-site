import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { buildUnsubscribeUrl } from '@/emails/send';
import { getNewsletterHtml, getNewsletterSubject, getNewsletterIssueNumbers } from '@/emails/newsletter';
import { getNewsletterIssue } from '@/emails/newsletter-loader';
import { resolveContactVars } from '@/newsletters/resolve';
import { replaceResendContactVars } from '@/emails/template-variables';
import { loadAllNewsletterIssues } from '@/newsletters/loader';

/**
 * GET /api/admin/subscribers/[id]/preview-newsletter?step=1
 *
 * When `step` is provided: renders a newsletter email as HTML for admin preview.
 * Returns the full rendered HTML along with the subject line and preview text.
 *
 * When `step` is omitted: returns newsletter metadata (numbers + subjects) from DB
 * without rendering any preview. Used to populate the dropdown on mount.
 *
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

    // When step is omitted, return metadata only (no rendering)
    if (stepParam === null) {
      const allNewsletters = await loadAllNewsletterIssues();
      const newsletterNumbers = [...allNewsletters.keys()].sort((a, b) => a - b);
      const newsletterMeta = newsletterNumbers.map((n) => {
        const nl = allNewsletters.get(n)!;
        return { number: n, subject: nl.subject };
      });
      return NextResponse.json({ newsletterNumbers, newsletterMeta });
    }

    const step = parseInt(stepParam, 10);
    const newsletterNumbers = await getNewsletterIssueNumbers();

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
    const subject = await getNewsletterSubject(step, subscriber.first_name, subscriber.id);
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsub_token, `newsletter_${step}`);

    let html = await getNewsletterHtml(step, subscriber, chart, unsubscribeUrl);
    if (!html) {
      return NextResponse.json({ error: `No newsletter template for step ${step}` }, { status: 400 });
    }

    const newsletter = await getNewsletterIssue(step, subscriber.first_name, null, subscriber.id);
    const preview = newsletter?.preview ?? '';

    // Resolve remaining Resend contact property placeholders for preview.
    // After Liquid resolution, the HTML may still contain {{{contact.key|}}} and
    // {{{FIRST_NAME|}}} patterns that Resend would normally resolve at send time.
    html = resolveContactVars(html, chart);
    html = replaceResendContactVars(html, {
      FIRST_NAME: subscriber.first_name,
      LAST_NAME: subscriber.last_name ?? '',
      EMAIL: subscriber.email,
      RESEND_UNSUBSCRIBE_URL: unsubscribeUrl,
    });

    return NextResponse.json({ subject, preview, html, newsletterNumbers });
  } catch (error) {
    console.error('[admin] Error rendering newsletter preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
