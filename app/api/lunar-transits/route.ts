import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById } from '@/lib/db';
import { calculateLunarCycle } from '@/lib/lunar';
import type { SerializedMoonTransit } from '@/app/see-your-design/[id]/lunar-cycle/lunar-timeline';

/**
 * GET /api/lunar-transits?subscriberId=<uuid>&month=YYYY-MM
 *
 * Computes lunar transit data for a given month on demand.
 * Includes trailing days before/after so the calendar grid's
 * first and last weeks are fully populated.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const subscriberId = searchParams.get('subscriberId');
  const month = searchParams.get('month');

  if (!subscriberId || !month) {
    return NextResponse.json(
      { error: 'Missing required params: subscriberId, month' },
      { status: 400 },
    );
  }

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'month must be YYYY-MM format' },
      { status: 400 },
    );
  }

  const subscriber = await getSubscriberById(subscriberId);
  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  }

  // Only Reflectors (type === 4) have lunar cycle data
  if (subscriber.chart.chart.type !== 4) {
    return NextResponse.json({ error: 'Subscriber is not a Reflector' }, { status: 422 });
  }

  const natalGates = subscriber.chart.chart.gates.map((g) => g.gate);

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const mo = parseInt(monthStr, 10) - 1; // JS 0-indexed month

  // 1st of requested month
  const firstOfMonth = new Date(Date.UTC(year, mo, 1));
  // Day of week for the 1st (0=Sun)
  const startDow = firstOfMonth.getUTCDay();
  // Trailing days from previous month to fill first week
  const leadingDays = startDow; // e.g. if 1st is Wed (3), need 3 trailing days

  // Last day of month
  const lastOfMonth = new Date(Date.UTC(year, mo + 1, 0));
  const daysInMonth = lastOfMonth.getUTCDate();
  // Day of week for last day
  const endDow = lastOfMonth.getUTCDay();
  // Trailing days into next month to fill last week
  const trailingDays = endDow === 6 ? 0 : 6 - endDow;

  // Compute start date (may be in previous month)
  const startDate = new Date(Date.UTC(year, mo, 1 - leadingDays));
  const totalDays = leadingDays + daysInMonth + trailingDays;

  const transits = calculateLunarCycle(startDate, natalGates, totalDays);

  const serialized: SerializedMoonTransit[] = transits.map((t) => ({
    ...t,
    enterTime: t.enterTime.toISOString(),
    exitTime: t.exitTime.toISOString(),
  }));

  return NextResponse.json({ transits: serialized, month });
}
