import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { loadAllNewsletterIssues } from '@/newsletters/loader';
import { WELCOME_SERIES_LENGTH } from '@/emails/welcome';

/**
 * GET /api/admin/newsletters/issues
 *
 * Lightweight endpoint returning all newsletter issue numbers and subjects.
 * Used by the editor's conditional node to populate the newsletter picker
 * on demand (only when the user selects "Newsletter" condition type).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = await loadAllNewsletterIssues();
  const issues: { number: number; subject: string }[] = [];

  for (const [num, raw] of all) {
    if (num <= WELCOME_SERIES_LENGTH) continue;
    issues.push({ number: num, subject: raw.subject });
  }

  issues.sort((a, b) => a.number - b.number);

  return NextResponse.json({ issues });
}
