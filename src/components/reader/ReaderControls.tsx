'use client';

import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Sun, X } from 'lucide-react';
import type { ReaderSettings } from '@/types/settings';
import { getReaderThemeColors } from '@/components/reader/theme-colors';

interface ReaderControlsProps {
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  open: boolean;
  onClose: () => void;
}

const FONT_FAMILIES: Array<{
  value: ReaderSettings['fontFamily'];
  label: string;
  displayFont: string;
}> = [
  { value: 'serif', label: 'Serif', displayFont: 'Georgia, serif' },
  { value: 'sans-serif', label: 'Sans', displayFont: 'system-ui, sans-serif' },
  { value: 'dyslexia', label: 'Easy Read', displayFont: 'system-ui, sans-serif' },
];

const THEMES: Array<{
  value: ReaderSettings['theme'];
  label: string;
  bg: string;
  fg: string;
}> = [
  { value: 'light', label: 'Light', bg: '#FFFFFF', fg: '#1a1a1a' },
  { value: 'dark', label: 'Dark', bg: '#1a1a1a', fg: '#e0e0e0' },
  { value: 'sepia', label: 'Sepia', bg: '#F5E6C8', fg: '#5B4636' },
];

export function ReaderControls({
  settings,
  onSettingsChange,
  open,
  onClose,
}: ReaderControlsProps) {
  const colors = getReaderThemeColors(settings.theme);

  function update(partial: Partial<ReaderSettings>) {
    onSettingsChange({ ...settings, ...partial });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Settings panel — inline bottom overlay */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'rounded-t-2xl shadow-2xl border-t',
          'max-h-[70vh] overflow-y-auto',
          'animate-in slide-in-from-bottom duration-300',
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-3 pb-2" style={{ backgroundColor: colors.bg }}>
          {/* Drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ backgroundColor: colors.trackBg }} />
          <h2 className="text-base font-semibold mt-2">Themes & Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 p-2 rounded-full touch-manipulation transition-colors"
            style={{ color: colors.muted }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close settings"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Theme */}
          <div>
            <label className="text-xs font-medium block mb-2.5" style={{ color: colors.muted }}>THEME</label>
            <div className="flex gap-4 justify-center">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => update({ theme: theme.value })}
                  className="flex flex-col items-center gap-1.5 touch-manipulation"
                  aria-label={`${theme.label} theme`}
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center text-xs font-medium',
                      settings.theme === theme.value
                        ? 'ring-2 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    )}
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.fg,
                      borderColor: settings.theme === theme.value ? colors.accent : colors.border,
                    } as React.CSSProperties}
                  >
                    Aa
                  </div>
                  <span className="text-xs" style={{ color: settings.theme === theme.value ? colors.text : colors.muted }}>
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: colors.muted }}>FONT SIZE</label>
              <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs shrink-0" style={{ color: colors.muted }}>A</span>
              <Slider
                min={12}
                max={32}
                step={1}
                value={[settings.fontSize]}
                onValueChange={(val) => {
                  const arr = Array.isArray(val) ? val : [val];
                  update({ fontSize: arr[0] });
                }}
              />
              <span className="text-lg font-bold shrink-0" style={{ color: colors.muted }}>A</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: colors.muted }}>FONT</label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => update({ fontFamily: font.value })}
                  className={cn(
                    'rounded-lg border py-2.5 px-3 text-sm transition-all min-h-[44px]',
                    'touch-manipulation font-medium',
                  )}
                  style={{
                    fontFamily: font.displayFont,
                    backgroundColor: settings.fontFamily === font.value ? colors.text : 'transparent',
                    color: settings.fontFamily === font.value ? colors.bg : colors.text,
                    borderColor: settings.fontFamily === font.value ? colors.text : colors.border,
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: colors.muted }}>LINE SPACING</label>
              <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
                {settings.lineSpacing.toFixed(1)}
              </span>
            </div>
            <Slider
              min={1.0}
              max={2.5}
              step={0.1}
              value={[settings.lineSpacing]}
              onValueChange={(val) => {
                const arr = Array.isArray(val) ? val : [val];
                update({ lineSpacing: Math.round(arr[0] * 10) / 10 });
              }}
            />
          </div>

          {/* Reading Mode */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: colors.muted }}>READING MODE</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'paginated' as const, label: 'Paginated' },
                { value: 'scrolled' as const, label: 'Scroll' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ flowMode: opt.value })}
                  className={cn(
                    'rounded-lg border py-2.5 px-3 text-sm transition-all min-h-[44px]',
                    'touch-manipulation font-medium',
                  )}
                  style={{
                    backgroundColor: settings.flowMode === opt.value ? colors.text : 'transparent',
                    color: settings.flowMode === opt.value ? colors.bg : colors.text,
                    borderColor: settings.flowMode === opt.value ? colors.text : colors.border,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: colors.muted }}>MARGINS</label>
            <div className="grid grid-cols-3 gap-2">
              {(['narrow', 'medium', 'wide'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ margins: m })}
                  className={cn(
                    'rounded-lg border py-2.5 px-3 text-sm capitalize transition-all min-h-[44px]',
                    'touch-manipulation font-medium',
                  )}
                  style={{
                    backgroundColor: settings.margins === m ? colors.text : 'transparent',
                    color: settings.margins === m ? colors.bg : colors.text,
                    borderColor: settings.margins === m ? colors.text : colors.border,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: colors.muted }}>ALIGNMENT</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'left' as const, label: 'Left' },
                { value: 'justify' as const, label: 'Justified' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ textAlign: opt.value })}
                  className={cn(
                    'rounded-lg border py-2.5 px-3 text-sm transition-all min-h-[44px]',
                    'touch-manipulation font-medium',
                  )}
                  style={{
                    backgroundColor: settings.textAlign === opt.value ? colors.text : 'transparent',
                    color: settings.textAlign === opt.value ? colors.bg : colors.text,
                    borderColor: settings.textAlign === opt.value ? colors.text : colors.border,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: colors.muted }}>BRIGHTNESS</label>
              <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
                {Math.round(settings.brightness * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="size-4 shrink-0 opacity-40" style={{ color: colors.muted }} />
              <Slider
                min={0.2}
                max={1.0}
                step={0.05}
                value={[settings.brightness]}
                onValueChange={(val) => {
                  const arr = Array.isArray(val) ? val : [val];
                  update({ brightness: Math.round(arr[0] * 100) / 100 });
                }}
              />
              <Sun className="size-5 shrink-0" style={{ color: colors.muted }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
