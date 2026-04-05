import type { ReaderSettings } from '@/types/settings';

export interface ReaderThemeColors {
  bg: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  surfaceHover: string;
  trackBg: string;
  trackFill: string;
  accent: string;
}

const THEME_MAP: Record<ReaderSettings['theme'], ReaderThemeColors> = {
  light: {
    bg: '#FFFFFF',
    text: '#1a1a1a',
    muted: '#666666',
    border: 'rgba(0,0,0,0.08)',
    surface: 'rgba(0,0,0,0.03)',
    surfaceHover: 'rgba(0,0,0,0.05)',
    trackBg: 'rgba(0,0,0,0.1)',
    trackFill: 'rgba(0,0,0,0.45)',
    accent: '#3b82f6',
  },
  dark: {
    bg: '#1a1a1a',
    text: '#e0e0e0',
    muted: '#888888',
    border: 'rgba(255,255,255,0.1)',
    surface: 'rgba(255,255,255,0.05)',
    surfaceHover: 'rgba(255,255,255,0.08)',
    trackBg: 'rgba(255,255,255,0.12)',
    trackFill: 'rgba(255,255,255,0.5)',
    accent: '#60a5fa',
  },
  sepia: {
    bg: '#F5E6C8',
    text: '#5B4636',
    muted: '#8B7355',
    border: '#d4c4a8',
    surface: 'rgba(91,70,54,0.05)',
    surfaceHover: 'rgba(91,70,54,0.08)',
    trackBg: 'rgba(91,70,54,0.15)',
    trackFill: 'rgba(91,70,54,0.5)',
    accent: '#b45309',
  },
};

export function getReaderThemeColors(theme: ReaderSettings['theme']): ReaderThemeColors {
  return THEME_MAP[theme];
}
