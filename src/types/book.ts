export interface Book {
  id: string; // Gutenberg ID (e.g. "1342")
  title: string;
  author: string;
  language: string;
  description?: string;
  coverUrl?: string;
  subjects: string[];
  categories: string[];
  downloadUrl: string; // EPUB URL
  dateAdded: number; // Unix timestamp (ms)
  fileSize?: number; // bytes
}

export interface Chapter {
  bookId: string;
  index: number; // spine index
  title: string;
  href: string;
  content: string; // extracted plain text for AI search
}

export type BookWithChapters = Book & {
  chapters: Chapter[];
};

export interface ReadingProgress {
  bookId: string;
  cfi: string; // current position as CFI string
  furthestCfi: string; // furthest position reached
  currentChapterIndex: number;
  totalChapters: number;
  percentComplete: number; // 0–100
  lastReadAt: number; // Unix timestamp (ms)
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi: string;
  chapterIndex: number;
  label?: string; // optional user note
  createdAt: number; // Unix timestamp (ms)
}
