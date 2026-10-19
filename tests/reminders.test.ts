import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionState } from '@capacitor/core';
import type { LocalNotificationSchema, ScheduleOptions } from '@capacitor/local-notifications';
import type { ReceivableRow } from '../src/db/types';
import { db } from '../src/db/db';
import { seedIfEmpty } from '../src/db/seed';
import { addReceivable, settlePart, unsettlePart, softDeleteReceivable, snoozeReminder } from '../src/db/receivables';
import { buildBackup } from '../src/features/backup/exportBackup';
import { importBackup } from '../src/features/backup/importBackup';
import { ReminderController } from '../src/native/reminderController';
import {
  buildReminderPlan, DAILY_ID, DEFAULT_REMINDERS, MAX_PENDING_DAYS,
  normalizePreferences, REMINDER_OWNER, reminderRoute, TEST_ID, type ReminderPreferences,
} from '../src/native/reminderPlan';

const now = new Date(2026, 9, 20, 8, 0);
const enabled: ReminderPreferences = { ...DEFAULT_REMINDERS, dailyEnabled: true, pendingEnabled: true };

function row(patch: Partial<ReceivableRow> = {}): ReceivableRow {
  return {
    id: 'r1', title: '私密项目', projectCents: 50000, reimburseCents: 1000,
    projectTxId: null, reimburseTxId: null, contactName: '私人联系人', contactInfo: '13800138000',
    remindDateKey: '2026-10-21', startDateKey: '2026-10-01', note: '', status: 'open',
    createdAt: 0, updatedAt: 0, deletedAt: null, ...patch,
  };
}

function harness(initial: ReminderPreferences = enabled, readRows = async () => [row()]) {
  let preferences = { ...initial };
  let permission: PermissionState = 'granted';
  let requested: PermissionState = 'granted';
  const pending = new Map<number, LocalNotificationSchema>();
  const api = {
    checkPermissions: vi.fn(async () => ({ display: permission })),
    requestPermissions: vi.fn(async () => { permission = requested; return { display: permission }; }),
    getPending: vi.fn(async () => ({ notifications: [...pending.values()] })),
    cancel: vi.fn(async ({ notifications }: { notifications: { id: number }[] }) => {
      notifications.forEach(({ id }) => pending.delete(id));
    }),
    schedule: vi.fn(async ({ notifications }: ScheduleOptions) => {
      notifications.forEach((item) => pending.set(item.id, item));
      return { notifications: notifications.map(({ id }) => ({ id })) };
    }),
  };
  const controller = new ReminderController({
    api, readRows, now: () => now,
    readPreferences: async () => preferences,
    writePreferences: async (next) => { preferences = next; },
  });
  return {
    api, pending, controller,
    setPermission: (value: PermissionState) => { permission = value; },
    setRequested: (value: PermissionState) => { requested = value; },
  };
}

