import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterDueSubscribers,
  insertNewsletterSegment,
  deleteNewsletterSegment,
  getNewsletterSegments,
} from '@/lib/db';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';
import { getResendClient } from '@/lib/resend-contacts';

/**
 * POST /api/admin/newsletters/segment
 *
 * Create a persistent audience segment from subscribers due for a specific newsletter issue.
 *
 * Body: { newsletterNumber: number, segmentName: string }
 *
 * Creates a Resend segment with prefix "audience_", adds all due subscribers,
 * and stores a row in newsletter_segments tracking the next_issue.
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

  let body: { newsletterNumber?: number; segmentName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { newsletterNumber, segmentName } = body;

  if (typeof newsletterNumber !== 'number' || newsletterNumber < 1) {
    return NextResponse.json({ error: 'Invalid newsletterNumber' }, { status: 400 });
  }

  if (!segmentName || typeof segmentName !== 'string' || segmentName.trim().length === 0) {
    return NextResponse.json({ error: 'segmentName is required' }, { status: 400 });
  }

  try {
    // Get subscribers due for this newsletter issue
    const allDue = await getNewsletterDueSubscribers(WELCOME_SERIES_LENGTH);
    const subscribers = allDue.filter(s => s.next_step === newsletterNumber);

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers are due for this newsletter' },
        { status: 422 },
      );
    }

    const client = getResendClient();

    // Create Resend segment with audience_ prefix (survives ephemeral cleanup)
    const resendName = `audience_${segmentName.trim()}`;
    const { data: segmentData, error: segmentError } = await client.segments.create({
      name: resendName,
    });
    if (segmentError || !segmentData) {
      return NextResponse.json(
        { error: `Failed to create Resend segment: ${JSON.stringify(segmentError)}` },
        { status: 500 },
      );
    }

    // Add each subscriber to the segment
    let contactCount = 0;
    for (const subscriber of subscribers) {
      const { error } = await client.contacts.segments.add({
        email: subscriber.email,
        segmentId: segmentData.id,
      });
      if (error) {
        console.warn(`[segment] Failed to add ${subscriber.email} to segment:`, error);
        continue;
      }
      contactCount++;
    }

    if (contactCount === 0) {
      // Clean up the empty segment
      await client.segments.remove(segmentData.id).catch(() => {
        // Don't let cleanup failure block the response
      });
      return NextResponse.json(
        { error: 'No contacts could be added to segment' },
        { status: 500 },
      );
    }

    // Insert DB row
    const segment = await insertNewsletterSegment({
      newsletterId: 1, // single publication for now
      name: segmentName.trim(),
      resendSegmentId: segmentData.id,
      nextIssue: newsletterNumber,
    });

    console.log(
      `[segment] Created audience segment "${segmentName}" (Resend: ${segmentData.id}) with ${contactCount} contacts for issue #${newsletterNumber}`,
    );

    return NextResponse.json({
      id: segment.id,
      segmentId: segmentData.id,
      segmentName: segment.name,
      contactCount,
      nextIssue: segment.nextIssue,
    });
  } catch (error) {
    console.error('[admin/newsletters/segment] Error creating segment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/newsletters/segment
 *
 * Remove a persistent audience segment.
 *
 * Body: { segmentId: number } (our DB ID)
 *
 * Deletes the Resend segment (ignoring 404) and removes the DB row.
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { segmentId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { segmentId } = body;

  if (typeof segmentId !== 'number') {
    return NextResponse.json({ error: 'Invalid segmentId' }, { status: 400 });
  }

  try {
    // Look up all segments to find the one to delete
    const segments = await getNewsletterSegments(1);
    const segment = segments.find(s => s.id === segmentId);

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Delete from Resend (ignore 404 — may already be gone)
    const client = getResendClient();
    await client.segments.remove(segment.resendSegmentId).catch((err: unknown) => {
      console.warn(`[segment] Failed to delete Resend segment ${segment.resendSegmentId}:`, err);
    });

    // Delete DB row
    await deleteNewsletterSegment(segmentId);

    console.log(
      `[segment] Deleted audience segment "${segment.name}" (DB: ${segmentId}, Resend: ${segment.resendSegmentId})`,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/newsletters/segment] Error deleting segment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
