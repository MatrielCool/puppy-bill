import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { seedIfEmpty } from '../src/db/seed';
import {
  addTransaction,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
} from '../src/db/mutations';
import { getSummary, listMonth } from '../src/db/queries';
import { todayKey } from '../src/lib/dates';

beforeEach(async () => {
  await db.transactions.clear();
  await db.categories.clear();
  await db.budgets.clear();
});

describe('内置分类种子', () => {
  it('首次启动写入分类', async () => {
    await seedIfEmpty();
    expect(await db.categories.count()).toBeGreaterThan(10);
  });

  it('重复调用不会写重复数据', async () => {
    await seedIfEmpty();
    const first = await db.categories.count();
    await seedIfEmpty();
    expect(await db.categories.count()).toBe(first);
  });
});

describe('记账', () => {
  it('写入后能按月查到', async () => {
    await addTransaction({
      kind: 'expense',
      amountCents: 2800,
      categoryId: 'c_food',
      dateKey: '2026-08-03',
      note: '午饭',
    });
    const rows = await listMonth('2026-08');
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(2800);
    expect(rows[0].monthKey).toBe('2026-08');
  });

  it('monthKey 由 dateKey 推导，不需要调用方传', async () => {
    await addTransaction({
      kind: 'expense',
      amountCents: 100,
      categoryId: 'c_food',
      dateKey: '2026-12-31',
      note: '',
    });
    expect((await db.transactions.toArray())[0].monthKey).toBe('2026-12');
  });

  it('改日期时 monthKey 跟着变，否则月视图会漏账', async () => {
    const id = await addTransaction({
      kind: 'expense',
      amountCents: 100,
      categoryId: 'c_food',
      dateKey: '2026-08-03',
      note: '',
    });
    await updateTransaction(id, { dateKey: '2026-09-01' });

    expect(await listMonth('2026-08')).toHaveLength(0);
    expect(await listMonth('2026-09')).toHaveLength(1);
  });
});

describe('软删除', () => {
  it('删除后查询不返回，但数据还在', async () => {
    const id = await addTransaction({
      kind: 'expense',
      amountCents: 500,
      categoryId: 'c_food',
      dateKey: '2026-08-03',
      note: '',
    });
    await softDeleteTransaction(id);

    expect(await listMonth('2026-08')).toHaveLength(0);
    expect(await db.transactions.count()).toBe(1);
  });

  it('可以撤销删除', async () => {
    const id = await addTransaction({
      kind: 'expense',
      amountCents: 500,
      categoryId: 'c_food',
      dateKey: '2026-08-03',
      note: '',
    });
    await softDeleteTransaction(id);
    await restoreTransaction(id);
    expect(await listMonth('2026-08')).toHaveLength(1);
  });
});

describe('汇总', () => {
  it('分别统计今日支出与本月收支，且不含已删除的', async () => {
    const today = todayKey();
    await addTransaction({ kind: 'expense', amountCents: 2800, categoryId: 'c_food', dateKey: today, note: '' });
    await addTransaction({ kind: 'expense', amountCents: 1200, categoryId: 'c_food', dateKey: today, note: '' });
    await addTransaction({ kind: 'income', amountCents: 500000, categoryId: 'c_salary', dateKey: today, note: '' });
    const deleted = await addTransaction({
      kind: 'expense', amountCents: 9999, categoryId: 'c_food', dateKey: today, note: '',
    });
    await softDeleteTransaction(deleted);

    const s = await getSummary();
    expect(s.todayCents).toBe(4000);
    expect(s.monthExpenseCents).toBe(4000);
    expect(s.monthIncomeCents).toBe(500000);
  });
});
