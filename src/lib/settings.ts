import { db } from '../db/db';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: Date.now() });
}

export const SETTING_LAST_BACKUP_AT = 'lastBackupAt';

/**
 * 记一笔页的催款横幅被关掉的那一天（dateKey）。
 *
 * 存日期而不是布尔值 —— 关掉只静音当天，第二天自动回来。真欠着的钱
 * 不该被永久静音，但也不该在同一天里反复戳你。
 */
export const SETTING_PENDING_MUTED_ON = 'pendingBannerMutedOn';
