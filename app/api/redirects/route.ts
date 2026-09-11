import { NextResponse } from 'next/server';
import { getAllRedirectRules, createRedirectRule, getAllSubscribers } from '@/lib/db';
import { getChartProperty } from '@/lib/redirect';

type Sample = { email: string; firstName: string };

export async function GET() {
  try {
    const [rules, subscribers] = await Promise.all([
      getAllRedirectRules(),
      getAllSubscribers(),
    ]);

    // Pre-compute one sample subscriber per type and per profile
    const samplesByType: Record<string, Sample> = {};
    const samplesByProfile: Record<string, Sample> = {};
    for (const sub of subscribers) {
      if (sub.email_status !== 'active' || !sub.chart?.chart) continue;
      const typeName = getChartProperty(sub.chart.chart, 'type');
      const profileName = getChartProperty(sub.chart.chart, 'profile');
      if (typeName && !samplesByType[typeName]) {
        samplesByType[typeName] = { email: sub.email, firstName: sub.first_name };
      }
      if (profileName && !samplesByProfile[profileName]) {
        samplesByProfile[profileName] = { email: sub.email, firstName: sub.first_name };
      }
    }

    return NextResponse.json({ rules, samples: { byType: samplesByType, byProfile: samplesByProfile } });
  } catch (error) {
    console.error('Error fetching redirect rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
