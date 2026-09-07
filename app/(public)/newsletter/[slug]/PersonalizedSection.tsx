import type { ComponentType } from 'react';
import type { EmailChartData } from '@/lib/hd-chart/parse-for-email';
import ShareLink from './ShareLink';
import styles from './page.module.css';

interface PersonalizedSectionProps {
  Component: ComponentType<{ chart: EmailChartData }>;
  chart: EmailChartData;
  shareUrl: string;
}

export default function PersonalizedSection({
  Component,
  chart,
  shareUrl,
}: PersonalizedSectionProps) {
  return (
    <aside className={styles.personalized}>
      <h2 className={styles.personalizedHeading}>What this means for you</h2>
      <Component chart={chart} />
      <ShareLink url={shareUrl} />
    </aside>
  );
}
