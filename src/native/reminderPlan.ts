import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { ReceivableRow } from '../db/types';
import { toDateKey } from '../lib/dates';

export interface ReminderPreferences {
  dailyEnabled: boolean;
  dailyTime: string;
  pendingEnabled: boolean;
  pendingTime: string;
}

export const DEFAULT_REMINDERS: ReminderPreferences = {
  dailyEnabled: false,
  dailyTime: '21:00',
  pendingEnabled: false,
  pendingTime: '09:00',
};

export const REMINDER_OWNER = 'puppy-bill-reminders-v1';
export const DAILY_ID = 7001;
export const TEST_ID = 7002;
// iOS 最多保留 64 条待发通知；为每日重复通知和测试通知各留一个位置。
export const MAX_PENDING_DAYS = 62;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validReminderTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function normalizePreferences(value: unknown): ReminderPreferences {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<ReminderPreferences>;
  return {
    dailyEnabled: raw.dailyEnabled === true,
    dailyTime: typeof raw.dailyTime === 'string' && TIME_RE.test(raw.dailyTime)
      ? raw.dailyTime : DEFAULT_REMINDERS.dailyTime,
    pendingEnabled: raw.pendingEnabled === true,
    pendingTime: typeof raw.pendingTime === 'string' && TIME_RE.test(raw.pendingTime)
      ? raw.pendingTime : DEFAULT_REMINDERS.pendingTime,
  };
}

export function reminderExtra(kind: 'daily' | 'pending' | 'test', fingerprint: string) {
  return { owner: REMINDER_OWNER, kind, fingerprint };
}

export function isOwnedReminder(notification: { extra?: unknown }): boolean {
  return (notification.extra as { owner?: string } | undefined)?.owner === REMINDER_OWNER;
}

/** 只接受已知通知类型，绝不使用通知数据中的任意 URL 导航。 */
export function reminderRoute(notification: { extra?: unknown }): '/' | '/pending' | '/settings' | null {
  if (!isOwnedReminder(notification)) return null;
  const kind = (notification.extra as { kind?: string }).kind;
  return kind === 'daily' ? '/' : kind === 'pending' ? '/pending' : kind === 'test' ? '/settings' : null;
}

/** 纯计划：本地日历时间；同一天合并；已过时的提醒不反复补发。 */
export function buildReminderPlan(
  preferences: ReminderPreferences,
  rows: ReceivableRow[],
  now: Date,
  pendingLimit = MAX_PENDING_DAYS,
) {
  const notifications: LocalNotificationSchema[] = [];
  if (preferences.dailyEnabled) {
    const [hour, minute] = preferences.dailyTime.split(':').map(Number);
    notifications.push({
      id: DAILY_ID,
      title: '小狗等你记一笔',
      body: '花一分钟，收好今天的生活日常。',
      sound: 'default',
      schedule: { on: { hour, minute }, repeats: true },
      extra: reminderExtra('daily', `daily:${preferences.dailyTime}:${now.getTimezoneOffset()}`),
    });
  }

  const counts = new Map<string, number>();
  let skippedPast = 0;
  if (preferences.pendingEnabled) {
    for (const row of rows) {
      const outstanding = (row.projectTxId === null ? row.projectCents : 0)
        + (row.reimburseTxId === null ? row.reimburseCents : 0);
      if (row.deletedAt !== null || row.status !== 'open' || outstanding <= 0) continue;
      counts.set(row.remindDateKey, (counts.get(row.remindDateKey) ?? 0) + 1);
    }
  }

  const [hour, minute] = preferences.pendingTime.split(':').map(Number);
  const pending: LocalNotificationSchema[] = [];
  for (const [dateKey, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const [year, month, day] = dateKey.split('-').map(Number);
    const at = new Date(year, month - 1, day, hour, minute);
    // 导入的数据也可能包含无效日历日期。
    if (toDateKey(at) !== dateKey) continue;
    if (at.getTime() <= now.getTime()) {
      skippedPast += count;
      continue;
    }
    pending.push({
      id: 100_000_000 + Number(dateKey.replaceAll('-', '')),
      title: '有一笔好消息，该问问啦',
      body: `有 ${count} 笔待入账到了提醒日期，点开看看。`,
      sound: 'default',
      schedule: { at },
      extra: reminderExtra('pending', `pending:${at.getTime()}:${count}`),
    });
  }

  const limit = Math.max(0, Math.min(MAX_PENDING_DAYS, pendingLimit));
  notifications.push(...pending.slice(0, limit));
  return {
    notifications,
    pendingDays: Math.min(pending.length, limit),
    deferredDays: Math.max(0, pending.length - limit),
    skippedPast,
  };
}
