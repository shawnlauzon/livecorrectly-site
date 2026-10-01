import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getScheduleForNewsletter,
  deleteNewsletterSchedule,
  deleteEmailSendsForBroadcast,
  deleteEmailSendsForResendEmails,
} from '@/lib/db';
import { getResendClient } from '@/lib/resend-contacts';

/**
 * POST /api/admin/newsletters/cancel
 *
 * Unschedule a scheduled newsletter (broadcast, or direct per-subscriber emails).
 * The schedule row is deleted — afterwards the issue is exactly as if it had
 * never been scheduled.
 *
 * Body: { newsletterNumber: number }
 *
 * Pipeline:
 * 1. Find the active schedule for this newsletter
 * 2. Cancel the broadcast (or each scheduled email) in Resend
 * 3. Delete the email_sends records for it
 * 4. Delete the schedule row
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

    // Cancel in Resend. Continue with the DB rollback even if Resend fails —
    // the send may have already happened or may not exist.
    const client = getResendClient();
    if (schedule.kind === 'direct') {
      for (const emailId of schedule.resend_email_ids ?? []) {
        const { error: cancelError } = await client.emails.cancel(emailId);
        if (cancelError) {
          console.warn(`[cancel] Failed to cancel email ${emailId} in Resend:`, cancelError);
        }
      }
      await deleteEmailSendsForResendEmails(schedule.resend_email_ids ?? []);
    } else if (schedule.broadcast_id) {
      const { error: cancelError } = await client.broadcasts.remove(schedule.broadcast_id);
      if (cancelError) {
        console.warn(
          `[cancel] Failed to remove/delete broadcast ${schedule.broadcast_id} in Resend:`,
          cancelError,
        );
      }
      await deleteEmailSendsForBroadcast(schedule.broadcast_id);
    }

    await deleteNewsletterSchedule(schedule.id);

    console.log(
      `[cancel] Newsletter #${newsletterNumber} unscheduled (${schedule.kind}${schedule.broadcast_id ? ` broadcast ${schedule.broadcast_id}` : ''})`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/newsletters/cancel] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
