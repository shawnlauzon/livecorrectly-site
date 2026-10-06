import { NextRequest, NextResponse } from 'next/server';
import { requestChartLink } from '@/lib/email/chart-link';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Already have a chart? Email me my link."
 * Accepts: { email: string, slug?: string } — slug is the newsletter issue being read.
 *
 * Always answers { ok: true } for a well-formed email, whether or not it belongs to
 * a subscriber, so the endpoint can't be used to find out who is subscribed.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  const slug = typeof body.slug === 'string' ? body.slug : undefined;

  try {
    const result = await requestChartLink({ email, slug });
    if (result === 'failed') {
      console.error(`[chart-link] Send failed for ${email}`);
    } else {
      console.log(`[chart-link] ${result} for ${email}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[chart-link] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
