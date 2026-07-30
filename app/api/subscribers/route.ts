import { NextRequest, NextResponse } from 'next/server';
import { createSubscriber } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, first_name, birth_date, birth_time, time_unknown, birth_place, chart } = body;

    if (!email || !first_name || !birth_date || !birth_place || chart == null) {
      return NextResponse.json(
        { error: 'Missing required fields: email, first_name, birth_date, birth_place, chart' },
        { status: 400 }
      );
    }

    const subscriber = await createSubscriber({
      email,
      first_name,
      birth_date,
      birth_time: birth_time ?? null,
      time_unknown: !!time_unknown,
      birth_place,
      chart,
    });

    return NextResponse.json({ id: subscriber.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
