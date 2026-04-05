'use client';

import { useState, useEffect } from 'react';
import { Trash2, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Highlight } from '@/types/book';
import {
  getHighlightsForBook,
  deleteHighlight,
} from '@/lib/reader/highlights';

const COLOR_HEX: Record<string, string> = {
  yellow: '#FBBF24',
  blue: '#60A5FA',
  green: '#34D399',
  pink: '#F472B6',
};

interface HighlightsPanelProps {
  bookId: string;
  onNavigate: (cfiRange: string) => void;
  open: boolean;
  onClose: () => void;
}

export function HighlightsPanel({
  bookId,
  onNavigate,
  open,
  onClose,
}: HighlightsPanelProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    if (open) {
      getHighlightsForBook(bookId).then(setHighlights);
    }
  }, [open, bookId]);

  async function handleDelete(id: string) {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }

  // Group highlights by chapter
  const grouped = highlights.reduce<Record<number, Highlight[]>>((acc, h) => {
    if (!acc[h.chapterIndex]) acc[h.chapterIndex] = [];
    acc[h.chapterIndex].push(h);
    return acc;
  }, {});

  const chapterIndices = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Highlighter className="size-4" />
            Highlights
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-64px)]">
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Highlighter className="size-8 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No highlights yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select text while reading to highlight it
              </p>
            </div>
          ) : (
            <div className="py-2">
              {chapterIndices.map((chapterIndex) => (
                <div key={chapterIndex}>
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Chapter {chapterIndex + 1}
                    </p>
                  </div>
                  {grouped[chapterIndex].map((highlight) => (
                    <div
                      key={highlight.id}
                      className={cn(
                        'group flex items-start gap-3 px-4 py-3',
                        'hover:bg-muted/50 cursor-pointer transition-colors'
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onNavigate(highlight.cfiRange);
                        onClose();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onNavigate(highlight.cfiRange);
                          onClose();
                        }
                      }}
                    >
                      {/* Color dot */}
                      <span
                        className="mt-1 w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLOR_HEX[highlight.color] || '#FBBF24' }}
                      />

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{highlight.text}</p>
                        {highlight.note && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {highlight.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(highlight.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(highlight.id);
                        }}
                        className={cn(
                          'shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100',
                          'hover:bg-destructive/10 hover:text-destructive',
                          'transition-all touch-manipulation min-w-[44px] min-h-[44px]',
                          'flex items-center justify-center'
                        )}
                        aria-label="Delete highlight"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
