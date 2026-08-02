import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '../../db/db';
import { listMonth } from '../../db/queries';
import { restoreTransaction, softDeleteTransaction } from '../../db/mutations';
import { formatCNY, formatCNYGrouped } from '../../lib/money';
import { currentMonthKey, formatDayHeader, formatMonthLabel } from '../../lib/dates';
import type { TransactionRow } from '../../db/types';
import type { ToastData } from '../../ui/Toast';
import styles from './ListScreen.module.css';

/**
 * Phase 1 的列表只做「看得见 + 删得掉」。
 * 月份切换、搜索、筛选、编辑留到 Phase 3。
 */
export function ListScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const monthKey = currentMonthKey();
  const rows = useLiveQuery(() => listMonth(monthKey), [monthKey]);
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c]));

  const expense = (rows ?? [])
    .filter((r) => r.kind === 'expense')
    .reduce((a, r) => a + r.amountCents, 0);
  const income = (rows ?? [])
    .filter((r) => r.kind === 'income')
    .reduce((a, r) => a + r.amountCents, 0);

  const byDay = groupByDay(rows ?? []);

  const handleDelete = (row: TransactionRow) => {
    void softDeleteTransaction(row.id);
    onToast({
      id: Date.now(),
      text: `已删除 ${formatCNY(row.amountCents)}`,
      actionLabel: '撤销',
      onAction: () => void restoreTransaction(row.id),
    });
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{formatMonthLabel(monthKey)}</h1>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCell}>
            <span className={styles.summaryLabel}>支出</span>
            <span className={styles.summaryValue}>{formatCNYGrouped(expense)}</span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryLabel}>收入</span>
            <span className={clsx(styles.summaryValue, styles.income)}>
              {formatCNYGrouped(income)}
            </span>
          </div>
          <div className={styles.summaryCell}>
            <span className={styles.summaryLabel}>结余</span>
            <span className={styles.summaryValue}>{formatCNYGrouped(income - expense)}</span>
          </div>
        </div>
      </div>

      {rows?.length === 0 && (
        <div className={styles.empty}>
          <img
            className={styles.emptyPuppy}
            src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
            alt=""
          />
          <p className={styles.emptyText}>这个月还没有账目，去「记一笔」写第一笔吧 🐾</p>
        </div>
      )}

      {byDay.map(([dateKey, dayRows]) => {
        const dayTotal = dayRows
          .filter((r) => r.kind === 'expense')
          .reduce((a, r) => a + r.amountCents, 0);
        return (
          <div key={dateKey}>
            <div className={styles.dayHeader}>
              <span>{formatDayHeader(dateKey)}</span>
              <span>{formatCNY(dayTotal)}</span>
            </div>
            {dayRows.map((row) => {
              const cat = catMap.get(row.categoryId);
              return (
                <div key={row.id} className={styles.row}>
                  <span className={styles.rowEmoji}>{cat?.emoji ?? '🐾'}</span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowName}>{cat?.name ?? '未知分类'}</span>
                    {row.note && <span className={styles.rowNote}>{row.note}</span>}
                  </span>
                  <span className={clsx(styles.rowAmount, row.kind === 'income' && styles.income)}>
                    {row.kind === 'income' ? '+' : '-'}
                    {formatCNY(row.amountCents)}
                  </span>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(row)}>
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function groupByDay(rows: TransactionRow[]): [string, TransactionRow[]][] {
  const map = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const list = map.get(row.dateKey);
    if (list) list.push(row);
    else map.set(row.dateKey, [row]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
