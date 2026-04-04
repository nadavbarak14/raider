'use client';

import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { BookCard } from './BookCard';

interface BookGridProps {
  books: Book[];
  isLoading: boolean;
  onSelectBook: (book: Book) => void;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[2/3] w-full rounded-lg bg-muted" />
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="h-3.5 w-4/5 rounded bg-muted" />
        <div className="h-3 w-3/5 rounded bg-muted" />
      </div>
    </div>
  );
}

export function BookGrid({ books, isLoading, onSelectBook }: BookGridProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading books"
        className={cn(
          'grid gap-4 px-4',
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
        <span className="sr-only">Loading books...</span>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="size-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No books found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different search or browse another category
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Book catalog"
      className={cn(
        'grid gap-4 px-4',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      )}
    >
      {books.map((book) => (
        <div key={book.id} role="listitem">
          <BookCard book={book} onSelect={onSelectBook} />
        </div>
      ))}
    </div>
  );
}
