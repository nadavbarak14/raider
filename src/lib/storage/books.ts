import { db } from './db';
import type { Book, Chapter } from '@/types/book';

/**
 * Save (or replace) book metadata.
 */
export async function saveBook(book: Book): Promise<void> {
  await db.books.put(book);
}

/**
 * Get a book by its Gutenberg ID.
 */
export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

/**
 * List all saved books, newest first.
 */
export async function getAllBooks(): Promise<Book[]> {
  return db.books.orderBy('dateAdded').reverse().toArray();
}

/**
 * Remove a book and every piece of data associated with it.
 */
export async function deleteBook(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.books,
      db.chapters,
      db.readingProgress,
      db.bookmarks,
      db.threads,
      db.messages,
      db.bookBlobs,
      db.cachedMetadata,
    ],
    async () => {
      // Gather thread IDs so we can delete messages too
      const threadIds = (await db.threads.where('bookId').equals(id).toArray()).map(
        (t) => t.id
      );

      await Promise.all([
        db.books.delete(id),
        db.chapters.where('bookId').equals(id).delete(),
        db.readingProgress.delete(id),
        db.bookmarks.where('bookId').equals(id).delete(),
        db.threads.where('bookId').equals(id).delete(),
        db.messages.where('threadId').anyOf(threadIds).delete(),
        db.bookBlobs.delete(id),
        db.cachedMetadata.delete(id),
      ]);
    }
  );
}

/**
 * Save all chapters for a book (replaces any existing ones).
 */
export async function saveChapters(bookId: string, chapters: Chapter[]): Promise<void> {
  await db.transaction('rw', db.chapters, async () => {
    await db.chapters.where('bookId').equals(bookId).delete();
    await db.chapters.bulkPut(chapters.map((c) => ({ ...c, bookId })));
  });
}

/**
 * Get all chapters for a book, sorted by spine index.
 */
export async function getChapters(bookId: string): Promise<Chapter[]> {
  return db.chapters
    .where('bookId')
    .equals(bookId)
    .sortBy('index');
}

/**
 * Get chapters up to (and including) `maxIndex` — used for spoiler boundary.
 */
export async function getChaptersUpTo(bookId: string, maxIndex: number): Promise<Chapter[]> {
  const all = await getChapters(bookId);
  return all.filter((c) => c.index <= maxIndex);
}

/**
 * Check whether a book has been saved locally.
 */
export async function isBookSaved(id: string): Promise<boolean> {
  const count = await db.books.where('id').equals(id).count();
  return count > 0;
}

/**
 * Save the raw EPUB blob for a book.
 */
export async function saveBookBlob(id: string, blob: Blob): Promise<void> {
  await db.bookBlobs.put({ bookId: id, blob });
}

/**
 * Retrieve the raw EPUB blob for a book.
 */
export async function getBookBlob(id: string): Promise<Blob | undefined> {
  const row = await db.bookBlobs.get(id);
  return row?.blob;
}
