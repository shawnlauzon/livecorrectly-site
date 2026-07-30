'use client';

import { Subscriber } from '@/lib/types/subscriber';
import ChartReadout from '@/components/chart-readout';
import styles from './chart-display.module.css';

interface ChartDisplayProps {
  subscriber: Subscriber;
  showBirthInfo?: boolean;
}

export default function ChartDisplay({
  subscriber,
  showBirthInfo = true
}: ChartDisplayProps) {
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
      </dl>

      <ChartReadout
        chart={subscriber.chart.chart}
        classes={{
          readout: styles.list,
          rowitem: styles.item,
          k: styles.label,
          v: styles.value,
        }}
      />
    </div>
  );
}
