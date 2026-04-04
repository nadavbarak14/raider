import type { Chapter } from '@/types/book';

export interface SearchResult {
  chapterIndex: number;
  chapterTitle: string;
  matchText: string; // The matching text snippet (with surrounding context)
  relevanceScore: number; // Simple relevance score
}

/**
 * Search within book text up to a chapter boundary (spoiler-safe).
 * Accepts pre-loaded chapters so it works in both client and server contexts.
 */
export function searchBookText(
  chapters: Chapter[],
  query: string,
  maxChapterIndex: number
): SearchResult[] {
  const filtered = chapters.filter((c) => c.index <= maxChapterIndex);
  return searchChapters(filtered, query);
}

/**
 * Search ALL chapters in a book (used for spoiler detection).
 */
export function searchAllChapters(
  chapters: Chapter[],
  query: string
): SearchResult[] {
  return searchChapters(chapters, query);
}

/**
 * Core search implementation: case-insensitive text search with relevance scoring.
 */
function searchChapters(chapters: Chapter[], query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  for (const chapter of chapters) {
    const contentLower = chapter.content.toLowerCase();

    // Score 1: Exact phrase match
    const exactMatches = findAllOccurrences(contentLower, queryLower);
    for (const pos of exactMatches) {
      results.push({
        chapterIndex: chapter.index,
        chapterTitle: chapter.title,
        matchText: extractSnippet(chapter.content, pos, queryLower.length),
        relevanceScore: 10,
      });
    }

    // If we already have exact matches for this chapter, skip word-level search
    if (exactMatches.length > 0) continue;

    // Score 2: All words present (word match)
    if (queryWords.length > 1) {
      const allWordsPresent = queryWords.every((w) => contentLower.includes(w));
      if (allWordsPresent) {
        // Find the position of the first query word for context
        const firstWordPos = contentLower.indexOf(queryWords[0]);
        if (firstWordPos !== -1) {
          results.push({
            chapterIndex: chapter.index,
            chapterTitle: chapter.title,
            matchText: extractSnippet(
              chapter.content,
              firstWordPos,
              queryWords[0].length
            ),
            relevanceScore: 7,
          });
        }
      }
    }

    // Score 3: Partial match — any individual word matches
    for (const word of queryWords) {
      const wordMatches = findAllOccurrences(contentLower, word);
      if (wordMatches.length > 0) {
        // Take the first occurrence
        results.push({
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          matchText: extractSnippet(
            chapter.content,
            wordMatches[0],
            word.length
          ),
          relevanceScore: 3 + Math.min(wordMatches.length, 4), // bonus for frequency, max 7
        });
        break; // one result per chapter for partial matches
      }
    }
  }

  // Sort by relevance (descending), then by chapter index (ascending)
  results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.chapterIndex - b.chapterIndex;
  });

  // Return top 10
  return results.slice(0, 10);
}

/**
 * Find all occurrences of `needle` in `haystack` (both already lowercased).
 */
function findAllOccurrences(haystack: string, needle: string): number[] {
  const positions: number[] = [];
  if (!needle) return positions;

  let startIndex = 0;
  while (startIndex < haystack.length) {
    const idx = haystack.indexOf(needle, startIndex);
    if (idx === -1) break;
    positions.push(idx);
    startIndex = idx + 1;
    // Limit to avoid excessive matches in long texts
    if (positions.length >= 20) break;
  }
  return positions;
}

/**
 * Extract a snippet of ~100 chars of surrounding context around a match.
 */
function extractSnippet(
  content: string,
  matchStart: number,
  matchLength: number
): string {
  const contextChars = 50; // chars on each side
  const snippetStart = Math.max(0, matchStart - contextChars);
  const snippetEnd = Math.min(
    content.length,
    matchStart + matchLength + contextChars
  );

  let snippet = content.slice(snippetStart, snippetEnd).trim();

  // Clean up: replace multiple whitespace with single space
  snippet = snippet.replace(/\s+/g, ' ');

  // Add ellipsis if we trimmed
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < content.length) snippet = snippet + '...';

  return snippet;
}
