// ── Types ────────────────────────────────────────────────────────────────────

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: string[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

// ── In-memory session cache ─────────────────────────────────────────────────

const cache = new Map<string, DictionaryResult | null>();

/** Clear the in-memory dictionary cache. Useful for testing. */
export function clearDictionaryCache() {
  cache.clear();
}

// ── API ─────────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Strip leading/trailing punctuation from a word.
 */
export function cleanWord(raw: string): string {
  return raw.replace(/^[^\w'-]+|[^\w'-]+$/g, '').toLowerCase();
}

/**
 * Look up a word in the free dictionary API.
 * Returns null if word not found, offline, or on error.
 */
export async function lookupWord(raw: string): Promise<DictionaryResult | null> {
  const word = cleanWord(raw);
  if (!word) return null;

  // Check cache
  if (cache.has(word)) return cache.get(word) ?? null;

  // Offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
    if (!res.ok) {
      cache.set(word, null);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    if (!data || !Array.isArray(data) || data.length === 0) {
      cache.set(word, null);
      return null;
    }

    const entry = data[0];
    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((p: { text?: string }) => p.text)?.text ||
      undefined;

    const meanings: DictionaryMeaning[] = (entry.meanings || [])
      .slice(0, 3)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        partOfSpeech: m.partOfSpeech || '',
        definitions: (m.definitions || [])
          .slice(0, 3)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((d: any) => d.definition || ''),
      }));

    const result: DictionaryResult = { word, phonetic, meanings };
    cache.set(word, result);
    return result;
  } catch {
    cache.set(word, null);
    return null;
  }
}

/**
 * Check if the device is currently online.
 */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}
