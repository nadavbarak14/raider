import { describe, it, expect } from 'vitest';
import {
  DEFAULT_READER_SETTINGS,
  DEFAULT_APP_SETTINGS,
  type ReaderSettings,
  type AppSettings,
} from '../settings';

describe('DEFAULT_READER_SETTINGS', () => {
  it('has all required fields with correct defaults', () => {
    expect(DEFAULT_READER_SETTINGS).toEqual({
      fontSize: 18,
      lineSpacing: 1.6,
      fontFamily: 'serif',
      theme: 'light',
      flowMode: 'paginated',
      margins: 'medium',
      textAlign: 'justify',
      brightness: 1.0,
      pageAnimation: 'slide',
    });
  });

  it('brightness is within valid range', () => {
    expect(DEFAULT_READER_SETTINGS.brightness).toBeGreaterThanOrEqual(0.2);
    expect(DEFAULT_READER_SETTINGS.brightness).toBeLessThanOrEqual(1.0);
  });
});

describe('DEFAULT_APP_SETTINGS', () => {
  it('has all required fields with correct defaults', () => {
    expect(DEFAULT_APP_SETTINGS.readerSettings).toEqual(DEFAULT_READER_SETTINGS);
    expect(DEFAULT_APP_SETTINGS.hasSeenOnboarding).toBe(false);
    expect(DEFAULT_APP_SETTINGS.dailyGoalMinutes).toBe(30);
    expect(DEFAULT_APP_SETTINGS.yearlyGoalBooks).toBe(12);
    expect(DEFAULT_APP_SETTINGS.collectionsSeeded).toBe(false);
  });
});

describe('backward compatibility', () => {
  it('merging old settings (missing new fields) with defaults produces valid object', () => {
    // Simulate settings saved before new fields were added
    const oldStoredSettings = {
      fontSize: 20,
      lineSpacing: 1.8,
      fontFamily: 'sans-serif' as const,
      theme: 'dark' as const,
    };

    const merged: ReaderSettings = {
      ...DEFAULT_READER_SETTINGS,
      ...oldStoredSettings,
    };

    // Old values preserved
    expect(merged.fontSize).toBe(20);
    expect(merged.lineSpacing).toBe(1.8);
    expect(merged.fontFamily).toBe('sans-serif');
    expect(merged.theme).toBe('dark');

    // New fields filled with defaults
    expect(merged.flowMode).toBe('paginated');
    expect(merged.margins).toBe('medium');
    expect(merged.textAlign).toBe('justify');
    expect(merged.brightness).toBe(1.0);
    expect(merged.pageAnimation).toBe('slide');
  });

  it('merging old AppSettings with defaults fills new app-level fields', () => {
    const oldAppSettings = {
      readerSettings: DEFAULT_READER_SETTINGS,
      hasSeenOnboarding: true,
    };

    const merged: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...oldAppSettings,
    };

    expect(merged.hasSeenOnboarding).toBe(true);
    expect(merged.dailyGoalMinutes).toBe(30);
    expect(merged.yearlyGoalBooks).toBe(12);
    expect(merged.collectionsSeeded).toBe(false);
  });
});
