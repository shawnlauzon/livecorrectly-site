import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createHoverIntent } from '@/app/(public)/newsletter/[slug]/hover-intent';

describe('createHoverIntent', () => {
  let onShow: Mock<(target: string) => void>;
  let onHide: Mock<() => void>;
  let intent: ReturnType<typeof createHoverIntent<string>>;

  beforeEach(() => {
    vi.useFakeTimers();
    onShow = vi.fn<(target: string) => void>();
    onHide = vi.fn<() => void>();
    intent = createHoverIntent<string>({ showDelay: 1000, hideDelay: 150, onShow, onHide });
  });

  afterEach(() => {
    intent.cancel();
    vi.useRealTimers();
  });

  it('shows only after the pointer rests for the full delay', () => {
    intent.enter('a');
    vi.advanceTimersByTime(999);
    expect(onShow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onShow).toHaveBeenCalledWith('a');
  });

  it('does not show when the pointer leaves before the delay', () => {
    intent.enter('a');
    vi.advanceTimersByTime(500);
    intent.leave();
    vi.advanceTimersByTime(2000);
    expect(onShow).not.toHaveBeenCalled();
  });

  it('hides after a short grace period once shown', () => {
    intent.enter('a');
    vi.advanceTimersByTime(1000);
    intent.leave();
    vi.advanceTimersByTime(149);
    expect(onHide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('stays open when the pointer moves into the tooltip during the grace period', () => {
    intent.enter('a');
    vi.advanceTimersByTime(1000);
    intent.leave();
    vi.advanceTimersByTime(100);
    intent.hold();
    vi.advanceTimersByTime(1000);
    expect(onHide).not.toHaveBeenCalled();
  });

  it('moves straight to another target while already shown', () => {
    intent.enter('a');
    vi.advanceTimersByTime(1000);
    intent.leave();
    intent.enter('b');
    expect(onShow).toHaveBeenLastCalledWith('b');
    vi.advanceTimersByTime(1000);
    expect(onHide).not.toHaveBeenCalled();
  });
});
