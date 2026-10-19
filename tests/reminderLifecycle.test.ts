import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '../src/db/db';
import { addReceivable, softDeleteReceivable } from '../src/db/receivables';
import { DEFAULT_REMINDERS, REMINDER_OWNER } from '../src/native/reminderPlan';

const mocks = vi.hoisted(() => ({
  native: true,
  preferences: '{}',
  pending: new Map(),
  listeners: new Map<string, (event: any) => void>(),
  navigate: vi.fn(),
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
}));

vi.mock('../src/native/platform', () => ({ isNativeIOS: () => mocks.native }));
vi.mock('../src/lib/router', () => ({ navigate: mocks.navigate }));
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: async () => ({ value: mocks.preferences }),
  set: async ({ value }: { value: string }) => { mocks.preferences = value; },
} }));
vi.mock('@capacitor/app', () => ({ App: {
  addListener: async (name: string, handler: (event: any) => void) => {
    mocks.listeners.set(name, handler);
    return { remove: async () => { mocks.listeners.delete(name); } };
  },
} }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  checkPermissions: mocks.checkPermissions,
  getPending: async () => ({ notifications: [...mocks.pending.values()] }),
  cancel: async ({ notifications }: { notifications: { id: number }[] }) => {
    notifications.forEach(({ id }) => mocks.pending.delete(id));
  },
  schedule: async ({ notifications }: { notifications: { id: number }[] }) => {
    notifications.forEach((item) => mocks.pending.set(item.id, item));
    return { notifications };
  },
  addListener: async (name: string, handler: (event: any) => void) => {
    mocks.listeners.set(name, handler);
    return { remove: async () => { mocks.listeners.delete(name); } };
  },
} }));

import { reminders, startNativeReminders } from '../src/native/reminders';
let stop: (() => void) | undefined;

beforeEach(async () => {
  mocks.native = true;
  mocks.preferences = JSON.stringify({ ...DEFAULT_REMINDERS, pendingEnabled: true });
  mocks.pending.clear();
  mocks.listeners.clear();
  vi.clearAllMocks();
  vi.stubGlobal('document', new EventTarget());
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  await Promise.resolve();
  vi.unstubAllGlobals();
});

it('账本提交自动刷新系统队列，返回前台恢复丢失的计划，停止后解除订阅', async () => {
  stop = startNativeReminders();
  await vi.waitFor(() => expect(mocks.checkPermissions).toHaveBeenCalled());
  const id = await addReceivable({
    title: '测试款项', projectCents: 100, reimburseCents: 0, contactName: '', contactInfo: '',
    remindDateKey: '2099-10-21', startDateKey: '2026-10-20', note: '',
  });
  await vi.waitFor(() => expect(mocks.pending.size).toBe(1));
  mocks.pending.clear();
  mocks.listeners.get('appStateChange')?.({ isActive: true });
  await vi.waitFor(() => expect(mocks.pending.size).toBe(1));
  await softDeleteReceivable(id);
  await vi.waitFor(() => expect(mocks.pending.size).toBe(0));
  stop();
  await vi.waitFor(() => expect(mocks.listeners.size).toBe(0));
  // 等已入队的核对结束，确认没有留下未处理的异步任务。
  await reminders.refresh();
});

it('通知点击进入对应标签页；划掉通知不触发页面跳转', async () => {
  stop = startNativeReminders();
  const handler = mocks.listeners.get('localNotificationActionPerformed')!;
  const notification = { extra: { owner: REMINDER_OWNER, kind: 'pending' } };
  handler({ notification, actionId: 'dismiss' });
  expect(mocks.navigate).not.toHaveBeenCalled();
  handler({ notification, actionId: 'tap' });
  expect(mocks.navigate).toHaveBeenCalledWith('/pending');
  await reminders.refresh();
});

it('普通网页不注册原生监听，也不读取系统通知权限', () => {
  mocks.native = false;
  stop = startNativeReminders();
  expect(mocks.listeners.size).toBe(0);
  expect(mocks.checkPermissions).not.toHaveBeenCalled();
});
