import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getSubscribersForEmailType } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = authHeader.replace('Bearer ', '');
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailType = request.nextUrl.searchParams.get('emailType');
    if (!emailType) {
      return NextResponse.json(
        { error: 'Missing emailType query parameter' },
        { status: 400 }
      );
    }

    const subscribers = await getSubscribersForEmailType(emailType);
    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Error fetching email subscribers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
