import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/storage/db';
import type { Bookmark } from '@/types/book';
import { compareCfi } from './position';

// ── Bookmark CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new bookmark at the given CFI position and persist it to IndexedDB.
 *
 * @param bookId        The Gutenberg book ID.
 * @param cfi           The EPUB CFI string for the bookmarked position.
 * @param chapterIndex  The spine chapter index containing the position.
 * @param label         Optional user-supplied label / note.
 * @returns             The newly created and saved Bookmark.
 */
export async function createBookmark(
  bookId: string,
  cfi: string,
  chapterIndex: number,
  label?: string
): Promise<Bookmark> {
  const bookmark: Bookmark = {
    id: uuidv4(),
    bookId,
    cfi,
    chapterIndex,
    label,
    createdAt: Date.now(),
  };

  await db.bookmarks.add(bookmark);
  return bookmark;
}

/**
 * Retrieve all bookmarks for a book, sorted by reading position (CFI order).
 *
 * @param bookId The Gutenberg book ID.
 */
export async function getBookmarksForBook(bookId: string): Promise<Bookmark[]> {
  const bookmarks = await db.bookmarks.where('bookId').equals(bookId).toArray();

  // Sort first by chapter index (coarse), then by CFI within the chapter
  return bookmarks.sort((a, b) => {
    if (a.chapterIndex !== b.chapterIndex) {
      return a.chapterIndex - b.chapterIndex;
    }
    return compareCfi(a.cfi, b.cfi);
  });
}

/**
 * Delete a single bookmark by its ID.
 *
 * @param id The UUID of the bookmark to remove.
 */
export async function deleteBookmark(id: string): Promise<void> {
  await db.bookmarks.delete(id);
}

/**
 * Check whether the given CFI position already has a bookmark.
 *
 * Matches on exact CFI string equality — the same CFI always maps to the
 * same location in the EPUB.
 *
 * @param bookId The Gutenberg book ID.
 * @param cfi    The EPUB CFI to check.
 */
export async function isLocationBookmarked(bookId: string, cfi: string): Promise<boolean> {
  const count = await db.bookmarks
    .where('bookId')
    .equals(bookId)
    .filter((b) => b.cfi === cfi)
    .count();
  return count > 0;
}

/**
 * Toggle a bookmark at the given position: creates one if absent, deletes it
 * if present. Returns the resulting state (true = now bookmarked).
 *
 * @param bookId        The Gutenberg book ID.
 * @param cfi           The EPUB CFI string.
 * @param chapterIndex  The spine chapter index.
 * @param label         Optional label for the new bookmark.
 */
export async function toggleBookmark(
  bookId: string,
  cfi: string,
  chapterIndex: number,
  label?: string
): Promise<boolean> {
  const existing = await db.bookmarks
    .where('bookId')
    .equals(bookId)
    .filter((b) => b.cfi === cfi)
    .first();

  if (existing) {
    await db.bookmarks.delete(existing.id);
    return false;
  }

  await createBookmark(bookId, cfi, chapterIndex, label);
  return true;
}
