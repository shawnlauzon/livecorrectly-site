import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  reactivateUnsubscribed: vi.fn(),
  recordEmailEvent: vi.fn(),
}));
vi.mock('@/lib/resend/contacts', () => ({
  resubscribeContactInResend: vi.fn(),
}));

import { reactivateUnsubscribed, recordEmailEvent } from '@/lib/db';
import { resubscribeContactInResend } from '@/lib/resend/contacts';
import { resubscribe } from '@/lib/email/resubscribe';

const ID = '11111111-1111-1111-1111-111111111111';

describe('resubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reactivateUnsubscribed).mockResolvedValue({ email: 'pat@example.com' });
  });

  it('reactivates an unsubscribed subscriber, records their consent, and syncs Resend', async () => {
    expect(await resubscribe(ID)).toBe(true);
    expect(reactivateUnsubscribed).toHaveBeenCalledWith(ID);
    expect(recordEmailEvent).toHaveBeenCalledWith({
      subscriberId: ID,
      eventType: 'resubscribe',
      emailType: 'website',
    });
    expect(resubscribeContactInResend).toHaveBeenCalledWith('pat@example.com');
  });

  it('does nothing for anyone who is not unsubscribed', async () => {
    vi.mocked(reactivateUnsubscribed).mockResolvedValue(null);
    expect(await resubscribe(ID)).toBe(false);
    expect(recordEmailEvent).not.toHaveBeenCalled();
    expect(resubscribeContactInResend).not.toHaveBeenCalled();
  });

  it('keeps the resubscribe when the Resend sync fails', async () => {
    vi.mocked(resubscribeContactInResend).mockRejectedValue(new Error('down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await resubscribe(ID)).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
