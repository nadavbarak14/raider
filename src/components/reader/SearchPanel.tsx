'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

interface SearchResult {
  cfi: string;
  excerpt: string;
  sectionIndex: number;
}

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (cfi: string) => void;
  theme: ReaderSettings['theme'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rendition: any;
}

export function SearchPanel({
  open,
  onClose,
  onNavigate,
  theme,
  rendition,
}: SearchPanelProps) {
  const colors = getReaderThemeColors(theme);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !rendition?.book) return;

    setSearching(true);
    setSearched(false);
    setResults([]);

    try {
      const book = rendition.book;
      const allResults: SearchResult[] = [];

      // Search each section in the spine
      const spineItems = book.spine?.spineItems || [];
      for (const item of spineItems) {
        try {
          await item.load(book.load.bind(book));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const found: any[] = item.find(searchQuery);
          if (found && found.length > 0) {
            for (const match of found) {
              allResults.push({
                cfi: match.cfi,
                excerpt: match.excerpt || searchQuery,
                sectionIndex: item.index,
              });
            }
          }
          item.unload();
        } catch {
          // Skip sections that fail to load
        }
      }

      setResults(allResults);
    } catch {
      // Search failed silently
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, [rendition]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  function handleResultClick(cfi: string) {
    onNavigate(cfi);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Search panel at top */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-40',
          'shadow-lg border-b',
          'animate-in slide-in-from-top duration-200',
          'max-h-[60vh] flex flex-col',
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {/* Search input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
          <Search className="size-4 shrink-0" style={{ color: colors.muted }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in book..."
            className={cn(
              'flex-1 bg-transparent text-sm outline-none placeholder:opacity-50',
            )}
            style={{ color: colors.text }}
          />
          {searching && <Loader2 className="size-4 animate-spin shrink-0" style={{ color: colors.muted }} />}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full touch-manipulation"
            style={{ color: colors.muted }}
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </form>

        {/* Results */}
        {(results.length > 0 || (searched && results.length === 0)) && (
          <div className="border-t overflow-y-auto max-h-[50vh]" style={{ borderColor: colors.border }}>
            {results.length === 0 && searched && (
              <p className="px-4 py-6 text-sm text-center" style={{ color: colors.muted }}>
                No results found for &ldquo;{query}&rdquo;
              </p>
            )}
            {results.map((result, i) => (
              <button
                key={`${result.cfi}-${i}`}
                type="button"
                onClick={() => handleResultClick(result.cfi)}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm border-b',
                  'transition-colors touch-manipulation min-h-[44px]',
                )}
                style={{ borderColor: colors.border, color: colors.text }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span className="line-clamp-2">{result.excerpt}</span>
              </button>
            ))}
            {results.length > 0 && (
              <p className="px-4 py-2 text-xs text-center" style={{ color: colors.muted }}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
