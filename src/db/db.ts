import Dexie, { type Table } from 'dexie';
import type {
  BudgetRow,
  CategoryId,
  CategoryRow,
  SettingRow,
  SnapshotRow,
  TransactionRow,
  TxId,
} from './types';

/**
 * schema 版本规则（改动前必读）：
 *   1. 已发布的 version(n) 块**永不修改** —— 手机上已经按它建过索引了
 *   2. 加字段 → 升版本号 + 重述该表完整的 stores 字符串 + .upgrade() 回填默认值
 *   3. 主键**永不变更**
 *   4. SCHEMA_VERSION 会嵌进每个导出文件；导入时拒绝更新版本、正向迁移旧版本
 */
export const SCHEMA_VERSION = 2;

/** v1 的 emoji → v2 的图标名。迁移和旧备份导入都用它。 */
export const EMOJI_TO_ICON: Record<string, string> = {
  '🍜': 'food',
  '🚌': 'transit',
  '🛍️': 'shopping',
  '🏠': 'home',
  '🎮': 'fun',
  '💊': 'health',
  '📚': 'study',
  '🎁': 'social',
  '🐶': 'pet',
  '🐾': 'other',
  '💰': 'salary',
  '✨': 'bonus',
  '🧧': 'redpacket',
};

export class PuppyDB extends Dexie {
  transactions!: Table<TransactionRow, TxId>;
  categories!: Table<CategoryRow, CategoryId>;
  budgets!: Table<BudgetRow, string>;
  settings!: Table<SettingRow, string>;
  snapshots!: Table<SnapshotRow, string>;

  constructor() {
    super('puppy-bill');

    this.version(1).stores({
      // 刻意**不建** [monthKey+deletedAt] 这类含 deletedAt 的复合索引：
      // IndexedDB 无法索引 null，deletedAt 为 null（即未删除）的记录根本不会
      // 进入索引，那样的复合索引查不到任何活账。
      // 改为按 monthKey/dateKey 单索引取出该月/该日的账，再在 JS 里过滤软删除 ——
      // 一个月最多几百条，开销可忽略。
      // [monthKey+categoryId] 两列都非空，可正常使用，留给 Phase 4 的分类预算汇总。
      transactions:
        'id, dateKey, monthKey, categoryId, ts, updatedAt, [monthKey+categoryId]',
      categories: 'id, kind, sortOrder, isArchived',
      budgets: 'id, monthKey, scope, [monthKey+scope]',
      settings: 'key',
      snapshots: 'id, at, reason',
    });

    // v2：分类改用自绘图标名取代 emoji。索引没变，只回填字段。
    this.version(2).upgrade((tx) =>
      tx
        .table('categories')
        .toCollection()
        .modify((row: CategoryRow & { emoji?: string }) => {
          row.icon ??= (row.emoji && EMOJI_TO_ICON[row.emoji]) || 'other';
        }),
    );

    // 下一次改动的模板 —— 不要动上面已发布的 version 块：
    // this.version(3).stores({ transactions: '…原有索引…, newIndex' })
    //   .upgrade(tx => tx.table('transactions').toCollection()
    //     .modify(row => { row.newField ??= 默认值; }));
  }
}

export const db = new PuppyDB();
