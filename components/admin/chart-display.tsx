'use client';

import { Subscriber } from '@/lib/types/subscriber';
import hdChart from '@/lib/hd-chart';
import styles from './chart-display.module.css';

interface ChartDisplayProps {
  subscriber: Subscriber;
  showBirthInfo?: boolean;
}

function capitalize(str: string | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function ChartDisplay({
  subscriber,
  showBirthInfo = true
}: ChartDisplayProps) {
  const hd = hdChart(subscriber.chart.chart);

  return (
    <div className={styles.container}>
      <dl className={styles.list}>
        <div className={styles.item}>
          <dt className={styles.label}>Name</dt>
          <dd className={styles.value}>
            {subscriber.first_name}{' '}
            {subscriber.last_name ? subscriber.last_name : ''}
          </dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Email</dt>
          <dd className={styles.value}>{subscriber.email}</dd>
        </div>

        {showBirthInfo && (
          <div className={styles.item}>
            <dt className={styles.label}>Birth Info</dt>
            <dd className={styles.value}>
              {subscriber.birth_date}
              {subscriber.birth_time && ` at ${subscriber.birth_time}`}
              {subscriber.time_unknown && ' (time unknown)'}
              <br />
              {subscriber.birth_place}
            </dd>
          </div>
        )}

        <div className={styles.item}>
          <dt className={styles.label}>Type</dt>
          <dd className={styles.value}>{hd.type()}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Career Design</dt>
          <dd className={styles.value}>{hd.careerDesign()}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Strategy</dt>
          <dd className={styles.value}>{capitalize(hd.strategy())}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Inner Authority</dt>
          <dd className={styles.value}>{hd.innerAuthority()}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Decision-making Strategy</dt>
          <dd className={styles.value}>
            {capitalize(hd.decisionMakingStrategy())}
          </dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Profile</dt>
          <dd className={styles.value}>{hd.profile()}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Definition</dt>
          <dd className={styles.value}>{capitalize(hd.definition())}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Assimilation Style</dt>
          <dd className={styles.value}>{capitalize(hd.assimilationStyle())}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Signature Theme (on-track)</dt>
          <dd className={styles.value}>{capitalize(hd.signatureTheme())}</dd>
        </div>

        <div className={styles.item}>
          <dt className={styles.label}>Not-Self Theme (off-track)</dt>
          <dd className={styles.value}>{capitalize(hd.notSelfTheme())}</dd>
        </div>
      </dl>
    </div>
  );
}
