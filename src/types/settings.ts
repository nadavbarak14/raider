export interface ReaderSettings {
  fontSize: number; // in px, e.g. 16
  lineSpacing: number; // multiplier, e.g. 1.5
  fontFamily: 'serif' | 'sans-serif' | 'dyslexia';
  theme: 'light' | 'dark' | 'sepia';
  flowMode: 'paginated' | 'scrolled';
  margins: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify';
  brightness: number; // 0.2 to 1.0
  pageAnimation: 'slide' | 'fade' | 'none';
}

export interface AppSettings {
  readerSettings: ReaderSettings;
  hasSeenOnboarding: boolean;
  dailyGoalMinutes: number;
  yearlyGoalBooks: number;
  collectionsSeeded: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineSpacing: 1.6,
  fontFamily: 'serif',
  theme: 'light',
  flowMode: 'paginated',
  margins: 'medium',
  textAlign: 'justify',
  brightness: 1.0,
  pageAnimation: 'slide',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  readerSettings: DEFAULT_READER_SETTINGS,
  hasSeenOnboarding: false,
  dailyGoalMinutes: 30,
  yearlyGoalBooks: 12,
  collectionsSeeded: false,
};
