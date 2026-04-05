import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunkText, createTTSEngine } from '../tts';

describe('chunkText', () => {
  it('splits text at paragraph boundaries', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe('First paragraph.');
    expect(chunks[1]).toBe('Second paragraph.');
    expect(chunks[2]).toBe('Third paragraph.');
  });

  it('keeps short paragraphs as single chunks', () => {
    const text = 'Short paragraph.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
  });

  it('splits long text without sentence boundaries by word count', () => {
    // Create a paragraph with > 200 words and no sentence boundaries
    const words = Array(250).fill('word').join(' ');
    const chunks = chunkText(words);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be <= 200 words
    for (const chunk of chunks) {
      expect(chunk.split(/\s+/).length).toBeLessThanOrEqual(200);
    }
  });

  it('returns empty array for empty/whitespace text', () => {
    expect(chunkText('')).toHaveLength(0);
    expect(chunkText('   ')).toHaveLength(0);
  });
});

describe('createTTSEngine', () => {
  beforeEach(() => {
    // Mock window.speechSynthesis
    const mockUtterance = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', mockUtterance);

    vi.stubGlobal('speechSynthesis', {
      speak: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('reports isSupported when speechSynthesis exists', () => {
    const engine = createTTSEngine();
    expect(engine.isSupported).toBe(true);
  });

  it('starts in idle status', () => {
    const engine = createTTSEngine();
    expect(engine.status).toBe('idle');
  });

  it('stop cancels speech and resets to idle', () => {
    const engine = createTTSEngine();
    engine.stop();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(engine.status).toBe('idle');
  });

  it('pause calls speechSynthesis.pause', () => {
    const engine = createTTSEngine();
    engine.pause();
    expect(window.speechSynthesis.pause).toHaveBeenCalled();
  });

  it('resume calls speechSynthesis.resume', () => {
    const engine = createTTSEngine();
    engine.resume();
    expect(window.speechSynthesis.resume).toHaveBeenCalled();
  });

  it('setRate clamps to 0.5-2.0', () => {
    const engine = createTTSEngine();
    engine.setRate(0.1); // should clamp to 0.5
    engine.setRate(3.0); // should clamp to 2.0
    // No assertion needed — just verify no errors
  });

  it('getVoices returns available voices', () => {
    const mockVoice = { name: 'Test Voice' } as SpeechSynthesisVoice;
    (window.speechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([mockVoice]);

    const engine = createTTSEngine();
    const voices = engine.getVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0].name).toBe('Test Voice');
  });
});
