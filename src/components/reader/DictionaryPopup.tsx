'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lookupWord, isOnline, type DictionaryResult } from '@/lib/reader/dictionary';

interface DictionaryPopupProps {
  word: string;
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
}

type State =
  | { status: 'loading' }
  | { status: 'found'; result: DictionaryResult }
  | { status: 'not_found'; word: string }
  | { status: 'offline' };

export function DictionaryPopup({
  word,
  position,
  visible,
  onClose,
}: DictionaryPopupProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: 'loading' });

  // Look up word when visible
  useEffect(() => {
    if (!visible || !word) return;

    if (!isOnline()) {
      setState({ status: 'offline' });
      return;
    }

    setState({ status: 'loading' });
    lookupWord(word).then((result) => {
      if (result) {
        setState({ status: 'found', result });
      } else {
        setState({ status: 'not_found', word });
      }
    });
  }, [visible, word]);

  // Dismiss on tap outside
  useEffect(() => {
    if (!visible) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

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

  // Position calculation (same approach as HighlightMenu)
  const popupWidth = 280;
  const popupHeight = 200;
  const padding = 8;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;

  let left = position.x - popupWidth / 2;
  let top = position.y - popupHeight - 12;

  if (left < padding) left = padding;
  if (left + popupWidth > viewportWidth - padding) left = viewportWidth - padding - popupWidth;
  if (top < padding) top = position.y + 24;

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 w-[280px] max-h-[280px] overflow-y-auto',
        'bg-popover text-popover-foreground',
        'rounded-xl shadow-lg border border-border p-4',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{ left, top }}
    >
      {state.status === 'loading' && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {state.status === 'offline' && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Dictionary unavailable offline
        </p>
      )}

      {state.status === 'not_found' && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No definition found for &ldquo;{state.word}&rdquo;
        </p>
      )}

      {state.status === 'found' && (
        <div className="space-y-3">
          {/* Word + phonetic */}
          <div>
            <span className="text-base font-semibold">{state.result.word}</span>
            {state.result.phonetic && (
              <span className="text-sm text-muted-foreground ml-2">
                {state.result.phonetic}
              </span>
            )}
          </div>

          {/* Meanings */}
          {state.result.meanings.map((meaning, i) => (
            <div key={i}>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {meaning.partOfSpeech}
              </span>
              <ol className="mt-1 space-y-1">
                {meaning.definitions.map((def, j) => (
                  <li key={j} className="text-sm pl-4 relative">
                    <span className="absolute left-0 text-muted-foreground">{j + 1}.</span>
                    {def}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
