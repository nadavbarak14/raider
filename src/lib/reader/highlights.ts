import { v4 as uuid } from 'uuid';
import { db } from '@/lib/storage/db';
import type { Highlight, HighlightColor } from '@/types/book';

/**
 * Create a new highlight, replacing any overlapping highlights in the same chapter.
 */
export async function createHighlight(
  bookId: string,
  cfiRange: string,
  text: string,
  color: HighlightColor,
  chapterIndex: number,
  note?: string
): Promise<Highlight> {
  const highlight: Highlight = {
    id: uuid(),
    bookId,
    cfiRange,
    text,
    color,
    note,
    chapterIndex,
    createdAt: Date.now(),
  };

  await db.transaction('rw', db.highlights, async () => {
    // Remove overlapping highlights in the same chapter
    const existing = await db.highlights
      .where('[bookId+chapterIndex]')
      .equals([bookId, chapterIndex])
      .toArray();

    const overlapping = existing.filter((h) => cfiRangesOverlap(h.cfiRange, cfiRange));
    if (overlapping.length > 0) {
      await db.highlights.bulkDelete(overlapping.map((h) => h.id));
    }

    await db.highlights.put(highlight);
  });

  return highlight;
}

/**
 * Get all highlights for a book, sorted by chapter then creation time.
 */
export async function getHighlightsForBook(bookId: string): Promise<Highlight[]> {
  const highlights = await db.highlights.where('bookId').equals(bookId).toArray();
  return highlights.sort((a, b) =>
    a.chapterIndex !== b.chapterIndex
      ? a.chapterIndex - b.chapterIndex
      : a.createdAt - b.createdAt
  );
}

/**
 * Get highlights for a specific chapter.
 */
export async function getHighlightsForChapter(
  bookId: string,
  chapterIndex: number
): Promise<Highlight[]> {
  return db.highlights
    .where('[bookId+chapterIndex]')
    .equals([bookId, chapterIndex])
    .sortBy('createdAt');
}

/**
 * Delete a highlight.
 */
export async function deleteHighlight(id: string): Promise<void> {
  await db.highlights.delete(id);
}

/**
 * Update a highlight's note.
 */
export async function updateHighlightNote(id: string, note: string): Promise<void> {
  await db.highlights.update(id, { note });
}

/**
 * Update a highlight's color.
 */
export async function updateHighlightColor(id: string, color: HighlightColor): Promise<void> {
  await db.highlights.update(id, { color });
}

/**
 * Basic CFI range overlap detection.
 *
 * EPUB CFI ranges look like: epubcfi(/6/4!/4/2,/1:0,/1:50)
 * The comma-separated parts after the spine component are start and end offsets.
 *
 * This is a simplified check: we consider ranges overlapping if they share the
 * same base path (spine component). For a first implementation this is acceptable.
 * A more precise check would parse character offsets, but CFI parsing is complex
 * and the "replace existing" behavior is forgiving of false positives.
 */
function cfiRangesOverlap(cfiA: string, cfiB: string): boolean {
  const baseA = extractCfiBase(cfiA);
  const baseB = extractCfiBase(cfiB);
  if (!baseA || !baseB || baseA !== baseB) return false;

  const rangeA = extractCfiOffsets(cfiA);
  const rangeB = extractCfiOffsets(cfiB);
  if (!rangeA || !rangeB) return false;

  // Ranges overlap if one starts before the other ends
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

/**
 * Extract the base path from a CFI range (everything before the first comma).
 * e.g., "epubcfi(/6/4!/4/2,/1:0,/1:50)" => "epubcfi(/6/4!/4/2"
 */
function extractCfiBase(cfi: string): string | null {
  const commaIndex = cfi.indexOf(',');
  if (commaIndex === -1) return cfi; // point CFI, no range
  return cfi.substring(0, commaIndex);
}

/**
 * Extract numeric start/end offsets from a CFI range for overlap comparison.
 * e.g., "epubcfi(/6/4!/4/2,/1:0,/1:50)" => { start: 0, end: 50 }
 */
function extractCfiOffsets(cfi: string): { start: number; end: number } | null {
  const parts = cfi.split(',');
  if (parts.length !== 3) return null;

  const startOffset = extractCharOffset(parts[1]);
  const endOffset = extractCharOffset(parts[2]);

  if (startOffset === null || endOffset === null) return null;
  return { start: startOffset, end: endOffset };
}

/**
 * Extract the character offset from a CFI segment like "/1:50" => 50 or "/1:0" => 0.
 */
function extractCharOffset(segment: string): number | null {
  // Remove trailing paren if present
  const clean = segment.replace(/\)$/, '');
  const colonIndex = clean.lastIndexOf(':');
  if (colonIndex === -1) return null;
  const num = parseInt(clean.substring(colonIndex + 1), 10);
  return isNaN(num) ? null : num;
}
