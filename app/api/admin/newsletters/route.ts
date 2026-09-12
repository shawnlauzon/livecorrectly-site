import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getNewsletterSchedules, getNewsletterDueSubscribers } from '@/lib/db';
import { getNewsletterNumbers } from '@/emails/newsletter-loader';
import { loadNewsletter } from '@/newsletters/loader';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { hasLiquidConditionals } from '@/newsletters/liquid-properties';

/**
 * GET /api/admin/newsletters
 *
 * List all newsletters with their scheduling status and ready counts.
 * Returns each newsletter's number, subject, subscriber ready count,
 * and latest schedule status.
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
    const [schedules, dueSubscribers] = await Promise.all([
      getNewsletterSchedules(),
      getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH),
    ]);

    // Group subscribers per next_step
    const readyGroups = new Map<number, { id: string; firstName: string; lastName: string | null; email: string }[]>();
    for (const sub of dueSubscribers) {
      const group = readyGroups.get(sub.next_step) ?? [];
      group.push({
        id: sub.id,
        firstName: sub.first_name,
        lastName: sub.last_name,
        email: sub.email,
      });
      readyGroups.set(sub.next_step, group);
    }

    // Build schedule lookup: newsletter_num → latest schedule
    const scheduleMap = new Map<number, typeof schedules[0]>();
    for (const schedule of schedules) {
      // Schedules are newest-first, so first match is latest
      if (!scheduleMap.has(schedule.newsletter_num)) {
        scheduleMap.set(schedule.newsletter_num, schedule);
      }
    }

    const newsletterNumbers = getNewsletterNumbers();
    // Only include newsletters after welcome series
    const postWelcomeNumbers = newsletterNumbers.filter(n => n > WELCOME_SERIES_LENGTH);

    const newsletters = postWelcomeNumbers.map(num => {
      const raw = loadNewsletter(num);
      const schedule = scheduleMap.get(num);
      return {
        number: num,
        subject: raw?.subject ?? '',
        slug: raw?.slug ?? null,
        hasLiquid: raw ? hasLiquidConditionals(raw.bodyMarkdown) : false,
        ready: readyGroups.get(num)?.length ?? 0,
        readySubscribers: readyGroups.get(num) ?? [],
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
