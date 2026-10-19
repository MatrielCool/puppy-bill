import { db } from './db';
import { newId } from '../lib/id';
import { addTransaction, softDeleteTransaction } from './mutations';
import { dateKeyOffset, todayKey } from '../lib/dates';
import type {
  CategoryId,
  ReceivableId,
  ReceivablePart,
  ReceivableRow,
  ReceivableStatus,
} from './types';

/**
 * 待入账的全部读写。
 *
 * 查询模式与 queries.ts 一致：走索引取出候选，再在 JS 里滤掉软删除的 ——
 * IndexedDB 索引不了 null，deletedAt 为 null（即未删除）的记录根本不会进入
 * 含 deletedAt 的索引。应收款的量级是几十条，JS 过滤的开销可忽略。
 */

/** 某一部分是否已经不欠了：要么本来就没有这部分，要么已到账 */
function partDone(row: ReceivableRow, part: ReceivablePart): boolean {
  return part === 'project'
    ? row.projectCents === 0 || row.projectTxId !== null
    : row.reimburseCents === 0 || row.reimburseTxId !== null;
}

/** status 是派生值，每次写入都由这里重算，绝不让界面直接赋值 */
function deriveStatus(row: ReceivableRow): ReceivableStatus {
  return partDone(row, 'project') && partDone(row, 'reimburse') ? 'settled' : 'open';
}

/** 这条记录还欠着多少钱（已到账的部分不计） */
export function outstandingCents(row: ReceivableRow): number {
  return (
    (row.projectTxId === null ? row.projectCents : 0) +
    (row.reimburseTxId === null ? row.reimburseCents : 0)
  );
}

export function partCents(row: ReceivableRow, part: ReceivablePart): number {
  return part === 'project' ? row.projectCents : row.reimburseCents;
}

export function partTxId(row: ReceivableRow, part: ReceivablePart): string | null {
  return part === 'project' ? row.projectTxId : row.reimburseTxId;
}

export const PART_LABEL: Record<ReceivablePart, string> = {
  project: '项目款',
  reimburse: '报销款',
};

// ---------------------------------------------------------------- 读

/** 全部未删除的待入账，按提醒日升序 —— 最该催的排最前 */
export async function listReceivables(): Promise<ReceivableRow[]> {
  const rows = await db.receivables.toArray();
  return rows
    .filter((r) => r.deletedAt === null)
    .sort((a, b) => a.remindDateKey.localeCompare(b.remindDateKey) || a.createdAt - b.createdAt);
}

/** 已到提醒日、还没结清的记录 */
export async function listDueReceivables(): Promise<ReceivableRow[]> {
  // [status+remindDateKey] 两列都非空，可安全走复合索引。
  // 空串排在所有非空字符串之前，因此下界用 ['open', ''] 即覆盖全部提醒日。
  const rows = await db.receivables
    .where('[status+remindDateKey]')
    .between(['open', ''], ['open', todayKey()], true, true)
    .toArray();
  return rows.filter((r) => r.deletedAt === null);
}

export interface DueSummary {
  count: number;
  cents: number;
}

/** 标签栏红点和记一笔页横幅都用它 */
export async function getDueSummary(): Promise<DueSummary> {
  const rows = await listDueReceivables();
  return {
    count: rows.length,
    cents: rows.reduce((acc, row) => acc + outstandingCents(row), 0),
  };
}

export interface ReceivableSummary {
  /** 未到账总额 */
  openCents: number;
  /** 其中项目款部分 */
  projectOpenCents: number;
  /** 其中报销款部分 */
  reimburseOpenCents: number;
  openCount: number;
  /** 已到提醒日的笔数 */
  dueCount: number;
  /** 已到提醒日的未到账金额 */
  dueCents: number;
}

/**
 * 汇总是纯函数，列表页拿到 rows 后直接算 —— 页面已经为了渲染取过一次数据，
 * 再为汇总开第二个 useLiveQuery 只会让同一份数据查两遍。
 */
export function summarize(rows: ReceivableRow[]): ReceivableSummary {
  const today = todayKey();
  const summary: ReceivableSummary = {
    openCents: 0,
    projectOpenCents: 0,
    reimburseOpenCents: 0,
    openCount: 0,
    dueCount: 0,
    dueCents: 0,
  };

  for (const row of rows) {
    if (row.status !== 'open') continue;
    const project = row.projectTxId === null ? row.projectCents : 0;
    const reimburse = row.reimburseTxId === null ? row.reimburseCents : 0;

    summary.openCount += 1;
    summary.projectOpenCents += project;
    summary.reimburseOpenCents += reimburse;
    summary.openCents += project + reimburse;

    if (row.remindDateKey <= today) {
      summary.dueCount += 1;
      summary.dueCents += project + reimburse;
    }
  }

  return summary;
}

/**
 * 取出已到账的那些部分对应的收入记录的日期，供列表显示「✓ 已到账 8月9日」。
 *
 * 刻意不把到账日冗余存在 receivables 上 —— 那笔收入的日期可以在账单页被改，
 * 冗余一份就会悄悄对不上。这里现查，量级是几十条。
 */
