import { db } from '@/lib/storage/db';
import type { Book } from '@/types/book';

const BASE_URL = 'https://gutendex.com';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Gutendex response shapes ─────────────────────────────────────────────────

interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
  media_type: string;
}

interface GutendexPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

// ── Transform helpers ────────────────────────────────────────────────────────

function pickEpubUrl(formats: Record<string, string>): string {
  // Prefer epub+zip, fall back to epub3, then epub
  return (
    formats['application/epub+zip'] ??
    formats['application/epub+zip; charset=utf-8'] ??
    Object.entries(formats).find(([mime]) => mime.startsWith('application/epub'))?.[1] ??
    ''
  );
}

function pickCoverUrl(formats: Record<string, string>, id: number): string {
  return (
    formats['image/jpeg'] ??
    formats['image/png'] ??
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`
  );
}

function transformBook(raw: GutendexBook): Book {
  const authorName =
    raw.authors.length > 0
      ? raw.authors.map((a) => a.name).join(', ')
      : 'Unknown Author';

  return {
    id: String(raw.id),
    title: raw.title,
    author: authorName,
    language: raw.languages[0] ?? 'en',
    subjects: raw.subjects,
    categories: raw.bookshelves,
    downloadUrl: pickEpubUrl(raw.formats),
    coverUrl: pickCoverUrl(raw.formats, raw.id),
    dateAdded: Date.now(),
  };
}

// ── Cache helpers ────────────────────────────────────────────────────────────

async function getCached(cacheKey: string): Promise<GutendexBook | GutendexPage | null> {
  try {
    const row = await db.cachedMetadata.get(cacheKey);
    if (!row) return null;
    if (Date.now() - row.cachedAt > CACHE_TTL_MS) return null;
    return JSON.parse(row.data) as GutendexBook | GutendexPage;
  } catch {
    return null;
  }
}

async function setCached(cacheKey: string, data: unknown): Promise<void> {
  try {
    await db.cachedMetadata.put({
      id: cacheKey,
      data: JSON.stringify(data),
      cachedAt: Date.now(),
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

// ── Fetch wrapper ────────────────────────────────────────────────────────────

async function fetchGutendex<T>(path: string, cacheKey: string): Promise<T | null> {
  const cached = await getCached(cacheKey);
  if (cached) return cached as T;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    await setCached(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Search books by title / author. Returns up to one page of results.
 */
export async function searchBooks(
  query: string,
  page = 1
): Promise<{ books: Book[]; count: number; hasMore: boolean }> {
  const params = new URLSearchParams({ search: query, page: String(page) });
  const cacheKey = `search:${query}:${page}`;
  const data = await fetchGutendex<GutendexPage>(`/books?${params}`, cacheKey);

  if (!data || !('results' in data)) return { books: [], count: 0, hasMore: false };

  return {
    books: (data as GutendexPage).results.map(transformBook),
    count: (data as GutendexPage).count,
    hasMore: (data as GutendexPage).next !== null,
  };
}

/**
 * Fetch metadata for a single book by its Gutenberg ID.
 */
export async function getBook(id: string): Promise<Book | null> {
  const cacheKey = `book:${id}`;
  const data = await fetchGutendex<GutendexBook>(`/books/${id}`, cacheKey);
  if (!data || !('id' in data)) return null;
  return transformBook(data as GutendexBook);
}

/**
 * Fetch a page of popular/trending books from the Gutendex default listing.
 */
export async function getBooksPage(page = 1): Promise<{ books: Book[]; hasMore: boolean }> {
  const params = new URLSearchParams({ page: String(page) });
  const cacheKey = `page:${page}`;
  const data = await fetchGutendex<GutendexPage>(`/books?${params}`, cacheKey);

  if (!data || !('results' in data)) return { books: [], hasMore: false };

  return {
    books: (data as GutendexPage).results.map(transformBook),
    hasMore: (data as GutendexPage).next !== null,
  };
}

/**
 * Fetch metadata for a curated list of book IDs.
 * Batches efficiently by fetching from cache first, then one-by-one for misses
 * (Gutendex does not expose a multi-ID endpoint).
 */
export async function getBooksByCategory(
  _category: string,
  bookIds: string[]
): Promise<Book[]> {
  const results = await Promise.all(bookIds.map((id) => getBook(id)));
  return results.filter((b): b is Book => b !== null);
}
