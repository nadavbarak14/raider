export type QuestionType =
  | 'ask_ai'
  | 'who_is_this'
  | 'explain'
  | 'recap'
  | 'general'
  | 'define';

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix timestamp (ms)
}

export interface Thread {
  id: string;
  bookId: string;
  anchorCfi: string | null; // where in the book; null for general threads
  anchorText: string | null; // highlighted passage; null for general threads
  chapterIndexAtCreation: number; // spoiler boundary
  messages: Message[];
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number; // Unix timestamp (ms)
  isGeneral: boolean;
}
