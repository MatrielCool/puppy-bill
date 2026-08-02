import { db } from './db';
import { newId } from '../lib/id';
import { toMonthKey, fromDateKey, todayKey } from '../lib/dates';
import type { CategoryId, TransactionRow, TxId, TxKind } from './types';

export interface NewTransaction {
  kind: TxKind;
  amountCents: number;
  categoryId: CategoryId;
  dateKey: string;
  note: string;
}

export async function addTransaction(input: NewTransaction): Promise<TxId> {
  const now = Date.now();
  const row: TransactionRow = {
    id: newId(),
    kind: input.kind,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    dateKey: input.dateKey,
    monthKey: toMonthKey(fromDateKey(input.dateKey)),
    // 记的是今天就用真实时刻（同日内按录入顺序排）；补记往日则用当天中午。
    // 必须用 todayKey() 而非 toISOString()：后者是 UTC，东八区凌晨会判错日期
    ts: input.dateKey === todayKey() ? now : fromDateKey(input.dateKey).getTime(),
    note: input.note,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.transactions.add(row);
  return row.id;
}

export async function updateTransaction(
  id: TxId,
  patch: Partial<Omit<TransactionRow, 'id' | 'createdAt'>>,
): Promise<void> {
  const next: Partial<TransactionRow> = { ...patch, updatedAt: Date.now() };
  // dateKey 变了，monthKey 必须跟着变，否则月视图会漏账
  if (patch.dateKey) next.monthKey = toMonthKey(fromDateKey(patch.dateKey));
  await db.transactions.update(id, next);
}

/** 软删除：只打标记，数据还在，可以撤销 */
export async function softDeleteTransaction(id: TxId): Promise<void> {
  await db.transactions.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function restoreTransaction(id: TxId): Promise<void> {
  await db.transactions.update(id, { deletedAt: null, updatedAt: Date.now() });
}
