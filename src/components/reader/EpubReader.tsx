'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from 'react';
import type { ReaderSettings } from '@/types/settings';
import type { Highlight } from '@/types/book';
import { getBookBlob, saveBookBlob, getBook as getStoredBook } from '@/lib/storage/books';
import { getBook as fetchBookMeta } from '@/lib/gutenberg/client';
import { saveChapters, getChapters } from '@/lib/storage/books';
import { Loader2 } from 'lucide-react';

// ── Highlight color map ─────────────────────────────────────────────────────

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: 'rgba(251, 191, 36, 0.3)',
  blue: 'rgba(96, 165, 250, 0.3)',
  green: 'rgba(52, 211, 153, 0.3)',
  pink: 'rgba(244, 114, 182, 0.3)',
};

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
  highlights?: Highlight[];
  onLocationChanged?: (cfi: string, chapterIndex: number, percent: number) => void;
  onTextSelected?: (cfi: string, selectedText: string, rect: DOMRect) => void;
  onReady?: (totalChapters: number) => void;
  /** Called when user taps the middle 40% of the reader (toggle chrome) */
  onCenterTap?: () => void;
  /** Ref exposed so the parent page can call .next() / .prev() / .display() */
  renditionRef?: RefObject<EpubRendition | null>;
  /** Callback to get the visible page text (for TTS) */
  onGetVisibleText?: RefObject<(() => string) | null>;
}

