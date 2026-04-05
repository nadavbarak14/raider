import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import {
  createHighlight,
  getHighlightsForBook,
  getHighlightsForChapter,
  deleteHighlight,
  updateHighlightNote,
  updateHighlightColor,
} from '../highlights';

beforeEach(async () => {
  await Dexie.delete('ai-book-companion');
  // Re-import fresh db instance
  const { AppDatabase } = await import('@/lib/storage/db');
  const db = new AppDatabase();
  // Force open so tables are created
  await db.open();
  await db.close();
});

describe('highlights CRUD', () => {
  it('creates and retrieves a highlight', async () => {
    const h = await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:0,/1:50)',
      'Hello world',
      'yellow',
      0
    );

    expect(h.id).toBeDefined();
    expect(h.bookId).toBe('book1');
    expect(h.text).toBe('Hello world');
    expect(h.color).toBe('yellow');

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(h.id);
  });

  it('retrieves highlights by chapter', async () => {
    await createHighlight('book1', 'epubcfi(/6/4!/4/2,/1:0,/1:50)', 'ch0 text', 'yellow', 0);
    await createHighlight('book1', 'epubcfi(/6/6!/4/2,/1:0,/1:30)', 'ch1 text', 'blue', 1);
    await createHighlight('book1', 'epubcfi(/6/6!/4/2,/1:40,/1:80)', 'ch1 text2', 'green', 1);

    const ch0 = await getHighlightsForChapter('book1', 0);
    expect(ch0).toHaveLength(1);

    const ch1 = await getHighlightsForChapter('book1', 1);
    expect(ch1).toHaveLength(2);
  });

  it('deletes a highlight', async () => {
    const h = await createHighlight('book1', 'epubcfi(/6/4!/4/2,/1:0,/1:50)', 'text', 'yellow', 0);
    await deleteHighlight(h.id);

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(0);
  });

  it('updates highlight note', async () => {
    const h = await createHighlight('book1', 'epubcfi(/6/4!/4/2,/1:0,/1:50)', 'text', 'yellow', 0);
    await updateHighlightNote(h.id, 'my note');

    const all = await getHighlightsForBook('book1');
    expect(all[0].note).toBe('my note');
  });

  it('updates highlight color', async () => {
    const h = await createHighlight('book1', 'epubcfi(/6/4!/4/2,/1:0,/1:50)', 'text', 'yellow', 0);
    await updateHighlightColor(h.id, 'pink');

    const all = await getHighlightsForBook('book1');
    expect(all[0].color).toBe('pink');
  });
});

describe('highlights sorting', () => {
  it('returns highlights sorted by chapterIndex then createdAt', async () => {
    await createHighlight('book1', 'epubcfi(/6/6!/4/2,/1:0,/1:30)', 'ch1 first', 'blue', 1);
    // Small delay to ensure different createdAt
    await new Promise((r) => setTimeout(r, 10));
    await createHighlight('book1', 'epubcfi(/6/4!/4/2,/1:0,/1:50)', 'ch0', 'yellow', 0);
    await new Promise((r) => setTimeout(r, 10));
    await createHighlight('book1', 'epubcfi(/6/6!/4/2,/1:40,/1:80)', 'ch1 second', 'green', 1);

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(3);
    expect(all[0].chapterIndex).toBe(0);
    expect(all[1].chapterIndex).toBe(1);
    expect(all[1].text).toBe('ch1 first');
    expect(all[2].chapterIndex).toBe(1);
    expect(all[2].text).toBe('ch1 second');
  });
});

describe('overlapping highlights', () => {
  it('replaces overlapping highlight in the same chapter', async () => {
    // Create a highlight at offsets 0-50
    await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:0,/1:50)',
      'original text',
      'yellow',
      0
    );

    // Create overlapping highlight at offsets 25-75 (overlaps 25-50)
    await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:25,/1:75)',
      'new text',
      'blue',
      0
    );

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(1);
    expect(all[0].text).toBe('new text');
    expect(all[0].color).toBe('blue');
  });

  it('does not replace non-overlapping highlights', async () => {
    // Create highlight at offsets 0-20
    await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:0,/1:20)',
      'first',
      'yellow',
      0
    );

    // Create non-overlapping highlight at offsets 50-80
    await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:50,/1:80)',
      'second',
      'blue',
      0
    );

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(2);
  });

  it('does not replace highlights in different chapters', async () => {
    await createHighlight(
      'book1',
      'epubcfi(/6/4!/4/2,/1:0,/1:50)',
      'ch0 text',
      'yellow',
      0
    );

    // Same CFI offsets but different chapter
    await createHighlight(
      'book1',
      'epubcfi(/6/6!/4/2,/1:0,/1:50)',
      'ch1 text',
      'blue',
      1
    );

    const all = await getHighlightsForBook('book1');
    expect(all).toHaveLength(2);
  });
});
