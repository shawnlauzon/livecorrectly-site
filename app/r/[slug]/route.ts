import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberByEmail, getRedirectRulesForSlug } from '@/lib/db';
import { getChartProperty } from '@/lib/redirect';

const APP_URL = process.env.APP_URL || 'https://www.livecorrectly.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.redirect(APP_URL);
  }

  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber?.chart?.chart) {
    return NextResponse.redirect(APP_URL);
  }

  const rules = await getRedirectRulesForSlug(slug);
  if (rules.length === 0) {
    return NextResponse.redirect(APP_URL);
  }

  // Collect unique property types from the rules
  const propertyTypes = [...new Set(rules.map(r => r.property_type))];

  // Resolve chart values for each property type
  const chartValues: Record<string, string | null> = {};
  for (const pt of propertyTypes) {
    chartValues[pt] = getChartProperty(subscriber.chart.chart, pt);
  }

  // Find the first specific match
  let matchedUrl: string | null = null;
  let defaultUrl: string | null = null;

  for (const rule of rules) {
    if (rule.property_value === '*') {
      defaultUrl = rule.destination_url;
      continue;
    }
    if (chartValues[rule.property_type] === rule.property_value) {
      matchedUrl = rule.destination_url;
      break;
    }
  }

  const destination = matchedUrl ?? defaultUrl ?? APP_URL;
  return NextResponse.redirect(destination);
}
