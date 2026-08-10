import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscriberById } from '@/lib/db';
import { renderEmail } from '@/emails/send';
import { buildBroadcastEmail, BroadcastSlug, BROADCASTS } from '@/emails/broadcast-config';

/**
 * GET /api/admin/subscribers/[id]/preview-broadcast?slug=reengagement-2026-08
 *
 * Renders a broadcast email as HTML for admin preview.
 * Returns the full rendered HTML along with the subject line and preview text.
 * Auth: Bearer <ADMIN_PASSWORD>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const slugParam = request.nextUrl.searchParams.get('slug');
    if (!slugParam) {
      return NextResponse.json({ error: 'slug query param is required' }, { status: 400 });
    }

    // Validate slug exists in BROADCASTS config
    if (!(slugParam in BROADCASTS)) {
      return NextResponse.json(
        { error: `Unknown broadcast slug: ${slugParam}` },
        { status: 400 }
      );
    }

    const subscriber = await getSubscriberById(id);
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    // Use shared broadcast builder to ensure identical output to send endpoint
    const { element, subject, preview } = buildBroadcastEmail(
      slugParam as BroadcastSlug,
      id,
      subscriber.first_name,
      subscriber.created_at,
      subscriber.unsub_token
    );

    const html = await renderEmail(element);

    return NextResponse.json({ subject, preview, html });
  } catch (error) {
    console.error('[admin] Error rendering broadcast preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
