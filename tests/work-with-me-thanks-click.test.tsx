// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { track } from '@/lib/analytics';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/components/site-nav', () => ({ default: () => null }));
vi.mock('@/components/site-footer', () => ({ default: () => null }));
vi.mock('@/components/purchase-report', () => ({ default: () => null }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/db', () => ({ getSubscriberById: vi.fn(async () => ({ id: SUB_ID })) }));
vi.mock('@/lib/subscriber-cookie-server', () => ({ getRememberedSubscriberId: vi.fn(async () => null) }));
vi.mock('@/components/chart-form', () => ({ default: () => null }));
vi.mock('@/components/remember-subscriber', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

const SUB_ID = '123e4567-e89b-42d3-a456-426614174000';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.mocked(track).mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('schedule_click', () => {
  it('fires when the Pick your time link is clicked', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUY_URL_GUIDED', 'https://buy.stripe.com/test');
    vi.stubEnv('NEXT_PUBLIC_SCHEDULE_URL_GUIDED', 'https://calendar.app.google/test');
    vi.resetModules();
    const { default: Page } = await import('@/app/(public)/work-with-me/thanks/page');
    const element = await Page({ searchParams: Promise.resolve({ offer: 'guided', s: SUB_ID }) });
    act(() => root.render(element));
    const link = container.querySelector('a')!;
    expect(link.textContent).toBe('Pick your time');
    // Stop happy-dom from trying to navigate to the external href.
    link.addEventListener('click', (e) => e.preventDefault(), { capture: true });
    act(() => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('schedule_click', { offer: 'guided' });
  });
});
