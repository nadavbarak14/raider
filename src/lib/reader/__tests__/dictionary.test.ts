import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanWord, lookupWord, clearDictionaryCache } from '../dictionary';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  clearDictionaryCache();
  // Reset navigator.onLine to true
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOCK_RESPONSE = [
  {
    word: 'hello',
    phonetic: '/həˈloʊ/',
    meanings: [
      {
        partOfSpeech: 'interjection',
        definitions: [
          { definition: 'Used as a greeting.' },
          { definition: 'Used to answer the telephone.' },
        ],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          { definition: 'An utterance of "hello"; a greeting.' },
        ],
      },
    ],
  },
];

describe('cleanWord', () => {
  it('strips punctuation', () => {
    expect(cleanWord('"hello"')).toBe('hello');
    expect(cleanWord('hello,')).toBe('hello');
    expect(cleanWord('(world)')).toBe('world');
    expect(cleanWord('...test...')).toBe('test');
  });

  it('preserves hyphens and apostrophes', () => {
    expect(cleanWord("don't")).toBe("don't");
    expect(cleanWord('well-known')).toBe('well-known');
  });

  it('lowercases', () => {
    expect(cleanWord('Hello')).toBe('hello');
  });
});

describe('lookupWord', () => {
  it('returns result for valid word', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    });

    const result = await lookupWord('hello');
    expect(result).not.toBeNull();
    expect(result?.word).toBe('hello');
    expect(result?.phonetic).toBe('/həˈloʊ/');
    expect(result?.meanings).toHaveLength(2);
    expect(result?.meanings[0].partOfSpeech).toBe('interjection');
    expect(result?.meanings[0].definitions).toHaveLength(2);
  });

  it('returns null for 404 (word not found)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await lookupWord('xyznonexistent');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await lookupWord('test');
    expect(result).toBeNull();
  });

  it('returns cached result on second call without re-fetching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    });

    await lookupWord('hello');
    const second = await lookupWord('hello');

    expect(second?.word).toBe('hello');
    // fetch should only be called once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns null when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const result = await lookupWord('hello-offline-test');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
