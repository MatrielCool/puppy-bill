import { db } from './db';
import { listMonth } from './queries';
import type { BudgetRow, CategoryId } from './types';

/** monthKey 为 '*' 表示"每月自动沿用"的默认预算 */
export const RECURRING = '*';

export function budgetId(monthKey: string, categoryId: CategoryId | null): string {
  return `${monthKey}:${categoryId ?? 'TOTAL'}`;
}

export async function setBudget(
  monthKey: string,
  categoryId: CategoryId | null,
  amountCents: number,
): Promise<void> {
  const row: BudgetRow = {
    id: budgetId(monthKey, categoryId),
    scope: categoryId === null ? 'total' : 'category',
    categoryId,
    monthKey,
    amountCents,
    updatedAt: Date.now(),
  };
  await db.budgets.put(row);
}

export async function clearBudget(
  monthKey: string,
  categoryId: CategoryId | null,
): Promise<void> {
  await db.budgets.delete(budgetId(monthKey, categoryId));
}

/**
 * 解析某月某分类的预算。
 * 顺序：该月的精确设定 → 每月沿用的默认值 → 无预算。
 */
export async function resolveBudget(
  monthKey: string,
  categoryId: CategoryId | null,
): Promise<number | null> {
  const exact = await db.budgets.get(budgetId(monthKey, categoryId));
  if (exact) return exact.amountCents;
  const recurring = await db.budgets.get(budgetId(RECURRING, categoryId));
  return recurring ? recurring.amountCents : null;
}

export interface BudgetProgress {
  categoryId: CategoryId | null;
  budgetCents: number;
  spentCents: number;
  /** 已用比例，无上限（可能大于 1） */
  ratio: number;
}

export interface MonthBudgetView {
  total: BudgetProgress | null;
  categories: BudgetProgress[];
  /** 本月已花（不含收入） */
  spentCents: number;
  /** 超支的项数 —— 图标角标用它 */
  overCount: number;
  /** 总预算剩余额度；无总预算时为 null */
  remainingCents: number | null;
  /** 含今天在内、本月还剩几天 */
  daysLeft: number;
}

export async function getMonthBudgetView(monthKey: string): Promise<MonthBudgetView> {
  const rows = (await listMonth(monthKey)).filter((r) => r.kind === 'expense');

  const spentByCat = new Map<string, number>();
  let spentCents = 0;
  for (const row of rows) {
    spentCents += row.amountCents;
    spentByCat.set(row.categoryId, (spentByCat.get(row.categoryId) ?? 0) + row.amountCents);
  }

  const totalBudget = await resolveBudget(monthKey, null);
  const total: BudgetProgress | null =
    totalBudget === null
      ? null
      : {
          categoryId: null,
          budgetCents: totalBudget,
          spentCents,
          ratio: totalBudget > 0 ? spentCents / totalBudget : 0,
        };

  const allBudgets = await db.budgets.toArray();
  const catIds = new Set(
    allBudgets
      .filter((b) => b.scope === 'category' && (b.monthKey === monthKey || b.monthKey === RECURRING))
      .map((b) => b.categoryId as string),
  );

  const categories: BudgetProgress[] = [];
  for (const categoryId of catIds) {
    const budgetCents = await resolveBudget(monthKey, categoryId);
    if (budgetCents === null) continue;
    const spent = spentByCat.get(categoryId) ?? 0;
    categories.push({
      categoryId,
      budgetCents,
      spentCents: spent,
      ratio: budgetCents > 0 ? spent / budgetCents : 0,
    });
  }
  categories.sort((a, b) => b.ratio - a.ratio);

  const overCount =
    (total && total.spentCents > total.budgetCents ? 1 : 0) +
    categories.filter((c) => c.spentCents > c.budgetCents).length;

  return {
    total,
    categories,
    spentCents,
    overCount,
    remainingCents: total ? total.budgetCents - total.spentCents : null,
    daysLeft: daysLeftInMonth(monthKey),
  };
}

/** 含今天在内本月还剩几天；查看往月时返回 0 */
function daysLeftInMonth(monthKey: string): number {
  const now = new Date();
  const [y, m] = monthKey.split('-').map(Number);
  if (y !== now.getFullYear() || m !== now.getMonth() + 1) return 0;
  return new Date(y, m, 0).getDate() - now.getDate() + 1;
}
