// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { firstTimeThisSession } from '@/lib/once-per-session';

describe('firstTimeThisSession', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('is true the first time and false after', () => {
    expect(firstTimeThisSession('a')).toBe(true);
    expect(firstTimeThisSession('a')).toBe(false);
  });

  it('tracks keys separately', () => {
    expect(firstTimeThisSession('a')).toBe(true);
    expect(firstTimeThisSession('b')).toBe(true);
  });
});
