import { describe, expect, it } from 'vitest';
import { fromDateKey, toDateKey, toMonthKey } from '../src/lib/dates';

describe('日期键按本地时区计算', () => {
  it('凌晨的时间不会被算到前一天', () => {
    // 东八区 2026-08-03 00:30 的 UTC 是 2026-08-02T16:30Z。
    // 如果用 toISOString().slice(0,10) 会得到 '2026-08-02'，把凌晨记的账算到昨天。
    const localMidnight = new Date(2026, 7, 3, 0, 30);
    expect(toDateKey(localMidnight)).toBe('2026-08-03');
  });

  it('深夜的时间不会被算到后一天', () => {
    const lateNight = new Date(2026, 7, 3, 23, 45);
    expect(toDateKey(lateNight)).toBe('2026-08-03');
  });

  it('个位数月/日补零', () => {
    expect(toDateKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('monthKey 取前七位', () => {
    expect(toMonthKey(new Date(2026, 7, 3, 12))).toBe('2026-08');
  });

  it('fromDateKey 往返一致', () => {
    for (const key of ['2026-01-01', '2026-08-03', '2026-12-31', '2024-02-29']) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });

  it('fromDateKey 用当天中午，跨夏令时也不会偏移到前后一天', () => {
    expect(fromDateKey('2026-08-03').getHours()).toBe(12);
  });
});
