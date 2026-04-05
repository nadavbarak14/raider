import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChromeVisibility } from '../useChromeVisibility';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useChromeVisibility', () => {
  it('starts with visible = true', () => {
    const { result } = renderHook(() =>
      useChromeVisibility({ ready: false, panelsOpen: [] })
    );
    expect(result.current.visible).toBe(true);
  });

  it('toggle flips visibility', () => {
    const { result } = renderHook(() =>
      useChromeVisibility({ ready: false, panelsOpen: [] })
    );

    act(() => {
      result.current.toggle();
    });
    expect(result.current.visible).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.visible).toBe(true);
  });

  it('auto-hides after 4s when ready and no panels open', () => {
    const { result } = renderHook(() =>
      useChromeVisibility({ ready: true, panelsOpen: [false, false] })
    );

    expect(result.current.visible).toBe(true);

    // Advance past the 4s timer
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.visible).toBe(false);
  });

  it('does not auto-hide when a panel is open', () => {
    const { result } = renderHook(() =>
      useChromeVisibility({ ready: true, panelsOpen: [true, false] })
    );

    expect(result.current.visible).toBe(true);

    // Advance well past 4s
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should still be visible because a panel is open
    expect(result.current.visible).toBe(true);
  });

  it('show() makes chrome visible again', () => {
    const { result } = renderHook(() =>
      useChromeVisibility({ ready: true, panelsOpen: [] })
    );

    // Let it auto-hide
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.visible).toBe(false);

    // Call show
    act(() => {
      result.current.show();
    });
    expect(result.current.visible).toBe(true);
  });
});
