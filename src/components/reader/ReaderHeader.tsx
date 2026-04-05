'use client';

import {
  ArrowLeft,
  Settings,
  BookmarkIcon,
  List,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Book } from '@/types/book';
import type { ReaderSettings } from '@/types/settings';

// ── Theme-aware chrome colors ───────────────────────────────────────────────

function getChromeColors(theme: ReaderSettings['theme']) {
  const bg =
    theme === 'dark'
      ? 'bg-[#1a1a1a]/95'
      : theme === 'sepia'
        ? 'bg-[#F5E6C8]/95'
        : 'bg-white/95';

  const text =
    theme === 'dark'
      ? 'text-[#e0e0e0]'
      : theme === 'sepia'
        ? 'text-[#5B4636]'
        : 'text-[#1a1a1a]';

  const border =
    theme === 'dark'
      ? 'border-white/10'
      : theme === 'sepia'
        ? 'border-[#d4c4a8]'
        : 'border-black/5';

  return { bg, text, border };
}

export { getChromeColors };

// ── Component ───────────────────────────────────────────────────────────────

interface ReaderHeaderProps {
  book: Book;
  theme: ReaderSettings['theme'];
  chromeVisible: boolean;
  isBookmarked: boolean;
  ttsActive?: boolean;
  ttsSupported?: boolean;
  onBack: () => void;
  onTocOpen: () => void;
  onBookmarkToggle: () => void;
  onSettingsOpen: () => void;
  onTTSToggle?: () => void;
}

export function ReaderHeader({
  book,
  theme,
  chromeVisible,
  isBookmarked,
  ttsActive = false,
  ttsSupported = false,
  onBack,
  onTocOpen,
  onBookmarkToggle,
  onSettingsOpen,
  onTTSToggle,
}: ReaderHeaderProps) {
  const { bg, text, border } = getChromeColors(theme);

  return (
    <header
      className={cn(
        'absolute top-0 left-0 right-0 z-20',
        'flex items-center gap-1 px-2 h-12',
        'backdrop-blur-md border-b transition-all duration-300',
        bg,
        text,
        border,
        chromeVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      )}
    >
      {/* Back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        aria-label="Back to library"
        className={cn('shrink-0', text)}
      >
        <ArrowLeft className="size-5" />
      </Button>

      {/* Title */}
      <div className="flex-1 min-w-0 px-1">
        <h1 className="text-sm font-medium truncate">{book.title}</h1>
        <p className="text-xs opacity-60 truncate">{book.author}</p>
      </div>

      {/* TOC */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onTocOpen}
        aria-label="Table of contents"
        className={cn('shrink-0', text)}
      >
        <List className="size-5" />
      </Button>

      {/* Bookmark */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBookmarkToggle}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        className={cn('shrink-0', text)}
      >
        <BookmarkIcon
          className={cn('size-5', isBookmarked && 'fill-current')}
        />
      </Button>

      {/* TTS */}
      {ttsSupported && onTTSToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onTTSToggle}
          aria-label={ttsActive ? 'Stop reading aloud' : 'Read aloud'}
          className={cn('shrink-0', text, ttsActive && 'text-blue-500')}
        >
          <Volume2 className={cn('size-5', ttsActive && 'animate-pulse')} />
        </Button>
      )}

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsOpen}
        aria-label="Reading settings"
        className={cn('shrink-0', text)}
      >
        <Settings className="size-5" />
      </Button>
    </header>
  );
}
