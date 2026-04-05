import { describe, it, expect } from 'vitest';
import { countWords, formatReadingTime, estimateReadingTime } from '../reading-time';

describe('countWords', () => {
  it('counts words in a string', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('one two three four five')).toBe(5);
  });

  it('returns 0 for empty or whitespace-only strings', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('handles multiple spaces', () => {
    expect(countWords('hello   world   test')).toBe(3);
  });
});

describe('formatReadingTime', () => {
  it('shows "< 1 min" for very short times', () => {
    expect(formatReadingTime(0.5)).toBe('< 1 min');
  });

  it('shows minutes for < 1 hour', () => {
    expect(formatReadingTime(5)).toBe('~5 min');
    expect(formatReadingTime(45)).toBe('~45 min');
  });

  it('shows hours + minutes for >= 1 hour', () => {
    expect(formatReadingTime(90)).toBe('~1 hr 30 min');
    expect(formatReadingTime(125)).toBe('~2 hr 5 min');
  });

  it('shows just hours when minutes are 0', () => {
    expect(formatReadingTime(120)).toBe('~2 hr');
  });
});

describe('estimateReadingTime', () => {
  it('calculates reading time from word count and WPM', () => {
    // 500 words at 250 WPM = 2 minutes
    expect(estimateReadingTime(500, 250)).toBe('~2 min');

    // 15000 words at 250 WPM = 60 minutes = 1 hour
    expect(estimateReadingTime(15000, 250)).toBe('~1 hr');
  });

  it('returns empty string for 0 words or 0 WPM', () => {
    expect(estimateReadingTime(0, 250)).toBe('');
    expect(estimateReadingTime(500, 0)).toBe('');
  });
});
