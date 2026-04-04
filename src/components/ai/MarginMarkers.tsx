'use client';

import { useState } from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Thread } from '@/types/thread';

interface MarginMarkersProps {
  threads: Thread[];
  onOpenThread: (thread: Thread) => void;
  visible: boolean;
}

/**
 * V1 simplified approach: a badge in the header area showing thread count,
 * which opens a thread list panel when tapped.
 *
 * A future V2 could place markers in the epub margin at each anchor CFI.
 */
export function MarginMarkers({
  threads,
  onOpenThread,
  visible,
}: MarginMarkersProps) {
  const [listOpen, setListOpen] = useState(false);

  if (!visible || threads.length === 0) return null;

  return (
    <>
      {/* ── Badge button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className={cn(
          'fixed top-14 right-3 z-30',
          'flex items-center gap-1.5 px-2.5 py-1.5',
          'rounded-full bg-primary text-primary-foreground',
          'text-xs font-medium shadow-md',
          'transition-all duration-300 touch-manipulation',
          'hover:scale-105 active:scale-95',
          'min-h-[36px]'
        )}
        aria-label={`${threads.length} AI conversation${threads.length === 1 ? '' : 's'}`}
      >
        <MessageSquare className="size-3.5" />
        <span>{threads.length}</span>
      </button>

      {/* ── Thread list panel ─────────────────────────────────────────── */}
      {listOpen && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'flex flex-col',
            'bg-background border-t border-border',
            'rounded-t-2xl shadow-2xl',
            'animate-in slide-in-from-bottom duration-300',
            'max-h-[50vh]'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">
              AI Conversations ({threads.length})
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setListOpen(false)}
              className="shrink-0 size-8"
              aria-label="Close thread list"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Thread list */}
          <ScrollArea className="flex-1 min-h-0">
            <ul className="py-1">
              {threads.map((thread) => {
                const lastMsg = thread.messages[thread.messages.length - 1];
                const preview = lastMsg?.content?.slice(0, 80) || 'No messages yet';
                const timeAgo = formatTimeAgo(thread.updatedAt);

                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setListOpen(false);
                        onOpenThread(thread);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3',
                        'flex flex-col gap-1',
                        'hover:bg-muted/50 active:bg-muted',
                        'transition-colors touch-manipulation',
                        'min-h-[56px]'
                      )}
                    >
                      {/* Title / anchor */}
                      <span className="text-sm font-medium text-foreground truncate">
                        {thread.isGeneral
                          ? 'General Question'
                          : thread.anchorText
                            ? `"${thread.anchorText.slice(0, 40)}${thread.anchorText.length > 40 ? '...' : ''}"`
                            : 'AI Conversation'}
                      </span>

                      {/* Preview */}
                      <span className="text-xs text-muted-foreground truncate">
                        {preview}
                      </span>

                      {/* Meta */}
                      <span className="text-[10px] text-muted-foreground/60">
                        {thread.messages.length} message{thread.messages.length === 1 ? '' : 's'} · {timeAgo}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      )}
    </>
  );
}

// ── Time formatting ────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
