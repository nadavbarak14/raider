import { db } from './db';
import type { ReadingProgress } from '@/types/book';

/**
 * Upsert reading position for a book.
 */
export async function saveProgress(progress: ReadingProgress): Promise<void> {
  await db.readingProgress.put(progress);
}

/**
 * Get the reading position for a specific book.
 */
export async function getProgress(bookId: string): Promise<ReadingProgress | undefined> {
  return db.readingProgress.get(bookId);
}

/**
 * Get all reading progress records, newest first.
 * Used by the library screen to surface "continue reading" items.
 */
export async function getAllProgress(): Promise<ReadingProgress[]> {
  return db.readingProgress.orderBy('lastReadAt').reverse().toArray();
}

/**
 * Update the furthest-reached position only when the new position is
 * genuinely ahead of the current record.
 *
 * Because CFI strings are not trivially comparable by string ordering, we
 * track `currentChapterIndex` as the coarse guard and only update
 * `furthestCfi` when the chapter index advances (or on first save).
 */
export async function updateFurthestPosition(
  bookId: string,
  cfi: string,
  chapterIndex: number
): Promise<void> {
  await db.transaction('rw', db.readingProgress, async () => {
    const existing = await db.readingProgress.get(bookId);

    if (!existing) {
      // No record yet — nothing to update; caller should use saveProgress instead.
      return;
    }

    const isAhead = chapterIndex > existing.currentChapterIndex;

    if (isAhead) {
      await db.readingProgress.update(bookId, {
        furthestCfi: cfi,
        currentChapterIndex: chapterIndex,
        lastReadAt: Date.now(),
      });
    } else {
      // Same chapter: always refresh the timestamp and current position.
      await db.readingProgress.update(bookId, {
        cfi,
        lastReadAt: Date.now(),
      });
    }
  });
}
