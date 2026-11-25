// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { track } from '@/lib/analytics';
import { offerThanksPath } from '@/lib/offers';
import ChartForm from '@/components/chart-form';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/generate-chart', () => ({
  generateChart: vi.fn(async () => ({ chart: {} })),
}));
vi.mock('@/lib/hd-chart', () => ({ default: () => ({ type: () => 'Generator' }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SESSION = 'cs_test_abc';
const SCHEDULE = 'https://calendar.app.google/test';
const SAVED_ID = '123e4567-e89b-42d3-a456-426614174000';
const GUIDED = { sessionId: SESSION, offer: { id: 'guided', scheduleUrl: SCHEDULE } };

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function stubFetch(exists: boolean) {
  fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (url.includes('maiamechanics')) return json({ 'America/Chicago': ['Austin'] });
    if (url.startsWith('/api/subscribers/check-email')) return json({ exists });
    if (url === '/api/subscribers') return json({ id: SAVED_ID });
    if (url === '/api/guide/purchase') return json({ ok: true });
    throw new Error(`Unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  vi.mocked(track).mockClear();
  push.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

function setValue(el: HTMLInputElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

type Purchase = { sessionId: string | null; offer?: { id: string; scheduleUrl: string } };

async function fillAndSubmit(purchase: Purchase) {
  act(() => root.render(<ChartForm purchase={purchase} />));
  const q = (sel: string) => container.querySelector<HTMLInputElement>(sel)!;
  setValue(q('#fname'), 'Ada');
  setValue(q('#email'), 'ada@example.com');
  setValue(q('#bdate'), '1990-01-02');
  setValue(q('#btime'), '10:30');

  // Type a city, wait for the places lookup, then pick it from the dropdown.
  const cityInput = q('[aria-label="Birth city"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(cityInput, 'Austin');
    cityInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await flush();
  act(() => {
    container
      .querySelector('[role="option"]')!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  });

  act(() => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await flush();
  await flush();
}

function bodyOf(url: string): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((c) => c[0] === url)!;
  return JSON.parse((call[1] as { body: string }).body);
}

describe('ChartForm purchase mode', () => {
  it('offer, email already on file: reports the purchase and offers the schedule link', async () => {
    stubFetch(true);
    await fillAndSubmit(GUIDED);

    expect(bodyOf('/api/guide/purchase')).toEqual({
      session_id: SESSION,
      email: 'ada@example.com',
      offer_id: 'guided',
    });
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(SCHEDULE);
    expect(link.textContent).toBe('Pick your time');
    expect(track).toHaveBeenCalledWith('purchase_details_on_file', { product: 'guided' });
    expect(container.textContent).toContain(
      'I already have your birth details for this email. Your personalized guide will be in your inbox within 24 hours.',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('offer, email not found: saves with the offer id and goes to the offer thank-you page', async () => {
    stubFetch(false);
    await fillAndSubmit(GUIDED);

    expect(bodyOf('/api/subscribers').guide_purchase).toEqual({
      session_id: SESSION,
      offer_id: 'guided',
    });
    expect(push).toHaveBeenCalledWith(offerThanksPath('guided', SESSION, SAVED_ID));
  });

  it('guide, email not found: saves without an offer id and goes to the chart page', async () => {
    stubFetch(false);
    await fillAndSubmit({ sessionId: SESSION });

    expect(bodyOf('/api/subscribers').guide_purchase).toEqual({ session_id: SESSION });
    expect(push).toHaveBeenCalledWith(`/see-your-design/${SAVED_ID}?from=form`);
  });
});