export function EpubReader({
  bookId,
  initialCfi,
  settings,
  highlights = [],
  onLocationChanged,
  onTextSelected,
  onReady,
  onCenterTap,
  renditionRef,
  onGetVisibleText,
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const internalRenditionRef = useRef<EpubRendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRenditionReady = useRef(false);
  const appliedHighlightsRef = useRef<Set<string>>(new Set());
  const lastCfiRef = useRef<string | undefined>(undefined);
  const flowModeRef = useRef(settings.flowMode);
  flowModeRef.current = settings.flowMode;

  // Stable callback refs so we don't re-run the effect when callbacks change
  const onLocationChangedRef = useRef(onLocationChanged);
  onLocationChangedRef.current = onLocationChanged;
  const onTextSelectedRef = useRef(onTextSelected);
  onTextSelectedRef.current = onTextSelected;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onCenterTapRef = useRef(onCenterTap);
  onCenterTapRef.current = onCenterTap;

  // ── Initialize EPUB ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    let rendition: EpubRendition | null = null;
    let book: EpubBook | null = null;
    let deferTimer: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Parallelize: import epubjs + resolve EPUB blob simultaneously
        const blobPromise = (async () => {
          let blob = await getBookBlob(bookId);
          if (!blob) {
            let meta = await getStoredBook(bookId);
            if (!meta) meta = (await fetchBookMeta(bookId)) ?? undefined;
            if (!meta?.downloadUrl) return null;

            const response = await fetch(`/api/epub/${bookId}`);
            if (!response.ok) return null;

            blob = await response.blob();
            await saveBookBlob(bookId, blob);
          }
          return blob;
        })();

        const [ePubModule, blob] = await Promise.all([
          import('epubjs'),
          blobPromise,
        ]);

        if (cancelled) return;

        if (!blob) {
          setError('Failed to load the book. Please try again.');
          setLoading(false);
          return;
        }

        const ePub = ePubModule.default;

        // 2. Create epubjs Book from ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        book = ePub(arrayBuffer);
        bookRef.current = book;

        await book.ready;

        if (cancelled) return;

        // 3. Create rendition
        const isScrolled = settings.flowMode === 'scrolled';
        rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: isScrolled ? 'scrolled-doc' : 'paginated',
          spread: 'none',
          snap: !isScrolled,
        });

        internalRenditionRef.current = rendition;
        if (renditionRef) {
          (renditionRef as React.MutableRefObject<EpubRendition | null>).current = rendition;
        }

        // Expose getVisibleText for TTS
        if (onGetVisibleText) {
          (onGetVisibleText as React.MutableRefObject<(() => string) | null>).current = () => {
            try {
              const iframe = containerRef.current?.querySelector('iframe');
              if (!iframe?.contentDocument?.body) return '';
              return iframe.contentDocument.body.textContent?.trim() || '';
            } catch {
              return '';
            }
          };
        }

        // 4. Determine display target BEFORE rendering — avoids double display()
        // Prefer last known CFI (e.g. when switching flow modes) over initialCfi
        let displayTarget: string | undefined = lastCfiRef.current || initialCfi;

        if (!displayTarget) {
          try {
            const nav = await book.loaded.navigation;
            if (nav?.toc?.length > 0) {
              const skipLabels = ['cover', 'title', 'copyright', 'contents', 'table of contents'];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const firstChapter = nav.toc.find((t: any) => {
                const label = t.label?.toLowerCase().trim() || '';
                return !skipLabels.some((skip) => label.includes(skip));
              });
              if (firstChapter?.href) {
                displayTarget = firstChapter.href;
              }
            }
          } catch {
            // Non-fatal: fall through to default display
          }
        }

        // 5. Single display() call with the resolved target
        await rendition.display(displayTarget);

        if (cancelled) return;

        // 6. Set up event listeners
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          if (!location?.start) return;
          isRenditionReady.current = true;
          const cfi = location.start.cfi || '';
          lastCfiRef.current = cfi;
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

        // 7. Register touch/click handlers inside epub iframe content
        //    Events inside the iframe don't bubble to React, so we must
        //    attach listeners directly to each content document.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.hooks.content.register((contents: any) => {
          const doc: Document = contents.document;
          let touchStart: { x: number; y: number; time: number } | null = null;
          let touchHandled = false;

          doc.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            touchHandled = false;
            touchStart = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              time: Date.now(),
            };
          }, { passive: true });

          doc.addEventListener('touchend', (e: TouchEvent) => {
            const start = touchStart;
            if (!start) return;
            touchStart = null;
            touchHandled = true;

            if (e.changedTouches.length === 0) return;
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - start.x;
            const deltaY = endY - start.y;
            const elapsed = Date.now() - start.time;

            // Swipe detection (relaxed thresholds for mobile)
            if (elapsed < 600 && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
              if (deltaX < 0) rendition.next();
              else rendition.prev();
              return;
            }

            // Tap detection (minimal finger movement)
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
              const sel = doc.getSelection?.();
              if (sel && sel.toString().trim()) return;

              const width = doc.documentElement.clientWidth;
              const relX = endX / width;
              // In scroll mode, only handle center tap (no page turn via tap zones)
              if (flowModeRef.current === 'scrolled') {
                onCenterTapRef.current?.();
              } else {
                if (relX < 0.3) rendition.prev();
                else if (relX > 0.7) rendition.next();
                else onCenterTapRef.current?.();
              }
            }
          }, { passive: true });

          // Desktop: click handler (skipped when touch already handled)
          doc.addEventListener('click', (e: MouseEvent) => {
            if (touchHandled) {
              touchHandled = false;
              return;
            }
            const sel = doc.getSelection?.();
            if (sel && sel.toString().trim()) return;

            const width = doc.documentElement.clientWidth;
            const relX = e.clientX / width;
            // In scroll mode, only handle center tap
            if (flowModeRef.current === 'scrolled') {
              onCenterTapRef.current?.();
            } else {
              if (relX < 0.3) rendition.prev();
              else if (relX > 0.7) rendition.next();
              else onCenterTapRef.current?.();
            }
          });
        });

        // 8. Report ready + hide loading before background work
        const totalChapters = book.spine?.items?.length ?? 0;
        onReadyRef.current?.(totalChapters);
        setLoading(false);

        // 8. Defer location generation so it doesn't compete with initial render
        deferTimer = setTimeout(() => {
          book?.locations.generate(1024).catch(() => {});
        }, 1500);

        // 9. Extract chapters in background if not already stored
        getChapters(bookId).then((existing) => {
          if (existing.length === 0) {
            import('@/lib/gutenberg/parser').then(async ({ extractChaptersFromEpub }) => {
              try {
                const chapters = await extractChaptersFromEpub(book, bookId);
                if (chapters.length > 0) await saveChapters(bookId, chapters);
              } catch {
                // Non-fatal
              }
            });
          }
        });
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
      if (deferTimer != null) clearTimeout(deferTimer);
      isRenditionReady.current = false;
      appliedHighlightsRef.current.clear();
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
    // Re-initialize when bookId or flowMode changes (flowMode requires new rendition)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, settings.flowMode]);

  // ── Apply settings to rendition ──────────────────────────────────────────

  useEffect(() => {
    const rendition = internalRenditionRef.current;
    if (!rendition) return;

    const themeStyles = THEME_STYLES[settings.theme];
    const fontFamily = FONT_MAP[settings.fontFamily];

    const marginPx =
      settings.margins === 'narrow' ? '8px' : settings.margins === 'wide' ? '40px' : '20px';

    try {
      rendition.themes.default({
        body: {
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineSpacing} !important`,
          'font-family': `${fontFamily} !important`,
          'padding-left': `${marginPx} !important`,
          'padding-right': `${marginPx} !important`,
          'padding-top': '0 !important',
          'padding-bottom': '0 !important',
          margin: '0 !important',
          ...themeStyles.body,
        },
        'body, p, div, span, li, td, th, blockquote, cite, em, strong, a, h1, h2, h3, h4, h5, h6': {
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineSpacing} !important`,
          'font-family': `${fontFamily} !important`,
          'text-align': `${settings.textAlign} !important`,
          ...themeStyles.bodyAll,
        },
      });
      rendition.themes.select('default');
    } catch {
      // Theme application can fail during transitions
    }
  }, [settings]);

  // ── Apply highlights to rendition ───────────────────────────────────────

  useEffect(() => {
    const rendition = internalRenditionRef.current;
    if (!rendition || !isRenditionReady.current) return;

    // Track which highlights are currently applied
    const currentIds = new Set(highlights.map((h) => h.id));

    // Remove highlights that are no longer in the list
    for (const id of appliedHighlightsRef.current) {
      if (!currentIds.has(id)) {
        try {
          const h = highlights.find((hl) => hl.id === id);
          if (h) rendition.annotations.remove(h.cfiRange, 'highlight');
        } catch {
          // Removal can fail if the annotation was on a different page
        }
        appliedHighlightsRef.current.delete(id);
      }
    }

    // Add new highlights
    for (const h of highlights) {
      if (appliedHighlightsRef.current.has(h.id)) continue;
      try {
        rendition.annotations.highlight(
          h.cfiRange,
          {},
          undefined,
          `hl-${h.color}`,
          { fill: HIGHLIGHT_COLOR_MAP[h.color] || HIGHLIGHT_COLOR_MAP.yellow, 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' }
        );
        appliedHighlightsRef.current.add(h.id);
      } catch {
        // Highlight application can fail for CFIs on other pages — that's ok,
        // epubjs will render them when the user navigates to the right page
      }
    }
  }, [highlights]);

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const rendition = internalRenditionRef.current;
      if (!rendition) return;
      // In scroll mode, let the browser handle arrow keys natively for scrolling
      if (flowModeRef.current === 'scrolled') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        rendition.prev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        rendition.next();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundColor: CONTAINER_BG[settings.theme],
        filter: settings.brightness < 1 ? `brightness(${settings.brightness})` : undefined,
      }}
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
      />
    </div>
  );
}
