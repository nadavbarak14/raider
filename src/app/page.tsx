'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import type { ReadingProgress } from '@/types/book';
import { seedCatalog, categoryMap } from '@/lib/gutenberg/seed-catalog';
import { searchBooks, getBooksPage } from '@/lib/gutenberg/client';
import { getAllProgress } from '@/lib/storage/progress';
import { getBook as getStoredBook } from '@/lib/storage/books';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/library/SearchBar';
import { CategoryNav } from '@/components/library/CategoryNav';
import { BookGrid } from '@/components/library/BookGrid';
import { BookDetail } from '@/components/library/BookDetail';

const ALL_CATEGORIES = ['All', ...Object.keys(categoryMap)];

// Build a quick lookup map from the seed catalog for O(1) access
const seedMap = new Map(seedCatalog.map((b) => [b.id, b]));

// ── Continue Reading item ────────────────────────────────────────────────────

interface ContinueReadingItem {
  book: Book;
  progress: ReadingProgress;
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

function ContinueReadingCard({ item }: { item: ContinueReadingItem }) {
  const { book, progress } = item;
  const [imgError, setImgError] = useState(false);
  const firstLetter = book.title.charAt(0).toUpperCase();
  const percent = Math.round(progress.percentComplete);

  return (
    <Link
      href={`/book/${book.id}`}
      className={cn(
        'group flex-shrink-0 w-36 sm:w-44 snap-start',
        'rounded-xl overflow-hidden',
        'transition-transform active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-muted">
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

        {/* Progress overlay at bottom of cover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-white/90">
              {percent}% complete
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mt-2 min-w-0 px-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
          {book.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {book.author}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary">
          Continue
          <ChevronRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}

function ContinueReadingSection({
  items,
}: {
  items: ContinueReadingItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="px-4 pb-2" aria-label="Continue reading">
      <h2 className="text-base font-semibold text-foreground mb-3">
        Continue Reading
      </h2>
      <div
        className={cn(
          'flex gap-4 overflow-x-auto pb-4',
          'snap-x snap-mandatory scroll-smooth',
          // Hide scrollbar on all browsers
          'scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]'
        )}
      >
        {items.map((item) => (
          <ContinueReadingCard key={item.book.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LibraryHome() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Continue Reading state
  const [continueItems, setContinueItems] = useState<ContinueReadingItem[]>([]);

  // Load More state
  const [extraBooks, setExtraBooks] = useState<Book[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const prevCategoryRef = useRef(activeCategory);

  // Reset extra books when category changes
  useEffect(() => {
    if (prevCategoryRef.current !== activeCategory) {
      setExtraBooks([]);
      setLoadMorePage(1);
      setHasMore(true);
      prevCategoryRef.current = activeCategory;
    }
  }, [activeCategory]);

  // Load continue-reading items on mount
  useEffect(() => {
    let cancelled = false;

    async function loadContinueReading() {
      try {
        const progressEntries = await getAllProgress();
        if (cancelled || progressEntries.length === 0) return;

        const items: ContinueReadingItem[] = [];

        for (const progress of progressEntries) {
          // Try local storage first, then fall back to seed catalog
          let book = await getStoredBook(progress.bookId);
          if (!book) {
            book = seedMap.get(progress.bookId);
          }
          if (book) {
            items.push({ book, progress });
          }
        }

        if (!cancelled) {
          // Already sorted by lastReadAt desc from getAllProgress
          setContinueItems(items);
        }
      } catch {
        // Silently fail — continue reading is non-critical
      }
    }

    loadContinueReading();
    return () => {
      cancelled = true;
    };
  }, []);

  // Get books for the active category from seed catalog (instant, no network)
  const categoryBooks = useMemo(() => {
    if (activeCategory === 'All') return seedCatalog;
    const ids = categoryMap[activeCategory];
    if (!ids) return [];
    return ids
      .map((id) => seedMap.get(id))
      .filter((b): b is Book => b !== undefined);
  }, [activeCategory]);

  // Merge seed catalog books with any extra loaded books, deduplicating by id
  const allCategoryBooks = useMemo(() => {
    if (extraBooks.length === 0) return categoryBooks;
    const seenIds = new Set(categoryBooks.map((b) => b.id));
    const unique = extraBooks.filter((b) => !seenIds.has(b.id));
    return [...categoryBooks, ...unique];
  }, [categoryBooks, extraBooks]);

  // Handle "Load More"
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const nextPage = loadMorePage + 1;

      if (activeCategory === 'All') {
        const { books, hasMore: more } = await getBooksPage(nextPage);
        setExtraBooks((prev) => [...prev, ...books]);
        setHasMore(more);
      } else {
        const { books, hasMore: more } = await searchBooks(activeCategory, nextPage);
        setExtraBooks((prev) => [...prev, ...books]);
        setHasMore(more);
      }

      setLoadMorePage(nextPage);
    } catch {
      // On error, just stop showing load more
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loadMorePage, activeCategory]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { books } = await searchBooks(query);
      setSearchResults(books);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle book selection
  function handleSelectBook(book: Book) {
    setSelectedBook(book);
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
  }

  // Are we in search mode?
  const isSearchMode = searchQuery.length > 0;

  // Choose which books to display
  const displayedBooks = isSearchMode ? searchResults : allCategoryBooks;

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-3">
          {/* App title */}
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="size-5 text-foreground" />
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              AI Book Companion
            </h1>
          </div>

          {/* Search */}
          <SearchBar onSearch={handleSearch} isSearching={isSearching} />

          {/* Categories — only show when not searching */}
          {!isSearchMode && (
            <div className="mt-2 -mb-1">
              <CategoryNav
                categories={ALL_CATEGORIES}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full py-4" aria-label="Book library">
        {/* Continue Reading — only when not searching and items exist */}
        {!isSearchMode && continueItems.length > 0 && (
          <ContinueReadingSection items={continueItems} />
        )}

        {/* Search mode feedback */}
        {isSearchMode && !isSearching && searchResults.length > 0 && (
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{' '}
            for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        <BookGrid
          books={displayedBooks}
          isLoading={isSearching}
          onSelectBook={handleSelectBook}
        />

        {/* Load More button — only when not searching and there are books */}
        {!isSearchMode && displayedBooks.length > 0 && hasMore && (
          <div className="flex justify-center px-4 py-6">
            <Button
              variant="outline"
              size="lg"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="min-w-[160px]"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Books'
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Book detail overlay */}
      <BookDetail
        book={selectedBook}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
