import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Thread, Message } from '@/types/thread';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deserializeThread(stored: { messages: string } & Omit<Thread, 'messages'>): Thread {
  return {
    ...stored,
    messages: JSON.parse(stored.messages) as Message[],
  };
}

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Create a new thread and return its generated ID.
 */
export async function createThread(
  thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuidv4();
  const now = Date.now();

  await db.threads.add({
    ...thread,
    id,
    messages: JSON.stringify(thread.messages ?? []),
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

/**
 * Get a thread by ID, with its messages deserialised.
 */
export async function getThread(id: string): Promise<Thread | undefined> {
  const stored = await db.threads.get(id);
  if (!stored) return undefined;
  return deserializeThread(stored);
}

/**
 * Get all threads for a book, newest first.
 */
export async function getThreadsForBook(bookId: string): Promise<Thread[]> {
  const stored = await db.threads
    .where('bookId')
    .equals(bookId)
    .reverse()
    .sortBy('updatedAt');
  return stored.map(deserializeThread);
}

/**
 * Get threads anchored to a specific chapter.
 */
export async function getThreadsForChapter(
  bookId: string,
  chapterIndex: number
): Promise<Thread[]> {
  const stored = await db.threads
    .where('[bookId+chapterIndexAtCreation]')
    // Dexie compound index requires an array key
    .equals([bookId, chapterIndex])
    .toArray()
    .catch(() =>
      // Fallback if compound index not available (e.g. in tests)
      db.threads
        .where('bookId')
        .equals(bookId)
        .filter((t) => t.chapterIndexAtCreation === chapterIndex)
        .toArray()
    );
  return stored.map(deserializeThread);
}

/**
 * Append a message to an existing thread.
 */
export async function addMessage(
  threadId: string,
  message: Omit<Message, 'id' | 'timestamp'>
): Promise<string> {
  const id = uuidv4();
  const now = Date.now();
  const newMessage: Message = { ...message, id, threadId, timestamp: now };

  await db.transaction('rw', db.threads, async () => {
    const stored = await db.threads.get(threadId);
    if (!stored) throw new Error(`Thread ${threadId} not found`);

    const messages: Message[] = JSON.parse(stored.messages);
    messages.push(newMessage);

    await db.threads.update(threadId, {
      messages: JSON.stringify(messages),
      updatedAt: now,
    });
  });

  return id;
}

/**
 * Delete a thread and its associated messages.
 */
export async function deleteThread(id: string): Promise<void> {
  await db.transaction('rw', [db.threads, db.messages], async () => {
    await db.threads.delete(id);
    await db.messages.where('threadId').equals(id).delete();
  });
}
