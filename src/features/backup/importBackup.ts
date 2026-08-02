import { db } from '../../db/db';
import { newId } from '../../lib/id';
import { buildBackup } from './exportBackup';
import { parseBackup } from './backupSchema';
import type { SnapshotRow } from '../../db/types';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

/** 任何破坏性操作前无条件留一份快照 */
export async function takeSnapshot(reason: SnapshotRow['reason']): Promise<void> {
  const backup = await buildBackup();
  const payload = JSON.stringify(backup);

  await db.snapshots.add({
    id: newId(),
    at: Date.now(),
    reason,
    txCount: backup.counts.transactions,
    sizeBytes: payload.length,
    payload,
  });

  // 只保留最近 3 个自动快照；pre-import 的一律留着
  const autos = await db.snapshots.where('reason').equals('auto').sortBy('at');
  if (autos.length > 3) {
    await db.snapshots.bulkDelete(autos.slice(0, autos.length - 3).map((s) => s.id));
  }
}

export async function importBackup(text: string, mode: ImportMode): Promise<ImportResult> {
  const file = parseBackup(text);

  await takeSnapshot('pre-import');

  const result: ImportResult = { added: 0, updated: 0, skipped: 0 };

  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.settings.clear(),
      ]);
      await db.transactions.bulkAdd(file.data.transactions);
      await db.categories.bulkAdd(file.data.categories);
      await db.budgets.bulkAdd(file.data.budgets);
      result.added = file.data.transactions.length;
      return;
    }

    // 合并：按 id upsert，冲突时保留 updatedAt 更大的一方。永不删除。
    const existing = new Map(
      (await db.transactions.toArray()).map((row) => [row.id, row]),
    );

    const toPut = [];
    for (const row of file.data.transactions) {
      const current = existing.get(row.id);
      if (!current) {
        toPut.push(row);
        result.added += 1;
      } else if (row.updatedAt > current.updatedAt) {
        toPut.push(row);
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
    }
    if (toPut.length) await db.transactions.bulkPut(toPut);

    // 分类和预算同样按 updatedAt/存在性合并，不覆盖用户本地改过的分类名
    const existingCats = new Set((await db.categories.toArray()).map((c) => c.id));
    const newCats = file.data.categories.filter((c) => !existingCats.has(c.id));
    if (newCats.length) await db.categories.bulkAdd(newCats);

    const existingBudgets = new Map((await db.budgets.toArray()).map((b) => [b.id, b]));
    const budgetsToPut = file.data.budgets.filter((b) => {
      const current = existingBudgets.get(b.id);
      return !current || b.updatedAt > current.updatedAt;
    });
    if (budgetsToPut.length) await db.budgets.bulkPut(budgetsToPut);
  });

  return result;
}
