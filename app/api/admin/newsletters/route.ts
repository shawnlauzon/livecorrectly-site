import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterDueSubscribers,
  getNewsletterReceivedStats,
  getNewsletterSchedules,
  getNewsletterPublication,
  getNewsletterSegments,
  createNewsletterIssue,
} from '@/lib/db';
import { getNewsletterIssueNumbers, clearNewsletterIssueCache } from '@/lib/newsletter/email-loader';
import { loadNewsletterIssue } from '@/lib/newsletter/loader';
import { WELCOME_SERIES_LENGTH } from '@/lib/email/welcome';
import { finalizeDueSchedules } from '@/lib/newsletter/finalize';
import { nextRegularSendAt } from '@/lib/newsletter/cadence';


/**
 * GET /api/admin/newsletters
 *
 * List all newsletters with their audience and delivery status.
 *
 * Per newsletter returns:
 * - receivedCount / lastSentAt: people actually sent this issue, and when it last went out
 * - dueCount / dueSubscribers: who Schedule would send to right now — active
 *   subscribers whose next_step is this issue
 * - segments: persistent segments whose next issue is this one
 * - schedule: the pending send, if one is scheduled
 *
 * Finalizes completed sends first (see finalizeDueSchedules).
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
    // Pick up sends Resend has completed since the last look, so status and
    // each segment's "Next" issue are current when the list renders.
    await finalizeDueSchedules();

    const [dueSubscribers, schedules, publication, allSegments, receivedStats] = await Promise.all([
      getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH),
      getNewsletterSchedules(),
      getNewsletterPublication(1),
      getNewsletterSegments(1),
      getNewsletterReceivedStats(),
    ]);

    const newsletterNumbers = await getNewsletterIssueNumbers();
    const postWelcomeNumbers = newsletterNumbers.filter(n => n > WELCOME_SERIES_LENGTH);

    const newsletters = await Promise.all(postWelcomeNumbers.map(async num => {
      const raw = await loadNewsletterIssue(num);
      const pending = schedules.find(s => s.newsletter_num === num && s.status === 'scheduled');
      const segments = allSegments.filter(s => s.nextIssue === num);
      const due = dueSubscribers.filter(s => s.next_step === num);
      const stats = receivedStats.get(num);

      return {
        number: num,
        subject: raw?.subject ?? '',
        slug: raw?.slug ?? null,

        receivedCount: stats?.receivedCount ?? 0,
        lastSentAt: stats?.lastSentAt ?? null,
        dueCount: due.length,
        dueSubscribers: due.map(s => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
        })),
        segments: segments.map(s => ({ id: s.id, name: s.name, nextIssue: s.nextIssue })),
        schedule: pending
          ? {
              id: pending.id,
              kind: pending.kind,
              broadcastId: pending.broadcast_id,
              scheduledAt: pending.scheduled_at,
              subscriberCount: pending.subscriber_count,
            }
          : null,
      };
    }));

    return NextResponse.json({
      newsletters,
      segments: allSegments.map(s => ({
        id: s.id,
        name: s.name,
        nextIssue: s.nextIssue,
      })),
      settings: publication
        ? {
            sendWeekday: publication.sendWeekday,
            sendTime: publication.sendTime,
            timezone: publication.timezone,
            nextRegularSendAt: nextRegularSendAt(publication)?.toISOString() ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[admin/newsletters] Error listing newsletters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/newsletters
 *
 * Create a blank newsletter issue numbered after the current last issue.
 * Returns the new issue number so the admin UI can open it in the editor.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const number = await createNewsletterIssue(1);
    clearNewsletterIssueCache();
    return NextResponse.json({ number });
  } catch (error) {
    console.error('[admin/newsletters] Error creating newsletter issue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
