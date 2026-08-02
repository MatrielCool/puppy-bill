import { useDeferredValue, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '../../db/db';
import { listMonth } from '../../db/queries';
import { restoreTransaction } from '../../db/mutations';
import { formatCNY, formatCNYGrouped } from '../../lib/money';
import { currentMonthKey, formatDayHeader, formatMonthLabel, shiftMonth } from '../../lib/dates';
import type { CategoryRow, TransactionRow } from '../../db/types';
import type { ToastData } from '../../ui/Toast';
import { Icon, type IconName } from '../../ui/Icon';
import { EditSheet } from './EditSheet';
import styles from './ListScreen.module.css';

export function ListScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [keyword, setKeyword] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<TransactionRow | null>(null);

  const rows = useLiveQuery(() => listMonth(monthKey), [monthKey]);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const catMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  // 防抖交给 React：输入时先渲染旧结果，避免每个字符都重排整个列表
  const deferredKeyword = useDeferredValue(keyword);

  const filtered = useMemo(() => {
    const kw = deferredKeyword.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (selectedCats.size > 0 && !selectedCats.has(row.categoryId)) return false;
      if (!kw) return true;
      const catName = catMap.get(row.categoryId)?.name ?? '';
      return row.note.toLowerCase().includes(kw) || catName.toLowerCase().includes(kw);
    });
  }, [rows, deferredKeyword, selectedCats, catMap]);

  const expense = sum(filtered, 'expense');
  const income = sum(filtered, 'income');
  const isFiltering = deferredKeyword.trim() !== '' || selectedCats.size > 0;
  const atCurrentMonth = monthKey === currentMonthKey();

  // 只列出本月真正用到的分类，避免筛选条塞满十几个用不上的选项
  const usedCategories = useMemo(() => {
    const ids = new Set((rows ?? []).map((r) => r.categoryId));
    return (categories ?? []).filter((c) => ids.has(c.id));
  }, [rows, categories]);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.monthNav}>
          <button
            className={styles.navBtn}
            onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
            aria-label="上个月"
          >
            <Icon name="chevronLeft" size={22} />
          </button>
          <span className={styles.monthLabel}>{formatMonthLabel(monthKey)}</span>
          <button
            className={styles.navBtn}
            onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
            disabled={atCurrentMonth}
            aria-label="下个月"
          >
            <Icon name="chevronRight" size={22} />
          </button>
        </div>

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

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="搜索备注或分类"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
          />
          <button
            className={clsx(styles.filterToggle, selectedCats.size > 0 && styles.filterToggleOn)}
            onClick={() => setFilterOpen((v) => !v)}
          >
            筛选{selectedCats.size > 0 ? ` ${selectedCats.size}` : ''}
          </button>
        </div>

        {filterOpen && usedCategories.length > 0 && (
          <div className={styles.filterStrip}>
            {selectedCats.size > 0 && (
              <button className={styles.filterChip} onClick={() => setSelectedCats(new Set())}>
                清除
              </button>
            )}
            {usedCategories.map((c) => (
              <button
                key={c.id}
                className={clsx(styles.filterChip, selectedCats.has(c.id) && styles.filterChipOn)}
                onClick={() => toggleCat(c.id)}
              >
                <Icon name={c.icon as IconName} size={20} />
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isFiltering && filtered.length > 0 && (
        <p className={styles.resultCount}>找到 {filtered.length} 笔</p>
      )}

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <img
            className={styles.emptyPuppy}
            src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
            alt=""
          />
          <p className={styles.emptyText}>
            {isFiltering
              ? '没有符合条件的账目，换个词试试'
              : atCurrentMonth
                ? '这个月还没有账目，去「记一笔」写第一笔吧'
                : '这个月没有记账'}
          </p>
        </div>
      )}

      {groupByDay(filtered).map(([dateKey, dayRows]) => (
        <div key={dateKey}>
          <div className={styles.dayHeader}>
            <span>{formatDayHeader(dateKey)}</span>
            <span>{formatCNY(sum(dayRows, 'expense'))}</span>
          </div>
          {dayRows.map((row) => (
            <TxRow
              key={row.id}
              row={row}
              category={catMap.get(row.categoryId)}
              onClick={() => setEditing(row)}
            />
          ))}
        </div>
      ))}

      {editing && (
        <EditSheet
          row={editing}
          onClose={() => setEditing(null)}
          onDeleted={(row) =>
            onToast({
              id: Date.now(),
              text: `已删除 ${formatCNY(row.amountCents)}`,
              actionLabel: '撤销',
              onAction: () => void restoreTransaction(row.id),
            })
          }
        />
      )}
    </div>
  );
}

function TxRow({
  row,
  category,
  onClick,
}: {
  row: TransactionRow;
  category: CategoryRow | undefined;
  onClick: () => void;
}) {
  return (
    <button className={styles.row} onClick={onClick}>
      <span className={styles.rowIcon}>
        <Icon name={(category?.icon ?? 'other') as IconName} size={26} />
      </span>
      <span className={styles.rowMain}>
        <span className={styles.rowName}>{category?.name ?? '未知分类'}</span>
        {row.note && <span className={styles.rowNote}>{row.note}</span>}
      </span>
      <span className={clsx(styles.rowAmount, row.kind === 'income' && styles.income)}>
        {row.kind === 'income' ? '+' : '-'}
        {formatCNY(row.amountCents)}
      </span>
    </button>
  );
}

function sum(rows: TransactionRow[], kind: TransactionRow['kind']): number {
  return rows.filter((r) => r.kind === kind).reduce((acc, r) => acc + r.amountCents, 0);
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