describe('本地提醒计划', () => {
  it('默认全部关闭；损坏的时间回落到有效默认值', () => {
    expect(buildReminderPlan(DEFAULT_REMINDERS, [row()], now).notifications).toEqual([]);
    expect(normalizePreferences({ dailyEnabled: 'true', pendingTime: '24:99' })).toEqual(DEFAULT_REMINDERS);
  });

  it('每天使用日历时间重复，待入账按当地日期一次性安排', () => {
    const plan = buildReminderPlan(enabled, [row()], now);
    expect(plan.notifications[0].schedule).toEqual({ on: { hour: 21, minute: 0 }, repeats: true });
    expect(plan.notifications[1].schedule?.at).toEqual(new Date(2026, 9, 21, 9, 0));
    expect(plan.notifications.every((item) => item.sound === 'default')).toBe(true);
  });

  it('同日合并，保留部分未到账款项，排除结清与删除，不泄露财务详情', () => {
    const plan = buildReminderPlan(enabled, [
      row(), row({ id: 'partial', projectTxId: 't1' }),
      row({ id: 'paid', status: 'settled' }), row({ id: 'deleted', deletedAt: 1 }),
      row({ id: 'zero', projectCents: 0, reimburseCents: 0 }),
    ], now);
    expect(plan.pendingDays).toBe(1);
    expect(plan.notifications[1].body).toContain('2 笔');
    expect(JSON.stringify(plan)).not.toMatch(/私密项目|私人联系人|13800138000|50000/);
  });

  it('不补发已过时间的提醒，也不接受不存在的日历日期', () => {
    const plan = buildReminderPlan(enabled, [
      row({ remindDateKey: '2026-10-19' }), row({ remindDateKey: '2026-10-20' }),
      row({ remindDateKey: '2026-02-30' }),
    ], new Date(2026, 9, 20, 9, 1));
    expect(plan.pendingDays).toBe(0);
    expect(plan.skippedPast).toBe(2);
  });

  it('按时间选择最近 62 个提醒日，并报告未安排的部分', () => {
    const rows = Array.from({ length: 70 }, (_, i) => {
      const date = new Date(2026, 10, 1 + i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return row({ id: `r${i}`, remindDateKey: dateKey });
    }).reverse();
    const plan = buildReminderPlan(enabled, rows, now);
    expect(plan.pendingDays).toBe(MAX_PENDING_DAYS);
    expect(plan.deferredDays).toBe(8);
    expect(plan.notifications[1].schedule?.at).toEqual(new Date(2026, 10, 1, 9));
    expect(new Set(plan.notifications.map((item) => item.id)).size).toBe(63);
  });

  it('只允许自有通知进入预定页面', () => {
    expect(reminderRoute({ extra: { owner: REMINDER_OWNER, kind: 'pending' } })).toBe('/pending');
    expect(reminderRoute({ extra: { owner: REMINDER_OWNER, kind: 'daily' } })).toBe('/');
    expect(reminderRoute({ extra: { kind: 'pending', url: 'https://example.com' } })).toBeNull();
  });
});

describe('系统通知队列', () => {
  it('启动和自动核对不申请权限，不向未授权的系统安排通知', async () => {
    const h = harness();
    h.setPermission('prompt');
    await h.controller.refresh();
    expect(h.api.requestPermissions).not.toHaveBeenCalled();
    expect(h.api.schedule).not.toHaveBeenCalled();
  });

  it('仅主动开启时授权，拒绝后开关仍关闭', async () => {
    const h = harness(DEFAULT_REMINDERS);
    h.setPermission('prompt');
    h.setRequested('denied');
    await expect(h.controller.save({ dailyEnabled: true })).rejects.toThrow('通知未获允许');
    expect(h.controller.getSnapshot().preferences.dailyEnabled).toBe(false);
    expect(h.api.schedule).not.toHaveBeenCalled();
    h.setPermission('granted');
    await h.controller.save({ dailyEnabled: true });
    expect(h.pending.has(DAILY_ID)).toBe(true);
  });

  it('重复核对不重复安排；改时间替换，关闭取消', async () => {
    const h = harness();
    await h.controller.refresh();
    await h.controller.refresh();
    expect(h.api.schedule).toHaveBeenCalledTimes(1);
    await h.controller.save({ dailyTime: '20:30' });
    expect(h.pending.get(DAILY_ID)?.schedule?.on).toEqual({ hour: 20, minute: 30 });
    await h.controller.save({ dailyEnabled: false, pendingEnabled: false });
    expect(h.pending.size).toBe(0);
  });

  it('权限在系统设置中撤回后清理自有队列，不碰其他功能通知', async () => {
    const h = harness();
    h.pending.set(91, { id: 91, title: 'other', body: 'other' });
    await h.controller.refresh();
    h.setPermission('denied');
    await h.controller.refresh();
    expect([...h.pending.keys()]).toEqual([91]);
    expect(h.api.requestPermissions).not.toHaveBeenCalled();
  });

  it('快速连续修改按顺序执行，最终关闭不会被旧安排覆盖', async () => {
    const h = harness(DEFAULT_REMINDERS);
    await Promise.all([
      h.controller.save({ dailyEnabled: true }),
      h.controller.save({ dailyTime: '20:00' }),
      h.controller.save({ dailyEnabled: false }),
    ]);
    expect(h.pending.size).toBe(0);
    expect(h.controller.getSnapshot().preferences.dailyTime).toBe('20:00');
  });

  it('系统调用失败可见且能重试，失败不会阻塞后续请求', async () => {
    const h = harness();
    h.api.schedule.mockRejectedValueOnce(new Error('系统暂时不可用'));
    await expect(h.controller.refresh()).rejects.toThrow('系统暂时不可用');
    expect(h.controller.getSnapshot().error).toBe('系统暂时不可用');
    await h.controller.refresh();
    expect(h.controller.getSnapshot().error).toBeNull();
    expect(h.pending.size).toBe(2);
  });

  it('测试提醒只安排一条，不偷偷开启每日或待入账提醒', async () => {
    const h = harness(DEFAULT_REMINDERS);
    await h.controller.test();
    await h.controller.refresh();
    expect([...h.pending.keys()]).toEqual([TEST_ID]);
    expect(h.pending.get(TEST_ID)?.schedule?.at?.getTime()).toBe(now.getTime() + 10_000);
    expect(h.controller.getSnapshot().preferences).toEqual(DEFAULT_REMINDERS);
  });
});

describe('真实账本变更后的提醒核对（隔离 IndexedDB）', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await seedIfEmpty();
  });

  it('结清两部分才取消，撤销恢复，删除取消', async () => {
    const h = harness({ ...enabled, dailyEnabled: false }, () => db.receivables.toArray());
    const id = await addReceivable(row());
    await h.controller.refresh();
    expect(h.pending.size).toBe(1);
    await settlePart(id, 'project', { amountCents: 50000, categoryId: 'c_salary', dateKey: '2026-10-20' });
    await h.controller.refresh();
    expect(h.pending.size).toBe(1);
    await settlePart(id, 'reimburse', { amountCents: 1000, categoryId: 'c_salary', dateKey: '2026-10-20' });
    await h.controller.refresh();
    expect(h.pending.size).toBe(0);
    await unsettlePart(id, 'project');
    await h.controller.refresh();
    expect(h.pending.size).toBe(1);
    await softDeleteReceivable(id);
    await h.controller.refresh();
    expect(h.pending.size).toBe(0);
  });

  it('延期取消原日期；覆盖导入后以导入账本重建计划', async () => {
    const h = harness({ ...enabled, dailyEnabled: false }, () => db.receivables.toArray());
    const id = await addReceivable(row());
    const backup = JSON.stringify(await buildBackup());
    await h.controller.refresh();
    const originalIds = [...h.pending.keys()];
    await snoozeReminder(id, 3650);
    await h.controller.refresh();
    expect([...h.pending.keys()]).not.toEqual(originalIds);
    await importBackup(backup, 'replace');
    await h.controller.refresh();
    expect([...h.pending.keys()]).toEqual(originalIds);
  });
});
