import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReadingSpeedTracker } from '../reading-speed';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReadingSpeedTracker', () => {
  it('returns default WPM (250) before 2 minutes of data', () => {
    const tracker = createReadingSpeedTracker();
    tracker.startSession();

    // Read 500 words in 1 minute (should be 500 WPM, but not enough time)
    tracker.recordPageTurn(500);
    vi.advanceTimersByTime(60_000); // 1 min

    expect(tracker.getWPM()).toBe(250); // default
  });

  it('calculates WPM after 2+ minutes', () => {
    const tracker = createReadingSpeedTracker();
    tracker.startSession();

    // Read 600 words over 3 minutes = 200 WPM
    tracker.recordPageTurn(600);
    vi.advanceTimersByTime(180_000); // 3 min

    expect(tracker.getWPM()).toBe(200);
  });

  it('clamps WPM to 50-800 range', () => {
    const tracker = createReadingSpeedTracker();
    tracker.startSession();

    // Very slow: 20 words in 3 minutes = 6.67 WPM → clamped to 50
    tracker.recordPageTurn(20);
    vi.advanceTimersByTime(180_000);

    expect(tracker.getWPM()).toBe(50);
  });

  it('does not count paused time', () => {
    const tracker = createReadingSpeedTracker();
    tracker.startSession();

    // Read 600 words in 2 minutes active
    tracker.recordPageTurn(600);
    vi.advanceTimersByTime(120_000); // 2 min active

    // Pause for 5 minutes (shouldn't count)
    tracker.pause();
    vi.advanceTimersByTime(300_000); // 5 min paused

    // Resume
    tracker.resume();
    vi.advanceTimersByTime(60_000); // 1 more min active

    // Total active: 3 min, 600 words = 200 WPM
    expect(tracker.getWPM()).toBe(200);
  });

  it('startSession resets state', () => {
    const tracker = createReadingSpeedTracker();
    tracker.startSession();
    tracker.recordPageTurn(1000);
    vi.advanceTimersByTime(180_000);

    // Reset
    tracker.startSession();
    expect(tracker.getSessionMinutes()).toBeCloseTo(0, 1);
    expect(tracker.getWPM()).toBe(250); // back to default
  });
});
