'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatReadingTime } from '@/lib/reader/reading-time';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

interface ProgressBarProps {
  percent: number;
  chapterName: string;
  currentChapter: number;
  totalChapters: number;
  chapterMinutesLeft?: number;
  bookMinutesLeft?: number;
  theme: ReaderSettings['theme'];
  /** Page within the current spine section (from epubjs displayed) */
  currentPage?: number;
  totalPages?: number;
  /** When true, show the full progress bar. When false, show compact page info only. */
  chromeVisible: boolean;
}

export function ProgressBar({
  percent,
  chapterName,
  currentChapter,
  totalChapters,
  chapterMinutesLeft,
  bookMinutesLeft,
  theme,
  currentPage,
  totalPages,
  chromeVisible,
}: ProgressBarProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = getReaderThemeColors(theme);

  return (
    <div className="w-full select-none" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Expanded details — only when chrome visible and user taps to expand */}
      {chromeVisible && expanded && (
        <div
          className="px-4 py-2 text-xs text-center border-t"
          style={{ borderColor: colors.border, backgroundColor: colors.surfaceHover }}
        >
          <div className="font-medium truncate max-w-[80vw] mx-auto">
            {chapterName || `Chapter ${currentChapter + 1}`}
          </div>
          <div className="mt-0.5" style={{ color: colors.muted }}>
            Chapter {currentChapter + 1} of {totalChapters} &middot;{' '}
            {Math.round(percent)}% complete
          </div>
          {(chapterMinutesLeft != null || bookMinutesLeft != null) && (
            <div className="mt-1 flex items-center justify-center gap-1" style={{ color: colors.muted }}>
              {chapterMinutesLeft != null && chapterMinutesLeft >= 1 && (
                <span>{formatReadingTime(chapterMinutesLeft)} left in chapter</span>
              )}
              {chapterMinutesLeft != null && chapterMinutesLeft >= 1 && bookMinutesLeft != null && bookMinutesLeft >= 1 && (
                <span>&middot;</span>
              )}
              {bookMinutesLeft != null && bookMinutesLeft >= 1 && (
                <span>{formatReadingTime(bookMinutesLeft)} left</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main progress row — when chrome is visible, show full bar */}
      {chromeVisible ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 min-h-[44px]',
            'backdrop-blur-sm border-t touch-manipulation',
          )}
          style={{
            backgroundColor: `${colors.bg}cc`,
            borderColor: colors.border,
          }}
          aria-label={`Reading progress: ${Math.round(percent)}%`}
        >
          {/* Bar track */}
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.trackBg }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, percent))}%`,
                backgroundColor: colors.trackFill,
              }}
            />
          </div>

          {/* Percentage + expand icon */}
          <span className="text-xs tabular-nums shrink-0 min-w-[3ch]" style={{ color: colors.muted }}>
            {Math.round(percent)}%
          </span>
          <ChevronUp
            className={cn('size-3 transition-transform', expanded && 'rotate-180')}
            style={{ color: colors.muted }}
          />
        </button>
      ) : (
        /* Compact always-visible page indicator */
        <div
          className="w-full flex items-center justify-center px-4 py-1"
          style={{ backgroundColor: `${colors.bg}ee` }}
        >
          <span className="text-[10px] tabular-nums" style={{ color: colors.muted }}>
            {currentPage != null ? currentPage : Math.round(percent) + '%'}
          </span>
        </div>
      )}
    </div>
  );
}
