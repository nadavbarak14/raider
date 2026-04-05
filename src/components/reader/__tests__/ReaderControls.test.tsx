import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReaderControls } from '../ReaderControls';
import { DEFAULT_READER_SETTINGS } from '@/types/settings';
import type { ReaderSettings } from '@/types/settings';

// Mock the Sheet to render content directly (avoids portal issues in tests)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

function renderControls(
  overrides: Partial<ReaderSettings> = {},
  onSettingsChange = vi.fn()
) {
  const settings = { ...DEFAULT_READER_SETTINGS, ...overrides };
  return {
    settings,
    onSettingsChange,
    ...render(
      <ReaderControls
        settings={settings}
        onSettingsChange={onSettingsChange}
        open={true}
        onClose={vi.fn()}
      />
    ),
  };
}

describe('ReaderControls - Margins', () => {
  it('renders three margin buttons', () => {
    renderControls();
    expect(screen.getByRole('button', { name: /narrow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wide/i })).toBeInTheDocument();
  });

  it('calls onSettingsChange with correct margins value', async () => {
    const user = userEvent.setup();
    const { onSettingsChange, settings } = renderControls();

    await user.click(screen.getByRole('button', { name: /wide/i }));
    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, margins: 'wide' });

    await user.click(screen.getByRole('button', { name: /narrow/i }));
    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, margins: 'narrow' });
  });
});

describe('ReaderControls - Text Alignment', () => {
  it('renders alignment buttons', () => {
    renderControls();
    expect(screen.getByRole('button', { name: /left/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /justified/i })).toBeInTheDocument();
  });

  it('calls onSettingsChange with correct textAlign value', async () => {
    const user = userEvent.setup();
    const { onSettingsChange, settings } = renderControls();

    await user.click(screen.getByRole('button', { name: /left/i }));
    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, textAlign: 'left' });
  });
});

describe('ReaderControls - Brightness', () => {
  it('shows brightness label and current percentage', () => {
    renderControls({ brightness: 0.8 });
    expect(screen.getByText('Brightness')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows 100% for default brightness', () => {
    renderControls({ brightness: 1.0 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('ReaderControls - Existing settings', () => {
  it('shows current font family as selected', async () => {
    const user = userEvent.setup();
    const { onSettingsChange, settings } = renderControls({ fontFamily: 'serif' });

    await user.click(screen.getByRole('button', { name: /sans/i }));
    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, fontFamily: 'sans-serif' });
  });
});
