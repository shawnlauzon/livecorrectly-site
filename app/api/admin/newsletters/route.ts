import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getAllSubscribers,
  getNewsletterSchedules,
} from '@/lib/db';
import { getNewsletterNumbers } from '@/emails/newsletter-loader';
import { loadNewsletter } from '@/newsletters/loader';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { hasLiquidConditionals } from '@/newsletters/liquid-properties';
import { getNextCadenceDates } from '@/newsletters/cadence';

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
 * - projectedSendAt: ISO timestamp of the projected (or actual) send date
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
    const [allSubscribers, schedules] = await Promise.all([
      getAllSubscribers(),
      getNewsletterSchedules(),
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

    const newsletterNumbers = await getNewsletterNumbers();
    const postWelcomeNumbers = newsletterNumbers.filter(n => n > WELCOME_SERIES_LENGTH);

    // Compute projected cadence dates for unsent/unscheduled newsletters.
    // Sent/scheduled newsletters use their actual date; unsent ones get assigned
    // consecutive cadence slots in sequence order.
    const unsentNumbers = postWelcomeNumbers.filter(num => {
      const schedule = scheduleMap.get(num);
      return !schedule || (schedule.status !== 'scheduled' && schedule.status !== 'sent');
    });
    const cadenceDates = getNextCadenceDates(new Date(), unsentNumbers.length);
    const projectedDateMap = new Map<number, string>();
    unsentNumbers.forEach((num, i) => {
      projectedDateMap.set(num, cadenceDates[i].toISOString());
    });

    const newsletters = await Promise.all(postWelcomeNumbers.map(async num => {
      const raw = await loadNewsletter(num);
      const schedule = scheduleMap.get(num);

      // Sent: all subscribers (any status) who have progressed past this newsletter
      const sentCount = allSubscribers.filter(s => s.next_step > num).length;

      // Project readiness: welcome-series subscribers finish within the first week,
      // then newsletters go out once per week.
      const nextWeekSubs = activeSubscribers.filter(
        s => s.next_step <= num && weeksUntilReady(s.next_step, num) === 1,
      );
      const nextWeekCount = nextWeekSubs.length;

      const laterSubs = activeSubscribers.filter(
        s => s.next_step <= num && weeksUntilReady(s.next_step, num) > 1,
      );
      const laterCount = laterSubs.length;

      // Determine the send date to display:
      // - Scheduled/sent → use the schedule's actual date
      // - Unsent → use the projected cadence date
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
        hasLiquid: raw ? hasLiquidConditionals(raw.bodyMarkdown) : false,
        sentCount,
        nextWeekCount,
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
        schedule: schedule
          ? {
              id: schedule.id,
              broadcastId: schedule.broadcast_id,
              scheduledAt: schedule.scheduled_at,
              subscriberCount: schedule.subscriber_count,
              status: schedule.status,
              createdAt: schedule.created_at,
            }
          : null,
      };
    }));

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('[admin/newsletters] Error listing newsletters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
