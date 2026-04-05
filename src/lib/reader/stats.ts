import type { ReadingSession, ReadingProgress } from '@/types/book';

/**
 * Calculate total reading time in minutes from completed sessions.
 */
export function calculateTotalReadingTime(sessions: ReadingSession[]): number {
  return sessions.reduce((total, s) => {
    if (s.endedAt <= 0) return total;
    return total + (s.endedAt - s.startedAt) / 60000;
  }, 0);
}

/**
 * Calculate current reading streak (consecutive days with at least 1 session).
 * Uses local dates for calculation.
 */
export function calculateCurrentStreak(sessions: ReadingSession[]): number {
  if (sessions.length === 0) return 0;

  // Get unique reading days (local date strings)
  const readingDays = new Set<string>();
  for (const s of sessions) {
    if (s.endedAt <= 0) continue;
    readingDays.add(toLocalDateString(s.startedAt));
  }

  if (readingDays.size === 0) return 0;

  // Start from today and count backwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const current = new Date(today);

  // Check today first
  if (readingDays.has(toLocalDateString(current.getTime()))) {
    streak = 1;
    current.setDate(current.getDate() - 1);
  } else {
    // Check yesterday (streak not broken yet if no reading today)
    current.setDate(current.getDate() - 1);
    if (!readingDays.has(toLocalDateString(current.getTime()))) {
      return 0; // No reading today or yesterday = no streak
    }
    streak = 1;
    current.setDate(current.getDate() - 1);
  }

  // Count consecutive previous days
  while (readingDays.has(toLocalDateString(current.getTime()))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate average session length in minutes.
 */
export function calculateAverageSessionLength(sessions: ReadingSession[]): number {
  const completed = sessions.filter((s) => s.endedAt > 0);
  if (completed.length === 0) return 0;
  const total = calculateTotalReadingTime(completed);
  return total / completed.length;
}

/**
 * Count number of books finished (percentComplete >= 99).
 */
export function calculateBooksFinished(progressRecords: ReadingProgress[]): number {
  return progressRecords.filter((p) => p.percentComplete >= 99).length;
}

/**
 * Check if the user has met their daily reading goal today.
 */
export function checkDailyGoal(sessions: ReadingSession[], goalMinutes: number): {
  met: boolean;
  minutesRead: number;
  goalMinutes: number;
} {
  const todayStr = toLocalDateString(Date.now());
  const todaySessions = sessions.filter(
    (s) => s.endedAt > 0 && toLocalDateString(s.startedAt) === todayStr
  );
  const minutesRead = calculateTotalReadingTime(todaySessions);
  return {
    met: minutesRead >= goalMinutes,
    minutesRead,
    goalMinutes,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
