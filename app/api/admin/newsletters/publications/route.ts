import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getAllNewsletterPublications, getAllSubscribers, getNewsletterSchedules } from '@/lib/db';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { getNewsletterIssueNumbers } from '@/emails/newsletter-loader';

/**
 * GET /api/admin/newsletters/publications
 *
 * List all newsletter publications with summary stats:
 * issue count, subscriber count, last sent date.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [publications, allSubscribers, schedules, issueNumbers] = await Promise.all([
      getAllNewsletterPublications(),
      getAllSubscribers(),
      getNewsletterSchedules(),
      getNewsletterIssueNumbers(),
    ]);

    // Count active subscribers past the welcome series (shared pool for all publications)
    const subscriberCount = allSubscribers.filter(
      s => (s.email_status === 'active' || s.email_status === 'failed')
        && s.next_step > WELCOME_SERIES_LENGTH,
    ).length;

    // Issue count: newsletters past the welcome series
    const issueCount = issueNumbers.filter(n => n > WELCOME_SERIES_LENGTH).length;

    // Last sent: most recent schedule with status='sent'
    const sentSchedules = schedules.filter(s => s.status === 'sent');
    const lastSentAt = sentSchedules.length > 0
      ? sentSchedules.reduce((latest, s) => {
          const t = typeof s.scheduled_at === 'string' ? s.scheduled_at : (s.scheduled_at as Date).toISOString();
          return t > latest ? t : latest;
        }, '')
      : null;

    const result = publications.map(pub => ({
      id: pub.id,
      name: pub.name,
      nextSendAt: pub.nextSendAt,
      intervalDays: pub.intervalDays,
      timezone: pub.timezone,
      issueCount,
      subscriberCount,
      lastSentAt,
    }));

    return NextResponse.json({ publications: result });
  } catch (error) {
    console.error('[admin/newsletters/publications] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
