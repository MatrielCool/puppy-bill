import { db, SCHEMA_VERSION } from '../../db/db';
import { todayKey } from '../../lib/dates';
import { formatAmount } from '../../lib/money';
import { FORMAT_VERSION, type BackupFile } from './backupSchema';

/** 组装完整备份（含软删除的记录 —— 它们是撤销和安全合并的依据） */
export async function buildBackup(): Promise<BackupFile> {
  const [transactions, categories, budgets, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.budgets.toArray(),
    db.settings.toArray(),
  ]);

  return {
    app: 'puppy-bill',
    formatVersion: FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
    },
    data: { transactions, categories, budgets, settings },
  };
}

export type DeliveryMethod = 'share' | 'download' | 'clipboard';

/**
 * 投递文件给用户。
 *
 * iOS standalone PWA 里 <a download> 不可靠 —— 文件预览会接管视图且无法返回 app。
 * navigator.share 是可靠路径，而且更有用：能存到「文件」App / iCloud 云盘、
 * 隔空投送到电脑、发到微信 —— 也就是**离开这台设备**，这才是备份的意义。
 */
export async function deliverFile(
  filename: string,
  content: string,
  mime: string,
): Promise<DeliveryMethod> {
  const file = new File([content], filename, { type: mime });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '小狗账单备份' });
      return 'share';
    } catch (error) {
      // 用户主动取消不算失败，直接向上抛让调用方区分
      if (error instanceof Error && error.name === 'AbortError') throw error;
      // 其他错误则降级到下载
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'download';
}

export async function exportJson(): Promise<DeliveryMethod> {
  const backup = await buildBackup();
  return deliverFile(
    `小狗账单-备份-${todayKey()}.json`,
    JSON.stringify(backup),
    'application/json',
  );
}

/**
 * CSV 导出，给 Excel 用。
 * 必须带 UTF-8 BOM，否则 Excel 打开中文是乱码。
 */
export async function exportCsv(): Promise<DeliveryMethod> {
  const [rows, categories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
  ]);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = ['日期,类型,分类,金额,备注'];

  for (const row of rows.filter((r) => r.deletedAt === null).sort((a, b) => a.ts - b.ts)) {
    lines.push(
      [
        row.dateKey,
        row.kind === 'expense' ? '支出' : '收入',
        escape(catMap.get(row.categoryId) ?? '未知分类'),
        formatAmount(row.amountCents),
        escape(row.note),
      ].join(','),
    );
  }

  return deliverFile(`小狗账单-${todayKey()}.csv`, `﻿${lines.join('\r\n')}`, 'text/csv');
}
