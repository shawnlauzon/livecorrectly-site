import { NextResponse } from 'next/server';
import { updateRedirectRule, deleteRedirectRule } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteRedirectRule(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