export async function loadSettledDates(rows: ReceivableRow[]): Promise<Map<string, string>> {
  const ids = rows
    .flatMap((r) => [r.projectTxId, r.reimburseTxId])
    .filter((id): id is string => id !== null);
  if (ids.length === 0) return new Map();

  const txs = await db.transactions.bulkGet(ids);
  return new Map(txs.filter((tx) => tx !== undefined).map((tx) => [tx.id, tx.dateKey]));
}

// ---------------------------------------------------------------- 写

export interface NewReceivable {
  title: string;
  projectCents: number;
  reimburseCents: number;
  contactName: string;
  contactInfo: string;
  remindDateKey: string;
  startDateKey: string;
  note: string;
}

function assertAmounts(projectCents: number, reimburseCents: number): void {
  if (projectCents + reimburseCents <= 0) {
    throw new Error('项目款和报销款不能都是 0');
  }
}

export async function addReceivable(input: NewReceivable): Promise<ReceivableId> {
  assertAmounts(input.projectCents, input.reimburseCents);
  const now = Date.now();
  const row: ReceivableRow = {
    id: newId(),
    ...input,
    projectTxId: null,
    reimburseTxId: null,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.receivables.add(row);
  return row.id;
}

/**
 * 改一条待入账。
 *
 * 金额可能被改动（比如报销款从 800 改成 0），所以每次都重算 status ——
 * 否则一条实际已经结清的记录会一直挂在「进行中」里。
 */
export async function updateReceivable(
  id: ReceivableId,
  patch: Partial<Omit<ReceivableRow, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.transaction('rw', db.receivables, async () => {
    const row = await db.receivables.get(id);
    if (!row) throw new Error('这条待入账已经不存在了');

    // 不用 Collection.modify：它会把回调里抛的错包成 ModifyError，
    // 校验失败的原因就被埋掉了
    const next: ReceivableRow = { ...row, ...patch };
    assertAmounts(next.projectCents, next.reimburseCents);
    next.status = deriveStatus(next);
    next.updatedAt = Date.now();
    await db.receivables.put(next);
  });
}

/** 软删除：项目黄了、录错了，都走这里。数据还在，可以撤销 */
export async function softDeleteReceivable(id: ReceivableId): Promise<void> {
  await db.receivables.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function restoreReceivable(id: ReceivableId): Promise<void> {
  await db.receivables.update(id, { deletedAt: null, updatedAt: Date.now() });
}

/**
 * 催过一轮之后把提醒日往后推。
 *
 * 这是实际使用中最高频的动作 —— 客户说「再等等」，不该逼人去开编辑表单改日期。
 */
export async function snoozeReminder(id: ReceivableId, days: number): Promise<void> {
  await db.receivables.update(id, {
    remindDateKey: dateKeyOffset(days),
    updatedAt: Date.now(),
  });
}

export interface SettleInput {
  /** 实际到账金额。默认等于该部分的应收额，但客户少付/多付是真实存在的 */
  amountCents: number;
  categoryId: CategoryId;
  /** 实际到账日 'YYYY-MM-DD' */
  dateKey: string;
  note?: string;
}

/**
 * 标记某一部分到账 —— 本功能的关键连接点。
 *
 * 钱到账后不该再手工去「记一笔」录一遍，所以这里直接生成对应的收入记录，
 * 并把它的 id 记在待入账上，这样撤销时能精确地把那一笔收回来。
 *
 * 生成收入走 mutations.addTransaction 而不是自己拼 row —— monthKey 派生和
 * 跨时区的 ts 处理都在那里，绕过去就会埋坑。
 */
export async function settlePart(
  id: ReceivableId,
  part: ReceivablePart,
  input: SettleInput,
): Promise<void> {
  await db.transaction('rw', [db.receivables, db.transactions], async () => {
    const row = await db.receivables.get(id);
    if (!row) throw new Error('这条待入账已经不存在了');
    if (partTxId(row, part) !== null) return; // 已到账，重复点击直接忽略

    const txId = await addTransaction({
      kind: 'income',
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      dateKey: input.dateKey,
      // 备注默认带上项目名，这样在账单页点开就知道这笔收入是哪来的
      note: input.note ?? `「${row.title}」${PART_LABEL[part]}`,
    });

    const next: ReceivableRow = {
      ...row,
      ...(part === 'project' ? { projectTxId: txId } : { reimburseTxId: txId }),
    };
    next.status = deriveStatus(next);
    next.updatedAt = Date.now();
    await db.receivables.put(next);
  });
}

/**
 * 撤销「标记到账」。
 *
 * 对应的收入记录走软删除而不是硬删 —— 与账单页的删除保持一致，
 * 万一是误撤销，数据还在备份和快照里。
 */
export async function unsettlePart(id: ReceivableId, part: ReceivablePart): Promise<void> {
  await db.transaction('rw', [db.receivables, db.transactions], async () => {
    const row = await db.receivables.get(id);
    if (!row) return;
    const txId = partTxId(row, part);
    if (txId === null) return;

    await softDeleteTransaction(txId);

    const next: ReceivableRow = {
      ...row,
      ...(part === 'project' ? { projectTxId: null } : { reimburseTxId: null }),
    };
    next.status = deriveStatus(next);
    next.updatedAt = Date.now();
    await db.receivables.put(next);
  });
}
