'use client';

import { useEffect, useState, useCallback, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  BookmarkIcon,
  List,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EpubReader } from '@/components/reader/EpubReader';
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ProgressBar } from '@/components/reader/ProgressBar';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { Bookmarks } from '@/components/reader/Bookmarks';
import { HighlightMenu } from '@/components/ai/HighlightMenu';
import { ThreadPanel } from '@/components/ai/ThreadPanel';
import { MarginMarkers } from '@/components/ai/MarginMarkers';
import { GeneralChat } from '@/components/ai/GeneralChat';
import type { Book, ReadingProgress } from '@/types/book';
import type { ReaderSettings } from '@/types/settings';
import type { QuestionType } from '@/types/thread';
import type { Thread } from '@/types/thread';
import { DEFAULT_READER_SETTINGS } from '@/types/settings';
import {
  getBook as getStoredBook,
  saveBook,
} from '@/lib/storage/books';
import { getBook as fetchBookMeta } from '@/lib/gutenberg/client';
import { getProgress, saveProgress } from '@/lib/storage/progress';
import { getSettings, updateReaderSettings } from '@/lib/storage/settings';
import { getThreadsForBook } from '@/lib/storage/threads';
import { isLocationBookmarked, toggleBookmark } from '@/lib/reader/bookmarks';

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
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // AI interaction state
  const [highlightMenuVisible, setHighlightMenuVisible] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedCfi, setSelectedCfi] = useState('');
  const [threadPanelOpen, setThreadPanelOpen] = useState(false);
  const [threadSessionKey, setThreadSessionKey] = useState(0);
  const [activeQuestionType, setActiveQuestionType] = useState<QuestionType>('ask_ai');
  const [activeAnchorText, setActiveAnchorText] = useState<string | undefined>(undefined);
  const [activeAnchorCfi, setActiveAnchorCfi] = useState<string | undefined>(undefined);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const [bookThreads, setBookThreads] = useState<Thread[]>([]);

  // TOC entries
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);

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

  // Hide chrome timer
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Load existing AI threads for this book
      const threads = await getThreadsForBook(bookId);
      if (!cancelled) {
        setBookThreads(threads);
      }

      if (!cancelled) {
        setPageReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // ── Auto-hide chrome after a delay ────────────────────────────────────────

  const scheduleChromeHide = useCallback(() => {
    if (chromeTimerRef.current) {
      clearTimeout(chromeTimerRef.current);
    }
    chromeTimerRef.current = setTimeout(() => {
      setChromeVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    if (chromeVisible && ready && !settingsOpen && !tocOpen && !bookmarksOpen && !threadPanelOpen) {
      scheduleChromeHide();
    }
    return () => {
      if (chromeTimerRef.current) {
        clearTimeout(chromeTimerRef.current);
      }
    };
  }, [chromeVisible, ready, settingsOpen, tocOpen, bookmarksOpen, threadPanelOpen, scheduleChromeHide]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleLocationChanged = useCallback(
    async (cfi: string, chapterIndex: number, pct: number) => {
      setCurrentCfi(cfi);
      setCurrentChapter(chapterIndex);
      setPercent(pct);

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
    },
    [bookId, totalChapters]
  );

  const handleReady = useCallback(
    (total: number) => {
      setTotalChapters(total);
      setReady(true);

      // Extract TOC entries from the epub book via rendition
      // We do this after the book is ready
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

  const handleTextSelected = useCallback(
    (cfi: string, text: string, rect: DOMRect) => {
      if (!text.trim()) return;
      setSelectedText(text.trim());
      setSelectedCfi(cfi);
      // Position the menu at the top-center of the selection
      setHighlightMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      setHighlightMenuVisible(true);
    },
    []
  );

  const handleHighlightAction = useCallback(
    (type: QuestionType) => {
      setHighlightMenuVisible(false);
      setActiveQuestionType(type);
      setActiveAnchorText(selectedText);
      setActiveAnchorCfi(selectedCfi);
      setActiveThreadId(undefined);
      setThreadSessionKey((k) => k + 1);
      setThreadPanelOpen(true);
    },
    [selectedText, selectedCfi]
  );

  const handleCloseThreadPanel = useCallback(() => {
    setThreadPanelOpen(false);
    // Refresh threads list when closing panel (new thread may have been created)
    getThreadsForBook(bookId).then(setBookThreads);
  }, [bookId]);

  const handleOpenGeneralChat = useCallback(() => {
    setActiveQuestionType('general');
    setActiveAnchorText(undefined);
    setActiveAnchorCfi(undefined);
    setActiveThreadId(undefined);
    setThreadSessionKey((k) => k + 1);
    setThreadPanelOpen(true);
  }, []);

  const handleOpenThread = useCallback((thread: Thread) => {
    setActiveQuestionType(thread.isGeneral ? 'general' : 'ask_ai');
    setActiveAnchorText(thread.anchorText ?? undefined);
    setActiveAnchorCfi(thread.anchorCfi ?? undefined);
    setActiveThreadId(thread.id);
    setThreadSessionKey((k) => k + 1);
    setThreadPanelOpen(true);
  }, []);

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

  const handleCenterTap = useCallback(() => {
    // Only toggle when no sheets or panels are open
    if (!settingsOpen && !tocOpen && !bookmarksOpen && !threadPanelOpen && !highlightMenuVisible) {
      setChromeVisible((prev) => !prev);
    }
  }, [settingsOpen, tocOpen, bookmarksOpen, threadPanelOpen, highlightMenuVisible]);

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

  // ── Theme-aware colors for the chrome ──────────────────────────────────────

  const chromeBg =
    settings.theme === 'dark'
      ? 'bg-[#1a1a1a]/95'
      : settings.theme === 'sepia'
        ? 'bg-[#F5E6C8]/95'
        : 'bg-white/95';

  const chromeText =
    settings.theme === 'dark'
      ? 'text-[#e0e0e0]'
      : settings.theme === 'sepia'
        ? 'text-[#5B4636]'
        : 'text-[#1a1a1a]';

  const chromeBorder =
    settings.theme === 'dark'
      ? 'border-white/10'
      : settings.theme === 'sepia'
        ? 'border-[#d4c4a8]'
        : 'border-black/5';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className={cn(
          'absolute top-0 left-0 right-0 z-20',
          'flex items-center gap-1 px-2 h-12',
          'backdrop-blur-md border-b transition-all duration-300',
          chromeBg,
          chromeText,
          chromeBorder,
          chromeVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        )}
      >
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          aria-label="Back to library"
          className={cn('shrink-0', chromeText)}
        >
          <ArrowLeft className="size-5" />
        </Button>

        {/* Title */}
        <div className="flex-1 min-w-0 px-1">
          <h1 className="text-sm font-medium truncate">{book.title}</h1>
          <p className="text-xs opacity-60 truncate">{book.author}</p>
        </div>

        {/* TOC */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTocOpen(true)}
          aria-label="Table of contents"
          className={cn('shrink-0', chromeText)}
        >
          <List className="size-5" />
        </Button>

        {/* Bookmark */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleBookmark}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          className={cn('shrink-0', chromeText)}
        >
          <BookmarkIcon
            className={cn('size-5', isBookmarked && 'fill-current')}
          />
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label="Reading settings"
          className={cn('shrink-0', chromeText)}
        >
          <Settings className="size-5" />
        </Button>
      </header>

      {/* ── Center tap zone (for toggling chrome) ─────────────────────────── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ top: '48px', bottom: '52px' }}
      >
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ left: '30%', right: '30%' }}
          onClick={handleCenterTap}
          aria-hidden="true"
        />
      </div>

      {/* ── EPUB Reader ───────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0">
        <EpubReader
          bookId={bookId}
          initialCfi={initialCfi}
          settings={settings}
          onLocationChanged={handleLocationChanged}
          onTextSelected={handleTextSelected}
          onReady={handleReady}
          renditionRef={renditionRef}
        />
      </main>

      {/* ── Progress Bar ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-20',
          'transition-all duration-300',
          chromeBg,
          chromeText,
          chromeVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <ProgressBar
          percent={percent}
          chapterName={currentChapterName}
          currentChapter={currentChapter}
          totalChapters={totalChapters || 1}
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

      {/* ── Bookmark list button (long-press accessible) ──────────────────── */}
      {/* This is a separate button to open the bookmarks list sheet */}
      {chromeVisible && (
        <button
          type="button"
          onClick={() => setBookmarksOpen(true)}
          className={cn(
            'fixed bottom-14 right-3 z-20',
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
      )}

      {/* ── AI Components ──────────────────────────────────────────────── */}

      {/* Highlight menu — appears on text selection */}
      <HighlightMenu
        position={highlightMenuPosition}
        selectedText={selectedText}
        selectedCfi={selectedCfi}
        onAction={handleHighlightAction}
        onClose={() => setHighlightMenuVisible(false)}
        visible={highlightMenuVisible}
      />

      {/* Thread panel — conversation view (key forces remount on each session) */}
      {threadPanelOpen && (
        <ThreadPanel
          key={threadSessionKey}
          bookId={bookId}
          currentChapterIndex={currentChapter}
          anchorCfi={activeAnchorCfi}
          anchorText={activeAnchorText}
          questionType={activeQuestionType}
          threadId={activeThreadId}
          open={threadPanelOpen}
          onClose={handleCloseThreadPanel}
        />
      )}

      {/* Margin markers — thread count badge */}
      <MarginMarkers
        threads={bookThreads}
        onOpenThread={handleOpenThread}
        visible={chromeVisible && !threadPanelOpen}
      />

      {/* General chat FAB */}
      {chromeVisible && !threadPanelOpen && (
        <GeneralChat
          bookId={bookId}
          currentChapterIndex={currentChapter}
          onOpen={handleOpenGeneralChat}
        />
      )}
    </div>
  );
}
