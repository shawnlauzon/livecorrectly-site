import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubscriberById } from '@/lib/db';
import { BodygraphChart } from '@/components/bodygraph/bodygraph-chart';

export const metadata: Metadata = {
  title: 'Chart Preview — Live Correctly',
  robots: 'noindex, nofollow',
};

export default async function ChartPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subscriber = await getSubscriberById(id);

  if (!subscriber?.chart?.chart) {
    notFound();
  }

  const { chart } = subscriber.chart;
  const name = subscriber.first_name || 'Unknown';

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
        }}
      >
        {name}&rsquo;s Chart
      </h1>
      <p
        style={{
          color: 'var(--muted, #6E688A)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
        }}
      >
        Bodygraph SVG renderer preview
      </p>

      <BodygraphChart
        chart={chart}
        planets={chart.planets}
        showGateNumbers={true}
        showSidebars={true}
      />
    </div>
  );
}
