import { db } from '../db/db';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: Date.now() });
}

export const SETTING_LAST_BACKUP_AT = 'lastBackupAt';
