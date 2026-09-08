import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getBroadcastConfigs } from '@/emails/broadcast-loader';

/**
 * GET /api/admin/broadcast-slugs
 *
 * Returns all broadcast slugs from disk with enabled status and auto-generated labels.
 * Auth: Bearer <ADMIN_PASSWORD>
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

  const configs = getBroadcastConfigs();

  const slugs = configs.map((config) => ({
    slug: config.slug,
    label: config.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    enabled: config.enabled,
  }));

  return NextResponse.json({ slugs });
}
