import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import {
  createCollection,
  getAllCollections,
  renameCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBooksInCollection,
  getCollectionsForBook,
  seedDefaultCollections,
  syncSystemCollections,
} from '../collections';
import { db } from '../db';

beforeEach(async () => {
  await Dexie.delete('ai-book-companion');
  // Force re-open so tables are created
  await db.open();
});

describe('collections CRUD', () => {
  it('creates and retrieves a collection', async () => {
    const c = await createCollection('My Books', '#FF0000');
    expect(c.id).toBeDefined();
    expect(c.name).toBe('My Books');
    expect(c.color).toBe('#FF0000');
    expect(c.isSystem).toBe(false);

    const all = await getAllCollections();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('My Books');
  });

  it('renames a user collection', async () => {
    const c = await createCollection('Old Name');
    await renameCollection(c.id, 'New Name');

    const all = await getAllCollections();
    expect(all[0].name).toBe('New Name');
  });

  it('prevents renaming system collections', async () => {
    const c = await createCollection('System', undefined, true);
    await expect(renameCollection(c.id, 'New Name')).rejects.toThrow(
      'Cannot rename system collection'
    );
  });

  it('deletes a user collection and cascades to collectionBooks', async () => {
    const c = await createCollection('Deletable');
    await addBookToCollection(c.id, 'book1');
    await addBookToCollection(c.id, 'book2');

    await deleteCollection(c.id);

    const all = await getAllCollections();
    expect(all).toHaveLength(0);

    const books = await getBooksInCollection(c.id);
    expect(books).toHaveLength(0);
  });

  it('prevents deleting system collections', async () => {
    const c = await createCollection('Currently Reading', undefined, true);
    await expect(deleteCollection(c.id)).rejects.toThrow(
      'Cannot delete system collection'
    );
  });
});

describe('book-to-collection operations', () => {
  it('adds a book to a collection', async () => {
    const c = await createCollection('Shelf');
    await addBookToCollection(c.id, 'book1');

    const books = await getBooksInCollection(c.id);
    expect(books).toEqual(['book1']);
  });

  it('duplicate add is idempotent', async () => {
    const c = await createCollection('Shelf');
    await addBookToCollection(c.id, 'book1');
    await addBookToCollection(c.id, 'book1');

    const books = await getBooksInCollection(c.id);
    expect(books).toHaveLength(1);
  });

  it('removes a book from a collection', async () => {
    const c = await createCollection('Shelf');
    await addBookToCollection(c.id, 'book1');
    await removeBookFromCollection(c.id, 'book1');

    const books = await getBooksInCollection(c.id);
    expect(books).toHaveLength(0);
  });

  it('gets collections for a book', async () => {
    const c1 = await createCollection('Shelf 1');
    const c2 = await createCollection('Shelf 2');
    await createCollection('Empty Shelf');

    await addBookToCollection(c1.id, 'book1');
    await addBookToCollection(c2.id, 'book1');

    const collections = await getCollectionsForBook('book1');
    expect(collections).toHaveLength(2);
    const names = collections.map((c) => c.name);
    expect(names).toContain('Shelf 1');
    expect(names).toContain('Shelf 2');
  });
});

describe('seedDefaultCollections', () => {
  it('creates 3 default collections with correct isSystem flags', async () => {
    await seedDefaultCollections();

    const all = await getAllCollections();
    expect(all).toHaveLength(3);

    const names = all.map((c) => c.name);
    expect(names).toContain('Currently Reading');
    expect(names).toContain('Finished');
    expect(names).toContain('Want to Read');

    const cr = all.find((c) => c.name === 'Currently Reading');
    expect(cr?.isSystem).toBe(true);

    const fin = all.find((c) => c.name === 'Finished');
    expect(fin?.isSystem).toBe(true);

    const wtr = all.find((c) => c.name === 'Want to Read');
    expect(wtr?.isSystem).toBe(false);
  });

  it('does not re-seed if collections already exist', async () => {
    await seedDefaultCollections();
    await seedDefaultCollections(); // second call should be no-op

    const all = await getAllCollections();
    expect(all).toHaveLength(3);
  });

  it('"Want to Read" can be deleted', async () => {
    await seedDefaultCollections();
    const all = await getAllCollections();
    const wtr = all.find((c) => c.name === 'Want to Read')!;

    await deleteCollection(wtr.id);
    const remaining = await getAllCollections();
    expect(remaining).toHaveLength(2);
  });
});

describe('syncSystemCollections', () => {
  it('moves books with progress to Currently Reading', async () => {
    await seedDefaultCollections();

    // Create reading progress at 50%
    await db.readingProgress.put({
      bookId: 'book1',
      cfi: '',
      furthestCfi: '',
      currentChapterIndex: 3,
      totalChapters: 10,
      percentComplete: 50,
      lastReadAt: Date.now(),
    });

    await syncSystemCollections();

    const all = await getAllCollections();
    const cr = all.find((c) => c.name === 'Currently Reading')!;
    const fin = all.find((c) => c.name === 'Finished')!;

    const crBooks = await getBooksInCollection(cr.id);
    const finBooks = await getBooksInCollection(fin.id);

    expect(crBooks).toContain('book1');
    expect(finBooks).not.toContain('book1');
  });

  it('moves completed books to Finished', async () => {
    await seedDefaultCollections();

    await db.readingProgress.put({
      bookId: 'book2',
      cfi: '',
      furthestCfi: '',
      currentChapterIndex: 10,
      totalChapters: 10,
      percentComplete: 100,
      lastReadAt: Date.now(),
    });

    await syncSystemCollections();

    const all = await getAllCollections();
    const cr = all.find((c) => c.name === 'Currently Reading')!;
    const fin = all.find((c) => c.name === 'Finished')!;

    const crBooks = await getBooksInCollection(cr.id);
    const finBooks = await getBooksInCollection(fin.id);

    expect(finBooks).toContain('book2');
    expect(crBooks).not.toContain('book2');
  });

  it('removes 0% progress books from both system collections', async () => {
    await seedDefaultCollections();

    const all = await getAllCollections();
    const cr = all.find((c) => c.name === 'Currently Reading')!;

    // Manually add a book
    await addBookToCollection(cr.id, 'book3');

    // Set progress to 0
    await db.readingProgress.put({
      bookId: 'book3',
      cfi: '',
      furthestCfi: '',
      currentChapterIndex: 0,
      totalChapters: 10,
      percentComplete: 0,
      lastReadAt: Date.now(),
    });

    await syncSystemCollections();

    const crBooks = await getBooksInCollection(cr.id);
    expect(crBooks).not.toContain('book3');
  });
});
