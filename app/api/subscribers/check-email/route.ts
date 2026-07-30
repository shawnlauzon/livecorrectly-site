import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByEmail } from '@/lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Missing required query parameter: email' },
      { status: 400 }
    );
  }

  try {
    const subscriber = await getSubscriberByEmail(email);
    return NextResponse.json({ exists: subscriber !== null });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
