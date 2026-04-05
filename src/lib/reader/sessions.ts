import { v4 as uuid } from 'uuid';
import { db } from '@/lib/storage/db';
import type { ReadingSession } from '@/types/book';

/**
 * Start a new reading session.
 */
export async function startSession(bookId: string): Promise<string> {
  const session: ReadingSession = {
    id: uuid(),
    bookId,
    startedAt: Date.now(),
    endedAt: 0,
    wordsRead: 0,
    pagesRead: 0,
  };
  await db.readingSessions.put(session);
  return session.id;
}

/**
 * End a reading session with accumulated data.
 */
export async function endSession(
  sessionId: string,
  wordsRead: number,
  pagesRead: number
): Promise<void> {
  await db.readingSessions.update(sessionId, {
    endedAt: Date.now(),
    wordsRead,
    pagesRead,
  });
}

/**
 * Get all sessions for a book.
 */
export async function getSessionsForBook(bookId: string): Promise<ReadingSession[]> {
  return db.readingSessions.where('bookId').equals(bookId).toArray();
}

/**
 * Get all reading sessions.
 */
export async function getAllSessions(): Promise<ReadingSession[]> {
  return db.readingSessions.toArray();
}

/**
 * Get sessions within a date range.
 */
export async function getSessionsInRange(
  startDate: number,
  endDate: number
): Promise<ReadingSession[]> {
  return db.readingSessions
    .where('startedAt')
    .between(startDate, endDate)
    .toArray();
}

/**
 * Clean up orphaned sessions (endedAt === 0) that are older than 30 seconds.
 * Cap them at 2 hours or discard if < 30 seconds.
 */
export async function cleanupOrphanedSessions(): Promise<void> {
  const all = await db.readingSessions.toArray();
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const THIRTY_SECONDS = 30 * 1000;

  for (const session of all) {
    if (session.endedAt !== 0) continue;

    const elapsed = now - session.startedAt;
    if (elapsed < THIRTY_SECONDS) {
      // Too short — likely accidental open, delete
      await db.readingSessions.delete(session.id);
    } else {
      // Cap at 2 hours
      const capped = Math.min(elapsed, TWO_HOURS);
      await db.readingSessions.update(session.id, {
        endedAt: session.startedAt + capped,
      });
    }
  }
}
