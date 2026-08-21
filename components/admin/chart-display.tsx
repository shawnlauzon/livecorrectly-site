'use client';

import { Subscriber } from '@/lib/types/subscriber';
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
              {subscriber.birth_input.date}
              {subscriber.birth_input.time && ` at ${subscriber.birth_input.time}`}
              {subscriber.birth_input.timeUnknown && ' (time unknown)'}
              <br />
              {subscriber.birth_input.city}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
