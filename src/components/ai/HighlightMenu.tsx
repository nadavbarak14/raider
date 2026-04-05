'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare, User, Lightbulb, ListOrdered, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/thread';
import type { HighlightColor } from '@/types/book';

const HIGHLIGHT_COLORS: { color: HighlightColor; hex: string; label: string }[] = [
  { color: 'yellow', hex: '#FBBF24', label: 'Yellow highlight' },
  { color: 'blue', hex: '#60A5FA', label: 'Blue highlight' },
  { color: 'green', hex: '#34D399', label: 'Green highlight' },
  { color: 'pink', hex: '#F472B6', label: 'Pink highlight' },
];

interface HighlightMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  selectedCfi: string;
  onAction: (type: QuestionType) => void;
  onHighlight?: (color: HighlightColor) => void;
  onClose: () => void;
  visible: boolean;
}

const ACTIONS: { type: QuestionType; icon: typeof MessageSquare; label: string; singleWordOnly?: boolean }[] = [
  { type: 'define', icon: BookOpen, label: 'Define', singleWordOnly: true },
  { type: 'ask_ai', icon: MessageSquare, label: 'Ask AI' },
  { type: 'who_is_this', icon: User, label: 'Who is this?' },
  { type: 'explain', icon: Lightbulb, label: 'Explain' },
  { type: 'recap', icon: ListOrdered, label: 'Recap' },
];

export function HighlightMenu({
  position,
  selectedText,
  onAction,
  onHighlight,
  onClose,
  visible,
}: HighlightMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss on tap outside
  useEffect(() => {
    if (!visible) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Slight delay to avoid the event that triggered the menu from closing it
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown, true);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [visible, onClose]);

  // Dismiss on Escape
  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  // Calculate position — center horizontally on x, above the y position
  // Clamp to viewport bounds
  const menuWidth = 280;
  const menuHeight = 52;
  const padding = 8;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = position.x - menuWidth / 2;
  let top = position.y - menuHeight - 12; // 12px gap above selection
  let arrowSide: 'bottom' | 'top' = 'bottom';

  // Clamp left
  if (left < padding) left = padding;
  if (left + menuWidth > viewportWidth - padding) left = viewportWidth - padding - menuWidth;

  // If not enough room above, show below
  if (top < padding) {
    top = position.y + 12;
    arrowSide = 'top';
  }

  // Clamp top
  if (top + menuHeight > viewportHeight - padding) {
    top = viewportHeight - padding - menuHeight;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'fixed z-50 flex items-center gap-0.5 px-1.5 py-1.5',
        'bg-popover text-popover-foreground',
        'rounded-xl shadow-lg border border-border',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{ left, top }}
    >
      {/* Arrow indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-3 h-3',
          'bg-popover border-border rotate-45',
          arrowSide === 'bottom'
            ? '-bottom-1.5 border-r border-b'
            : '-top-1.5 border-l border-t'
        )}
      />

      {/* Color highlight buttons */}
      {onHighlight && (
        <>
          <div className="flex items-center gap-1 px-1">
            {HIGHLIGHT_COLORS.map(({ color, hex, label }) => (
              <button
                key={color}
                type="button"
                role="menuitem"
                onClick={() => onHighlight(color)}
                aria-label={label}
                className={cn(
                  'w-7 h-7 rounded-full border-2 border-transparent',
                  'hover:scale-110 active:scale-95 transition-transform',
                  'touch-manipulation min-w-[44px] min-h-[44px]',
                  'flex items-center justify-center'
                )}
              >
                <span
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: hex }}
                />
              </button>
            ))}
          </div>
          <div className="w-px h-8 bg-border mx-0.5" />
        </>
      )}

      {ACTIONS.filter(a => !a.singleWordOnly || (selectedText && selectedText.trim().split(/\s+/).length === 1)).map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          onClick={() => onAction(type)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5',
            'rounded-lg text-xs font-medium',
            'hover:bg-muted active:bg-muted/80',
            'transition-colors touch-manipulation',
            'min-w-[56px] min-h-[44px]'
          )}
        >
          <Icon className="size-4" />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}
