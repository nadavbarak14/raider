'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TTSEngine, TTSStatus } from '@/lib/reader/tts';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface TTSControlsProps {
  engine: TTSEngine;
  onStop: () => void;
  theme: ReaderSettings['theme'];
}

export function TTSControls({ engine, onStop, theme }: TTSControlsProps) {
  const colors = getReaderThemeColors(theme);
  const [status, setStatus] = useState<TTSStatus>(engine.status);
  const [rate, setRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);

  useEffect(() => {
    engine.onStatusChange = setStatus;
    return () => {
      engine.onStatusChange = null;
    };
  }, [engine]);

  // Load voices (may be async in some browsers)
  useEffect(() => {
    function loadVoices() {
      const v = engine.getVoices();
      if (v.length > 0) setVoices(v);
    }

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, [engine]);

  function handlePlayPause() {
    if (status === 'speaking') {
      engine.pause();
    } else if (status === 'paused') {
      engine.resume();
    }
  }

  function handleStop() {
    engine.stop();
    onStop();
  }

  function handleSpeedChange(newRate: number) {
    setRate(newRate);
    engine.setRate(newRate);
    setShowSpeedPicker(false);
  }

  function handleVoiceChange(index: number) {
    setSelectedVoiceIndex(index);
    if (voices[index]) {
      engine.setVoice(voices[index]);
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'flex items-center gap-3 px-4 py-3',
        'backdrop-blur-md border-t',
        'animate-in slide-in-from-bottom-2 duration-200'
      )}
      style={{
        backgroundColor: `${colors.bg}f2`,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {/* Play/Pause */}
      <button
        type="button"
        onClick={handlePlayPause}
        className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center',
          'hover:opacity-90 active:scale-95 transition-all',
          'touch-manipulation'
        )}
        style={{ backgroundColor: colors.text, color: colors.bg }}
        aria-label={status === 'speaking' ? 'Pause' : 'Resume'}
      >
        {status === 'speaking' ? (
          <Pause className="size-5" />
        ) : (
          <Play className="size-5 ml-0.5" />
        )}
      </button>

      {/* Stop */}
      <button
        type="button"
        onClick={handleStop}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'border transition-colors touch-manipulation'
        )}
        style={{ borderColor: colors.border, color: colors.text }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        aria-label="Stop reading"
      >
        <Square className="size-4" />
      </button>

      {/* Speed selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSpeedPicker(!showSpeedPicker)}
          className={cn(
            'h-10 px-3 rounded-lg flex items-center gap-1',
            'border transition-colors text-sm font-medium touch-manipulation'
          )}
          style={{ borderColor: colors.border, color: colors.text }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {rate}x
          <ChevronDown className="size-3" />
        </button>
        {showSpeedPicker && (
          <div
            className="absolute bottom-full mb-2 left-0 rounded-lg shadow-lg border p-1 min-w-[80px]"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          >
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  'w-full px-3 py-1.5 rounded text-sm text-left transition-colors',
                  s === rate && 'font-bold'
                )}
                style={{
                  backgroundColor: s === rate ? colors.surface : 'transparent',
                  color: colors.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = s === rate ? colors.surface : 'transparent'; }}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice selector (compact) */}
      {voices.length > 1 && (
        <select
          value={selectedVoiceIndex}
          onChange={(e) => handleVoiceChange(Number(e.target.value))}
          className={cn(
            'h-10 px-2 rounded-lg border text-sm max-w-[120px] truncate'
          )}
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            color: colors.text,
          }}
          aria-label="Voice"
        >
          {voices.map((v, i) => (
            <option key={i} value={i}>
              {v.name.replace(/^(Microsoft |Google )/, '')}
            </option>
          ))}
        </select>
      )}

      {/* Status label */}
      <span className="text-xs ml-auto" style={{ color: colors.muted }}>
        {status === 'speaking' ? 'Reading aloud...' : status === 'paused' ? 'Paused' : ''}
      </span>
    </div>
  );
}
