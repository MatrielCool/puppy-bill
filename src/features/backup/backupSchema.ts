import { z } from 'zod';
import { SCHEMA_VERSION } from '../../db/db';

/**
 * 导入前的校验。财务数据值得为此付出这点体积 ——
 * 一个损坏或截断的文件如果直接灌进数据库，损失是不可逆的。
 */

const txSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['expense', 'income']),
  amountCents: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  ts: z.number(),
  note: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  kind: z.enum(['expense', 'income']),
  sortOrder: z.number(),
  isBuiltin: z.union([z.literal(0), z.literal(1)]),
  isArchived: z.union([z.literal(0), z.literal(1)]),
});

const budgetSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(['total', 'category']),
  categoryId: z.string().nullable(),
  monthKey: z.string(),
  amountCents: z.number().int().nonnegative(),
  updatedAt: z.number(),
});

const settingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  updatedAt: z.number(),
});

export const FORMAT_VERSION = 1;

export const backupSchema = z.object({
  app: z.literal('puppy-bill'),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string(),
  counts: z.object({
    transactions: z.number().int().nonnegative(),
    categories: z.number().int().nonnegative(),
    budgets: z.number().int().nonnegative(),
  }),
  data: z.object({
    transactions: z.array(txSchema),
    categories: z.array(categorySchema),
    budgets: z.array(budgetSchema),
    settings: z.array(settingSchema).default([]),
  }),
});

export type BackupFile = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

/** 解析并校验备份文件，失败时抛出面向用户的中文错误 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('文件不是有效的 JSON，可能已损坏或选错了文件。');
  }

  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const isWrongApp =
      typeof raw === 'object' && raw !== null && (raw as { app?: unknown }).app !== 'puppy-bill';
    throw new BackupError(
      isWrongApp ? '这不是小狗账单的备份文件。' : '备份文件格式不正确，可能已损坏。',
    );
  }

  const file = result.data;

  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError(
      `这个备份来自更新版本的小狗账单（数据版本 ${file.schemaVersion}，当前 ${SCHEMA_VERSION}）。请先更新 app 再导入。`,
    );
  }

  // counts 与实际数组长度对不上 = 文件被截断。
  // 这是备份文件经过分享面板传输后最现实的失败模式。
  const actual = {
    transactions: file.data.transactions.length,
    categories: file.data.categories.length,
    budgets: file.data.budgets.length,
  };
  for (const key of ['transactions', 'categories', 'budgets'] as const) {
    if (file.counts[key] !== actual[key]) {
      throw new BackupError(
        `备份文件不完整：${key} 应有 ${file.counts[key]} 条，实际只有 ${actual[key]} 条。文件可能在传输中被截断了。`,
      );
    }
  }

  return file;
}
