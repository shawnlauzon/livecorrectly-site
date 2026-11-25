import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from 'react-email';
import { Welcome1 } from '@/emails/welcome1';
import { Welcome2 } from '@/emails/welcome2';
import { Welcome3 } from '@/emails/welcome3';
import { LIBRARY_BLOCK_COPY } from '@/lib/newsletter/library-block';
import { SHARE_COPY } from '@/lib/newsletter/share';

const WELCOME_EMAILS = [
  ['welcome 1', () => React.createElement(Welcome1, Welcome1.PreviewProps)],
  ['welcome 2', () => React.createElement(Welcome2, Welcome2.PreviewProps)],
  ['welcome 3', () => React.createElement(Welcome3, Welcome3.PreviewProps)],
] as const;

// The welcome series comes from Live Correctly, not the Permission Slip
// newsletter, so it carries none of the newsletter's branding or sections.
describe.each(WELCOME_EMAILS)('%s', (_name, email) => {
  const html = () => render(email());

  it('has no Permission Slip branding', async () => {
    const out = await html();
    expect(out).not.toContain('permission-slip');
    expect(out).not.toContain('Permission Slip');
  });

  it('has no newsletter library block or share line', async () => {
    const out = await html();
    expect(out).not.toContain(LIBRARY_BLOCK_COPY.heading);
    expect(out).not.toContain(SHARE_COPY.link);
  });

  it('keeps the signature and the footer with the unsubscribe link', async () => {
    const out = await html();
    expect(out).toContain('headshot');
    expect(out).toContain('Unsubscribe');
    expect(out).toContain('Indio Drive');
  });
});
