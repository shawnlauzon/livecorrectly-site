import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getAllRedirectRules, createRedirectRule } from '@/lib/db';

function getPassword(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

export async function GET(request: NextRequest) {
  try {
    const password = getPassword(request);
    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await getAllRedirectRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching redirect rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const password = getPassword(request);
    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, property_type, property_value, destination_url } = body;

    if (!slug || !property_type || !property_value || !destination_url) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, property_type, property_value, destination_url' },
        { status: 400 },
      );
    }

    const rule = await createRedirectRule({ slug, property_type, property_value, destination_url });
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A rule with this slug, property type, and value already exists' },
        { status: 409 },
      );
    }
    console.error('Error creating redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
