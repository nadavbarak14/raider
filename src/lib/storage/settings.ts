import { db } from './db';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import type { AppSettings, ReaderSettings } from '@/types/settings';

const SETTINGS_KEY = 'app' as const;

/**
 * Get current app settings, returning defaults if nothing has been saved yet.
 */
export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get(SETTINGS_KEY);
  if (!row) return { ...DEFAULT_APP_SETTINGS };
  return row.settings;
}

/**
 * Overwrite the entire settings record.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ id: SETTINGS_KEY, settings });
}

/**
 * Merge a partial `ReaderSettings` update into the stored settings.
 */
export async function updateReaderSettings(
  partial: Partial<ReaderSettings>
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    const updated: AppSettings = {
      ...current,
      readerSettings: {
        ...current.readerSettings,
        ...partial,
      },
    };
    await db.settings.put({ id: SETTINGS_KEY, settings: updated });
  });
}
