'use client';

import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EpubReader } from '@/components/reader/EpubReader';
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ProgressBar } from '@/components/reader/ProgressBar';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { Bookmarks } from '@/components/reader/Bookmarks';
import { ReaderHeader, type ReaderMenuAction } from '@/components/reader/ReaderHeader';
import { HighlightMenu } from '@/components/ai/HighlightMenu';
import { HighlightsPanel } from '@/components/reader/HighlightsPanel';
import { DictionaryPopup } from '@/components/reader/DictionaryPopup';
import { TTSControls } from '@/components/reader/TTSControls';
import { ThreadPanel } from '@/components/ai/ThreadPanel';
import { MarginMarkers } from '@/components/ai/MarginMarkers';
import { GeneralChat } from '@/components/ai/GeneralChat';
import { SearchPanel } from '@/components/reader/SearchPanel';
import { useChromeVisibility } from '@/hooks/useChromeVisibility';
import { useHighlightInteraction } from '@/hooks/useHighlightInteraction';
import { getReaderThemeColors } from '@/components/reader/theme-colors';
import type { Book, ReadingProgress, Highlight, HighlightColor } from '@/types/book';
import type { ReaderSettings } from '@/types/settings';
import { DEFAULT_READER_SETTINGS } from '@/types/settings';
import {
  getBook as getStoredBook,
  saveBook,
} from '@/lib/storage/books';
import { getBook as fetchBookMeta } from '@/lib/gutenberg/client';
import { getProgress, saveProgress } from '@/lib/storage/progress';
import { getSettings, updateReaderSettings } from '@/lib/storage/settings';
import { isLocationBookmarked, toggleBookmark } from '@/lib/reader/bookmarks';
import { createHighlight, getHighlightsForBook } from '@/lib/reader/highlights';
import { createReadingSpeedTracker } from '@/lib/reader/reading-speed';
import { getReadingTimeEstimates } from '@/lib/reader/reading-time';
import { startSession, endSession } from '@/lib/reader/sessions';
import { createTTSEngine, type TTSEngine } from '@/lib/reader/tts';

// ── Touch Overlay — reliable tap/swipe detection on top of epub iframe ───────

