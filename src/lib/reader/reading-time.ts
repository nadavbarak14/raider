import { getChapters } from '@/lib/storage/books';
import type { Chapter } from '@/types/book';

/**
 * Count words in a text string.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Get word count for a specific chapter.
 */
export async function getChapterWordCount(
  bookId: string,
  chapterIndex: number
): Promise<number | undefined> {
  const chapters = await getChapters(bookId);
  const chapter = chapters.find((c) => c.index === chapterIndex);
  if (!chapter?.content) return undefined;
  return countWords(chapter.content);
}

/**
 * Get total remaining words from current position to end of book.
 */
export async function getRemainingBookWords(
  bookId: string,
  currentChapterIndex: number,
  percentThroughChapter: number
): Promise<number | undefined> {
  const chapters = await getChapters(bookId);
  if (chapters.length === 0) return undefined;

  let totalRemaining = 0;

  for (const chapter of chapters) {
    if (!chapter.content) continue;
    const words = countWords(chapter.content);

    if (chapter.index < currentChapterIndex) {
      // Already read
      continue;
    } else if (chapter.index === currentChapterIndex) {
      // Partially read
      const fractionRemaining = 1 - percentThroughChapter / 100;
      totalRemaining += Math.round(words * fractionRemaining);
    } else {
      // Not yet read
      totalRemaining += words;
    }
  }

  return totalRemaining;
}

/**
 * Format minutes into a human-readable string.
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `~${hours} hr`;
  return `~${hours} hr ${mins} min`;
}

/**
 * Calculate reading time estimate from word count and WPM.
 */
export function estimateReadingTime(wordCount: number, wpm: number): string {
  if (wordCount <= 0 || wpm <= 0) return '';
  const minutes = wordCount / wpm;
  return formatReadingTime(minutes);
}

/**
 * Get reading time estimates for chapter and book.
 */
export async function getReadingTimeEstimates(
  bookId: string,
  currentChapterIndex: number,
  percentThroughChapter: number,
  wpm: number
): Promise<{
  chapterMinutesLeft?: number;
  bookMinutesLeft?: number;
}> {
  const [chapterWords, bookWords] = await Promise.all([
    getChapterWordCount(bookId, currentChapterIndex),
    getRemainingBookWords(bookId, currentChapterIndex, percentThroughChapter),
  ]);

  const chapterMinutesLeft =
    chapterWords != null
      ? (chapterWords * (1 - percentThroughChapter / 100)) / wpm
      : undefined;

  const bookMinutesLeft = bookWords != null ? bookWords / wpm : undefined;

  return { chapterMinutesLeft, bookMinutesLeft };
}
