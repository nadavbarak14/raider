import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { AppDatabase } from '../db';

// Each test gets a fresh database to avoid cross-test contamination
let db: AppDatabase;

beforeEach(async () => {
  // Delete any existing test database
  await Dexie.delete('ai-book-companion');
  db = new AppDatabase();
});

describe('database schema', () => {
  it('has all original tables', async () => {
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain('books');
    expect(tableNames).toContain('chapters');
    expect(tableNames).toContain('readingProgress');
    expect(tableNames).toContain('bookmarks');
    expect(tableNames).toContain('threads');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('bookBlobs');
    expect(tableNames).toContain('cachedMetadata');
  });

  it('has all v2 tables', async () => {
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain('highlights');
    expect(tableNames).toContain('collections');
    expect(tableNames).toContain('collectionBooks');
    expect(tableNames).toContain('readingSessions');
  });

  it('can write and read from new tables', async () => {
    // Highlights
    await db.highlights.put({
      id: 'h1',
      bookId: 'book1',
      cfiRange: 'epubcfi(/6/4!/4/2,/1:0,/1:50)',
      text: 'highlighted text',
      color: 'yellow',
      chapterIndex: 0,
      createdAt: Date.now(),
    });
    const highlight = await db.highlights.get('h1');
    expect(highlight?.text).toBe('highlighted text');
    expect(highlight?.color).toBe('yellow');

    // Collections
    await db.collections.put({
      id: 'c1',
      name: 'Want to Read',
      isSystem: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const collection = await db.collections.get('c1');
    expect(collection?.name).toBe('Want to Read');

    // CollectionBooks
    await db.collectionBooks.put({
      collectionId: 'c1',
      bookId: 'book1',
      addedAt: Date.now(),
    });
    const entries = await db.collectionBooks
      .where('[collectionId+bookId]')
      .equals(['c1', 'book1'])
      .toArray();
    expect(entries).toHaveLength(1);

    // ReadingSessions
    await db.readingSessions.put({
      id: 's1',
      bookId: 'book1',
      startedAt: Date.now(),
      endedAt: 0,
      wordsRead: 0,
      pagesRead: 0,
    });
    const session = await db.readingSessions.get('s1');
    expect(session?.bookId).toBe('book1');
  });
});

describe('deleteBook cascade', () => {
  it('removes highlights, collectionBooks, and readingSessions for the book', async () => {
    const bookId = 'test-book';
    const now = Date.now();

    // Set up book with related data
    await db.books.put({
      id: bookId,
      title: 'Test Book',
      author: 'Author',
      language: 'en',
      subjects: [],
      categories: [],
      downloadUrl: 'https://example.com/book.epub',
      dateAdded: now,
    });

    await db.highlights.put({
      id: 'h1',
      bookId,
      cfiRange: 'epubcfi(/6/4)',
      text: 'test',
      color: 'yellow',
      chapterIndex: 0,
      createdAt: now,
    });

    await db.highlights.put({
      id: 'h2',
      bookId,
      cfiRange: 'epubcfi(/6/6)',
      text: 'test2',
      color: 'blue',
      chapterIndex: 1,
      createdAt: now,
    });

    await db.collectionBooks.put({
      collectionId: 'c1',
      bookId,
      addedAt: now,
    });

    await db.readingSessions.put({
      id: 's1',
      bookId,
      startedAt: now,
      endedAt: now + 60000,
      wordsRead: 500,
      pagesRead: 2,
    });

    // Also add a highlight for a different book to make sure it's not deleted
    await db.highlights.put({
      id: 'h3',
      bookId: 'other-book',
      cfiRange: 'epubcfi(/6/8)',
      text: 'other',
      color: 'green',
      chapterIndex: 0,
      createdAt: now,
    });

    // Import and run deleteBook
    const { deleteBook } = await import('../books');
    await deleteBook(bookId);

    // Verify cascade
    expect(await db.books.get(bookId)).toBeUndefined();
    expect(await db.highlights.where('bookId').equals(bookId).count()).toBe(0);
    expect(await db.collectionBooks.where('bookId').equals(bookId).count()).toBe(0);
    expect(await db.readingSessions.where('bookId').equals(bookId).count()).toBe(0);

    // Verify other book's highlight is untouched
    expect(await db.highlights.get('h3')).toBeDefined();
  });
});
