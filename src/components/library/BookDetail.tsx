'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { isBookSaved } from '@/lib/storage/books';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BookDetailProps {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}

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

/**
 * Inner content component, keyed by book.id in the parent to
 * naturally reset imgError / saved state without setState-in-effect.
 */
function BookDetailContent({ book, onClose }: { book: Book; onClose: () => void }) {
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
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>{book.title}</SheetTitle>
        <SheetDescription>Book details and reading option</SheetDescription>
      </SheetHeader>

      {/* Cover + core info */}
      <div className="flex gap-4 px-6 pt-2">
        {/* Cover thumbnail */}
        <div className="shrink-0 w-24 aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md">
          {book.coverUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={cn(
                'size-full bg-gradient-to-br flex items-center justify-center',
                gradientFromId(book.id)
              )}
            >
              <span className="text-2xl font-bold text-white/80">
                {firstLetter}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight text-foreground line-clamp-3">
            {book.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground truncate">
            {book.author}
          </p>
          {saved && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5" />
              <span>Downloaded</span>
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {book.language === 'en' ? 'English' : book.language}
          </p>
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="mt-4 px-6">
          <p className="text-sm leading-relaxed text-foreground/80">
            {book.description}
          </p>
        </div>
      )}

      {/* Subjects */}
      {book.subjects.length > 0 && (
        <div className="mt-4 px-6">
          <div className="flex flex-wrap gap-1.5">
            {book.subjects.slice(0, 6).map((subject) => (
              <Badge key={subject} variant="secondary" className="text-xs">
                {subject}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Start Reading button */}
      <div className="mt-6 px-6">
        <Link href={`/book/${book.id}`} onClick={onClose}>
          <Button
            size="lg"
            className="w-full h-12 rounded-xl text-base font-medium gap-2"
          >
            <BookOpen className="size-5" />
            Start Reading
          </Button>
        </Link>
      </div>
    </>
  );
}

export function BookDetail({ book, open, onClose }: BookDetailProps) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl overflow-y-auto px-0 pb-8">
        {book && <BookDetailContent key={book.id} book={book} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}
