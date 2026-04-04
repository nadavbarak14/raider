'use client';

import { useEffect } from 'react';

/**
 * Requests persistent storage from the browser so IndexedDB data
 * (books, progress, threads) is not evicted under storage pressure.
 */
export function PersistStorage() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {
        // Silently ignore — not all browsers support this
      });
    }
  }, []);

  return null;
}
