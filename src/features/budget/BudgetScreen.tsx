import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '../../db/db';
import { getMonthBudgetView, resolveBudget } from '../../db/budgets';
import { formatCNYGrouped } from '../../lib/money';
import { currentMonthKey, formatMonthLabel } from '../../lib/dates';
import { Icon, type IconName } from '../../ui/Icon';
import { BudgetSheet } from './BudgetSheet';
import styles from './BudgetScreen.module.css';

const RING_R = 74;
const RING_C = 2 * Math.PI * RING_R;

/** 按已用比例分档，三处（环、进度条、文案）共用同一套阈值 */
function tone(ratio: number): 'calm' | 'warn' | 'over' {
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'warn';
  return 'calm';
}

export function BudgetScreen() {
  const monthKey = currentMonthKey();
  const [editing, setEditing] = useState<{ id: string | null; name: string } | null>(null);

  const view = useLiveQuery(() => getMonthBudgetView(monthKey), [monthKey]);
  const categories = useLiveQuery(() => db.categories.where('kind').equals('expense').toArray(), []);
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  const editingCurrent = useLiveQuery(
    () => (editing ? resolveBudget(monthKey, editing.id) : Promise.resolve(null)),
    [editing, monthKey],
  );

  if (!view) return null;

  const { total, categories: catProgress, daysLeft, remainingCents } = view;
  const budgeted = new Set(catProgress.map((c) => c.categoryId));
  const unbudgeted = (categories ?? []).filter((c) => !budgeted.has(c.id) && c.isArchived === 0);

  const totalTone = total ? tone(total.ratio) : 'calm';
  const percent = total ? Math.round(total.ratio * 100) : 0;
  // 环最多画满一圈，超出部分靠颜色和文案表达
  const dash = total ? Math.min(total.ratio, 1) * RING_C : 0;

  const dailyAllowance =
    remainingCents !== null && daysLeft > 0 && remainingCents > 0
      ? Math.floor(remainingCents / daysLeft)
      : null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>预算</h1>
      <p className={styles.monthLabel}>{formatMonthLabel(monthKey)}</p>

      {total === null ? (
        <div className={styles.empty}>
          <img
            className={styles.emptyPuppy}
            src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
            alt=""
          />
          <p className={styles.emptyText}>
            还没有设置预算。
            <br />
            设一个月度总额，小狗帮你盯着。
          </p>
          <button
            className={styles.primaryBtn}
            onClick={() => setEditing({ id: null, name: '月度总' })}
          >
            设置月度预算
          </button>
        </div>
      ) : (
        <div className={styles.ringCard}>
          <div className={styles.ringWrap}>
            <svg className={styles.ringSvg} width="176" height="176" viewBox="0 0 176 176">
              <circle className={styles.ringTrack} cx="88" cy="88" r={RING_R} strokeWidth="13" />
              <circle
                className={clsx(
                  styles.ringBar,
                  totalTone === 'calm' && styles.ringCalm,
                  totalTone === 'warn' && styles.ringWarn,
                  totalTone === 'over' && styles.ringOver,
                )}
                cx="88"
                cy="88"
                r={RING_R}
                strokeWidth="13"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C - dash}
              />
            </svg>
            <div className={styles.ringCenter}>
              <Icon
                name="profile"
                size={44}
                className={totalTone === 'over' ? styles.puppyShake : undefined}
              />
              <span className={styles.ringPercent}>{percent}%</span>
              <span className={styles.ringSpent}>
                {formatCNYGrouped(total.spentCents)} / {formatCNYGrouped(total.budgetCents)}
              </span>
            </div>
          </div>

          {totalTone === 'over' ? (
            <p className={styles.overText}>
              本月已超支 {formatCNYGrouped(total.spentCents - total.budgetCents)}
            </p>
          ) : (
            <div className={styles.allowance}>
              <span>剩余</span>
              <span className={styles.allowanceBig}>{formatCNYGrouped(remainingCents ?? 0)}</span>
              {daysLeft > 0 && (
                <>
                  <span>· 还有 {daysLeft} 天</span>
                  {dailyAllowance !== null && (
                    <span>
                      · 每天可花{' '}
                      <b className={styles.allowanceBig}>{formatCNYGrouped(dailyAllowance)}</b>
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <button
            className={styles.primaryBtn}
            onClick={() => setEditing({ id: null, name: '月度总' })}
          >
            修改总预算
          </button>
        </div>
      )}

      {catProgress.length > 0 && (
        <>
          <p className={styles.sectionTitle}>分类预算</p>
          <div className={styles.card}>
            {catProgress.map((p) => {
              const cat = catMap.get(p.categoryId as string);
              const t = tone(p.ratio);
              return (
                <button
                  key={p.categoryId}
                  className={styles.catRow}
                  onClick={() =>
                    setEditing({ id: p.categoryId as string, name: cat?.name ?? '分类' })
                  }
                >
                  <span className={styles.catIcon}>
                    <Icon name={(cat?.icon ?? 'other') as IconName} size={24} />
                  </span>
                  <span className={styles.catMain}>
                    <span className={styles.catTop}>
                      <span className={styles.catName}>{cat?.name ?? '未知分类'}</span>
                      <span className={clsx(styles.catNums, t === 'over' && styles.catOver)}>
                        {formatCNYGrouped(p.spentCents)} / {formatCNYGrouped(p.budgetCents)}
                      </span>
                    </span>
                    <span className={styles.bar}>
                      <span
                        className={clsx(
                          styles.barFill,
                          t === 'calm' && styles.barCalm,
                          t === 'warn' && styles.barWarn,
                          t === 'over' && styles.barOver,
                        )}
                        style={{ width: `${Math.min(p.ratio, 1) * 100}%` }}
                      />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {unbudgeted.length > 0 && (
        <>
          <p className={styles.sectionTitle}>未设预算</p>
          <div className={clsx(styles.card, styles.dim)}>
            {unbudgeted.map((c) => (
              <button
                key={c.id}
                className={styles.catRow}
                onClick={() => setEditing({ id: c.id, name: c.name })}
              >
                <span className={styles.catIcon}>
                  <Icon name={c.icon as IconName} size={24} />
                </span>
                <span className={styles.catMain}>
                  <span className={styles.catName}>{c.name}</span>
                </span>
                <span className={styles.catNums}>设置</span>
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <BudgetSheet
          monthKey={monthKey}
          categoryId={editing.id}
          categoryName={editing.name}
          currentCents={editingCurrent ?? null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
