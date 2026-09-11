import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getEmailPerformanceStats, getDailyEmailActivity } from '@/lib/db';

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

    const [emails, daily] = await Promise.all([
      getEmailPerformanceStats(),
      getDailyEmailActivity(),
    ]);

    const totals = {
      sent: 0,
      opened: 0,
      clicked: 0,
    };
    for (const e of emails) {
      totals.sent += e.sent;
      totals.opened += e.opened;
      totals.clicked += e.clicked;
    }

    return NextResponse.json({ emails, totals, daily });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
