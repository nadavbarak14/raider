'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Menu,
  List,
  BookmarkIcon,
  Highlighter,
  Search,
  Volume2,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Book } from '@/types/book';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

// ── Types ──────────────────────────────────────────────────────────────────

export type ReaderMenuAction =
  | 'toc'
  | 'bookmarks'
  | 'highlights'
  | 'search'
  | 'tts'
  | 'settings';

interface ReaderHeaderProps {
  book: Book;
  theme: ReaderSettings['theme'];
  chromeVisible: boolean;
  isBookmarked: boolean;
  ttsActive?: boolean;
  ttsSupported?: boolean;
  onBack: () => void;
  onMenuAction: (action: ReaderMenuAction) => void;
  onBookmarkToggle: () => void;
}

const MENU_ITEMS: { action: ReaderMenuAction; icon: typeof List; label: string }[] = [
  { action: 'toc', icon: List, label: 'Table of Contents' },
  { action: 'bookmarks', icon: BookmarkIcon, label: 'Bookmarks' },
  { action: 'highlights', icon: Highlighter, label: 'Highlights' },
  { action: 'search', icon: Search, label: 'Search in Book' },
  { action: 'tts', icon: Volume2, label: 'Read Aloud' },
  { action: 'settings', icon: Settings, label: 'Themes & Settings' },
];

export function ReaderHeader({
  book,
  theme,
  chromeVisible,
  isBookmarked,
  ttsActive = false,
  ttsSupported = false,
  onBack,
  onMenuAction,
  onBookmarkToggle,
}: ReaderHeaderProps) {
  const colors = getReaderThemeColors(theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when chrome hides
  useEffect(() => {
    if (!chromeVisible) setMenuOpen(false);
  }, [chromeVisible]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, true);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick, true);
    };
  }, [menuOpen]);

  function handleMenuAction(action: ReaderMenuAction) {
    setMenuOpen(false);
    onMenuAction(action);
  }

  // Filter out TTS if not supported
  const visibleItems = MENU_ITEMS.filter(
    (item) => item.action !== 'tts' || ttsSupported
  );

  return (
    <>
      <header
        className={cn(
          'absolute top-0 left-0 right-0 z-20',
          'flex items-center gap-1 px-2 h-12',
          'backdrop-blur-md border-b transition-all duration-300',
          chromeVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        )}
        style={{
          backgroundColor: `${colors.bg}f2`,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to library"
          className="shrink-0"
          style={{ color: colors.text }}
        >
          <ArrowLeft className="size-5" />
        </Button>

        {/* Title */}
        <div className="flex-1 min-w-0 px-1">
          <h1 className="text-sm font-medium truncate">{book.title}</h1>
          <p className="text-xs truncate" style={{ color: colors.muted }}>{book.author}</p>
        </div>

        {/* Bookmark toggle (quick access) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBookmarkToggle}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          className="shrink-0"
          style={{ color: colors.text }}
        >
          <BookmarkIcon
            className={cn('size-5', isBookmarked && 'fill-current')}
          />
        </Button>

        {/* Menu button */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Reader menu"
            className="shrink-0"
            style={{ color: colors.text }}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className={cn(
                'absolute right-0 top-full mt-1 z-50',
                'w-56 rounded-xl shadow-lg border py-1.5',
                'animate-in fade-in-0 zoom-in-95 duration-150',
              )}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              {visibleItems.map(({ action, icon: Icon, label }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleMenuAction(action)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm',
                    'transition-colors touch-manipulation min-h-[44px]',
                  )}
                  style={{ color: colors.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon className={cn(
                    'size-4 shrink-0',
                    action === 'tts' && ttsActive && 'text-blue-500'
                  )} />
                  <span>{label}</span>
                  {action === 'tts' && ttsActive && (
                    <span className="ml-auto text-xs rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surface, color: colors.accent }}>
                      On
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
