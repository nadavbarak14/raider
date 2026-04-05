import Dexie, { type EntityTable } from 'dexie';
import type { Book, Chapter, ReadingProgress, Bookmark, Highlight, Collection, CollectionBook, ReadingSession } from '@/types/book';
import type { Thread, Message } from '@/types/thread';
import type { AppSettings } from '@/types/settings';

// ── Stored shapes ────────────────────────────────────────────────────────────

/**
 * Chapters get an auto-incremented numeric primary key in the DB.
 * The `id` field is omitted on insert and filled in by Dexie.
 */
export type StoredChapter = Chapter & { id?: number };

/**
 * Threads stored in DB hold messages as a serialised JSON column; we keep the
 * live `messages` array only in-memory after loading (see threads.ts).
 */
export type StoredThread = Omit<Thread, 'messages'> & {
  messages: string; // JSON-serialised Message[]
};

/** Blobs are stored separately so large binary data doesn't slow metadata queries. */
export interface BookBlob {
  bookId: string;
  blob: Blob;
}

/** Raw Gutendex API response cached for offline resilience. */
export interface CachedMetadata {
  id: string; // Gutenberg ID
  data: string; // JSON-serialised API response
  cachedAt: number; // Unix timestamp (ms)
}

/** The single settings row. */
export interface StoredSettings {
  id: 'app'; // singleton key
  settings: AppSettings;
}

// ── Database definition ──────────────────────────────────────────────────────

export class AppDatabase extends Dexie {
  books!: EntityTable<Book, 'id'>;
  chapters!: EntityTable<StoredChapter, 'id'>;
  readingProgress!: EntityTable<ReadingProgress, 'bookId'>;
  bookmarks!: EntityTable<Bookmark, 'id'>;
  threads!: EntityTable<StoredThread, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  settings!: EntityTable<StoredSettings, 'id'>;
  bookBlobs!: EntityTable<BookBlob, 'bookId'>;
  cachedMetadata!: EntityTable<CachedMetadata, 'id'>;
  highlights!: EntityTable<Highlight, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  collectionBooks!: EntityTable<CollectionBook, 'id'>;
  readingSessions!: EntityTable<ReadingSession, 'id'>;

  constructor() {
    super('ai-book-companion');

    this.version(1).stores({
      // Primary key first, then indexed fields
      books: 'id, title, author, dateAdded',
      chapters: '++id, bookId, index, [bookId+index]',
      readingProgress: 'bookId, lastReadAt',
      bookmarks: 'id, bookId, chapterIndex, createdAt',
      threads: 'id, bookId, chapterIndexAtCreation, createdAt, updatedAt, isGeneral',
      messages: 'id, threadId, timestamp',
      settings: 'id',
      bookBlobs: 'bookId',
      cachedMetadata: 'id, cachedAt',
    });

    this.version(2).stores({
      // Existing tables (must repeat schema for Dexie versioning)
      books: 'id, title, author, dateAdded',
      chapters: '++id, bookId, index, [bookId+index]',
      readingProgress: 'bookId, lastReadAt',
      bookmarks: 'id, bookId, chapterIndex, createdAt',
      threads: 'id, bookId, chapterIndexAtCreation, createdAt, updatedAt, isGeneral',
      messages: 'id, threadId, timestamp',
      settings: 'id',
      bookBlobs: 'bookId',
      cachedMetadata: 'id, cachedAt',
      // New tables
      highlights: 'id, bookId, cfiRange, chapterIndex, [bookId+chapterIndex]',
      collections: 'id, name, createdAt',
      collectionBooks: '++id, collectionId, bookId, [collectionId+bookId]',
      readingSessions: 'id, bookId, startedAt',
    });
  }
}

// Singleton instance — safe to import anywhere (Dexie handles lazy open)
export const db = new AppDatabase();
