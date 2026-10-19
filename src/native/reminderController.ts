import type { PermissionState } from '@capacitor/core';
import type { LocalNotificationsPlugin } from '@capacitor/local-notifications';
import type { ReceivableRow } from '../db/types';
import {
  buildReminderPlan, DEFAULT_REMINDERS, isOwnedReminder, normalizePreferences,
  reminderExtra, TEST_ID, validReminderTime, type ReminderPreferences,
} from './reminderPlan';

type NotificationAPI = Pick<LocalNotificationsPlugin,
  'checkPermissions' | 'requestPermissions' | 'getPending' | 'cancel' | 'schedule'>;

export interface ReminderStatus {
  preferences: ReminderPreferences;
  permission: PermissionState | 'unknown';
  ready: boolean;
  pendingDays: number;
  deferredDays: number;
  skippedPast: number;
  error: string | null;
}

interface Dependencies {
  api: NotificationAPI;
  readPreferences: () => Promise<unknown>;
  writePreferences: (value: ReminderPreferences) => Promise<void>;
  readRows: () => Promise<ReceivableRow[]>;
  now?: () => Date;
}

/** 串行核对系统队列，避免快速编辑或启停开关时旧请求覆盖新请求。 */
export class ReminderController {
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private status: ReminderStatus = {
    preferences: { ...DEFAULT_REMINDERS }, permission: 'unknown', ready: false,
    pendingDays: 0, deferredDays: 0, skippedPast: 0, error: null,
  };

  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) { this.dependencies = dependencies; }

  getSnapshot = (): ReminderStatus => this.status;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<ReminderStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work).catch((error: unknown) => {
      this.reportError(error);
      throw error;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  reportError(error: unknown) {
    this.update({ error: error instanceof Error ? error.message : '提醒未能同步，请重试。' });
  }

  refresh = () => this.enqueue(() => this.reconcile());

  save = (patch: Partial<ReminderPreferences>) => this.enqueue(async () => {
    for (const value of [patch.dailyTime, patch.pendingTime]) {
      if (value !== undefined && !validReminderTime(value)) throw new Error('请选择有效的提醒时间。');
    }
    const previous = normalizePreferences(await this.dependencies.readPreferences());
    const next = normalizePreferences({ ...previous, ...patch });
    const enabling = (patch.dailyEnabled === true && !previous.dailyEnabled)
      || (patch.pendingEnabled === true && !previous.pendingEnabled);
    if (enabling) await this.ensurePermission();
    await this.dependencies.writePreferences(next);
    this.update({ preferences: next });
    await this.reconcile();
  });

  test = () => this.enqueue(async () => {
    await this.ensurePermission();
    await this.dependencies.api.cancel({ notifications: [{ id: TEST_ID }] });
    await this.dependencies.api.schedule({ notifications: [{
      id: TEST_ID,
      title: '小狗来报到啦',
      body: '这是一条测试提醒。以后也会这样提醒你。',
      sound: 'default',
      schedule: { at: new Date(this.now().getTime() + 10_000) },
      extra: reminderExtra('test', 'test'),
    }] });
    await this.reconcile();
  });

  private now() { return this.dependencies.now?.() ?? new Date(); }

  private async ensurePermission() {
    let { display } = await this.dependencies.api.checkPermissions();
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      ({ display } = await this.dependencies.api.requestPermissions());
    }
    this.update({ permission: display });
    if (display !== 'granted') {
      throw new Error('通知未获允许，请在 iPhone「设置 → 通知 → 小狗账单」中开启。');
    }
  }

  private async reconcile() {
    const { api } = this.dependencies;
    const preferences = normalizePreferences(await this.dependencies.readPreferences());
    const { display } = await api.checkPermissions();
    this.update({ preferences, permission: display });
    const { notifications: pending } = await api.getPending();
    const owned = pending.filter(isOwnedReminder);
    if (display !== 'granted') {
      // 仅核对权限，启动和返回前台绝不主动弹授权框。
      if (owned.length) await api.cancel({ notifications: owned.map(({ id }) => ({ id })) });
      this.update({ ready: true, pendingDays: 0, deferredDays: 0, skippedPast: 0, error: null });
      return;
    }

    // 也给将来可能增加的其他通知保留空间，测试通知始终预留一个位置。
    const otherCount = pending.filter((item) => !isOwnedReminder(item)).length;
    const plan = buildReminderPlan(preferences, await this.dependencies.readRows(), this.now(),
      64 - otherCount - 1 - (preferences.dailyEnabled ? 1 : 0));
    const desired = new Map(plan.notifications.map((item) => [item.id, item]));
    const current = new Map(owned.filter((item) => item.id !== TEST_ID).map((item) => [item.id, item]));
    const fingerprint = (item: { extra?: unknown }) =>
      (item.extra as { fingerprint?: string } | undefined)?.fingerprint;
    const obsolete = [...current.values()].filter((item) =>
      !desired.has(item.id) || fingerprint(item) !== fingerprint(desired.get(item.id)!));
    const added = plan.notifications.filter((item) =>
      !current.has(item.id) || fingerprint(item) !== fingerprint(current.get(item.id)!));

    if (obsolete.length) await api.cancel({ notifications: obsolete.map(({ id }) => ({ id })) });
    if (added.length) await api.schedule({ notifications: added });
    this.update({
      ready: true, pendingDays: plan.pendingDays, deferredDays: plan.deferredDays,
      skippedPast: plan.skippedPast, error: null,
    });
  }
}
