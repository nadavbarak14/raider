'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Bookmark } from '@/types/book';
import {
  getBookmarksForBook,
  toggleBookmark,
  deleteBookmark,
} from '@/lib/reader/bookmarks';

interface BookmarksProps {
  bookId: string;
  currentCfi: string;
  currentChapterIndex: number;
  onNavigate: (cfi: string) => void;
  open: boolean;
  onClose: () => void;
}

export function Bookmarks({
  bookId,
  currentCfi,
  currentChapterIndex,
  onNavigate,
  open,
  onClose,
}: BookmarksProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);

  const loadBookmarks = useCallback(async () => {
    const bms = await getBookmarksForBook(bookId);
    setBookmarks(bms);
    setIsCurrentBookmarked(bms.some((b) => b.cfi === currentCfi));
  }, [bookId, currentCfi]);

  // Load bookmarks when the sheet opens or the current position changes
  useEffect(() => {
    if (!open) return;
    // Use a flag to prevent updates after unmount / close
    let stale = false;
    getBookmarksForBook(bookId).then((bms) => {
      if (stale) return;
      setBookmarks(bms);
      setIsCurrentBookmarked(bms.some((b) => b.cfi === currentCfi));
    });
    return () => {
      stale = true;
    };
  }, [open, bookId, currentCfi]);

  async function handleToggleBookmark() {
    if (!currentCfi) return;
    await toggleBookmark(bookId, currentCfi, currentChapterIndex);
    await loadBookmarks();
  }

  async function handleDelete(id: string) {
    await deleteBookmark(id);
    await loadBookmarks();
  }

  function handleNavigate(cfi: string) {
    onNavigate(cfi);
    onClose();
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" showCloseButton={true} className="w-[85vw] sm:max-w-sm p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>Bookmarks</SheetTitle>
        </SheetHeader>

        {/* Add bookmark for current page */}
        <div className="p-3 border-b">
          <Button
            variant={isCurrentBookmarked ? 'secondary' : 'outline'}
            className="w-full min-h-[44px]"
            onClick={handleToggleBookmark}
            disabled={!currentCfi}
          >
            <BookmarkPlus className="size-4 mr-2" />
            {isCurrentBookmarked ? 'Remove Bookmark' : 'Bookmark This Page'}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-7rem)]">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="text-3xl mb-2 opacity-30">
                <BookmarkPlus className="size-10" />
              </div>
              <p className="text-sm text-muted-foreground">
                No bookmarks yet. Tap the button above to bookmark the current page.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="group">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-4 py-3',
                      'border-b border-border/50 last:border-0',
                      'hover:bg-muted/50'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleNavigate(bookmark.cfi)}
                      className="flex-1 text-left min-h-[44px] flex flex-col justify-center touch-manipulation"
                    >
                      <span className="text-sm font-medium truncate block">
                        {bookmark.label || `Chapter ${bookmark.chapterIndex + 1}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(bookmark.createdAt)}
                      </span>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={() => handleDelete(bookmark.id)}
                      aria-label="Delete bookmark"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
