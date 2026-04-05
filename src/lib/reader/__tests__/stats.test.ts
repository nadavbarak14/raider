import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateTotalReadingTime,
  calculateCurrentStreak,
  calculateAverageSessionLength,
  calculateBooksFinished,
  checkDailyGoal,
} from '../stats';
import type { ReadingSession, ReadingProgress } from '@/types/book';

function makeSession(overrides: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id: Math.random().toString(),
    bookId: 'book1',
    startedAt: Date.now() - 3600000,
    endedAt: Date.now(),
    wordsRead: 0,
    pagesRead: 0,
    ...overrides,
  };
}

describe('calculateTotalReadingTime', () => {
  it('sums session durations in minutes', () => {
    const sessions = [
      makeSession({ startedAt: 0, endedAt: 600000 }), // 10 min
      makeSession({ startedAt: 0, endedAt: 1200000 }), // 20 min
    ];
    expect(calculateTotalReadingTime(sessions)).toBeCloseTo(30, 0);
  });

  it('skips sessions with endedAt <= 0', () => {
    const sessions = [
      makeSession({ startedAt: 0, endedAt: 600000 }), // 10 min
      makeSession({ startedAt: 0, endedAt: 0 }), // orphaned
    ];
    expect(calculateTotalReadingTime(sessions)).toBeCloseTo(10, 0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalReadingTime([])).toBe(0);
  });
});

describe('calculateCurrentStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns streak of 3 for 3 consecutive days', () => {
    const now = new Date(2026, 3, 5, 12, 0, 0); // April 5, 2026 noon
    vi.setSystemTime(now);

    const sessions = [
      makeSession({ startedAt: now.getTime(), endedAt: now.getTime() + 60000 }), // today
      makeSession({ startedAt: now.getTime() - 86400000, endedAt: now.getTime() - 86400000 + 60000 }), // yesterday
      makeSession({ startedAt: now.getTime() - 2 * 86400000, endedAt: now.getTime() - 2 * 86400000 + 60000 }), // 2 days ago
    ];

    expect(calculateCurrentStreak(sessions)).toBe(3);
  });

  it('returns 1 if only read yesterday (not broken yet)', () => {
    const now = new Date(2026, 3, 5, 12, 0, 0);
    vi.setSystemTime(now);

    const sessions = [
      makeSession({
        startedAt: now.getTime() - 86400000,
        endedAt: now.getTime() - 86400000 + 60000,
      }),
    ];

    expect(calculateCurrentStreak(sessions)).toBe(1);
  });

  it('returns 0 if gap of more than 1 day', () => {
    const now = new Date(2026, 3, 5, 12, 0, 0);
    vi.setSystemTime(now);

    const sessions = [
      makeSession({
        startedAt: now.getTime() - 3 * 86400000,
        endedAt: now.getTime() - 3 * 86400000 + 60000,
      }),
    ];

    expect(calculateCurrentStreak(sessions)).toBe(0);
  });

  it('returns 0 for empty sessions', () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });
});

describe('calculateAverageSessionLength', () => {
  it('calculates average in minutes', () => {
    const sessions = [
      makeSession({ startedAt: 0, endedAt: 600000 }), // 10 min
      makeSession({ startedAt: 0, endedAt: 1200000 }), // 20 min
    ];
    expect(calculateAverageSessionLength(sessions)).toBeCloseTo(15, 0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateAverageSessionLength([])).toBe(0);
  });
});

describe('calculateBooksFinished', () => {
  it('counts books with >= 99% progress', () => {
    const records: ReadingProgress[] = [
      { bookId: 'b1', cfi: '', furthestCfi: '', currentChapterIndex: 0, totalChapters: 10, percentComplete: 100, lastReadAt: 0 },
      { bookId: 'b2', cfi: '', furthestCfi: '', currentChapterIndex: 0, totalChapters: 10, percentComplete: 99, lastReadAt: 0 },
      { bookId: 'b3', cfi: '', furthestCfi: '', currentChapterIndex: 0, totalChapters: 10, percentComplete: 50, lastReadAt: 0 },
    ];
    expect(calculateBooksFinished(records)).toBe(2);
  });
});

describe('checkDailyGoal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 5, 14, 0, 0)); // April 5, 2026, 2pm
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns not met when reading less than goal', () => {
    const now = Date.now();
    const sessions = [
      makeSession({ startedAt: now - 1500000, endedAt: now }), // 25 min today
    ];
    const result = checkDailyGoal(sessions, 30);
    expect(result.met).toBe(false);
    expect(result.minutesRead).toBeCloseTo(25, 0);
  });

  it('returns met when reading exceeds goal', () => {
    const now = Date.now();
    const sessions = [
      makeSession({ startedAt: now - 2100000, endedAt: now }), // 35 min today
    ];
    const result = checkDailyGoal(sessions, 30);
    expect(result.met).toBe(true);
    expect(result.minutesRead).toBeCloseTo(35, 0);
  });

  it('ignores sessions from other days', () => {
    const now = Date.now();
    const sessions = [
      makeSession({ startedAt: now - 86400000 - 1800000, endedAt: now - 86400000 }), // yesterday
    ];
    const result = checkDailyGoal(sessions, 30);
    expect(result.met).toBe(false);
    expect(result.minutesRead).toBeCloseTo(0, 0);
  });
});
