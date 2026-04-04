'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from 'react';
import type { ReaderSettings } from '@/types/settings';
import { getBookBlob, saveBookBlob, getBook as getStoredBook } from '@/lib/storage/books';
import { getBook as fetchBookMeta } from '@/lib/gutenberg/client';
import { saveChapters, getChapters } from '@/lib/storage/books';
import { Loader2 } from 'lucide-react';

// ── Types for epubjs (we avoid importing at module level) ────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type EpubBook = any;
type EpubRendition = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Theme configurations ─────────────────────────────────────────────────────

const THEME_STYLES: Record<
  ReaderSettings['theme'],
  { body: Record<string, string>; bodyAll: Record<string, string> }
> = {
  light: {
    body: { background: '#FFFFFF !important' },
    bodyAll: { color: '#1a1a1a !important' },
  },
  dark: {
    body: { background: '#1a1a1a !important' },
    bodyAll: { color: '#e0e0e0 !important' },
  },
  sepia: {
    body: { background: '#F5E6C8 !important' },
    bodyAll: { color: '#5B4636 !important' },
  },
};

const CONTAINER_BG: Record<ReaderSettings['theme'], string> = {
  light: '#FFFFFF',
  dark: '#1a1a1a',
  sepia: '#F5E6C8',
};

const FONT_MAP: Record<ReaderSettings['fontFamily'], string> = {
  serif: 'Georgia, "Times New Roman", serif',
  'sans-serif': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  dyslexia: 'OpenDyslexic, "Comic Sans MS", system-ui, sans-serif',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface EpubReaderProps {
  bookId: string;
  initialCfi?: string;
  settings: ReaderSettings;
  onLocationChanged?: (cfi: string, chapterIndex: number, percent: number) => void;
  onTextSelected?: (cfi: string, selectedText: string, rect: DOMRect) => void;
  onReady?: (totalChapters: number) => void;
  /** Ref exposed so the parent page can call .next() / .prev() / .display() */
  renditionRef?: RefObject<EpubRendition | null>;
}

export function EpubReader({
  bookId,
  initialCfi,
  settings,
  onLocationChanged,
  onTextSelected,
  onReady,
  renditionRef,
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const internalRenditionRef = useRef<EpubRendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable callback refs so we don't re-run the effect when callbacks change
  const onLocationChangedRef = useRef(onLocationChanged);
  onLocationChangedRef.current = onLocationChanged;
  const onTextSelectedRef = useRef(onTextSelected);
  onTextSelectedRef.current = onTextSelected;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // ── Initialize EPUB ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    let rendition: EpubRendition | null = null;
    let book: EpubBook | null = null;

    async function init() {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Dynamically import epubjs (browser-only)
        const ePub = (await import('epubjs')).default;

        // 2. Load the EPUB data — prefer cached blob, otherwise fetch
        let blob = await getBookBlob(bookId);

        if (!blob) {
          // Get book metadata to find download URL
          let meta = await getStoredBook(bookId);
          if (!meta) {
            meta = (await fetchBookMeta(bookId)) ?? undefined;
          }
          if (!meta?.downloadUrl) {
            setError('Could not find EPUB download URL.');
            setLoading(false);
            return;
          }

          // Fetch the EPUB file
          const response = await fetch(meta.downloadUrl);
          if (!response.ok) {
            setError('Failed to download the book. Please try again.');
            setLoading(false);
            return;
          }
          blob = await response.blob();

          // Cache the blob for offline use
          await saveBookBlob(bookId, blob);
        }

        if (cancelled) return;

        // 3. Create epubjs Book from ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        book = ePub(arrayBuffer);
        bookRef.current = book;

        // Wait for the book to be ready
        await book.ready;

        if (cancelled) return;

        // 4. Create rendition
        rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          snap: true,
        });

        internalRenditionRef.current = rendition;
        if (renditionRef) {
          (renditionRef as React.MutableRefObject<EpubRendition | null>).current = rendition;
        }

        // 5. Display at initial position or start
        if (initialCfi) {
          await rendition.display(initialCfi);
        } else {
          await rendition.display();
        }

        if (cancelled) return;

        // 6. Generate locations for percentage tracking
        await book.locations.generate(1024);

        if (cancelled) return;

        // 7. Set up event listeners
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          if (!location?.start) return;
          const cfi = location.start.cfi || '';
          const percent = location.start.percentage != null
            ? Math.round(location.start.percentage * 100)
            : 0;
          const chapterIndex = location.start.index ?? 0;
          onLocationChangedRef.current?.(cfi, chapterIndex, percent);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          try {
            const selection = contents?.window?.getSelection?.();
            if (!selection || selection.rangeCount === 0) return;
            const selectedText = selection.toString().trim();
            if (!selectedText) return;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            onTextSelectedRef.current?.(cfiRange, selectedText, rect);
          } catch {
            // Selection handling is non-critical
          }
        });

        // 8. Extract chapters if not already stored
        const existingChapters = await getChapters(bookId);
        if (existingChapters.length === 0) {
          // Do this in background, don't block reading
          import('@/lib/gutenberg/parser').then(async ({ extractChaptersFromEpub }) => {
            try {
              const chapters = await extractChaptersFromEpub(book, bookId);
              if (chapters.length > 0) {
                await saveChapters(bookId, chapters);
              }
            } catch {
              // Non-fatal: chapter extraction failure doesn't block reading
            }
          });
        }

        // 9. Report ready
        const totalChapters = book.spine?.items?.length ?? 0;
        onReadyRef.current?.(totalChapters);

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('EpubReader init error:', err);
          setError('Failed to load the book. Please try again.');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (rendition) {
        try {
          rendition.destroy();
        } catch {
          // cleanup is best-effort
        }
      }
      if (book) {
        try {
          book.destroy();
        } catch {
          // cleanup is best-effort
        }
      }
      bookRef.current = null;
      internalRenditionRef.current = null;
      if (renditionRef) {
        (renditionRef as React.MutableRefObject<EpubRendition | null>).current = null;
      }
    };
    // Only re-initialize when bookId changes; settings are applied separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // ── Apply settings to rendition ──────────────────────────────────────────

  useEffect(() => {
    const rendition = internalRenditionRef.current;
    if (!rendition) return;

    const themeStyles = THEME_STYLES[settings.theme];
    const fontFamily = FONT_MAP[settings.fontFamily];

    try {
      rendition.themes.default({
        body: {
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineSpacing} !important`,
          'font-family': `${fontFamily} !important`,
          padding: '0 !important',
          margin: '0 !important',
          ...themeStyles.body,
        },
        'body, p, div, span, li, td, th, blockquote, cite, em, strong, a, h1, h2, h3, h4, h5, h6': {
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineSpacing} !important`,
          'font-family': `${fontFamily} !important`,
          ...themeStyles.bodyAll,
        },
      });
      rendition.themes.select('default');
    } catch {
      // Theme application can fail during transitions
    }
  }, [settings]);

  // ── Touch/click navigation ───────────────────────────────────────────────

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const rendition = internalRenditionRef.current;
      if (!rendition) return;

      const container = containerRef.current;
      if (!container) return;

      // Get the x-coordinate of the tap
      let clientX: number;
      if ('touches' in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
        } else {
          return;
        }
      } else {
        clientX = e.clientX;
      }

      const rect = container.getBoundingClientRect();
      const relativeX = (clientX - rect.left) / rect.width;

      if (relativeX < 0.3) {
        rendition.prev();
      } else if (relativeX > 0.7) {
        rendition.next();
      }
      // Middle 40% does nothing (toggles UI, handled by parent)
    },
    []
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const rendition = internalRenditionRef.current;
      if (!rendition) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        rendition.prev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        rendition.next();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Swipe gesture support ────────────────────────────────────────────────

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;

    const rendition = internalRenditionRef.current;
    if (!rendition) return;

    if (e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const elapsed = Date.now() - start.time;

    // Must be a quick horizontal swipe (not a vertical scroll)
    const MIN_SWIPE = 50;
    const MAX_TIME = 500;
    if (elapsed > MAX_TIME) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < -MIN_SWIPE) {
      rendition.next();
    } else if (deltaX > MIN_SWIPE) {
      rendition.prev();
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: CONTAINER_BG[settings.theme] }}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: CONTAINER_BG[settings.theme] }}
        >
          <Loader2
            className="size-8 animate-spin"
            style={{
              color:
                settings.theme === 'dark'
                  ? '#e0e0e0'
                  : settings.theme === 'sepia'
                    ? '#5B4636'
                    : '#1a1a1a',
            }}
          />
          <p
            className="text-sm"
            style={{
              color:
                settings.theme === 'dark'
                  ? '#999'
                  : settings.theme === 'sepia'
                    ? '#8B7355'
                    : '#666',
            }}
          >
            Loading book...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8"
          style={{ backgroundColor: CONTAINER_BG[settings.theme] }}
        >
          <p
            className="text-sm text-center"
            style={{
              color:
                settings.theme === 'dark'
                  ? '#e0e0e0'
                  : settings.theme === 'sepia'
                    ? '#5B4636'
                    : '#1a1a1a',
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* EPUB container + tap/swipe overlay */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      />
    </div>
  );
}
