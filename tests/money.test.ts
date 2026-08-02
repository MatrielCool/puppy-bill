import { describe, expect, it } from 'vitest';
import { formatAmount, formatCNY, formatCNYGrouped, parseInputToCents } from '../src/lib/money';
import { keypadReducer, initialKeypadState } from '../src/features/record/useKeypadReducer';

describe('parseInputToCents', () => {
  it('把键盘输入串正确转成分', () => {
    expect(parseInputToCents('')).toBe(0);
    expect(parseInputToCents('0')).toBe(0);
    expect(parseInputToCents('28')).toBe(2800);
    expect(parseInputToCents('28.')).toBe(2800);
    expect(parseInputToCents('28.5')).toBe(2850);
    expect(parseInputToCents('28.50')).toBe(2850);
    expect(parseInputToCents('28.05')).toBe(2805);
    expect(parseInputToCents('0.01')).toBe(1);
    expect(parseInputToCents('.')).toBe(0);
  });

  it('不产生浮点误差', () => {
    // 0.1 + 0.2 用浮点会得到 0.30000000000000004
    expect(parseInputToCents('0.1') + parseInputToCents('0.2')).toBe(30);
    expect(parseInputToCents('0.3')).toBe(30);
  });
});

describe('格式化', () => {
  it('formatAmount 补齐两位小数', () => {
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(5)).toBe('0.05');
    expect(formatAmount(2800)).toBe('28.00');
    expect(formatAmount(2805)).toBe('28.05');
    expect(formatAmount(-2805)).toBe('-28.05');
  });

  it('formatCNY 带货币符号', () => {
    expect(formatCNY(2800)).toBe('¥28.00');
  });

  it('formatCNYGrouped 加千分位', () => {
    expect(formatCNYGrouped(231000)).toBe('¥2,310.00');
    expect(formatCNYGrouped(100)).toBe('¥1.00');
    expect(formatCNYGrouped(-231055)).toBe('-¥2,310.55');
  });
});

describe('键盘 reducer', () => {
  const s0 = initialKeypadState();
  const run = (actions: Parameters<typeof keypadReducer>[1][]) =>
    actions.reduce(keypadReducer, s0);

  it('小数点后最多两位', () => {
    const s = run([
      { type: 'digit', value: '2' },
      { type: 'dot' },
      { type: 'digit', value: '5' },
      { type: 'digit', value: '0' },
      { type: 'digit', value: '9' }, // 应被忽略
    ]);
    expect(s.input).toBe('2.50');
  });

  it('只允许一个小数点', () => {
    const s = run([{ type: 'digit', value: '2' }, { type: 'dot' }, { type: 'dot' }]);
    expect(s.input).toBe('2.');
  });

  it('直接按小数点补前导零', () => {
    expect(run([{ type: 'dot' }]).input).toBe('0.');
  });

  it('不产生前导零', () => {
    const s = run([{ type: 'digit', value: '0' }, { type: 'digit', value: '7' }]);
    expect(s.input).toBe('7');
  });

  it('限制整数位数，防止误触输入天文数字', () => {
    const s = run(Array.from({ length: 12 }, () => ({ type: 'digit' as const, value: '9' })));
    expect(s.input).toBe('9999999');
  });

  it('退格', () => {
    const s = run([
      { type: 'digit', value: '2' },
      { type: 'digit', value: '8' },
      { type: 'backspace' },
    ]);
    expect(s.input).toBe('2');
  });

  it('切换收支时清空分类，避免把支出分类用在收入上', () => {
    const s = run([
      { type: 'setCategory', categoryId: 'c_food' },
      { type: 'setKind', kind: 'income' },
    ]);
    expect(s.categoryId).toBeNull();
  });

  it('reset 保留分类和日期，方便连续记账', () => {
    const s = run([
      { type: 'setCategory', categoryId: 'c_food' },
      { type: 'setDate', dateKey: '2026-08-01' },
      { type: 'digit', value: '5' },
      { type: 'reset' },
    ]);
    expect(s.input).toBe('');
    expect(s.categoryId).toBe('c_food');
    expect(s.dateKey).toBe('2026-08-01');
  });
});
