'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CategoryNavProps {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
}

export function CategoryNav({
  categories,
  activeCategory,
  onSelect,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll the active pill into view when category changes
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const pillLeft = pill.offsetLeft;
      const pillWidth = pill.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;

      // If the pill is out of the visible area, scroll to center it
      if (
        pillLeft < scrollLeft ||
        pillLeft + pillWidth > scrollLeft + containerWidth
      ) {
        container.scrollTo({
          left: pillLeft - containerWidth / 2 + pillWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeCategory]);

  return (
    <nav
      ref={scrollRef}
      aria-label="Book categories"
      className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-2 -mx-4"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {categories.map((cat) => {
        const isActive = cat === activeCategory;
        return (
          <button
            key={cat}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(cat)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'min-h-[44px] min-w-[44px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {cat}
          </button>
        );
      })}
    </nav>
  );
}
