import type { Metadata } from 'next';
import Link from 'next/link';
import ChartForm from '@/components/chart-form';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'See how you\u2019re designed \u2014 Live Correctly',
  description:
    'Get your Human Design chart, then learn how to actually use it.',
};

export default function SeeYourDesign() {
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
            href="/"
            style={{
              fontWeight: 500,
              fontSize: '0.92rem',
              textDecoration: 'none',
              color: 'var(--muted)',
            }}
          >
            &larr; Back
          </Link>
        </nav>
      </header>

      <main className={`${styles.wrap} ${styles.main}`}>
        <p className={styles.eyebrow}>Human Design</p>
        <h1 className={styles.h1}>See how you&rsquo;re designed.</h1>
        <p className={styles.lead}>
          Enter your birth details and see your chart right away. I&rsquo;ll
          also send you a short series on how you&rsquo;re specifically
          designed, and use it both in and outside of work.
        </p>

        <ChartForm />
      </main>

      <footer className={`${styles.wrap} ${styles.footer}`}>
        shawn@livecorrectly.com &nbsp;&middot;&nbsp; Austin, TX
      </footer>
    </>
  );
}
