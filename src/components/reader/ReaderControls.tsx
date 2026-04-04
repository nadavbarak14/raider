'use client';

import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ReaderSettings } from '@/types/settings';

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
  ring: string;
}> = [
  { value: 'light', label: 'Light', bg: '#FFFFFF', fg: '#1a1a1a', ring: 'ring-gray-300' },
  { value: 'dark', label: 'Dark', bg: '#1a1a1a', fg: '#e0e0e0', ring: 'ring-gray-600' },
  { value: 'sepia', label: 'Sepia', bg: '#F5E6C8', fg: '#5B4636', ring: 'ring-amber-400' },
];

export function ReaderControls({
  settings,
  onSettingsChange,
  open,
  onClose,
}: ReaderControlsProps) {
  function update(partial: Partial<ReaderSettings>) {
    onSettingsChange({ ...settings, ...partial });
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl px-6 pb-8 pt-4">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <SheetHeader className="p-0 pb-4">
          <SheetTitle>Reading Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Font Size</label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">A</span>
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
              <span className="text-lg font-bold text-muted-foreground shrink-0">A</span>
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Line Spacing</label>
              <span className="text-sm tabular-nums text-muted-foreground">
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

          {/* Font Family */}
          <div>
            <label className="text-sm font-medium block mb-3">Font</label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => update({ fontFamily: font.value })}
                  className={cn(
                    'rounded-lg border py-2.5 px-3 text-sm transition-all min-h-[44px]',
                    'touch-manipulation',
                    settings.fontFamily === font.value
                      ? 'border-foreground bg-foreground text-background font-medium'
                      : 'border-border hover:border-foreground/30 bg-background'
                  )}
                  style={{ fontFamily: font.displayFont }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium block mb-3">Theme</label>
            <div className="flex gap-3 justify-center">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => update({ theme: theme.value })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 touch-manipulation'
                  )}
                  aria-label={`${theme.label} theme`}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center text-xs font-medium',
                      settings.theme === theme.value
                        ? 'ring-2 ring-offset-2 ring-offset-background border-foreground'
                        : 'border-border hover:border-foreground/30'
                    )}
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                  >
                    Aa
                  </div>
                  <span className="text-xs text-muted-foreground">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live preview text */}
          <div
            className="rounded-lg border p-4 transition-all"
            style={{
              fontFamily:
                settings.fontFamily === 'serif'
                  ? 'Georgia, serif'
                  : settings.fontFamily === 'dyslexia'
                    ? 'OpenDyslexic, Comic Sans MS, system-ui, sans-serif'
                    : 'system-ui, sans-serif',
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
              backgroundColor:
                settings.theme === 'dark'
                  ? '#1a1a1a'
                  : settings.theme === 'sepia'
                    ? '#F5E6C8'
                    : '#FFFFFF',
              color:
                settings.theme === 'dark'
                  ? '#e0e0e0'
                  : settings.theme === 'sepia'
                    ? '#5B4636'
                    : '#1a1a1a',
            }}
          >
            It was the best of times, it was the worst of times&hellip;
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
