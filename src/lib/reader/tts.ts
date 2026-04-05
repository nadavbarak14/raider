/**
 * Text-to-Speech engine wrapping the Web Speech API.
 * Free, works offline, supports adjustable speed and voice selection.
 */

export type TTSStatus = 'idle' | 'speaking' | 'paused';

export interface TTSEngine {
  readonly isSupported: boolean;
  readonly status: TTSStatus;
  speak(text: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setRate(rate: number): void;
  setVoice(voice: SpeechSynthesisVoice): void;
  getVoices(): SpeechSynthesisVoice[];
  onEnd: (() => void) | null;
  onStatusChange: ((status: TTSStatus) => void) | null;
}

const MAX_CHUNK_LENGTH = 200; // words per chunk (Chrome 15s bug workaround)

/**
 * Split text into chunks at paragraph/sentence boundaries.
 */
export function chunkText(text: string): string[] {
  if (!text.trim()) return [];

  // Split by paragraphs first (double newline)
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const chunks: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length <= MAX_CHUNK_LENGTH) {
      chunks.push(para.trim());
    } else {
      // Split long paragraphs at sentence boundaries
      const sentences = para.split(/(?<=[.!?])\s+/);

      // If no sentence boundaries, split by word count
      if (sentences.length <= 1) {
        for (let i = 0; i < words.length; i += MAX_CHUNK_LENGTH) {
          chunks.push(words.slice(i, i + MAX_CHUNK_LENGTH).join(' '));
        }
      } else {
        let current: string[] = [];
        let currentWordCount = 0;

        for (const sentence of sentences) {
          const sentenceWords = sentence.trim().split(/\s+/).length;
          if (currentWordCount + sentenceWords > MAX_CHUNK_LENGTH && current.length > 0) {
            chunks.push(current.join(' '));
            current = [sentence.trim()];
            currentWordCount = sentenceWords;
          } else {
            current.push(sentence.trim());
            currentWordCount += sentenceWords;
          }
        }
        if (current.length > 0) {
          chunks.push(current.join(' '));
        }
      }
    }
  }

  return chunks.filter((c) => c.trim());
}

/**
 * Create a TTS engine instance.
 */
export function createTTSEngine(): TTSEngine {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  let currentStatus: TTSStatus = 'idle';
  let currentRate = 1.0;
  let currentVoice: SpeechSynthesisVoice | null = null;
  let chunkQueue: string[] = [];
  let chunkIndex = 0;

  const engine: TTSEngine = {
    get isSupported() {
      return supported;
    },
    get status() {
      return currentStatus;
    },
    onEnd: null,
    onStatusChange: null,

    speak(text: string) {
      if (!supported) return;
      this.stop();

      chunkQueue = chunkText(text);
      chunkIndex = 0;
      if (chunkQueue.length === 0) return;

      speakNextChunk();
    },

    pause() {
      if (!supported) return;
      window.speechSynthesis.pause();
      setStatus('paused');
    },

    resume() {
      if (!supported) return;
      window.speechSynthesis.resume();
      setStatus('speaking');
    },

    stop() {
      if (!supported) return;
      window.speechSynthesis.cancel();
      chunkQueue = [];
      chunkIndex = 0;
      setStatus('idle');
    },

    setRate(rate: number) {
      currentRate = Math.max(0.5, Math.min(2.0, rate));
    },

    setVoice(voice: SpeechSynthesisVoice) {
      currentVoice = voice;
    },

    getVoices(): SpeechSynthesisVoice[] {
      if (!supported) return [];
      return window.speechSynthesis.getVoices();
    },
  };

  function setStatus(s: TTSStatus) {
    currentStatus = s;
    engine.onStatusChange?.(s);
  }

  function speakNextChunk() {
    if (chunkIndex >= chunkQueue.length) {
      setStatus('idle');
      engine.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunkQueue[chunkIndex]);
    utterance.rate = currentRate;
    if (currentVoice) utterance.voice = currentVoice;

    utterance.onend = () => {
      chunkIndex++;
      speakNextChunk();
    };

    utterance.onerror = () => {
      // Skip failed chunk, try next
      chunkIndex++;
      if (chunkIndex < chunkQueue.length) {
        speakNextChunk();
      } else {
        setStatus('idle');
        engine.onEnd?.();
      }
    };

    setStatus('speaking');
    window.speechSynthesis.speak(utterance);
  }

  return engine;
}
