'use client';

import { useEffect } from 'react';
import { BookOpen, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReaderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging (could send to a reporting service)
    console.error('[ReaderError]', error);
  }, [error]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 px-8 text-center max-w-sm">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          We had trouble loading this book. This could be a temporary issue — try
          again or head back to the library.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            <ArrowLeft className="size-4 mr-2" />
            Library
          </Button>
          <Button onClick={reset}>
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
