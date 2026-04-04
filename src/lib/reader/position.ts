/**
 * CFI position tracking utilities.
 *
 * epubjs exposes `EpubCFI` via `window.ePub.CFI` or can be imported directly.
 * We wrap the comparator so that:
 *  - callers never need to import epubjs directly
 *  - we can fall back to lexicographic comparison when epubjs is unavailable
 *    (e.g. in server-side/test contexts)
 */

// ── CFI comparison ───────────────────────────────────────────────────────────

/**
 * Compare two EPUB CFI strings.
 *
 * Returns:
 *  -1  if a comes before b
 *   0  if they are equal
 *   1  if a comes after b
 */
export function compareCfi(a: string, b: string): -1 | 0 | 1 {
  if (a === b) return 0;

  try {
    // epubjs exports EpubCFI as a named export or as a class on the default export
    // We do a dynamic require so this module is safe to import in SSR/Node contexts
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ePub = require('epubjs') as { default?: { CFI: new () => EpubCfiInstance } } & {
      CFI?: new () => EpubCfiInstance;
    };

    const CFIClass = ePub.default?.CFI ?? ePub.CFI;
    if (CFIClass) {
      const cfiInstance = new CFIClass();
      const result: number = cfiInstance.compare(a, b);
      if (result < 0) return -1;
      if (result > 0) return 1;
      return 0;
    }
  } catch {
    // Fall through to lexicographic fallback
  }

  // Fallback: lexicographic comparison — imperfect but avoids crashes
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

interface EpubCfiInstance {
  compare(a: string, b: string): number;
}

// ── Chapter from CFI ─────────────────────────────────────────────────────────

/**
 * Determine which spine chapter index a CFI belongs to.
 *
 * epubjs CFIs encode the spine item index as the first component, e.g.:
 *   epubcfi(/6/4[ch001]!/4/2/1:0)
 *              ↑ spine position = (4 - 2) / 2 = index 1
 *
 * `spine` should be an array whose length equals the total chapter count.
 * If the CFI cannot be parsed we return 0.
 *
 * @param cfi   A valid EPUB CFI string.
 * @param spine An ordered array representing the book spine (one entry per chapter).
 */
export function getChapterFromCfi(cfi: string, spine: unknown[]): number {
  if (!cfi || spine.length === 0) return 0;

  try {
    // CFI format: epubcfi(/6/N[id]!/...)
    // The first path step after /6/ is the spine position (N = 2-based even index)
    const match = /^epubcfi\(\/6\/(\d+)/i.exec(cfi);
    if (match) {
      // The spine item is at position (N / 2) - 1 in 0-based indexing
      const n = parseInt(match[1], 10);
      const index = Math.max(0, n / 2 - 1);
      return Math.min(Math.floor(index), spine.length - 1);
    }
  } catch {
    // Fall through
  }

  return 0;
}

// ── Percent complete ─────────────────────────────────────────────────────────

/**
 * Calculate reading progress as a percentage (0–100).
 *
 * epubjs `rendition.currentLocation()` returns a location object with
 * `start.percentage` and `end.percentage` properties (values 0–1).
 *
 * @param currentLocation  The value returned by `rendition.currentLocation()`.
 * @param _book            The epubjs Book instance (unused; reserved for future use).
 */
export function calculatePercent(
  currentLocation: EpubLocation | null | undefined,
  _book?: unknown
): number {
  if (!currentLocation) return 0;

  try {
    // Try the percentage from the start of the visible range
    const startPct = currentLocation.start?.percentage;
    if (typeof startPct === 'number' && isFinite(startPct)) {
      return Math.min(100, Math.max(0, Math.round(startPct * 100)));
    }

    // Some builds expose it directly on the location object
    const directPct = (currentLocation as unknown as { percentage?: number }).percentage;
    if (typeof directPct === 'number' && isFinite(directPct)) {
      return Math.min(100, Math.max(0, Math.round(directPct * 100)));
    }
  } catch {
    // Fall through
  }

  return 0;
}

interface EpubLocation {
  start?: {
    cfi?: string;
    percentage?: number;
  };
  end?: {
    cfi?: string;
    percentage?: number;
  };
}
