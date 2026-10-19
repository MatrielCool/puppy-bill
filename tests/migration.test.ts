import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { EMOJI_TO_ICON } from '../src/db/db';
import { ICON_PATHS } from '../src/ui/iconPaths.mjs';

/**
 * v1 → v2 迁移测试。
 *
 * 这条路径会在用户手机上对着已有数据真实跑一次 —— 迁移写错就是数据损坏，
 * 所以这里用一个独立的库名，完整模拟"先建 v1、写入数据、再用 v2 打开"的过程。
 */
describe('schema v1 → v2 迁移', () => {
  it('把 emoji 回填成图标名，且不动其他字段', async () => {
    const DB_NAME = 'puppy-bill-migration-test';
    await Dexie.delete(DB_NAME);

    // ── 1. 建一个 v1 结构的库，写入带 emoji 的分类 ──
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores({
      transactions: 'id, dateKey, monthKey, categoryId, ts, updatedAt, [monthKey+categoryId]',
      categories: 'id, kind, sortOrder, isArchived',
      budgets: 'id, monthKey, scope, [monthKey+scope]',
      settings: 'key',
      snapshots: 'id, at, reason',
    });
    await v1.open();
    await v1.table('categories').bulkAdd([
      { id: 'c_food', name: '餐饮', emoji: '🍜', kind: 'expense', sortOrder: 0, isBuiltin: 1, isArchived: 0 },
      { id: 'c_pet', name: '宠物', emoji: '🐶', kind: 'expense', sortOrder: 1, isBuiltin: 1, isArchived: 0 },
      { id: 'c_weird', name: '自定义', emoji: '🦄', kind: 'expense', sortOrder: 2, isBuiltin: 0, isArchived: 0 },
    ]);
    await v1.table('transactions').add({
      id: 't1', kind: 'expense', amountCents: 2800, categoryId: 'c_food',
      dateKey: '2026-08-03', monthKey: '2026-08', ts: 1, note: '午饭',
      createdAt: 1, updatedAt: 1, deletedAt: null,
    });
    v1.close();

    // ── 2. 用 v2 定义重新打开，触发升级 ──
    const v2 = new Dexie(DB_NAME);
    v2.version(1).stores({
      transactions: 'id, dateKey, monthKey, categoryId, ts, updatedAt, [monthKey+categoryId]',
      categories: 'id, kind, sortOrder, isArchived',
      budgets: 'id, monthKey, scope, [monthKey+scope]',
      settings: 'key',
      snapshots: 'id, at, reason',
    });
    v2.version(2).upgrade((tx) =>
      tx
        .table('categories')
        .toCollection()
        .modify((row: { icon?: string; emoji?: string }) => {
          row.icon ??= (row.emoji && EMOJI_TO_ICON[row.emoji]) || 'other';
        }),
    );
    await v2.open();

    const categories = await v2.table('categories').orderBy('sortOrder').toArray();

    expect(categories[0].icon).toBe('food');
    expect(categories[1].icon).toBe('pet');
    // 认不出的 emoji 退化为通用图标，而不是留空
    expect(categories[2].icon).toBe('other');

    // 每个回填出来的图标都必须真实存在，否则界面会是空白格子
    for (const c of categories) {
      expect(ICON_PATHS).toHaveProperty(c.icon);
    }

    // 其他字段原样保留
    expect(categories[0].name).toBe('餐饮');
    expect(categories[2].isBuiltin).toBe(0);

    // 交易数据分毫未动
    const tx = await v2.table('transactions').get('t1');
    expect(tx.amountCents).toBe(2800);
    expect(tx.note).toBe('午饭');

    v2.close();
    await Dexie.delete(DB_NAME);
  });
});

/**
 * v2 → v3 迁移。
 *
 * v3 只是新增 receivables 表，一个字段都没改 —— 但「只是加张表」正是最容易
 * 想当然的一类改动，而它同样会在真机上对着几个月的真实账目跑一次。
 * 这里要证明的只有一件事：老数据一条不少。
 */
describe('schema v2 → v3 迁移', () => {
  it('新增 receivables 表，原有数据分毫未动', async () => {
    const DB_NAME = 'puppy-bill-migration-test-v3';
    await Dexie.delete(DB_NAME);

    const V1_STORES = {
      transactions: 'id, dateKey, monthKey, categoryId, ts, updatedAt, [monthKey+categoryId]',
      categories: 'id, kind, sortOrder, isArchived',
      budgets: 'id, monthKey, scope, [monthKey+scope]',
      settings: 'key',
      snapshots: 'id, at, reason',
    };

    // ── 1. 建一个 v2 结构的库并写入真实形状的数据 ──
    const v2 = new Dexie(DB_NAME);
    v2.version(1).stores(V1_STORES);
    v2.version(2);
    await v2.open();
    await v2.table('categories').add({
      id: 'c_salary', name: '工资', icon: 'salary', kind: 'income',
      sortOrder: 0, isBuiltin: 1, isArchived: 0,
    });
    await v2.table('transactions').add({
      id: 't1', kind: 'income', amountCents: 500_000, categoryId: 'c_salary',
      dateKey: '2026-08-01', monthKey: '2026-08', ts: 1, note: '八月工资',
      createdAt: 1, updatedAt: 1, deletedAt: null,
    });
    await v2.table('budgets').add({
      id: '2026-08:TOTAL', scope: 'total', categoryId: null,
      monthKey: '2026-08', amountCents: 400_000, updatedAt: 1,
    });
    v2.close();

    // ── 2. 用 v3 定义重新打开，触发升级 ──
    const v3 = new Dexie(DB_NAME);
    v3.version(1).stores(V1_STORES);
    v3.version(2);
    v3.version(3).stores({
      receivables: 'id, status, remindDateKey, updatedAt, [status+remindDateKey]',
    });
    await v3.open();

    // 老数据必须原样还在 —— 这是这次升级唯一真正要紧的事
    const tx = await v3.table('transactions').get('t1');
    expect(tx.amountCents).toBe(500_000);
    expect(tx.note).toBe('八月工资');
    expect(await v3.table('categories').count()).toBe(1);
    expect((await v3.table('budgets').get('2026-08:TOTAL')).amountCents).toBe(400_000);

    // 新表建出来了，而且复合索引可用（「哪些该催了」全靠它）
    expect(await v3.table('receivables').count()).toBe(0);
    await v3.table('receivables').add({
      id: 'r1', title: '尾款', projectCents: 100, reimburseCents: 0,
      projectTxId: null, reimburseTxId: null, contactName: '', contactInfo: '',
      remindDateKey: '2026-09-08', startDateKey: '2026-08-09', note: '',
      status: 'open', createdAt: 1, updatedAt: 1, deletedAt: null,
    });
    const due = await v3
      .table('receivables')
      .where('[status+remindDateKey]')
      .between(['open', ''], ['open', '2026-09-30'], true, true)
      .toArray();
    expect(due).toHaveLength(1);

    v3.close();
    await Dexie.delete(DB_NAME);
  });
});
