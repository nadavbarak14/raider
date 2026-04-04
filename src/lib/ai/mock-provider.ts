import type { QuestionType } from '@/types/thread';
import type { Chapter } from '@/types/book';
import { searchBookText } from './search-tool';
import { checkForSpoilers } from './spoiler-guard';
import type { SearchResult } from './search-tool';

export interface MockResponse {
  content: string;
  isSpoilerWarning: boolean;
}

/**
 * Generate a mock AI response based on question type and search results.
 * Designed to feel plausible enough to demo the UX flow.
 *
 * @param params.chapters - All chapters for the book (loaded client-side, passed in)
 */
export function generateMockResponse(params: {
  questionType: QuestionType;
  query: string;
  anchorText?: string;
  chapters: Chapter[];
  currentChapterIndex: number;
}): MockResponse {
  const { questionType, query, anchorText, chapters, currentChapterIndex } =
    params;

  switch (questionType) {
    case 'who_is_this':
      return handleWhoIsThis(query, chapters, currentChapterIndex);
    case 'explain':
      return handleExplain(query, anchorText, chapters, currentChapterIndex);
    case 'recap':
      return handleRecap(chapters, currentChapterIndex);
    case 'ask_ai':
    case 'general':
    default:
      return handleGeneral(query, chapters, currentChapterIndex);
  }
}

// ---------------------------------------------------------------------------
// Response generators by question type
// ---------------------------------------------------------------------------

function handleWhoIsThis(
  query: string,
  chapters: Chapter[],
  currentChapterIndex: number
): MockResponse {
  const results = searchBookText(chapters, query, currentChapterIndex);

  if (results.length > 0) {
    const topResult = results[0];
    const otherChapters = getUniqueChapterTitles(results, topResult.chapterIndex);

    let response = `Based on what you've read so far, "${extractName(query)}" appears in ${topResult.chapterTitle}. Here's a relevant passage: "${truncate(topResult.matchText, 120)}"`;

    if (otherChapters.length > 0) {
      response += ` They are also mentioned in ${otherChapters.slice(0, 2).join(' and ')}.`;
    }

    return { content: response, isSpoilerWarning: false };
  }

  // Check if the character appears in future chapters
  const spoilerCheck = checkForSpoilers(chapters, query, currentChapterIndex);
  if (spoilerCheck.hasSpoiler) {
    return {
      content: spoilerCheck.message!,
      isSpoilerWarning: true,
    };
  }

  return {
    content: dontKnowResponse(),
    isSpoilerWarning: false,
  };
}

function handleExplain(
  query: string,
  anchorText: string | undefined,
  chapters: Chapter[],
  currentChapterIndex: number
): MockResponse {
  const textToExplain = anchorText || query;

  // Search for context around the passage
  const results = searchBookText(
    chapters,
    textToExplain.slice(0, 60), // use first 60 chars as search query
    currentChapterIndex
  );

  if (anchorText) {
    const passage = truncate(anchorText, 80);
    let response = `This passage \u2014 "${passage}" \u2014 is significant in the context of the narrative.`;

    if (results.length > 0) {
      response += ` It appears in ${results[0].chapterTitle}, where the author develops themes that connect to the broader story.`;
    } else {
      response += ` The author uses this language to convey deeper meaning about the characters and their circumstances.`;
    }

    return { content: response, isSpoilerWarning: false };
  }

  // No anchor text, treat more like a general question
  if (results.length > 0) {
    return {
      content: `Regarding your question about "${truncate(query, 40)}": based on the text in ${results[0].chapterTitle}, "${truncate(results[0].matchText, 100)}" \u2014 this passage helps illustrate the author's intent.`,
      isSpoilerWarning: false,
    };
  }

  return {
    content: dontKnowResponse(),
    isSpoilerWarning: false,
  };
}

function handleRecap(
  chapters: Chapter[],
  currentChapterIndex: number
): MockResponse {
  // Get chapter titles up to current position for the recap
  const readChapters = chapters.filter((c) => c.index <= currentChapterIndex);
  const chapterNum = currentChapterIndex + 1;

  let response = `Here's a summary of where you are: you've read through Chapter ${chapterNum} so far.`;

  if (readChapters.length > 0) {
    const chapterTitles = readChapters
      .map((c) => c.title)
      .filter((t) => t && t.trim() !== '')
      .slice(0, 5);
    if (chapterTitles.length > 0) {
      response += ` The story has progressed through ${chapterTitles.join(', ')}.`;
    }
  }

  response +=
    ' Continue reading to discover how the narrative develops from here!';

  return { content: response, isSpoilerWarning: false };
}

function handleGeneral(
  query: string,
  chapters: Chapter[],
  currentChapterIndex: number
): MockResponse {
  // Search book text for relevant passages
  const results = searchBookText(chapters, query, currentChapterIndex);

  if (results.length > 0) {
    return {
      content: buildAnswerFromResults(query, results),
      isSpoilerWarning: false,
    };
  }

  // No results in safe chapters — check spoiler guard
  const spoilerCheck = checkForSpoilers(
    chapters,
    query,
    currentChapterIndex
  );

  if (spoilerCheck.hasSpoiler) {
    return {
      content: spoilerCheck.message!,
      isSpoilerWarning: true,
    };
  }

  return {
    content: dontKnowResponse(),
    isSpoilerWarning: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAnswerFromResults(
  query: string,
  results: SearchResult[]
): string {
  const top = results[0];
  let answer = `Based on what you've read, here's what I found about "${truncate(query, 40)}": in ${top.chapterTitle}, the text mentions: "${truncate(top.matchText, 120)}"`;

  if (results.length > 1) {
    const secondChapter = results[1].chapterTitle;
    if (secondChapter !== top.chapterTitle) {
      answer += ` There's also a related mention in ${secondChapter}.`;
    }
  }

  return answer;
}

function dontKnowResponse(): string {
  return "I couldn't find specific information about that in the text you've read so far. Try asking about a specific character, event, or passage, or continue reading \u2014 the answer might be ahead!";
}

/**
 * Extract a likely name from a "who is" query.
 */
function extractName(query: string): string {
  // Remove common prefixes like "who is", "who's", "tell me about"
  const cleaned = query
    .replace(/^(who\s+(is|are|was|were)\s+)/i, '')
    .replace(/^(tell\s+me\s+about\s+)/i, '')
    .replace(/^(what\s+(is|are)\s+)/i, '')
    .replace(/\?$/, '')
    .trim();
  return cleaned || query;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

function getUniqueChapterTitles(
  results: SearchResult[],
  excludeChapterIndex: number
): string[] {
  const titles = new Set<string>();
  for (const r of results) {
    if (r.chapterIndex !== excludeChapterIndex) {
      titles.add(r.chapterTitle);
    }
  }
  return [...titles];
}
