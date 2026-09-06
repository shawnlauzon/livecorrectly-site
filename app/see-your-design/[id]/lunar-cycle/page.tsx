import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSubscriberById } from '@/lib/db';
import { calculateLunarCycle } from '@/lib/lunar';
import LunarTimeline, { type SerializedMoonTransit } from './lunar-timeline';
import styles from '../../page.module.css';

export default async function LunarCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subscriber = await getSubscriberById(id);

  if (!subscriber) {
    redirect(`/see-your-design/${id}`);
  }

  // Only Reflectors (type === 4) have a lunar cycle page
  if (subscriber.chart.chart.type !== 4) {
    redirect(`/see-your-design/${id}`);
  }

  // Extract natal gates from the chart
  const natalGates = subscriber.chart.chart.gates.map((g) => g.gate);

  // Compute date range: current month's calendar grid
  // Includes trailing days from prev month (first week) and next month (last week)
  const now = new Date();
  const year = now.getUTCFullYear();
  const mo = now.getUTCMonth();

  const firstOfMonth = new Date(Date.UTC(year, mo, 1));
  const startDow = firstOfMonth.getUTCDay(); // 0=Sun
  const leadingDays = startDow;

  const lastOfMonth = new Date(Date.UTC(year, mo + 1, 0));
  const daysInMonth = lastOfMonth.getUTCDate();
  const endDow = lastOfMonth.getUTCDay();
  const trailingDays = endDow === 6 ? 0 : 6 - endDow;

  const startDate = new Date(Date.UTC(year, mo, 1 - leadingDays));
  const totalDays = leadingDays + daysInMonth + trailingDays;

  const startMonth = `${year}-${String(mo + 1).padStart(2, '0')}`;

  // Calculate transits for the current month grid (gate transitions are cached in-memory)
  const transits = calculateLunarCycle(startDate, natalGates, totalDays);

  // Serialize Date objects to ISO strings for the client
  const serializedTransits: SerializedMoonTransit[] = transits.map((t) => ({
    ...t,
    enterTime: t.enterTime.toISOString(),
    exitTime: t.exitTime.toISOString(),
  }));

  return (
    <>
      <header className={styles.wrap}>
        <nav
          style={{
            paddingTop: 28,
            paddingBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: '1.24rem',
              letterSpacing: '-0.02em',
              textDecoration: 'none',
            }}
          >
            Live <span style={{ color: 'var(--grape)' }}>Correctly</span>
          </Link>
          <Link
            href={`/see-your-design/${id}`}
            style={{
              fontWeight: 500,
              fontSize: '0.92rem',
              textDecoration: 'none',
              color: 'var(--muted)',
            }}
          >
            &larr; Your chart
          </Link>
        </nav>
      </header>

      <main className={`${styles.wrap} ${styles.main}`}>
        <p className={styles.eyebrow}>Lunar Cycle</p>
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Moon cycle for {subscriber.first_name}{subscriber.last_name ? ` ${subscriber.last_name}` : ''}
        </h1>
        <p
          style={{
            fontSize: 'clamp(0.95rem, 1.4vw, 1.08rem)',
            color: 'var(--muted)',
            maxWidth: '36em',
            marginBottom: 32,
          }}
        >
          As the Moon moves through the 64 gates, it completes channels with your
          natal activations &mdash; giving you a sample of different energy types
          throughout your ~28-day cycle.
        </p>

        <LunarTimeline
          transits={serializedTransits}
          chart={subscriber.chart.chart}
          startMonth={startMonth}
          subscriberId={id}
        />
      </main>

      <footer className={`${styles.wrap} ${styles.footer}`}>
        shawn@livecorrectly.com &nbsp;&middot;&nbsp; Austin, TX
      </footer>
    </>
  );
}
