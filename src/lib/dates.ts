/**
 * 日期键一律按**本地时区**计算。
 *
 * 不用 toISOString()：它会转成 UTC，导致东八区凌晨 0-8 点记的账被算到前一天。
 */

/** Date → 'YYYY-MM-DD'（本地时区） */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date → 'YYYY-MM'（本地时区） */
export function toMonthKey(date: Date): string {
  return toDateKey(date).slice(0, 7);
}

/** 'YYYY-MM-DD' → Date（当天 12:00，避开夏令时边界） */
export function fromDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

/** 相对今天偏移 n 天的日期键 */
export function dateKeyOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 'YYYY-MM-DD' → '8月2日 周日'；今天/昨天特殊显示 */
export function formatDayHeader(dateKey: string): string {
  if (dateKey === todayKey()) return '今天';
  if (dateKey === dateKeyOffset(-1)) return '昨天';
  const d = fromDateKey(dateKey);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

/** 'YYYY-MM' 前后移动 n 个月。用 Date 运算而非手算，自动处理跨年。 */
export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

/** 'YYYY-MM' → '2026年8月' */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}年${Number(m)}月`;
}
