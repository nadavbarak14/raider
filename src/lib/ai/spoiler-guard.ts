import { searchBookText, searchAllChapters } from './search-tool';
import type { Chapter } from '@/types/book';

export interface SpoilerCheckResult {
  hasSpoiler: boolean;
  /** If the answer is found in chapters beyond the current one */
  spoilerChapterIndex?: number;
  message?: string;
}

/**
 * Check whether answering a query would require information from
 * chapters the reader hasn't reached yet.
 *
 * @param allChapters - All chapters for the book (including future ones)
 * @param query - The user's search query
 * @param currentChapterIndex - The reader's current position (spoiler boundary)
 */
export function checkForSpoilers(
  allChapters: Chapter[],
  query: string,
  currentChapterIndex: number
): SpoilerCheckResult {
  // Search within the reader's boundary (safe chapters)
  const safeResults = searchBookText(allChapters, query, currentChapterIndex);

  // Search all chapters (including future ones)
  const allResults = searchAllChapters(allChapters, query);

  // Filter for results that are beyond the current chapter
  const futureResults = allResults.filter(
    (r) => r.chapterIndex > currentChapterIndex
  );

  // Case 1: Results exist only beyond the boundary
  if (safeResults.length === 0 && futureResults.length > 0) {
    const earliestSpoiler = futureResults.reduce((min, r) =>
      r.chapterIndex < min.chapterIndex ? r : min
    );
    return {
      hasSpoiler: true,
      spoilerChapterIndex: earliestSpoiler.chapterIndex,
      message: `I found information related to your question, but it involves events you haven't read yet (beyond Chapter ${currentChapterIndex + 1}). Would you like me to answer anyway? This may contain spoilers.`,
    };
  }

  // Case 2: Results exist both within and beyond boundary — safe to answer
  // (the answer is available in chapters the reader has already read)
  if (safeResults.length > 0) {
    return { hasSpoiler: false };
  }

  // Case 3: No results anywhere — AI will say "I don't know"
  return { hasSpoiler: false };
}
