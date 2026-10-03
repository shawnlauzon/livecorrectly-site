import { describe, it, expect } from 'vitest';
import { resolveNewsletterHtml } from '@/lib/newsletter/resolve';
import { SAMPLE_CHART } from '@/lib/newsletter/sample-chart';
import { extractBodyContent } from '@/lib/newsletter/web';

describe('SAMPLE_CHART', () => {
  it('parses the fixture into a complete chart', () => {
    expect(SAMPLE_CHART.careerDesign).not.toBe('');
    expect(SAMPLE_CHART.innerAuthorityShortName).not.toBe('');
    expect(SAMPLE_CHART.notSelfTheme).not.toBe('');
  });
});

describe('resolveNewsletterHtml with highlightChartValues', () => {
  const resolve = (html: string, highlightChartValues?: boolean) =>
    resolveNewsletterHtml(html, { chart: SAMPLE_CHART, mode: 'web', highlightChartValues });

  it('wraps chart variables in a sample highlight', async () => {
    expect(await resolve('<p>your {{ authority_short }} knows</p>', true)).toBe(
      `<p>your <mark class="sample-value">${SAMPLE_CHART.innerAuthorityShortName}</mark> knows</p>`,
    );
  });

  it('does not wrap identity variables', async () => {
    expect(await resolve("<p>Hey {{ first_name | default: 'there' }},</p>", true)).toBe(
      '<p>Hey there,</p>',
    );
  });

  it('evaluates chart conditionals against the sample chart', async () => {
    const html = `{% if career_type == "${SAMPLE_CHART.careerDesign}" %}match{% else %}miss{% endif %}`;
    expect(await resolve(html, true)).toBe('match');
  });

  it('keeps email-only blocks hidden on the web', async () => {
    expect(await resolve('{% if mode == "email" %}reply to me{% endif %}', true)).toBe('');
  });

  it('leaves output unwrapped without the flag', async () => {
    expect(await resolve('<p>your {{ authority_short }} knows</p>')).toBe(
      `<p>your ${SAMPLE_CHART.innerAuthorityShortName} knows</p>`,
    );
  });
});

describe('extractBodyContent', () => {
  it('unwraps a full email document to its body contents', () => {
    const doc =
      '<!DOCTYPE html><html dir="ltr" lang="en"><head><meta name="x" /></head>' +
      '<body dir="ltr" style="background-color:#fff"><table><tr><td>Hi</td></tr></table></body></html>';
    expect(extractBodyContent(doc)).toBe('<table><tr><td>Hi</td></tr></table>');
  });

  it('returns a fragment unchanged', () => {
    expect(extractBodyContent('<p>Hi</p>')).toBe('<p>Hi</p>');
  });
});
