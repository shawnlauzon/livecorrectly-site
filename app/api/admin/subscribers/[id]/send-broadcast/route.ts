import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { sendEmail, formatEmailRecipient } from '@/emails/send';
import { buildBroadcastEmail, BroadcastSlug } from '@/emails/broadcast-config';

/**
 * POST /api/admin/subscribers/[id]/send-broadcast
 *
 * Manually send a broadcast email to a subscriber for testing/verification.
 * Does NOT record in broadcast_sends — manual sends are independent of the
 * automated broadcast, so the subscriber still gets the real send from the cron.
 *
 * Body: { slug: "reengagement-2026-08" }
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Parse and validate body
    const body = await request.json();
    const slug = body.slug;

    if (typeof slug !== 'string' || slug.length === 0) {
      return NextResponse.json(
        { error: 'slug must be a non-empty string' },
        { status: 400 }
      );
    }

    // Fetch subscriber
    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Check email status
    if (subscriber.email_status !== 'active') {
      return NextResponse.json(
        { error: `Cannot send to subscriber with email_status "${subscriber.email_status}"` },
        { status: 422 }
      );
    }

    // Build and send the email using shared broadcast config
    const { element, subject } = buildBroadcastEmail(
      slug as BroadcastSlug,
      id,
      subscriber.first_name,
      subscriber.created_at,
      subscriber.unsub_token
    );

    const result = await sendEmail({
      to: formatEmailRecipient(subscriber.first_name, subscriber.last_name, subscriber.email),
      subject,
      react: element,
      unsubToken: subscriber.unsub_token,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log(`[admin] Manually sent broadcast "${slug}" to ${subscriber.email} (id=${result.id})`);
    return NextResponse.json({ ok: true, slug, emailId: result.id });
  } catch (error) {
    console.error('[admin] Error sending broadcast email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
