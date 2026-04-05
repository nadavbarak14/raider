'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatReadingTime } from '@/lib/reader/reading-time';

interface ProgressBarProps {
  percent: number;
  chapterName: string;
  currentChapter: number;
  totalChapters: number;
  chapterMinutesLeft?: number;
  bookMinutesLeft?: number;
}

export function ProgressBar({
  percent,
  chapterName,
  currentChapter,
  totalChapters,
  chapterMinutesLeft,
  bookMinutesLeft,
}: ProgressBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full select-none">
      {/* Expanded details */}
      {expanded && (
        <div className="px-4 py-2 text-xs text-center bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10">
          <div className="font-medium truncate max-w-[80vw] mx-auto">
            {chapterName || `Chapter ${currentChapter + 1}`}
          </div>
          <div className="mt-0.5 text-muted-foreground">
            Chapter {currentChapter + 1} of {totalChapters} &middot;{' '}
            {Math.round(percent)}% complete
          </div>
          {(chapterMinutesLeft != null || bookMinutesLeft != null) && (
            <div className="mt-1 flex items-center justify-center gap-1 text-muted-foreground/70">
              <Clock className="size-3" />
              {chapterMinutesLeft != null && (
                <span>{formatReadingTime(chapterMinutesLeft)} left in chapter</span>
              )}
              {chapterMinutesLeft != null && bookMinutesLeft != null && (
                <span>&middot;</span>
              )}
              {bookMinutesLeft != null && (
                <span>{formatReadingTime(bookMinutesLeft)} left in book</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tappable progress bar */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2 min-h-[44px]',
          'bg-background/80 backdrop-blur-sm',
          'border-t border-black/5 dark:border-white/5',
          'touch-manipulation'
        )}
        aria-label={`Reading progress: ${Math.round(percent)}%`}
      >
        {/* Bar track */}
        <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/60 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>

        {/* Percentage label */}
        <span className="text-xs tabular-nums text-muted-foreground shrink-0 min-w-[3ch]">
          {Math.round(percent)}%
        </span>
      </button>
    </div>
  );
}