function TouchOverlay({
  onTapLeft,
  onTapRight,
  onTapCenter,
}: {
  onTapLeft: () => void;
  onTapRight: () => void;
  onTapCenter: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchHandledRef = useRef(false);
  const lastNavRef = useRef(0); // cooldown to prevent rapid multi-page turns

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function navigate(action: () => void) {
      const now = Date.now();
      if (now - lastNavRef.current < 300) return; // 300ms cooldown
      lastNavRef.current = now;
      action();
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchHandledRef.current = false;
      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }

    function onTouchEnd(e: TouchEvent) {
      const start = touchRef.current;
      if (!start) return;
      touchRef.current = null;
      touchHandledRef.current = true;
      if (e.changedTouches.length === 0) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - start.x;
      const dy = endY - start.y;
      const elapsed = Date.now() - start.time;

      // Swipe detection (require 80px+ horizontal movement)
      if (elapsed < 600 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 80) {
        navigate(dx < 0 ? onTapRight : onTapLeft);
        return;
      }

      // Tap detection
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && elapsed < 400) {
        const width = el!.clientWidth;
        const relX = endX / width;
        if (relX < 0.3) navigate(onTapLeft);
        else if (relX > 0.7) navigate(onTapRight);
        else navigate(onTapCenter);
      }
    }

    function onClick(e: MouseEvent) {
      // Skip if touch already handled (prevents double-fire on mobile)
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }
      const width = el!.clientWidth;
      const relX = e.clientX / width;
      if (relX < 0.3) navigate(onTapLeft);
      else if (relX > 0.7) navigate(onTapRight);
      else navigate(onTapCenter);
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('click', onClick);
    };
  }, [onTapLeft, onTapRight, onTapCenter]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10"
      style={{ touchAction: 'manipulation' }}
    />
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TocEntry {
  label: string;
  href: string;
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookId } = use(params);
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────

  const [book, setBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [initialCfi, setInitialCfi] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Current reading state
  const [currentCfi, setCurrentCfi] = useState('');
  const [currentChapter, setCurrentChapter] = useState(0);
  const [percent, setPercent] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  // UI toggles
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [highlightsPanelOpen, setHighlightsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Highlights
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Dictionary
  const [dictionaryVisible, setDictionaryVisible] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [dictionaryPosition, setDictionaryPosition] = useState({ x: 0, y: 0 });

  // Reading time estimates
  const speedTrackerRef = useRef(createReadingSpeedTracker());
  const [chapterMinutesLeft, setChapterMinutesLeft] = useState<number | undefined>(undefined);
  const [bookMinutesLeft, setBookMinutesLeft] = useState<number | undefined>(undefined);
  const sessionStartTimeRef = useRef(Date.now());
  const startPercentRef = useRef(0);

  // Session tracking
  const sessionIdRef = useRef<string | null>(null);
  const pagesReadRef = useRef(0);

  // TTS
  const ttsEngineRef = useRef<TTSEngine | null>(null);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const getVisibleTextRef = useRef<(() => string) | null>(null);
  const ttsCleanupRef = useRef<(() => void) | null>(null);

  // Check TTS support on client only (avoids hydration mismatch)
  useEffect(() => {
    setTtsSupported('speechSynthesis' in window);
  }, []);

  // TOC entries
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);

  // ── Hooks ────────────────────────────────────────────────────────────────

  const highlight = useHighlightInteraction(bookId);

  const chrome = useChromeVisibility({
    ready,
    panelsOpen: [settingsOpen, tocOpen, bookmarksOpen, highlightsPanelOpen, searchOpen, highlight.threadPanelOpen],
  });

  // Derive chapter name from tocEntries + currentChapter
  const currentChapterName = useMemo(() => {
    if (tocEntries.length > 0 && currentChapter < tocEntries.length) {
      return tocEntries[currentChapter]?.label || '';
    }
    return '';
  }, [tocEntries, currentChapter]);

  // Rendition ref for external navigation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null);

  // Theme colors
  const colors = getReaderThemeColors(settings.theme);

  // ── Initialize: load book metadata, settings, and progress ───────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Load settings
      const appSettings = await getSettings();
      if (!cancelled) {
        setSettings(appSettings.readerSettings);
      }

      // Load book metadata — try IndexedDB first, then API
      let bookMeta = await getStoredBook(bookId);
      if (!bookMeta) {
        const fetched = await fetchBookMeta(bookId);
        if (fetched) {
          bookMeta = fetched;
          await saveBook(fetched);
        }
      }
      if (!cancelled && bookMeta) {
        setBook(bookMeta);
      }

      // Load reading progress
      const progress = await getProgress(bookId);
      if (!cancelled && progress?.cfi) {
        setInitialCfi(progress.cfi);
        setCurrentCfi(progress.cfi);
        setCurrentChapter(progress.currentChapterIndex);
        setPercent(progress.percentComplete);
        setTotalChapters(progress.totalChapters);
        startPercentRef.current = progress.percentComplete;
      }

      // Start reading speed tracker and session
      speedTrackerRef.current.startSession();
      sessionStartTimeRef.current = Date.now();
      const sid = await startSession(bookId);
      if (!cancelled) sessionIdRef.current = sid;

      // Load highlights for this book
      const loadedHighlights = await getHighlightsForBook(bookId);
      if (!cancelled) setHighlights(loadedHighlights);

      // Load existing AI threads for this book
      await highlight.refreshThreads();

      if (!cancelled) {
        setPageReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
      // End reading session on unmount
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current, 0, pagesReadRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // ── Keyboard shortcut: Ctrl+F for search ────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleLocationChanged = useCallback(
    async (cfi: string, chapterIndex: number, pct: number, pageInfo?: { current: number; total: number }) => {
      setCurrentCfi(cfi);
      setCurrentChapter(chapterIndex);
      setPercent(pct);

      // Use page info from relocated event, or query rendition directly
      if (pageInfo?.current != null && pageInfo?.total != null) {
        setCurrentPage(pageInfo.current);
        setTotalPages(pageInfo.total);
      } else {
        // Fallback: query rendition.location directly
        try {
          const loc = renditionRef.current?.location;
          if (loc?.start?.displayed) {
            setCurrentPage(loc.start.displayed.page);
            setTotalPages(loc.start.displayed.total);
          }
        } catch {
          // Non-critical
        }
      }

      // Track reading speed and pages (estimate ~250 words per page turn)
      speedTrackerRef.current.recordPageTurn(250);
      pagesReadRef.current += 1;

      // Persist reading progress
      const progress: ReadingProgress = {
        bookId,
        cfi,
        furthestCfi: cfi,
        currentChapterIndex: chapterIndex,
        totalChapters,
        percentComplete: pct,
        lastReadAt: Date.now(),
      };
      await saveProgress(progress);

      // Check bookmark status
      const bookmarked = await isLocationBookmarked(bookId, cfi);
      setIsBookmarked(bookmarked);

      // Update reading time estimates
      // Use session-based estimation as primary (more reliable than word-count based)
      const sessionMinutes = (Date.now() - sessionStartTimeRef.current) / 60000;
      const progressMade = pct - startPercentRef.current;

      if (sessionMinutes >= 1 && progressMade > 0.5) {
        // Session-based estimate: how long to finish based on current pace
        const minutesPerPercent = sessionMinutes / progressMade;
        const remaining = (100 - pct) * minutesPerPercent;
        setBookMinutesLeft(Math.max(1, remaining));

        // Chapter estimate (rough: assume equal chapter sizes)
        if (totalChapters > 0) {
          const chapterPercent = 100 / totalChapters;
          const progressInChapter = pct - (chapterIndex * chapterPercent);
          const remainingInChapter = chapterPercent - progressInChapter;
          if (remainingInChapter > 0) {
            setChapterMinutesLeft(Math.max(1, remainingInChapter * minutesPerPercent));
          }
        }
      } else {
        // Fallback to word-count based estimation
        const wpm = speedTrackerRef.current.getWPM();
        const estimates = await getReadingTimeEstimates(bookId, chapterIndex, pct, wpm);
        // Only show if the estimate seems reasonable (> 1 minute)
        setChapterMinutesLeft(
          estimates.chapterMinutesLeft != null && estimates.chapterMinutesLeft >= 1
            ? estimates.chapterMinutesLeft
            : undefined
        );
        setBookMinutesLeft(
          estimates.bookMinutesLeft != null && estimates.bookMinutesLeft >= 1
            ? estimates.bookMinutesLeft
            : undefined
        );
      }
    },
    [bookId, totalChapters]
  );

  const handleReady = useCallback(
    (total: number) => {
      setReady(true);

      // Extract TOC entries from the epub book via rendition
      const rendition = renditionRef.current;
      if (rendition?.book) {
        rendition.book.loaded.navigation.then(
          (nav: { toc: Array<{ href: string; label: string }> }) => {
            if (nav?.toc && nav.toc.length > 0) {
              const entries = nav.toc.map((entry) => ({
                label: entry.label?.trim() || '',
                href: entry.href,
              }));
              setTocEntries(entries);
              // Use TOC count as chapter count — more accurate than spine items
              setTotalChapters(entries.length);
            } else {
              // Fallback to spine count if no TOC
              setTotalChapters(total);
            }
          }
        );
      } else {
        setTotalChapters(total);
      }
    },
    []
  );

  const handleSettingsChange = useCallback(
    async (newSettings: ReaderSettings) => {
      setSettings(newSettings);
      await updateReaderSettings(newSettings);
    },
    []
  );

  const handleTocNavigate = useCallback((href: string) => {
    const rendition = renditionRef.current;
    if (rendition) {
      // epubjs needs the href passed through the book's canonical URL resolver
      // to handle relative paths within the EPUB correctly
      const book = rendition.book;
      if (book?.canonical) {
        const resolved = book.canonical(href);
        rendition.display(resolved);
      } else {
        rendition.display(href);
      }
    }
  }, []);

  const handleBookmarkNavigate = useCallback((cfi: string) => {
    const rendition = renditionRef.current;
    if (rendition) {
      rendition.display(cfi);
    }
  }, []);

  const handleToggleBookmark = useCallback(async () => {
    if (!currentCfi) return;
    const nowBookmarked = await toggleBookmark(bookId, currentCfi, currentChapter);
    setIsBookmarked(nowBookmarked);
  }, [bookId, currentCfi, currentChapter]);

  // Show highlight menu for ALL text selections (single-word and multi-word)
  const handleTextSelected = useCallback(
    (cfi: string, text: string, rect: DOMRect) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Always show highlight/AI menu for any selection
      highlight.handleTextSelected(cfi, text, rect);

      // Also prepare dictionary data for single words (menu will have "Define" option)
      const isSingleWord = trimmed.split(/\s+/).length === 1;
      if (isSingleWord) {
        setDictionaryWord(trimmed);
        setDictionaryPosition({ x: rect.left + rect.width / 2, y: rect.top });
      }
    },
    [highlight]
  );

  const handleHighlightColor = useCallback(
    async (color: HighlightColor) => {
      if (!highlight.selectedCfi || !highlight.selectedText) return;
      await createHighlight(
        bookId,
        highlight.selectedCfi,
        highlight.selectedText,
        color,
        currentChapter
      );
      highlight.dismissHighlightMenu();
      // Refresh highlights list
      const updated = await getHighlightsForBook(bookId);
      setHighlights(updated);
    },
    [bookId, currentChapter, highlight]
  );

  const handleHighlightAction = useCallback(
    (type: Parameters<typeof highlight.handleHighlightAction>[0]) => {
      if (type === 'define') {
        // Show dictionary popup for the selected word
        const word = highlight.selectedText?.trim();
        if (word) {
          setDictionaryWord(word);
          setDictionaryPosition(highlight.highlightMenuPosition);
          setDictionaryVisible(true);
          highlight.dismissHighlightMenu();
        }
        return;
      }
      highlight.handleHighlightAction(type);
    },
    [highlight]
  );

  const handleHighlightNavigate = useCallback((cfiRange: string) => {
    const rendition = renditionRef.current;
    if (rendition) {
      rendition.display(cfiRange);
    }
  }, []);

  const handleSearchNavigate = useCallback((cfi: string) => {
    const rendition = renditionRef.current;
    if (rendition) {
      rendition.display(cfi);
    }
  }, []);

  const handleTTSToggle = useCallback(() => {
    if (ttsActive) {
      ttsEngineRef.current?.stop();
      ttsCleanupRef.current?.();
      ttsCleanupRef.current = null;
      setTtsActive(false);
      return;
    }

    // Create engine if needed
    if (!ttsEngineRef.current) {
      ttsEngineRef.current = createTTSEngine();
    }
    const engine = ttsEngineRef.current;
    if (!engine.isSupported) return;

    // Get iframe document for highlighting
    const iframe = document.querySelector('main iframe') as HTMLIFrameElement | null;
    const iframeDoc = iframe?.contentDocument;

    // Build text-node map for word highlighting
    function buildTextMap(body: HTMLElement) {
      const map: { node: Text; start: number; end: number }[] = [];
      let offset = 0;
      const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const len = node.textContent?.length || 0;
        map.push({ node, start: offset, end: offset + len });
        offset += len;
      }
      return map;
    }

    let textMap: { node: Text; start: number; end: number }[] = [];
    if (iframeDoc?.body) {
      textMap = buildTextMap(iframeDoc.body);

      // Inject highlight overlay into iframe
      let overlay = iframeDoc.getElementById('tts-hl-overlay');
      if (!overlay) {
        overlay = iframeDoc.createElement('div');
        overlay.id = 'tts-hl-overlay';
        overlay.style.cssText = 'position:absolute;pointer-events:none;background:rgba(96,165,250,0.35);border-radius:3px;transition:left 0.08s,top 0.08s,width 0.08s;z-index:9999;display:none;';
        iframeDoc.body.appendChild(overlay);
      }
    }

    function highlightWordAt(charIndex: number, charLen: number) {
      if (!iframeDoc?.body) return;
      const overlay = iframeDoc.getElementById('tts-hl-overlay');
      if (!overlay) return;

      // Find the text node containing this offset
      for (const entry of textMap) {
        if (charIndex >= entry.start && charIndex < entry.end) {
          const localOffset = charIndex - entry.start;
          const endOffset = Math.min(localOffset + charLen, entry.node.textContent?.length || 0);
          try {
            const range = iframeDoc.createRange();
            range.setStart(entry.node, localOffset);
            range.setEnd(entry.node, endOffset);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const scrollX = iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft || 0;
              const scrollY = iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop || 0;
              overlay.style.left = (rect.left + scrollX) + 'px';
              overlay.style.top = (rect.top + scrollY) + 'px';
              overlay.style.width = rect.width + 'px';
              overlay.style.height = rect.height + 'px';
              overlay.style.display = 'block';
              // Auto-scroll: keep highlighted word visible
              const viewH = iframeDoc.documentElement.clientHeight;
              if (rect.top < 40 || rect.bottom > viewH - 40) {
                entry.node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          } catch {
            // Range creation can fail
          }
          return;
        }
      }
    }

    function clearHighlight() {
      if (!iframeDoc) return;
      const overlay = iframeDoc.getElementById('tts-hl-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    // Store cleanup function
    ttsCleanupRef.current = clearHighlight;

    // Word boundary highlighting
    engine.onWordBoundary = (charIndex, charLen) => {
      highlightWordAt(charIndex, charLen);
    };

    // Auto-advance: when TTS finishes the page, go to next page
    engine.onEnd = () => {
      clearHighlight();
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.next().then(() => {
        // After page turn, wait for content to load, then rebuild map and read new page
        setTimeout(() => {
          const newIframeDoc = (document.querySelector('main iframe') as HTMLIFrameElement)?.contentDocument;
          if (newIframeDoc?.body) {
            textMap = buildTextMap(newIframeDoc.body);
            // Re-inject overlay
            let newOverlay = newIframeDoc.getElementById('tts-hl-overlay');
            if (!newOverlay) {
              newOverlay = newIframeDoc.createElement('div');
              newOverlay.id = 'tts-hl-overlay';
              newOverlay.style.cssText = 'position:absolute;pointer-events:none;background:rgba(96,165,250,0.35);border-radius:3px;transition:left 0.08s,top 0.08s,width 0.08s;z-index:9999;display:none;';
              newIframeDoc.body.appendChild(newOverlay);
            }
          }
          const text = getVisibleTextRef.current?.();
          if (text) engine.speak(text);
        }, 600);
      });
    };

    // Start speaking current page
    const text = getVisibleTextRef.current?.();
    if (text) {
      engine.speak(text);
      setTtsActive(true);
    }
  }, [ttsActive]);

  const handleTTSStop = useCallback(() => {
    ttsCleanupRef.current?.();
    ttsCleanupRef.current = null;
    setTtsActive(false);
  }, []);

  const chromeToggle = chrome.toggle;
  const handleCenterTap = useCallback(() => {
    if (!settingsOpen && !tocOpen && !bookmarksOpen && !searchOpen && !highlight.threadPanelOpen && !highlight.highlightMenuVisible) {
      chromeToggle();
    }
  }, [settingsOpen, tocOpen, bookmarksOpen, searchOpen, highlight.threadPanelOpen, highlight.highlightMenuVisible, chromeToggle]);


  // ── Menu action handler ──────────────────────────────────────────────────

  const handleMenuAction = useCallback((action: ReaderMenuAction) => {
    switch (action) {
      case 'toc':
        setTocOpen(true);
        break;
      case 'bookmarks':
        setBookmarksOpen(true);
        break;
      case 'highlights':
        setHighlightsPanelOpen(true);
        break;
      case 'search':
        setSearchOpen(true);
        break;
      case 'tts':
        handleTTSToggle();
        break;
      case 'settings':
        setSettingsOpen(true);
        break;
    }
  }, [handleTTSToggle]);

  // ── Guard: if page data isn't ready, show a loader ────────────────────────

  if (!pageReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <BookOpen className="size-10 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Preparing your book...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Could not find this book. It may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <ReaderHeader
        book={book}
        theme={settings.theme}
        chromeVisible={chrome.visible}
        isBookmarked={isBookmarked}
        ttsActive={ttsActive}
        ttsSupported={ttsSupported}
        onBack={() => router.push('/')}
        onMenuAction={handleMenuAction}
        onBookmarkToggle={handleToggleBookmark}
      />

      {/* ── EPUB Reader ───────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 relative" style={{ paddingBottom: '28px' }}>
        <EpubReader
          bookId={bookId}
          initialCfi={initialCfi}
          settings={settings}
          highlights={highlights}
          ttsActive={ttsActive}
          onLocationChanged={handleLocationChanged}
          onTextSelected={handleTextSelected}
          onReady={handleReady}
          onCenterTap={handleCenterTap}
          renditionRef={renditionRef}
          onGetVisibleText={getVisibleTextRef}
        />

        {/* Touch overlay — captures taps/swipes reliably on top of epub iframe */}
        {ready && settings.flowMode !== 'scrolled' && (
          <TouchOverlay
            onTapLeft={() => renditionRef.current?.prev()}
            onTapRight={() => renditionRef.current?.next()}
            onTapCenter={handleCenterTap}
          />
        )}
      </main>

      {/* ── Progress Bar — always visible at bottom ──────────────────────── */}
      {ready && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20',
            'transition-all duration-300',
          )}
        >
          <ProgressBar
            percent={percent}
            chapterName={currentChapterName}
            currentChapter={currentChapter}
            totalChapters={totalChapters || 1}
            chapterMinutesLeft={chapterMinutesLeft}
            bookMinutesLeft={bookMinutesLeft}
            theme={settings.theme}
            currentPage={currentPage}
            totalPages={totalPages}
            chromeVisible={chrome.visible}
          />
        </div>
      )}

      {/* ── Panels/Sheets ─────────────────────────────────────────────────── */}
      <ReaderControls
        settings={settings}
        onSettingsChange={handleSettingsChange}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <TableOfContents
        chapters={tocEntries}
        currentChapter={currentChapter}
        onNavigate={handleTocNavigate}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        theme={settings.theme}
      />

      <Bookmarks
        bookId={bookId}
        currentCfi={currentCfi}
        currentChapterIndex={currentChapter}
        onNavigate={handleBookmarkNavigate}
        open={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />

      <HighlightsPanel
        bookId={bookId}
        onNavigate={handleHighlightNavigate}
        open={highlightsPanelOpen}
        onClose={() => setHighlightsPanelOpen(false)}
      />

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleSearchNavigate}
        theme={settings.theme}
        rendition={renditionRef.current}
      />

      {/* ── AI Components ──────────────────────────────────────────────── */}

      <DictionaryPopup
        word={dictionaryWord}
        position={dictionaryPosition}
        visible={dictionaryVisible}
        onClose={() => setDictionaryVisible(false)}
      />

      <HighlightMenu
        position={highlight.highlightMenuPosition}
        selectedText={highlight.selectedText}
        selectedCfi={highlight.selectedCfi}
        onAction={handleHighlightAction}
        onHighlight={handleHighlightColor}
        onClose={highlight.dismissHighlightMenu}
        visible={highlight.highlightMenuVisible}
      />

      {highlight.threadPanelOpen && (
        <ThreadPanel
          key={highlight.threadSessionKey}
          bookId={bookId}
          currentChapterIndex={currentChapter}
          anchorCfi={highlight.activeAnchorCfi}
          anchorText={highlight.activeAnchorText}
          questionType={highlight.activeQuestionType}
          threadId={highlight.activeThreadId}
          open={highlight.threadPanelOpen}
          onClose={highlight.handleCloseThreadPanel}
        />
      )}

      <MarginMarkers
        threads={highlight.bookThreads}
        onOpenThread={highlight.handleOpenThread}
        visible={chrome.visible && !highlight.threadPanelOpen}
      />

      {chrome.visible && !highlight.threadPanelOpen && (
        <GeneralChat
          bookId={bookId}
          currentChapterIndex={currentChapter}
          onOpen={highlight.handleOpenGeneralChat}
        />
      )}

      {/* TTS Controls */}
      {ttsActive && ttsEngineRef.current && (
        <TTSControls
          engine={ttsEngineRef.current}
          onStop={handleTTSStop}
          theme={settings.theme}
        />
      )}
    </div>
  );
}
