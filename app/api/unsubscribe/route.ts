import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByUnsubToken, updateEmailStatus } from '@/lib/db';
import { unsubscribeContactInResend } from '@/lib/resend-contacts';

/**
 * Unsubscribe endpoint.
 *
 * GET ?token=<uuid> — browser click from email link.
 * POST — RFC 8058 one-click unsubscribe (mail client auto-post).
 *
 * Both return a generic confirmation regardless of whether the token exists,
 * to avoid leaking email address existence.
 */

function confirmationHtml(campaign: string | null): string {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const safeCampaign = (campaign ?? 'unknown').replace(/'/g, "\\'");
  const gaScript = gaId ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_personalization:'denied',ad_user_data:'denied'});
    gtag('js',new Date());gtag('config','${gaId}');
    try{if(localStorage.getItem('cookie-consent')==='granted')gtag('consent','update',{analytics_storage:'granted'})}catch(e){}
    gtag('event','email_unsubscribe',{campaign:'${safeCampaign}'});
  </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Unsubscribed</title>${gaScript}</head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
  <h1>You've been unsubscribed</h1>
  <p>You won't receive any more emails from Live Correctly.</p>
</body>
</html>`;
}

async function handleUnsubscribe(token: string | null, from: string | null): Promise<void> {
  if (!token) return;

  const subscriber = await getSubscriberByUnsubToken(token);
  if (subscriber && subscriber.email_status === 'active') {
    await updateEmailStatus(subscriber.id, 'unsubscribed', from ?? undefined);
    console.log(`[unsubscribe] Unsubscribed subscriber ${subscriber.id} (from=${from ?? 'unknown'})`);

    // Sync to Resend so they're excluded from future broadcasts
    try {
      await unsubscribeContactInResend(subscriber.email);
    } catch (err) {
      console.error(`[unsubscribe] Failed to sync unsubscribe to Resend for ${subscriber.email}:`, err);
    }
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const from = request.nextUrl.searchParams.get('utm_campaign');
  await handleUnsubscribe(token, from);

  return new NextResponse(confirmationHtml(from), {
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
