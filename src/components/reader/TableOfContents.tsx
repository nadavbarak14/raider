'use client';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

interface TocEntry {
  label: string;
  href: string;
}

interface TableOfContentsProps {
  chapters: TocEntry[];
  currentChapter: number;
  onNavigate: (href: string) => void;
  open: boolean;
  onClose: () => void;
  theme: ReaderSettings['theme'];
}

export function TableOfContents({
  chapters,
  currentChapter,
  onNavigate,
  open,
  onClose,
  theme,
}: TableOfContentsProps) {
  const colors = getReaderThemeColors(theme);

  function handleSelect(href: string) {
    onNavigate(href);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 z-40',
          'w-[85vw] sm:max-w-sm',
          'shadow-2xl border-r',
          'flex flex-col',
          'animate-in slide-in-from-left duration-300',
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <h2 className="text-base font-semibold">Table of Contents</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full touch-manipulation transition-colors"
            style={{ color: colors.muted }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <nav aria-label="Table of contents">
            <ul className="py-1">
              {chapters.map((chapter, index) => (
                <li key={`${chapter.href}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(chapter.href)}
                    className={cn(
                      'w-full text-left px-4 py-3 text-sm transition-colors',
                      'min-h-[44px] flex items-center gap-3',
                      'touch-manipulation',
                    )}
                    style={{
                      backgroundColor: index === currentChapter ? colors.surface : 'transparent',
                      fontWeight: index === currentChapter ? 600 : 400,
                      color: index === currentChapter ? colors.text : colors.muted,
                    }}
                    onMouseEnter={(e) => {
                      if (index !== currentChapter) {
                        e.currentTarget.style.backgroundColor = colors.surfaceHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index === currentChapter ? colors.surface : 'transparent';
                    }}
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: index === currentChapter ? colors.text : colors.surface,
                        color: index === currentChapter ? colors.bg : colors.muted,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="line-clamp-2">{chapter.label || `Chapter ${index + 1}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      </div>
    </>
  );
}
