export interface ReaderSettings {
  fontSize: number; // in px, e.g. 16
  lineSpacing: number; // multiplier, e.g. 1.5
  fontFamily: 'serif' | 'sans-serif' | 'dyslexia';
  theme: 'light' | 'dark' | 'sepia';
}

export interface AppSettings {
  readerSettings: ReaderSettings;
  hasSeenOnboarding: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineSpacing: 1.6,
  fontFamily: 'serif',
  theme: 'light',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  readerSettings: DEFAULT_READER_SETTINGS,
  hasSeenOnboarding: false,
};
