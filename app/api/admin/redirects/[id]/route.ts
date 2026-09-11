import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { updateRedirectRule, deleteRedirectRule } from '@/lib/db';

function getPassword(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const password = getPassword(request);
    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { destination_url } = body;

    if (!destination_url) {
      return NextResponse.json({ error: 'Missing required field: destination_url' }, { status: 400 });
    }

    const rule = await updateRedirectRule(id, { destination_url });
    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    console.error('Error updating redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const password = getPassword(request);
    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteRedirectRule(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
