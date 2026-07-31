import { Subscriber } from '@/lib/types/subscriber';
import { parseChartForEmail } from '@/lib/hd-chart/parse-for-email';
import { Welcome0 } from '@/emails/welcome0';
import { Welcome1 } from '@/emails/welcome1';
import { Welcome2 } from '@/emails/welcome2';
import { Welcome3 } from '@/emails/welcome3';
import { Welcome4 } from '@/emails/welcome4';
import { Welcome5 } from '@/emails/welcome5';
import React from 'react';

export const WELCOME_SERIES_LENGTH = 5;

/**
 * Build the React element for a welcome series step.
 * Step 0 is the immediate confirmation email (not part of the 5-day drip).
 * Steps 1-5 are the drip series.
 * Returns null if the step is out of range.
 */
export function getWelcomeEmail(
  step: number,
  subscriber: Subscriber,
  chart: ReturnType<typeof parseChartForEmail>,
  unsubscribeUrl: string,
  bookingUrl: string,
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
    case 4:
      return React.createElement(Welcome4, props);
    case 5:
      return React.createElement(Welcome5, { ...props, bookingUrl });
    default:
      return null;
  }
}
