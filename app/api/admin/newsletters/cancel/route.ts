import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getScheduleForNewsletter,
  updateScheduleStatus,
  getSubscribersForNewsletterSchedule,
  rollBackNewsletterAdvancement,
  deleteEmailSendsForBroadcast,
} from '@/lib/db';
import { getResendClient } from '@/lib/resend-contacts';

/**
 * POST /api/admin/newsletters/cancel
 *
 * Cancel a scheduled newsletter broadcast.
 *
 * Body: { newsletterNumber: number }
 *
 * Pipeline:
 * 1. Find the active schedule for this newsletter
 * 2. Cancel the broadcast in Resend
 * 3. Roll back next_step for affected subscribers
 * 4. Delete email_sends records for the broadcast
 * 5. Update schedule status to 'cancelled'
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
    const body = await request.json();
    const { newsletterNumber } = body;

    if (typeof newsletterNumber !== 'number' || newsletterNumber < 1) {
      return NextResponse.json({ error: 'Invalid newsletterNumber' }, { status: 400 });
    }

    // Find active schedule
    const schedule = await getScheduleForNewsletter(newsletterNumber);
    if (!schedule || schedule.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Newsletter #${newsletterNumber} is not currently scheduled` },
        { status: 404 },
      );
    }

    // Cancel the broadcast in Resend
    const client = getResendClient();
    const { error: cancelError } = await client.broadcasts.cancel(schedule.broadcast_id);
    if (cancelError) {
      console.warn(
        `[cancel] Failed to cancel broadcast ${schedule.broadcast_id} in Resend:`,
        cancelError,
      );
      // Continue with DB rollback even if Resend cancel fails —
      // the broadcast may have already been sent or may not exist
    }

    // Find subscribers whose next_step was advanced
    const subscriberIds = await getSubscribersForNewsletterSchedule(
      newsletterNumber,
      schedule.broadcast_id,
    );

    // Roll back next_step
    const rolledBack = await rollBackNewsletterAdvancement(
      subscriberIds,
      newsletterNumber,
    );

    // Delete email_sends records
    await deleteEmailSendsForBroadcast(schedule.broadcast_id);

    // Update schedule status
    await updateScheduleStatus(schedule.id, 'cancelled');

    console.log(
      `[cancel] Newsletter #${newsletterNumber} cancelled. Broadcast ${schedule.broadcast_id}, rolled back ${rolledBack}/${subscriberIds.length} subscribers`,
    );

    return NextResponse.json({
      ok: true,
      rolledBack,
      totalAffected: subscriberIds.length,
    });
  } catch (error) {
    console.error('[admin/newsletters/cancel] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
