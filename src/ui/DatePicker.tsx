import { useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Icon } from './Icon';
import { dateKeyOffset, formatMonthLabel, todayKey, toDateKey } from '../lib/dates';
import styles from './DatePicker.module.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 底部弹出的日期选择器：快捷选项 + 月历。不允许选未来日期。 */
export function DatePicker({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (dateKey: string) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const today = todayKey();
  const quick = [
    { label: '今天', key: today },
    { label: '昨天', key: dateKeyOffset(-1) },
    { label: '前天', key: dateKeyOffset(-2) },
  ];

  const firstWeekday = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const monthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;

  // 固定 6 行 42 格。月份天数和起始星期不同会让网格高度在 4~6 行间变化，
  // 导致上/下月按钮位置跟着跳，容易误触。补足空格让高度恒定。
  const trailingBlanks = 42 - firstWeekday - daysInMonth;

  const shift = (delta: number) => {
    const d = new Date(viewMonth.year, viewMonth.month + delta, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  // 不给选未来 —— 记账只会记已经发生的开销
  const now = new Date();
  const atCurrentMonth =
    viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth();

  const pick = (dateKey: string) => {
    onPick(dateKey);
    onClose();
  };

  // 用 portal 挂到 body：选择器渲染在页面内部时会受父层堆叠上下文影响，
  // 导致底部标签栏盖在它上面。挂到 body 才能确实盖住整个下半屏。
  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-label="选择日期">
        <div className={styles.grabber} />

        <div className={styles.quickRow}>
          {quick.map((q) => (
            <button
              key={q.key}
              className={clsx(styles.quick, value === q.key && styles.quickOn)}
              onClick={() => pick(q.key)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={() => shift(-1)} aria-label="上个月">
            <Icon name="chevronLeft" size={20} />
          </button>
          <span className={styles.monthLabel}>{formatMonthLabel(monthKey)}</span>
          <button
            className={styles.navBtn}
            onClick={() => shift(1)}
            disabled={atCurrentMonth}
            aria-label="下个月"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>

        <div className={styles.grid}>
          {WEEKDAYS.map((w) => (
            <div key={w} className={styles.weekday}>
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`blank-${i}`} className={styles.blank} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = toDateKey(new Date(viewMonth.year, viewMonth.month, day));
            const isFuture = key > today;
            return (
              <button
                key={key}
                className={clsx(
                  styles.day,
                  value === key && styles.dayOn,
                  key === today && value !== key && styles.dayToday,
                  isFuture && styles.dayFuture,
                )}
                disabled={isFuture}
                onClick={() => pick(key)}
              >
                {day}
              </button>
            );
          })}
          {Array.from({ length: trailingBlanks }, (_, i) => (
            <div key={`tail-${i}`} className={styles.blank} />
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
