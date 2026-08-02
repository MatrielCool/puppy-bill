import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { addTransaction, softDeleteTransaction } from '../src/db/mutations';
import { getMonthBudgetView, RECURRING, resolveBudget, setBudget, clearBudget } from '../src/db/budgets';
import { currentMonthKey, shiftMonth, toMonthKey } from '../src/lib/dates';

beforeEach(async () => {
  await Promise.all([db.transactions.clear(), db.budgets.clear(), db.categories.clear()]);
});

describe('预算解析顺序', () => {
  it('该月的精确设定优先于每月沿用的默认值', async () => {
    await setBudget(RECURRING, 'c_food', 100000);
    await setBudget('2026-08', 'c_food', 50000);
    expect(await resolveBudget('2026-08', 'c_food')).toBe(50000);
    // 其他月份仍用默认值
    expect(await resolveBudget('2026-09', 'c_food')).toBe(100000);
  });

  it('没有精确设定时回落到每月沿用', async () => {
    await setBudget(RECURRING, null, 400000);
    expect(await resolveBudget('2026-08', null)).toBe(400000);
  });

  it('都没有则返回 null，而不是 0 —— 0 预算和没设预算是两回事', async () => {
    expect(await resolveBudget('2026-08', 'c_food')).toBeNull();
  });

  it('取消预算会同时清掉本月和每月沿用两条，避免残留把设置"复活"', async () => {
    await setBudget(RECURRING, 'c_food', 100000);
    await setBudget('2026-08', 'c_food', 50000);
    await Promise.all([clearBudget('2026-08', 'c_food'), clearBudget(RECURRING, 'c_food')]);
    expect(await resolveBudget('2026-08', 'c_food')).toBeNull();
  });
});

describe('预算进度', () => {
  const thisMonth = currentMonthKey();
  const dayIn = (monthKey: string) => `${monthKey}-15`;

  it('只统计支出，收入不占用预算', async () => {
    await setBudget(thisMonth, null, 100000);
    await addTransaction({
      kind: 'expense', amountCents: 30000, categoryId: 'c_food', dateKey: dayIn(thisMonth), note: '',
    });
    await addTransaction({
      kind: 'income', amountCents: 500000, categoryId: 'c_salary', dateKey: dayIn(thisMonth), note: '',
    });

    const view = await getMonthBudgetView(thisMonth);
    expect(view.total?.spentCents).toBe(30000);
    expect(view.remainingCents).toBe(70000);
  });

  it('不统计已删除的账目', async () => {
    await setBudget(thisMonth, null, 100000);
    const id = await addTransaction({
      kind: 'expense', amountCents: 30000, categoryId: 'c_food', dateKey: dayIn(thisMonth), note: '',
    });
    await softDeleteTransaction(id);

    expect((await getMonthBudgetView(thisMonth)).total?.spentCents).toBe(0);
  });

  it('超支时 overCount 累计总预算和各分类，供图标角标使用', async () => {
    await setBudget(thisMonth, null, 10000);
    await setBudget(thisMonth, 'c_food', 5000);
    await setBudget(thisMonth, 'c_fun', 5000);

    await addTransaction({
      kind: 'expense', amountCents: 9000, categoryId: 'c_food', dateKey: dayIn(thisMonth), note: '',
    });
    await addTransaction({
      kind: 'expense', amountCents: 8000, categoryId: 'c_fun', dateKey: dayIn(thisMonth), note: '',
    });

    const view = await getMonthBudgetView(thisMonth);
    // 总预算 10000 花了 17000 超支，两个分类也都超了 → 3
    expect(view.overCount).toBe(3);
  });

  it('未超支时 overCount 为 0', async () => {
    await setBudget(thisMonth, null, 100000);
    await addTransaction({
      kind: 'expense', amountCents: 1000, categoryId: 'c_food', dateKey: dayIn(thisMonth), note: '',
    });
    expect((await getMonthBudgetView(thisMonth)).overCount).toBe(0);
  });

  it('只算当月的账，上个月的不计入', async () => {
    const last = shiftMonth(thisMonth, -1);
    await setBudget(thisMonth, null, 100000);
    await addTransaction({
      kind: 'expense', amountCents: 50000, categoryId: 'c_food', dateKey: dayIn(last), note: '',
    });
    expect((await getMonthBudgetView(thisMonth)).total?.spentCents).toBe(0);
  });

  it('没有总预算时 total 为 null，剩余额度也为 null', async () => {
    const view = await getMonthBudgetView(thisMonth);
    expect(view.total).toBeNull();
    expect(view.remainingCents).toBeNull();
  });

  it('查看往月时剩余天数为 0，不会算出误导性的每日额度', async () => {
    const last = shiftMonth(thisMonth, -1);
    await setBudget(last, null, 100000);
    expect((await getMonthBudgetView(last)).daysLeft).toBe(0);
  });

  it('本月剩余天数含今天，且不超过当月总天数', async () => {
    const view = await getMonthBudgetView(thisMonth);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(view.daysLeft).toBeGreaterThanOrEqual(1);
    expect(view.daysLeft).toBeLessThanOrEqual(daysInMonth);
  });
});

describe('月份切换', () => {
  it('跨年正确', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('往返一致', () => {
    expect(shiftMonth(shiftMonth('2026-08', -5), 5)).toBe('2026-08');
  });

  it('与 toMonthKey 结果一致', () => {
    expect(shiftMonth('2026-08', 0)).toBe(toMonthKey(new Date(2026, 7, 15)));
  });
});
