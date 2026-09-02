import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByUnsubToken, updateEmailStatus } from '@/lib/db';

/**
 * Unsubscribe endpoint.
 *
 * GET ?token=<uuid> — browser click from email link.
 * POST — RFC 8058 one-click unsubscribe (mail client auto-post).
 *
 * Both return a generic confirmation regardless of whether the token exists,
 * to avoid leaking email address existence.
 */

const CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
  <h1>You've been unsubscribed</h1>
  <p>You won't receive any more emails from Live Correctly.</p>
</body>
</html>`;

async function handleUnsubscribe(token: string | null, from: string | null): Promise<void> {
  if (!token) return;

  const subscriber = await getSubscriberByUnsubToken(token);
  if (subscriber && subscriber.email_status === 'active') {
    await updateEmailStatus(subscriber.id, 'unsubscribed', from ?? undefined);
    console.log(`[unsubscribe] Unsubscribed subscriber ${subscriber.id} (from=${from ?? 'unknown'})`);
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const from = request.nextUrl.searchParams.get('utm_campaign');
  await handleUnsubscribe(token, from);

  return new NextResponse(CONFIRMATION_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function POST(request: NextRequest) {
  // RFC 8058: one-click POST goes to the full URL including query params
  let token = request.nextUrl.searchParams.get('token');
  const from = request.nextUrl.searchParams.get('utm_campaign');

  if (!token) {
    try {
      const formData = await request.formData();
      token = formData.get('token') as string | null;
    } catch {
      // Not form data — try JSON
      try {
        const body = await request.json();
        token = body.token ?? null;
      } catch {
        // No parseable body — token stays null
      }
    }
  }

  await handleUnsubscribe(token, from);
  return new NextResponse(null, { status: 200 });
}
