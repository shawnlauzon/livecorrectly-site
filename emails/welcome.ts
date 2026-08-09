import { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { Welcome0 } from '@/emails/welcome0';
import { Welcome1 } from '@/emails/welcome1';
import { Welcome2 } from '@/emails/welcome2';
import { Welcome3 } from '@/emails/welcome3';
import React from 'react';

export const WELCOME_SERIES_LENGTH = 3;

/**
 * Build the React element for a welcome series step.
 * Step 0 is the immediate confirmation email (not part of the 3-day drip).
 * Steps 1-3 are the drip series.
 * Returns null if the step is out of range.
 */
export function getWelcomeEmail(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail>,
  unsubscribeUrl: string,
  chartUrl?: string
): React.ReactElement | null {
  const props = {
    firstName: subscriber.first_name,
    chart,
    unsubscribeUrl
  };

  switch (step) {
    case 0:
      return React.createElement(Welcome0, { ...props, chartUrl: chartUrl ?? '' });
    case 1:
      return React.createElement(Welcome1, props);
    case 2:
      return React.createElement(Welcome2, props);
    case 3:
      return React.createElement(Welcome3, props);
    default:
      return null;
  }
}
