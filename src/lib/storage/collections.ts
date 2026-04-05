import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { Collection, CollectionBook, ReadingProgress } from '@/types/book';

// ── Default collections ─────────────────────────────────────────────────────

const SYSTEM_COLLECTIONS = [
  { name: 'Currently Reading', isSystem: true },
  { name: 'Finished', isSystem: true },
  { name: 'Want to Read', isSystem: false },
] as const;

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function createCollection(
  name: string,
  color?: string,
  isSystem = false
): Promise<Collection> {
  const now = Date.now();
  const collection: Collection = {
    id: uuid(),
    name,
    color,
    isSystem,
    createdAt: now,
    updatedAt: now,
  };
  await db.collections.put(collection);
  return collection;
}

export async function getAllCollections(): Promise<Collection[]> {
  return db.collections.orderBy('createdAt').toArray();
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  return db.collections.get(id);
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const collection = await db.collections.get(id);
  if (!collection) return;
  if (collection.isSystem) {
    throw new Error('Cannot rename system collection');
  }
  await db.collections.update(id, { name, updatedAt: Date.now() });
}

export async function deleteCollection(id: string): Promise<void> {
  const collection = await db.collections.get(id);
  if (!collection) return;
  if (collection.isSystem) {
    throw new Error('Cannot delete system collection');
  }
  await db.transaction('rw', [db.collections, db.collectionBooks], async () => {
    await db.collectionBooks.where('collectionId').equals(id).delete();
    await db.collections.delete(id);
  });
}

// ── Book-to-Collection operations ───────────────────────────────────────────

export async function addBookToCollection(
  collectionId: string,
  bookId: string
): Promise<void> {
  // Check for duplicate
  const existing = await db.collectionBooks
    .where('[collectionId+bookId]')
    .equals([collectionId, bookId])
    .count();
  if (existing > 0) return; // idempotent

  await db.collectionBooks.put({
    collectionId,
    bookId,
    addedAt: Date.now(),
  });
}

export async function removeBookFromCollection(
  collectionId: string,
  bookId: string
): Promise<void> {
  await db.collectionBooks
    .where('[collectionId+bookId]')
    .equals([collectionId, bookId])
    .delete();
}

export async function getBooksInCollection(collectionId: string): Promise<string[]> {
  const entries = await db.collectionBooks
    .where('collectionId')
    .equals(collectionId)
    .toArray();
  return entries.map((e) => e.bookId);
}

export async function getCollectionsForBook(bookId: string): Promise<Collection[]> {
  const entries = await db.collectionBooks
    .where('bookId')
    .equals(bookId)
    .toArray();
  const collectionIds = entries.map((e) => e.collectionId);
  if (collectionIds.length === 0) return [];
  const collections = await db.collections
    .where('id')
    .anyOf(collectionIds)
    .toArray();
  return collections;
}

// ── Seed defaults ───────────────────────────────────────────────────────────

export async function seedDefaultCollections(): Promise<void> {
  const existing = await db.collections.count();
  if (existing > 0) return; // already seeded

  for (const def of SYSTEM_COLLECTIONS) {
    await createCollection(def.name, undefined, def.isSystem);
  }
}

// ── Auto-populate system collections based on reading progress ──────────────

export async function syncSystemCollections(): Promise<void> {
  const collections = await getAllCollections();
  const currentlyReading = collections.find(
    (c) => c.isSystem && c.name === 'Currently Reading'
  );
  const finished = collections.find(
    (c) => c.isSystem && c.name === 'Finished'
  );

  if (!currentlyReading || !finished) return;

  const allProgress: ReadingProgress[] = await db.readingProgress.toArray();

  for (const progress of allProgress) {
    const { bookId, percentComplete } = progress;

    if (percentComplete >= 100) {
      // Move to Finished, remove from Currently Reading
      await addBookToCollection(finished.id, bookId);
      await removeBookFromCollection(currentlyReading.id, bookId);
    } else if (percentComplete > 0) {
      // Move to Currently Reading, remove from Finished
      await addBookToCollection(currentlyReading.id, bookId);
      await removeBookFromCollection(finished.id, bookId);
    } else {
      // Not started — remove from both
      await removeBookFromCollection(currentlyReading.id, bookId);
      await removeBookFromCollection(finished.id, bookId);
    }
  }
}

/**
 * Find a system collection by name.
 */
export async function findSystemCollection(name: string): Promise<Collection | undefined> {
  const all = await getAllCollections();
  return all.find((c) => c.isSystem && c.name === name);
}
