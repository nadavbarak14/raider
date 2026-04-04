'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Send, X, Sparkles } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { getChapters } from '@/lib/storage/books';
import { createThread, addMessage, getThread } from '@/lib/storage/threads';
import type { Chapter } from '@/types/book';
import type { QuestionType } from '@/types/thread';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the automatic first message for a given question type + selected text. */
function buildInitialMessage(questionType: QuestionType, anchorText?: string): string | null {
  const text = anchorText?.trim();
  switch (questionType) {
    case 'who_is_this':
      return text ? `Who is ${text}?` : 'Who is this character?';
    case 'explain':
      return text ? `Explain this passage: "${text}"` : 'Can you explain this?';
    case 'recap':
      return 'Give me a recap of the story up to this point.';
    case 'ask_ai':
      return null; // user types their own question
    case 'general':
      return null;
    default:
      return null;
  }
}

/** Extract plain text from a UIMessage's parts array. */
function getMessageText(msg: UIMessage): string {
  if (!msg.parts) return '';
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** Check if a UIMessage has a text part that is still streaming. */
function isMessageStreaming(msg: UIMessage): boolean {
  if (!msg.parts) return false;
  return msg.parts.some(
    (p) => p.type === 'text' && 'state' in p && p.state === 'streaming'
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ThreadPanelProps {
  bookId: string;
  currentChapterIndex: number;
  anchorCfi?: string;
  anchorText?: string;
  questionType: QuestionType;
  initialMessage?: string;
  threadId?: string;
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
// The parent must provide a unique `sessionKey` prop (or React `key`)
// each time the panel is opened to ensure fresh state.

export function ThreadPanel({
  bookId,
  currentChapterIndex,
  anchorCfi,
  anchorText,
  questionType,
  initialMessage,
  threadId: existingThreadId,
  onClose,
}: ThreadPanelProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(existingThreadId);
  const [historicalMessages, setHistoricalMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const hasSentInitialRef = useRef(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load chapters from IndexedDB ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    getChapters(bookId).then((ch) => {
      if (!cancelled) {
        setChapters(ch);
        setChaptersLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // ── Load existing thread messages ────────────────────────────────────────

  useEffect(() => {
    if (!existingThreadId) return;
    let cancelled = false;
    getThread(existingThreadId).then((thread) => {
      if (!cancelled && thread) {
        setHistoricalMessages(
          thread.messages.map((m) => ({ role: m.role, content: m.content }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [existingThreadId]);

  // ── Transport (recreated when dependencies change) ──────────────────────

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: async ({ messages: msgs }) => ({
          body: {
            messages: msgs.map((m) => ({
              role: m.role,
              content: getMessageText(m),
            })),
            chapters,
            currentChapterIndex,
            questionType,
            anchorText: anchorText ?? undefined,
          },
        }),
      }),
    [chapters, currentChapterIndex, questionType, anchorText]
  );

  // ── Thread ID ref for persistence callback ─────────────────────────────

  const threadIdRef = useRef(threadId);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  // ── Persistence handler ────────────────────────────────────────────────

  const handleFinish = useCallback(
    async (msg: { message: UIMessage; messages?: UIMessage[] }) => {
      const text = getMessageText(msg.message);
      if (!text) return;

      let tid = threadIdRef.current;
      if (!tid) {
        tid = await createThread({
          bookId,
          anchorCfi: anchorCfi ?? null,
          anchorText: anchorText ?? null,
          chapterIndexAtCreation: currentChapterIndex,
          messages: [],
          isGeneral: questionType === 'general',
        });
        setThreadId(tid);
        threadIdRef.current = tid;
      }

      const allMsgs = msg.messages ?? [];
      const lastUserMsg = [...allMsgs].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        const userText = getMessageText(lastUserMsg);
        if (userText) {
          await addMessage(tid, { role: 'user', content: userText, threadId: tid });
        }
      }

      await addMessage(tid, { role: 'assistant', content: text, threadId: tid });
    },
    [bookId, anchorCfi, anchorText, currentChapterIndex, questionType]
  );

  // ── useChat hook ─────────────────────────────────────────────────────────

  const {
    messages: chatMessages,
    sendMessage,
    status,
  } = useChat({
    id: threadId ?? undefined,
    transport,
    messages: existingThreadId
      ? historicalMessages.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
        }))
      : undefined,
    onFinish: handleFinish,
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // ── Auto-send initial message ────────────────────────────────────────────

  useEffect(() => {
    if (!chaptersLoaded || hasSentInitialRef.current) return;
    if (existingThreadId) return; // Don't auto-send for existing threads

    const autoMessage = initialMessage || buildInitialMessage(questionType, anchorText);
    if (autoMessage) {
      hasSentInitialRef.current = true;
      sendMessage({ text: autoMessage });
    } else {
      hasSentInitialRef.current = true;
      // For ask_ai and general: just focus the input
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chaptersLoaded, existingThreadId, questionType, anchorText, initialMessage, sendMessage]);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Handle user submission ───────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = inputValue.trim();
      if (!text || isStreaming) return;
      sendMessage({ text });
      setInputValue('');
    },
    [inputValue, isStreaming, sendMessage]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'flex flex-col',
        'bg-background border-t border-border',
        'rounded-t-2xl shadow-2xl',
        'animate-in slide-in-from-bottom duration-300',
        'max-h-[60vh]'
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Sparkles className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          {anchorText ? (
            <p className="text-xs text-muted-foreground truncate">
              &ldquo;{anchorText.length > 60 ? anchorText.slice(0, 60) + '...' : anchorText}&rdquo;
            </p>
          ) : (
            <p className="text-sm font-medium">General Question</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0 size-8"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-4">
          {chatMessages.map((msg) => {
            const text = getMessageText(msg);
            const streaming = isMessageStreaming(msg);
            return (
              <MessageBubble
                key={msg.id}
                message={{ role: msg.role as 'user' | 'assistant', content: text }}
                isStreaming={streaming}
              />
            );
          })}

          {/* Show typing indicator when submitted but no assistant message yet */}
          {status === 'submitted' &&
            !chatMessages.some((m) => m.role === 'assistant' && isMessageStreaming(m)) && (
              <MessageBubble
                message={{ role: 'assistant', content: '' }}
                isStreaming
              />
            )}

          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a follow-up..."
          disabled={isStreaming}
          className={cn(
            'flex-1 min-w-0 h-10 px-3 rounded-lg',
            'bg-muted text-foreground text-sm',
            'border border-border',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50'
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || isStreaming}
          className="shrink-0 size-10 rounded-lg"
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
