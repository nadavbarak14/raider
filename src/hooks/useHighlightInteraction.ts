import { useCallback, useState } from 'react';
import type { QuestionType, Thread } from '@/types/thread';
import { getThreadsForBook } from '@/lib/storage/threads';

interface SelectionState {
  text: string;
  cfi: string;
  position: { x: number; y: number };
}

export function useHighlightInteraction(bookId: string) {
  // Highlight menu state
  const [highlightMenuVisible, setHighlightMenuVisible] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedCfi, setSelectedCfi] = useState('');

  // Thread panel state
  const [threadPanelOpen, setThreadPanelOpen] = useState(false);
  const [threadSessionKey, setThreadSessionKey] = useState(0);
  const [activeQuestionType, setActiveQuestionType] = useState<QuestionType>('ask_ai');
  const [activeAnchorText, setActiveAnchorText] = useState<string | undefined>(undefined);
  const [activeAnchorCfi, setActiveAnchorCfi] = useState<string | undefined>(undefined);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const [bookThreads, setBookThreads] = useState<Thread[]>([]);

  const handleTextSelected = useCallback(
    (cfi: string, text: string, rect: DOMRect) => {
      if (!text.trim()) return;
      setSelectedText(text.trim());
      setSelectedCfi(cfi);
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

  const dismissHighlightMenu = useCallback(() => {
    setHighlightMenuVisible(false);
  }, []);

  const refreshThreads = useCallback(() => {
    return getThreadsForBook(bookId).then(setBookThreads);
  }, [bookId]);

  const selection: SelectionState | null = highlightMenuVisible
    ? { text: selectedText, cfi: selectedCfi, position: highlightMenuPosition }
    : null;

  return {
    // Highlight menu
    highlightMenuVisible,
    highlightMenuPosition,
    selectedText,
    selectedCfi,
    selection,
    handleTextSelected,
    dismissHighlightMenu,

    // Thread panel
    threadPanelOpen,
    threadSessionKey,
    activeQuestionType,
    activeAnchorText,
    activeAnchorCfi,
    activeThreadId,
    bookThreads,
    handleHighlightAction,
    handleCloseThreadPanel,
    handleOpenGeneralChat,
    handleOpenThread,
    refreshThreads,
  };
}
