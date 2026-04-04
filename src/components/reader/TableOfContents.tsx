'use client';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
}

export function TableOfContents({
  chapters,
  currentChapter,
  onNavigate,
  open,
  onClose,
}: TableOfContentsProps) {
  function handleSelect(href: string) {
    onNavigate(href);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="left" showCloseButton={true} className="w-[85vw] sm:max-w-sm p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>Table of Contents</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-3.5rem)]">
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
                      'hover:bg-muted/50 active:bg-muted',
                      'touch-manipulation',
                      index === currentChapter
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs',
                        index === currentChapter
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate">{chapter.label || `Chapter ${index + 1}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
