import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('react-email', () => ({ render: vi.fn() }));
vi.mock('../lib/db', () => ({ getActiveSubscriberByEmail: vi.fn() }));

import { forwardInboundReply, shouldForwardReply, type InboundReply } from '../emails/send';

const reply: InboundReply = {
  from: 'Korynn <korynn@example.com>',
  subject: 'Re: Look before you leap',
  html: '<p>Loved this one</p>',
  text: 'Loved this one',
  headers: null,
  attachments: [],
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'fwd_1' }, error: null });
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'Shawn Lauzon <shawn@livecorrectly.com>';
  process.env.EMAIL_FROM_NOTIFICATIONS = 'Live Correctly <notifications@livecorrectly.com>';
  delete process.env.EMAIL_DOMAIN_TRANSACTIONAL;
});

describe('shouldForwardReply', () => {
  it('forwards a normal reply', () => {
    expect(shouldForwardReply(reply)).toBe(true);
  });

  it('does not forward mail from the admin mailbox (loop guard), case-insensitively', () => {
    expect(shouldForwardReply({ ...reply, from: 'Shawn <Shawn@LiveCorrectly.com>' })).toBe(false);
  });

  it('does not forward auto-replies', () => {
    expect(shouldForwardReply({ ...reply, headers: { 'Auto-Submitted': 'auto-replied' } })).toBe(false);
    expect(shouldForwardReply({ ...reply, headers: { 'auto-submitted': 'auto-generated' } })).toBe(false);
  });

  it('forwards when Auto-Submitted is "no"', () => {
    expect(shouldForwardReply({ ...reply, headers: { 'Auto-Submitted': 'no' } })).toBe(true);
  });
});

describe('forwardInboundReply', () => {
  it('sends to the admin mailbox looking like a direct message: original subject, sender name as display name, Reply-To the sender, body untouched', async () => {
    const result = await forwardInboundReply(reply);

    expect(result).toEqual({ success: true, id: 'fwd_1' });
    const payload = sendMock.mock.calls[0][0];
    expect(payload.to).toBe('Shawn Lauzon <shawn@livecorrectly.com>');
    expect(payload.from).toBe('"Korynn" <notifications@livecorrectly.com>');
    expect(payload.replyTo).toBe('Korynn <korynn@example.com>');
    expect(payload.subject).toBe('Re: Look before you leap');
    expect(payload.html).toBe('<p>Loved this one</p>');
    expect(payload.text).toBeUndefined();
  });

  it('uses the sender address as display name when there is no name', async () => {
    await forwardInboundReply({ ...reply, from: 'korynn@example.com' });
    expect(sendMock.mock.calls[0][0].from).toBe('"korynn@example.com" <notifications@livecorrectly.com>');
  });

  it('strips quotes and angle brackets from the display name', async () => {
    await forwardInboundReply({ ...reply, from: '"Ko"rynn <x>" <korynn@example.com>' });
    expect(sendMock.mock.calls[0][0].from).toBe('"Korynn x" <notifications@livecorrectly.com>');
  });

  it('falls back to text when there is no HTML body', async () => {
    await forwardInboundReply({ ...reply, html: null });
    const payload = sendMock.mock.calls[0][0];
    expect(payload.html).toBeUndefined();
    expect(payload.text).toBe('Loved this one');
  });

  it('passes attachments through', async () => {
    await forwardInboundReply({ ...reply, attachments: [{ filename: 'a.pdf', content: 'QUJD' }] });
    expect(sendMock.mock.calls[0][0].attachments).toEqual([{ filename: 'a.pdf', content: 'QUJD' }]);
  });

  it('does not send when the loop guard trips', async () => {
    const result = await forwardInboundReply({ ...reply, from: 'shawn@livecorrectly.com' });
    expect(result).toEqual({ success: false });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns failure and does not throw when Resend returns an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(forwardInboundReply(reply)).resolves.toEqual({ success: false });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
