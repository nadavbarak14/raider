'use client';

import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, BookmarkIcon, Highlighter, Volume2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EpubReader } from '@/components/reader/EpubReader';
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ProgressBar } from '@/components/reader/ProgressBar';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { Bookmarks } from '@/components/reader/Bookmarks';
import { ReaderHeader, getChromeColors } from '@/components/reader/ReaderHeader';
import { HighlightMenu } from '@/components/ai/HighlightMenu';
import { HighlightsPanel } from '@/components/reader/HighlightsPanel';
import { DictionaryPopup } from '@/components/reader/DictionaryPopup';
import { TTSControls } from '@/components/reader/TTSControls';
import { ThreadPanel } from '@/components/ai/ThreadPanel';
import { MarginMarkers } from '@/components/ai/MarginMarkers';
import { GeneralChat } from '@/components/ai/GeneralChat';
import { useChromeVisibility } from '@/hooks/useChromeVisibility';
import { useHighlightInteraction } from '@/hooks/useHighlightInteraction';
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

  // UI toggles
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [highlightsPanelOpen, setHighlightsPanelOpen] = useState(false);
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

  // Session tracking
  const sessionIdRef = useRef<string | null>(null);
  const pagesReadRef = useRef(0);

  // TTS
  const ttsEngineRef = useRef<TTSEngine | null>(null);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const getVisibleTextRef = useRef<(() => string) | null>(null);

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
    panelsOpen: [settingsOpen, tocOpen, bookmarksOpen, highlightsPanelOpen, highlight.threadPanelOpen],
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
      }

      // Start reading speed tracker and session
      speedTrackerRef.current.startSession();
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

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleLocationChanged = useCallback(
    async (cfi: string, chapterIndex: number, pct: number) => {
      setCurrentCfi(cfi);
      setCurrentChapter(chapterIndex);
      setPercent(pct);

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
      const wpm = speedTrackerRef.current.getWPM();
      const estimates = await getReadingTimeEstimates(bookId, chapterIndex, pct, wpm);
      setChapterMinutesLeft(estimates.chapterMinutesLeft);
      setBookMinutesLeft(estimates.bookMinutesLeft);
    },
    [bookId, totalChapters]
  );

  const handleReady = useCallback(
    (total: number) => {
      setTotalChapters(total);
      setReady(true);

      // Extract TOC entries from the epub book via rendition
      const rendition = renditionRef.current;
      if (rendition?.book) {
        rendition.book.loaded.navigation.then(
          (nav: { toc: Array<{ href: string; label: string }> }) => {
            if (nav?.toc) {
              setTocEntries(
                nav.toc.map((entry) => ({
                  label: entry.label?.trim() || '',
                  href: entry.href,
                }))
              );
            }
          }
        );
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
      rendition.display(href);
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

  // Route text selection: single word -> dictionary, multi-word -> highlight menu
  const handleTextSelected = useCallback(
    (cfi: string, text: string, rect: DOMRect) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const isSingleWord = trimmed.split(/\s+/).length === 1;
      if (isSingleWord) {
        setDictionaryWord(trimmed);
        setDictionaryPosition({ x: rect.left + rect.width / 2, y: rect.top });
        setDictionaryVisible(true);
      } else {
        highlight.handleTextSelected(cfi, text, rect);
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

  const handleHighlightNavigate = useCallback((cfiRange: string) => {
    const rendition = renditionRef.current;
    if (rendition) {
      rendition.display(cfiRange);
    }
  }, []);

  const handleTTSToggle = useCallback(() => {
    if (ttsActive) {
      ttsEngineRef.current?.stop();
      setTtsActive(false);
      return;
    }

    // Create engine if needed
    if (!ttsEngineRef.current) {
      ttsEngineRef.current = createTTSEngine();
    }
    const engine = ttsEngineRef.current;
    if (!engine.isSupported) return;

    // Set up auto-advance: when TTS finishes the page, go to next page
    engine.onEnd = () => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.next().then(() => {
        // After page turn, wait a beat for content to load, then read new page
        setTimeout(() => {
          const text = getVisibleTextRef.current?.();
          if (text) engine.speak(text);
        }, 500);
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
    setTtsActive(false);
  }, []);

  const handleCenterTap = useCallback(() => {
    if (!settingsOpen && !tocOpen && !bookmarksOpen && !highlight.threadPanelOpen && !highlight.highlightMenuVisible) {
      chrome.toggle();
    }
  }, [settingsOpen, tocOpen, bookmarksOpen, highlight.threadPanelOpen, highlight.highlightMenuVisible, chrome]);

  const handleNextPage = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const handlePrevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

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
            <ArrowLeft className="size-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  const { bg: chromeBg, text: chromeText, border: chromeBorder } = getChromeColors(settings.theme);

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
        onTocOpen={() => setTocOpen(true)}
        onBookmarkToggle={handleToggleBookmark}
        onSettingsOpen={() => setSettingsOpen(true)}
        onTTSToggle={handleTTSToggle}
      />

      {/* ── EPUB Reader ───────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 relative">
        <EpubReader
          bookId={bookId}
          initialCfi={initialCfi}
          settings={settings}
          highlights={highlights}
          onLocationChanged={handleLocationChanged}
          onTextSelected={handleTextSelected}
          onReady={handleReady}
          onCenterTap={handleCenterTap}
          renditionRef={renditionRef}
          onGetVisibleText={getVisibleTextRef}
        />

        {/* Tap zones are handled inside the epub iframe via EpubReader's
            hooks.content.register handlers. Visible chevron buttons below
            provide a fallback for page navigation. */}
      </main>

      {/* ── Visible prev/next buttons ────────────────────────────────────── */}
      {ready && settings.flowMode !== 'scrolled' && (
        <>
          <button
            type="button"
            onClick={handlePrevPage}
            className={cn(
              'fixed left-1 top-1/2 -translate-y-1/2 z-20',
              'w-10 h-20 rounded-full flex items-center justify-center',
              'transition-opacity duration-300 touch-manipulation',
              'opacity-20 hover:opacity-60 active:opacity-100',
              settings.theme === 'dark' ? 'text-white/80' : 'text-black/40',
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleNextPage}
            className={cn(
              'fixed right-1 top-1/2 -translate-y-1/2 z-20',
              'w-10 h-20 rounded-full flex items-center justify-center',
              'transition-opacity duration-300 touch-manipulation',
              'opacity-20 hover:opacity-60 active:opacity-100',
              settings.theme === 'dark' ? 'text-white/80' : 'text-black/40',
            )}
            aria-label="Next page"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* ── Toolbar toggle (always visible, outside iframe) ──────────────── */}
      {ready && !chrome.visible && (
        <button
          type="button"
          onClick={() => chrome.show()}
          className={cn(
            'fixed top-3 right-3 z-20',
            'w-8 h-8 rounded-full flex items-center justify-center',
            'backdrop-blur-md border shadow-sm transition-all duration-300',
            'touch-manipulation opacity-40 hover:opacity-80 active:opacity-100',
            settings.theme === 'dark'
              ? 'bg-white/10 text-white/70 border-white/10'
              : settings.theme === 'sepia'
                ? 'bg-[#F5E6C8]/80 text-[#5B4636]/70 border-[#d4c4a8]'
                : 'bg-white/80 text-black/50 border-black/5',
          )}
          aria-label="Show toolbar"
        >
          <Settings className="size-4" />
        </button>
      )}

      {/* ── Progress Bar ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-20',
          'transition-all duration-300',
          chromeBg,
          chromeText,
          chrome.visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <ProgressBar
          percent={percent}
          chapterName={currentChapterName}
          currentChapter={currentChapter}
          totalChapters={totalChapters || 1}
          chapterMinutesLeft={chapterMinutesLeft}
          bookMinutesLeft={bookMinutesLeft}
        />
      </div>

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

      {/* ── Floating action buttons ──────────────────────────────────────── */}
      {chrome.visible && (
        <div className="fixed bottom-14 right-3 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setHighlightsPanelOpen(true)}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'backdrop-blur-md border shadow-sm transition-all duration-300',
              'touch-manipulation',
              chromeBg,
              chromeText,
              chromeBorder
            )}
            aria-label="View all highlights"
          >
            <Highlighter className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setBookmarksOpen(true)}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'backdrop-blur-md border shadow-sm transition-all duration-300',
              'touch-manipulation',
              chromeBg,
              chromeText,
              chromeBorder
            )}
            aria-label="View all bookmarks"
          >
            <BookmarkIcon className="size-4" />
          </button>
        </div>
      )}

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
        onAction={highlight.handleHighlightAction}
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
        />
      )}
    </div>
  );
}
