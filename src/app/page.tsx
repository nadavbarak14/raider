'use client';

import { useState, useCallback, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/types/book';
import { seedCatalog, categoryMap } from '@/lib/gutenberg/seed-catalog';
import { searchBooks } from '@/lib/gutenberg/client';
import { SearchBar } from '@/components/library/SearchBar';
import { CategoryNav } from '@/components/library/CategoryNav';
import { BookGrid } from '@/components/library/BookGrid';
import { BookDetail } from '@/components/library/BookDetail';

const ALL_CATEGORIES = ['All', ...Object.keys(categoryMap)];

// Build a quick lookup map from the seed catalog for O(1) access
const seedMap = new Map(seedCatalog.map((b) => [b.id, b]));

export default function LibraryHome() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Get books for the active category from seed catalog (instant, no network)
  const categoryBooks = useMemo(() => {
    if (activeCategory === 'All') return seedCatalog;
    const ids = categoryMap[activeCategory];
    if (!ids) return [];
    return ids
      .map((id) => seedMap.get(id))
      .filter((b): b is Book => b !== undefined);
  }, [activeCategory]);

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
  const displayedBooks = isSearchMode ? searchResults : categoryBooks;

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
