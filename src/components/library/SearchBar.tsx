'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue.trim());
  }

  function handleClear() {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <Search
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 size-4',
          'text-muted-foreground pointer-events-none'
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search books, authors..."
        className={cn(
          'h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10',
          'text-sm placeholder:text-muted-foreground',
          'transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
          'dark:bg-input/30'
        )}
      />
      {(value || isSearching) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          ) : (
            <button
              onClick={handleClear}
              className="flex items-center justify-center size-6 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] -m-[10px]"
              aria-label="Clear search"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
