'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneralChatProps {
  bookId: string;
  currentChapterIndex: number;
  onOpen: () => void;
}

/**
 * Floating action button for opening a general (non-anchored) AI chat.
 * Positioned in the bottom-right corner of the reader.
 */
export function GeneralChat({ onOpen }: GeneralChatProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'fixed bottom-16 left-3 z-30',
        'flex items-center justify-center',
        'size-12 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'touch-manipulation'
      )}
      aria-label="Ask AI a question"
    >
      <Sparkles className="size-5" />
    </button>
  );
}
