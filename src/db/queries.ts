import { db } from './db';
import { currentMonthKey, todayKey } from '../lib/dates';
import type { CategoryRow, TransactionRow, TxKind } from './types';

/**
 * 查询模式：按 monthKey / dateKey 单索引取出该区间的账，再在 JS 里滤掉软删除的。
 *
 * 不用 [monthKey+deletedAt] 复合索引，因为 IndexedDB 无法索引 null —— 未删除的
 * 记录（deletedAt 为 null）根本不会进入这类索引，查出来会是空的。
 * 一个月最多几百条，JS 过滤的开销可忽略。
 */

/** 某月的账，按时间倒序 */
export async function listMonth(monthKey: string): Promise<TransactionRow[]> {
  const rows = await db.transactions.where('monthKey').equals(monthKey).toArray();
  return rows.filter((r) => r.deletedAt === null).sort((a, b) => b.ts - a.ts);
}

/** 最近 n 条账，按时间倒序 */
export async function listRecent(limit: number): Promise<TransactionRow[]> {
  const rows = await db.transactions.orderBy('ts').reverse().limit(limit * 2).toArray();
  return rows.filter((r) => r.deletedAt === null).slice(0, limit);
}

export interface DaySummary {
  todayCents: number;
  monthExpenseCents: number;
  monthIncomeCents: number;
}

/** 首页顶部那条汇总：今日支出 + 本月收支 */
export async function getSummary(): Promise<DaySummary> {
  const today = todayKey();
  const month = currentMonthKey();

  const [todayRows, monthRows] = await Promise.all([
    db.transactions.where('dateKey').equals(today).toArray(),
    db.transactions.where('monthKey').equals(month).toArray(),
  ]);

  const alive = (rows: TransactionRow[]) => rows.filter((r) => r.deletedAt === null);
  const sum = (rows: TransactionRow[], kind: TxKind) =>
    rows.filter((r) => r.kind === kind).reduce((acc, r) => acc + r.amountCents, 0);

  return {
    todayCents: sum(alive(todayRows), 'expense'),
    monthExpenseCents: sum(alive(monthRows), 'expense'),
    monthIncomeCents: sum(alive(monthRows), 'income'),
  };
}

/**
 * 分类按「近 30 天使用频率」排序，最常用的排在最前 —— 记一笔时少划几下。
 * 没用过的按 sortOrder 兜底排在后面。
 */
export async function listCategoriesByFrequency(kind: TxKind): Promise<CategoryRow[]> {
  const categories = await db.categories
    .where('kind')
    .equals(kind)
    .and((c) => c.isArchived === 0)
    .toArray();

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = await db.transactions.where('ts').above(since).toArray();

  const freq = new Map<string, number>();
  for (const row of recent) {
    if (row.deletedAt !== null || row.kind !== kind) continue;
    freq.set(row.categoryId, (freq.get(row.categoryId) ?? 0) + 1);
  }

  return categories.sort((a, b) => {
    const diff = (freq.get(b.id) ?? 0) - (freq.get(a.id) ?? 0);
    return diff !== 0 ? diff : a.sortOrder - b.sortOrder;
  });
}
