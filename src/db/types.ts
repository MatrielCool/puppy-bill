export type TxId = string;
export type CategoryId = string;

/** 收支方向。金额一律存正数，方向由这个字段承载。 */
export type TxKind = 'expense' | 'income';

export interface TransactionRow {
  id: TxId;
  kind: TxKind;
  /** 金额，单位「分」，永远是正整数。钱的运算绝不用浮点。 */
  amountCents: number;
  categoryId: CategoryId;
  /** 'YYYY-MM-DD'，按**本地时区**在录入时算好并建索引 */
  dateKey: string;
  /** 'YYYY-MM'，同上。让月视图和预算汇总变成单索引等值查找 */
  monthKey: string;
  /** epoch ms，用于同一天内排序 */
  ts: number;
  note: string;
  createdAt: number;
  updatedAt: number;
  /** 软删除。换来撤销、安全合并导入、误触不丢数据 */
  deletedAt: number | null;
}

export interface CategoryRow {
  id: CategoryId;
  name: string;
  emoji: string;
  kind: TxKind;
  sortOrder: number;
  /** IndexedDB 无法索引 boolean，所以用 0|1 */
  isBuiltin: 0 | 1;
  isArchived: 0 | 1;
}

export interface BudgetRow {
  /** `${monthKey}:${categoryId ?? 'TOTAL'}`，monthKey 为 '*' 表示每月沿用的默认值 */
  id: string;
  scope: 'total' | 'category';
  categoryId: CategoryId | null;
  monthKey: string;
  amountCents: number;
  updatedAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

/** 本地安全网：批量破坏性操作前自动留存的快照 */
export interface SnapshotRow {
  id: string;
  at: number;
  reason: 'auto' | 'pre-import' | 'manual';
  txCount: number;
  sizeBytes: number;
  payload: string;
}
