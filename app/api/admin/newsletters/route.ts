import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getAllSubscribers,
  getNewsletterSchedules,
  getNewsletterPublication,
  getNewsletterSegments,
  createNewsletterIssue,
} from '@/lib/db';
import { getNewsletterIssueNumbers, clearNewsletterIssueCache } from '@/emails/newsletter-loader';
import { loadNewsletterIssue } from '@/newsletters/loader';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { finalizeDueSchedules } from '@/lib/newsletter-finalize';
import { regularSendAtWeeksOut } from '@/lib/newsletter-cadence';
import { SEGMENT_MIN_SIZE } from '@/lib/newsletter-audience';


/**
 * Project how many weeks until a subscriber at `currentStep` reaches newsletter `targetNum`.
 *
 * Welcome-series subscribers finish within the first week (daily sends), so they're
 * treated as starting at WELCOME_SERIES_LENGTH + 1.  After that, newsletters go out
 * once per week, so weeks = targetNum - effectiveStep + 1.
 *
 * Returns 0 for "already sent" (currentStep > targetNum).
 */
function weeksUntilReady(currentStep: number, targetNum: number): number {
  if (currentStep > targetNum) return 0; // already sent
  const effectiveStep = Math.max(currentStep, WELCOME_SERIES_LENGTH + 1);
  return targetNum - effectiveStep + 1;
}

/**
 * GET /api/admin/newsletters
 *
 * List all newsletters with their scheduling status, audience counts, and
 * projected send dates.
 *
 * Per newsletter returns:
 * - sentCount: subscribers who have already received this newsletter (next_step > N)
 * - nextWeekCount: active subscribers projected to be ready within 1 week
 * - laterCount: active subscribers projected to need 2+ weeks
 * - dueNowCount / directSend: subscribers due now, and whether they'll get direct emails
 * - projectedSendAt: ISO timestamp of the projected (or actual) send date
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

    const [allSubscribers, schedules, publication, allSegments] = await Promise.all([
      getAllSubscribers(),
      getNewsletterSchedules(),
      getNewsletterPublication(1),
      getNewsletterSegments(1),
    ]);

    const activeSubscribers = allSubscribers.filter(
      s => s.email_status === 'active' || s.email_status === 'failed',
    );

    // Build schedule lookup: newsletter_num → latest schedule
    const scheduleMap = new Map<number, typeof schedules[0]>();
    for (const schedule of schedules) {
      // Schedules are newest-first, so first match is latest
      if (!scheduleMap.has(schedule.newsletter_num)) {
        scheduleMap.set(schedule.newsletter_num, schedule);
      }
    }

    const newsletterNumbers = await getNewsletterIssueNumbers();
    const postWelcomeNumbers = newsletterNumbers.filter(n => n > WELCOME_SERIES_LENGTH);

    // Compute projected cadence dates from persisted publication settings.
    // Sent/scheduled newsletters keep their actual date; unsent ones get
    // consecutive weekly slots starting at the next regular send time.
    const unsentNumbers = postWelcomeNumbers.filter(num => {
      const schedule = scheduleMap.get(num);
      return !schedule || (schedule.status !== 'scheduled' && schedule.status !== 'sent');
    });
    const projectedDateMap = new Map<number, string>();
    if (publication) {
      unsentNumbers.forEach((num, i) => {
        const sendDate = regularSendAtWeeksOut(publication, i);
        if (sendDate) projectedDateMap.set(num, sendDate.toISOString());
      });
    }

    const newsletters = await Promise.all(postWelcomeNumbers.map(async num => {
      const raw = await loadNewsletterIssue(num);
      const schedule = scheduleMap.get(num);

      // Sent: all subscribers (any status) who have progressed past this newsletter
      const sentCount = allSubscribers.filter(s => s.next_step > num).length;

      // Project readiness per-newsletter: skip projection only when THIS
      // newsletter is cancelled or has a segment pointing at it. All other
      // newsletters keep their weeksUntilReady projection.
      const isCancelled = schedule?.status === 'cancelled';
      const hasSegment = allSegments.some(s => s.nextIssue === num);

      let nextWeekSubs: typeof activeSubscribers = [];
      let nextWeekCount = 0;
      let laterSubs: typeof activeSubscribers = [];
      let laterCount = 0;

      if (isCancelled || hasSegment) {
        // Cancelled — no subscribers to show.
        // Has segment — audience is managed in Resend; the frontend fetches
        // contacts on demand via /api/admin/newsletters/segment/contacts.
      } else {
        nextWeekSubs = activeSubscribers.filter(
          s => s.next_step <= num && weeksUntilReady(s.next_step, num) === 1,
        );
        nextWeekCount = nextWeekSubs.length;
        laterSubs = activeSubscribers.filter(
          s => s.next_step <= num && weeksUntilReady(s.next_step, num) > 1,
        );
        laterCount = laterSubs.length;
      }

      // Determine the send date to display:
      // - Scheduled/sent → use the schedule's actual date
      // - Unsent → use the projected cadence date
      // Subscribers due right now (next_step = this issue), for the "Next"
      // column when no segment exists: under SEGMENT_MIN_SIZE they're sent directly.
      const dueNowCount = activeSubscribers.filter(s => s.next_step === num).length;
      const directSend = !hasSegment && dueNowCount > 0 && dueNowCount < SEGMENT_MIN_SIZE;

      let projectedSendAt: string | null = null;
      if (schedule?.status === 'scheduled' || schedule?.status === 'sent') {
        projectedSendAt = schedule.scheduled_at;
      } else {
        projectedSendAt = projectedDateMap.get(num) ?? null;
      }

      return {
        number: num,
        subject: raw?.subject ?? '',
        slug: raw?.slug ?? null,

        sentCount,
        nextWeekCount,
        dueNowCount,
        directSend,
        laterCount,
        projectedSendAt,
        nextWeekSubscribers: nextWeekSubs.map(s => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
        })),
        laterSubscribers: laterSubs.map(s => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
        })),
        segments: allSegments
          .filter(s => s.nextIssue === num)
          .map(s => ({ id: s.id, name: s.name, nextIssue: s.nextIssue })),
        schedule: schedule
          ? {
              id: schedule.id,
              kind: schedule.kind,
              broadcastId: schedule.broadcast_id,
              scheduledAt: schedule.scheduled_at,
              subscriberCount: schedule.subscriber_count,
              status: schedule.status,
              createdAt: schedule.created_at,
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
            nextRegularSendAt: regularSendAtWeeksOut(publication, 0)?.toISOString() ?? null,
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
