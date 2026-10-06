import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Subscriber } from '@/lib/types/subscriber';

vi.mock('@/lib/db', () => ({
  getSubscriberByEmailIgnoreCase: vi.fn(),
  claimRepeatableEmailSend: vi.fn(),
  setEmailSendResendId: vi.fn(),
}));
vi.mock('@/lib/email/send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/send')>()),
  sendTransactionalEmail: vi.fn(),
}));

import { getSubscriberByEmailIgnoreCase, claimRepeatableEmailSend, setEmailSendResendId } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/send';
import { requestChartLink, CHART_LINK_EMAIL_TYPE } from '@/lib/email/chart-link';

const ID = '11111111-1111-1111-1111-111111111111';
const subscriber = {
  id: ID,
  email: 'pat@example.com',
  first_name: 'Pat',
  last_name: null,
  unsub_token: 'tok',
  email_status: 'active',
} as Subscriber;

/** Props passed to the rendered email component on the last send. */
function sentProps() {
  const call = vi.mocked(sendTransactionalEmail).mock.calls.at(-1)![0];
  return call.react.props as { newsletterUrl: string; chartUrl: string; firstName: string };
}

describe('requestChartLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_URL;
    vi.mocked(getSubscriberByEmailIgnoreCase).mockResolvedValue(subscriber);
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(true);
    vi.mocked(sendTransactionalEmail).mockResolvedValue({ success: true, id: 're_1' });
  });

  it('emails an active subscriber a personalized link back to the issue they were reading', async () => {
    expect(await requestChartLink({ email: '  pat@example.com ', slug: 'issue-three' })).toBe('sent');

    expect(getSubscriberByEmailIgnoreCase).toHaveBeenCalledWith('pat@example.com');
    const props = sentProps();
    expect(props.firstName).toBe('Pat');
    expect(props.newsletterUrl).toBe(
      `https://www.livecorrectly.com/newsletter/issue-three?s=${ID}&utm_source=livecorrectly&utm_medium=email&utm_campaign=chart_link`,
    );
    expect(props.chartUrl).toBe(
      `https://www.livecorrectly.com/see-your-design/${ID}?utm_source=livecorrectly&utm_medium=email&utm_campaign=chart_link`,
    );
    expect(vi.mocked(sendTransactionalEmail).mock.calls[0][0]).not.toHaveProperty('unsubToken');
    expect(setEmailSendResendId).toHaveBeenCalledWith(ID, CHART_LINK_EMAIL_TYPE, 're_1');
  });

  it('links to the newsletter index without a slug', async () => {
    await requestChartLink({ email: 'pat@example.com' });
    expect(sentProps().newsletterUrl).toContain(`/newsletter?s=${ID}&`);
  });

  it('ignores a malformed slug rather than putting it in the link', async () => {
    await requestChartLink({ email: 'pat@example.com', slug: '../admin' });
    expect(sentProps().newsletterUrl).toContain(`/newsletter?s=${ID}&`);
  });

  it('still sends to an unsubscribed subscriber, who asked for it', async () => {
    vi.mocked(getSubscriberByEmailIgnoreCase).mockResolvedValue({ ...subscriber, email_status: 'unsubscribed' });
    expect(await requestChartLink({ email: 'pat@example.com' })).toBe('sent');
  });

  it.each(['bounced', 'complained', 'suppressed'] as const)('sends nothing to a %s address', async (status) => {
    vi.mocked(getSubscriberByEmailIgnoreCase).mockResolvedValue({ ...subscriber, email_status: status });
    expect(await requestChartLink({ email: 'pat@example.com' })).toBe('not_found');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when no subscriber has that email', async () => {
    vi.mocked(getSubscriberByEmailIgnoreCase).mockResolvedValue(null);
    expect(await requestChartLink({ email: 'nobody@example.com' })).toBe('not_found');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when a link went out within the rate-limit window', async () => {
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(false);
    expect(await requestChartLink({ email: 'pat@example.com' })).toBe('rate_limited');
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('reports a failed send without recording a Resend id', async () => {
    vi.mocked(sendTransactionalEmail).mockResolvedValue({ success: false });
    expect(await requestChartLink({ email: 'pat@example.com' })).toBe('failed');
    expect(setEmailSendResendId).not.toHaveBeenCalled();
  });
});
