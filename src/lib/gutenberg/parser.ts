import type { Chapter } from '@/types/book';

// ── Project Gutenberg header / footer markers ────────────────────────────────

/**
 * PG books include a lengthy legal preamble and footer that we want to strip
 * so that AI search and reading percentages reflect the actual literary text.
 *
 * The canonical markers (all-caps, surrounded by triple asterisks) appear in
 * both plain-text releases and, via conversion, in EPUB HTML chapters.
 */
const PG_START_RE =
  /\*{3}\s*START\s+OF\s+(?:THE\s+)?(?:THIS\s+)?PROJECT\s+GUTENBERG[^*]*\*{3}/i;
const PG_END_RE =
  /\*{3}\s*END\s+OF\s+(?:THE\s+)?(?:THIS\s+)?PROJECT\s+GUTENBERG[^*]*\*{3}/i;

/**
 * Strip the Project Gutenberg boilerplate from raw EPUB chapter HTML.
 * If start marker is found, everything up to (and including) it is removed.
 * If end marker is found, everything from it onward is removed.
 */
export function stripGutenbergHeaders(html: string): string {
  let result = html;

  const startMatch = PG_START_RE.exec(result);
  if (startMatch) {
    result = result.slice(startMatch.index + startMatch[0].length);
  }

  const endMatch = PG_END_RE.exec(result);
  if (endMatch) {
    result = result.slice(0, endMatch.index);
  }

  return result;
}

/**
 * Convert EPUB HTML to plain text suitable for AI search indexing.
 * - Strips all HTML tags
 * - Collapses whitespace / newlines
 * - Decodes common HTML entities
 */
export function extractChapterText(html: string): string {
  // Strip PG boilerplate first
  const stripped = stripGutenbergHeaders(html);

  // Remove script and style blocks entirely
  const noScript = stripped
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // Replace block-level tags with newlines to preserve paragraph structure
  const withBreaks = noScript
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  const noTags = withBreaks.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  const decoded = noTags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalise whitespace: collapse runs of spaces, trim blank lines
  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── epubjs chapter extraction ────────────────────────────────────────────────

interface SpineItem {
  index: number;
  href: string;
  // epubjs Section
  load: (resolver: (path: string) => string) => Promise<Document>;
  unload: () => void;
}

/**
 * Iterate over every spine item in an epubjs `Book`, extract and clean the
 * HTML content, and return an array of `Chapter` objects ready for storage
 * and AI indexing.
 *
 * @param epub   An epubjs `Book` instance (already opened).
 * @param bookId The Gutenberg ID of the parent book.
 */
export async function extractChaptersFromEpub(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  epub: any,
  bookId: string
): Promise<Chapter[]> {
  const chapters: Chapter[] = [];

  // Ensure navigation metadata is loaded
  await epub.ready;

  const spine = epub.spine;
  const toc: Array<{ href: string; label: string }> = epub.navigation?.toc ?? [];

  // Build a href → title map from the table of contents
  const tocMap = new Map<string, string>();
  for (const entry of toc) {
    // Strip fragment identifier for matching
    const baseHref = entry.href.split('#')[0];
    tocMap.set(baseHref, entry.label?.trim() ?? '');
  }

  // spine.items is the ordered array of SpineItem-like objects in epubjs
  const spineItems: SpineItem[] = spine.items ?? [];

  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i];
    try {
      // load() returns a DOM Document; we need the serialised HTML
      const doc: Document = await item.load(epub.load.bind(epub));

      const rawHtml = doc.documentElement?.outerHTML ?? doc.body?.innerHTML ?? '';
      const content = extractChapterText(rawHtml);

      // Derive chapter title from TOC or fall back to index
      const baseHref = (item.href ?? '').split('#')[0].split('/').pop() ?? '';
      const title =
        tocMap.get(item.href) ??
        tocMap.get(baseHref) ??
        `Chapter ${i + 1}`;

      chapters.push({
        bookId,
        index: i,
        title,
        href: item.href ?? '',
        content,
      });

      item.unload();
    } catch {
      // Non-fatal: skip spine items that fail to load (e.g. nav documents)
      chapters.push({
        bookId,
        index: i,
        title: `Chapter ${i + 1}`,
        href: item.href ?? '',
        content: '',
      });
    }
  }

  return chapters;
}
