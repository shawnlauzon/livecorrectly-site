import { describe, it, expect } from 'vitest';
import { toPublicSubscriber, type Subscriber } from '@/lib/types/subscriber';
import type { ChartRecord } from '@/lib/types/chart';

const subscriber: Subscriber = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'person@example.com',
  first_name: 'Pat',
  last_name: 'Doe',
  birth_input: { date: '1990-01-02', time: '03:04', timeUnknown: false, city: 'Austin', country: 'US' },
  chart: { chart: {} } as unknown as ChartRecord,
  next_step: 5,
  welcome_resend_step: null,
  email_status: 'active',
  email_status_at: null,
  unsub_token: '22222222-2222-2222-2222-222222222222',
  created_at: '2026-01-01T00:00:00Z',
};

describe('toPublicSubscriber', () => {
  it('keeps only what the public chart page renders', () => {
    expect(toPublicSubscriber(subscriber)).toEqual({
      first_name: 'Pat',
      last_name: 'Doe',
      birth_input: subscriber.birth_input,
      chart: subscriber.chart,
      email_status: 'active',
    });
  });

  it('never exposes the email or unsubscribe token', () => {
    const json = JSON.stringify(toPublicSubscriber(subscriber));
    expect(json).not.toContain('person@example.com');
    expect(json).not.toContain(subscriber.unsub_token);
  });
});
