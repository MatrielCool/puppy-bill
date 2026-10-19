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
  /** 图标名，对应 ui/iconPaths.mjs 里的键。schema v2 起取代 emoji */
  icon: string;
  /** @deprecated v1 遗留字段，仅为兼容旧备份保留，界面不再使用 */
  emoji?: string;
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

export type ReceivableId = string;

/**
 * 待入账 —— 已经谈定、但钱还没到的应收款。
 *
 * 一个项目的钱通常分两笔独立结清：**项目款**（服务费本身）和**报销款**
 * （本次项目垫付的差旅、采购等）。客户走的是不同流程，到账时间往往差很远，
 * 所以一条记录里并排放两个金额、两个独立的到账状态，而不是拆成两条记录 ——
 * 拆开就看不出「这个项目一共还欠我多少」。
 */
export interface ReceivableRow {
  id: ReceivableId;
  /** 款项内容 —— 是什么项目的款 */
  title: string;

  /** 项目款，单位「分」。与 reimburseCents 至少有一个为正 */
  projectCents: number;
  /** 报销款，单位「分」。为 0 表示这笔款没有报销部分 */
  reimburseCents: number;
  /** 项目款到账后生成的那条收入记录的 id；未到账为 null */
  projectTxId: TxId | null;
  /** 报销款到账后生成的那条收入记录的 id；未到账为 null */
  reimburseTxId: TxId | null;

  contactName: string;
  /** 微信号 / 手机号 / 邮箱，自由文本。是手机号时列表里可直接拨号 */
  contactInfo: string;

  /** 计划催款提醒日 'YYYY-MM-DD'。与账目不同，这个**可以是未来** */
  remindDateKey: string;
  /** 款项产生日 'YYYY-MM-DD'，新增时默认今天 */
  startDateKey: string;
  note: string;

  /**
   * 'open' 尚有未到账的部分 | 'settled' 全部到账。
   * 派生值，由 db/receivables.ts 的写操作统一重算，界面不直接改它 ——
   * 存下来是为了能走 [status+remindDateKey] 复合索引。
   */
  status: ReceivableStatus;
  createdAt: number;
  updatedAt: number;
  /** 软删除，与 transactions 一致：换来撤销、安全合并导入 */
  deletedAt: number | null;
}

export type ReceivableStatus = 'open' | 'settled';

/** 一条待入账里的两个可独立结清的部分 */
export type ReceivablePart = 'project' | 'reimburse';

/** 本地安全网：批量破坏性操作前自动留存的快照 */
export interface SnapshotRow {
  id: string;
  at: number;
  reason: 'auto' | 'pre-import' | 'manual';
  txCount: number;
  sizeBytes: number;
  payload: string;
}
