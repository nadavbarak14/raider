'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { isBookSaved } from '@/lib/storage/books';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

// Deterministic gradient from book ID for fallback covers
function gradientFromId(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients = [
    'from-zinc-700 to-zinc-900',
    'from-stone-600 to-stone-800',
    'from-slate-600 to-slate-800',
    'from-neutral-600 to-neutral-800',
    'from-zinc-600 to-zinc-800',
    'from-stone-700 to-stone-900',
  ];
  return gradients[hash % gradients.length];
}

export function BookCard({ book, onSelect }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isBookSaved(book.id).then((result) => {
      if (!cancelled) setSaved(result);
    });
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  const firstLetter = book.title.charAt(0).toUpperCase();

  return (
    <button
      onClick={() => onSelect(book)}
      className={cn(
        'group flex flex-col text-left rounded-lg overflow-hidden',
        'transition-transform active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'min-w-0 w-full'
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-muted">
        {book.coverUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={cn(
              'size-full bg-gradient-to-br flex items-center justify-center',
              gradientFromId(book.id)
            )}
          >
            <span className="text-4xl font-bold text-white/80">
              {firstLetter}
            </span>
          </div>
        )}

        {/* Downloaded indicator */}
        {saved && (
          <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Check className="size-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="mt-2 min-w-0 px-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
          {book.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {book.author}
        </p>
      </div>
    </button>
  );
}
