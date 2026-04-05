'use client';

import { cn } from '@/lib/utils';
import { Library } from 'lucide-react';

interface CollectionCardProps {
  name: string;
  bookCount: number;
  isSystem: boolean;
  onClick: () => void;
}

export function CollectionCard({
  name,
  bookCount,
  onClick,
}: CollectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 p-3 rounded-xl border',
        'bg-card hover:bg-accent/50 transition-colors',
        'min-w-[140px] max-w-[160px] text-left touch-manipulation'
      )}
    >
      <Library className="size-5 text-muted-foreground mb-1" />
      <span className="text-sm font-medium line-clamp-1">{name}</span>
      <span className="text-xs text-muted-foreground">
        {bookCount} {bookCount === 1 ? 'book' : 'books'}
      </span>
    </button>
  );
}
