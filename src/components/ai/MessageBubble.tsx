'use client';

import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: { role: 'user' | 'assistant'; content: string };
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {/* Message content */}
        {message.content ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : isStreaming ? (
          <TypingIndicator />
        ) : null}

        {/* Streaming indicator appended to content */}
        {isStreaming && message.content && (
          <span className="inline-flex ml-1 align-bottom">
            <TypingDots />
          </span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      <TypingDots />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-current opacity-50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '600ms' }}
        />
      ))}
    </span>
  );
}
