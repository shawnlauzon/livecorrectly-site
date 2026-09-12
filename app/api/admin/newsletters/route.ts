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

/**
 * GET /api/admin/newsletters
 *
 * List all newsletters with their scheduling status and audience counts.
 *
 * Per newsletter returns:
 * - sentCount: subscribers who have already received this newsletter (next_step > N)
 * - nextWeekCount: active subscribers due for it now (next_step = N, will be sent when scheduled)
 * - laterCount: active subscribers still working through earlier emails (next_step < N)
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

    const newsletterNumbers = getNewsletterNumbers();
    const postWelcomeNumbers = newsletterNumbers.filter(n => n > WELCOME_SERIES_LENGTH);

    const newsletters = postWelcomeNumbers.map(num => {
      const raw = loadNewsletter(num);
      const schedule = scheduleMap.get(num);

      // Sent: all subscribers (any status) who have progressed past this newsletter
      const sentCount = allSubscribers.filter(s => s.next_step > num).length;

      // Next week: active subscribers whose next_step is exactly this newsletter
      const nextWeekSubs = activeSubscribers.filter(s => s.next_step === num);
      const nextWeekCount = nextWeekSubs.length;

      // Later: active subscribers still on earlier emails (will eventually reach this one)
      const laterSubs = activeSubscribers.filter(s => s.next_step < num);
      const laterCount = laterSubs.length;

      return {
        number: num,
        subject: raw?.subject ?? '',
        slug: raw?.slug ?? null,
        hasLiquid: raw ? hasLiquidConditionals(raw.bodyMarkdown) : false,
        sentCount,
        nextWeekCount,
        laterCount,
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
    });

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('[admin/newsletters] Error listing newsletters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
