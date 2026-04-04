import { streamText } from 'ai';
import { createMockModel } from '@/lib/ai/mock-model';
import { generateMockResponse } from '@/lib/ai/mock-provider';
import type { QuestionType } from '@/types/thread';
import type { Chapter } from '@/types/book';

export async function POST(req: Request) {
  const body = await req.json();

  const {
    messages,
    chapters,
    currentChapterIndex,
    questionType,
    anchorText,
  } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    chapters: Chapter[];
    currentChapterIndex: number;
    questionType: QuestionType;
    anchorText?: string;
  };

  // Extract the latest user message as the query
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const query = lastUserMessage?.content ?? '';

  // Generate the mock response (search + spoiler guard)
  const mockResponse = generateMockResponse({
    questionType,
    query,
    anchorText,
    chapters: chapters ?? [],
    currentChapterIndex,
  });

  // Create a mock model that streams the pre-computed response.
  // When swapping to a real provider (e.g. Claude), replace this with
  // a real model and pass book context in the system prompt instead.
  const model = createMockModel(mockResponse.content);

  const result = streamText({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return result.toUIMessageStreamResponse();
}
