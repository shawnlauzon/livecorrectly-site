import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from 'react-email';
import { ChartLink } from '@/emails/chart-link';

describe('ChartLink email', () => {
  it('is a plain white note: no beige background, header, signature, or footer', async () => {
    const html = await render(
      React.createElement(ChartLink, {
        firstName: 'Pat',
        newsletterUrl: 'https://example.com/newsletter?s=x',
        chartUrl: 'https://example.com/see-your-design/x',
      }),
    );
    expect(html).toContain('https://example.com/newsletter?s=x');
    expect(html).not.toContain('permission-slip');
    expect(html).not.toContain('headshot');
    expect(html).not.toContain('Unsubscribe');
    expect(html).not.toContain('Indio Drive');
    expect(html.toLowerCase()).not.toContain('faf8f4');
  });
});
