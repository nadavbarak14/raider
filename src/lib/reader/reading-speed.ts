/**
 * Tracks reading speed (WPM) within a session.
 * Uses a plain object pattern (not React state) since it tracks timing.
 */
export interface ReadingSpeedTracker {
  startSession(): void;
  recordPageTurn(wordsOnPage: number): void;
  getWPM(): number;
  getSessionMinutes(): number;
  pause(): void;
  resume(): void;
}

const DEFAULT_WPM = 250;
const MIN_WPM = 50;
const MAX_WPM = 800;
const MIN_MINUTES_FOR_ESTIMATE = 2;

export function createReadingSpeedTracker(): ReadingSpeedTracker {
  let sessionStartTime = 0;
  let totalWords = 0;
  let totalActiveMs = 0;
  let lastResumeTime = 0;
  let isPaused = false;

  function startSession() {
    sessionStartTime = Date.now();
    lastResumeTime = sessionStartTime;
    totalWords = 0;
    totalActiveMs = 0;
    isPaused = false;
  }

  function recordPageTurn(wordsOnPage: number) {
    if (wordsOnPage > 0) {
      totalWords += wordsOnPage;
    }
  }

  function pause() {
    if (!isPaused && lastResumeTime > 0) {
      totalActiveMs += Date.now() - lastResumeTime;
      isPaused = true;
    }
  }

  function resume() {
    if (isPaused) {
      lastResumeTime = Date.now();
      isPaused = false;
    }
  }

  function getActiveMinutes(): number {
    let ms = totalActiveMs;
    if (!isPaused && lastResumeTime > 0) {
      ms += Date.now() - lastResumeTime;
    }
    return ms / 60000;
  }

  function getSessionMinutes(): number {
    return getActiveMinutes();
  }

  function getWPM(): number {
    const minutes = getActiveMinutes();
    if (minutes < MIN_MINUTES_FOR_ESTIMATE) return DEFAULT_WPM;
    const wpm = totalWords / minutes;
    return Math.max(MIN_WPM, Math.min(MAX_WPM, Math.round(wpm)));
  }

  return {
    startSession,
    recordPageTurn,
    getWPM,
    getSessionMinutes,
    pause,
    resume,
  };
}
