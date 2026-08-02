import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, SCHEMA_VERSION } from '../src/db/db';
import { seedIfEmpty } from '../src/db/seed';
import { addTransaction, softDeleteTransaction } from '../src/db/mutations';
import { buildBackup } from '../src/features/backup/exportBackup';
import { importBackup } from '../src/features/backup/importBackup';
import { BackupError, parseBackup } from '../src/features/backup/backupSchema';

async function wipe() {
  await Promise.all([
    db.transactions.clear(),
    db.categories.clear(),
    db.budgets.clear(),
    db.settings.clear(),
    db.snapshots.clear(),
  ]);
}

beforeEach(wipe);

async function makeSampleData() {
  await seedIfEmpty();
  await addTransaction({
    kind: 'expense', amountCents: 2800, categoryId: 'c_food', dateKey: '2026-08-03', note: '午饭',
  });
  await addTransaction({
    kind: 'income', amountCents: 500000, categoryId: 'c_salary', dateKey: '2026-08-01', note: '八月工资',
  });
  const gone = await addTransaction({
    kind: 'expense', amountCents: 100, categoryId: 'c_food', dateKey: '2026-08-02', note: '记错了',
  });
  await softDeleteTransaction(gone);
}

describe('备份往返 —— 整个项目最重要的测试', () => {
  it('导出 → 清空 → 覆盖导入，数据完全一致', async () => {
    await makeSampleData();
    const before = await db.transactions.orderBy('id').toArray();
    const beforeCats = await db.categories.orderBy('id').toArray();

    const json = JSON.stringify(await buildBackup());
    await wipe();
    expect(await db.transactions.count()).toBe(0);

    await importBackup(json, 'replace');

    expect(await db.transactions.orderBy('id').toArray()).toEqual(before);
    expect(await db.categories.orderBy('id').toArray()).toEqual(beforeCats);
  });

  it('备份包含软删除的记录 —— 它们是撤销和安全合并的依据', async () => {
    await makeSampleData();
    const backup = await buildBackup();
    expect(backup.data.transactions.filter((t) => t.deletedAt !== null)).toHaveLength(1);
  });

  it('金额分文不差', async () => {
    await makeSampleData();
    const json = JSON.stringify(await buildBackup());
    await wipe();
    await importBackup(json, 'replace');

    const rows = await db.transactions.toArray();
    expect(rows.reduce((a, r) => a + r.amountCents, 0)).toBe(2800 + 500000 + 100);
  });
});

describe('合并导入', () => {
  it('不删除本地已有但备份里没有的账目', async () => {
    await makeSampleData();
    const json = JSON.stringify(await buildBackup());

    await addTransaction({
      kind: 'expense', amountCents: 999, categoryId: 'c_food', dateKey: '2026-08-05', note: '备份后新增',
    });

    const result = await importBackup(json, 'merge');
    expect(result.skipped).toBe(3);
    // 备份里的 3 笔 + 备份后新增的 1 笔
    expect(await db.transactions.count()).toBe(4);
  });

  it('冲突时保留 updatedAt 更大的一方', async () => {
    await makeSampleData();
    const id = (await db.transactions.toArray())[0].id;

    const backup = await buildBackup();
    // 伪造一份"更新的"备份
    const newer = {
      ...backup,
      data: {
        ...backup.data,
        transactions: backup.data.transactions.map((t) =>
          t.id === id ? { ...t, note: '来自备份的新版本', updatedAt: t.updatedAt + 10_000 } : t,
        ),
      },
    };

    const result = await importBackup(JSON.stringify(newer), 'merge');
    expect(result.updated).toBe(1);
    expect((await db.transactions.get(id))?.note).toBe('来自备份的新版本');
  });

  it('导入前自动留快照', async () => {
    await makeSampleData();
    const json = JSON.stringify(await buildBackup());
    await importBackup(json, 'merge');

    const snapshots = await db.snapshots.where('reason').equals('pre-import').toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].txCount).toBe(3);
  });
});

describe('导入校验拦截坏文件', () => {
  const valid = () => ({
    app: 'puppy-bill',
    formatVersion: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { transactions: 0, categories: 0, budgets: 0 },
    data: { transactions: [], categories: [], budgets: [], settings: [] },
  });

  it('拒绝非 JSON', () => {
    expect(() => parseBackup('这不是 json')).toThrow(BackupError);
  });

  it('拒绝别的 app 的文件', () => {
    expect(() => parseBackup(JSON.stringify({ ...valid(), app: 'other-app' }))).toThrow(
      /不是小狗账单/,
    );
  });

  it('拒绝来自更新版本的备份', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...valid(), schemaVersion: SCHEMA_VERSION + 1 })),
    ).toThrow(/更新版本/);
  });

  it('拒绝被截断的文件 —— 分享传输后最现实的失败模式', () => {
    const truncated = { ...valid(), counts: { transactions: 5, categories: 0, budgets: 0 } };
    expect(() => parseBackup(JSON.stringify(truncated))).toThrow(/不完整|截断/);
  });

  it('拒绝金额为负或非整数的记录', () => {
    const bad = {
      ...valid(),
      counts: { transactions: 1, categories: 0, budgets: 0 },
      data: {
        ...valid().data,
        transactions: [
          {
            id: 'x', kind: 'expense', amountCents: -5, categoryId: 'c', dateKey: '2026-08-03',
            monthKey: '2026-08', ts: 1, note: '', createdAt: 1, updatedAt: 1, deletedAt: null,
          },
        ],
      },
    };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
  });

  it('拒绝日期格式错误的记录', () => {
    const bad = {
      ...valid(),
      counts: { transactions: 1, categories: 0, budgets: 0 },
      data: {
        ...valid().data,
        transactions: [
          {
            id: 'x', kind: 'expense', amountCents: 100, categoryId: 'c', dateKey: '2026/08/03',
            monthKey: '2026-08', ts: 1, note: '', createdAt: 1, updatedAt: 1, deletedAt: null,
          },
        ],
      },
    };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
  });

  it('校验失败时不会动数据库', async () => {
    await makeSampleData();
    const before = await db.transactions.count();
    await expect(importBackup('坏文件', 'replace')).rejects.toThrow(BackupError);
    expect(await db.transactions.count()).toBe(before);
  });
});
