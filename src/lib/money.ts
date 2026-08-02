/**
 * 金额一律以「分」为单位的整数存储和运算，永不用浮点。
 * 0.1 + 0.2 !== 0.3 这种问题在记账 app 里是不可接受的。
 */

/** 分 → 显示字符串，如 2800 → "28.00" */
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** 分 → 带符号的人民币显示，如 2800 → "¥28.00" */
export function formatCNY(cents: number): string {
  return `¥${formatAmount(cents)}`;
}

/** 分 → 千分位人民币，用于汇总数字，如 231000 → "¥2,310.00" */
export function formatCNYGrouped(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const yuan = Math.floor(abs / 100);
  const fen = String(abs % 100).padStart(2, '0');
  return `${sign}¥${yuan.toLocaleString('zh-CN')}.${fen}`;
}

/**
 * 把键盘输入的字符串解析成分。
 * 输入串形如 "28"、"28."、"28.5"、"28.50"，小数点后最多两位（由 reducer 保证）。
 */
export function parseInputToCents(input: string): number {
  if (!input || input === '.') return 0;
  const [intPart = '0', fracPart = ''] = input.split('.');
  const yuan = Number.parseInt(intPart || '0', 10);
  const fen = Number.parseInt(fracPart.padEnd(2, '0').slice(0, 2) || '0', 10);
  return yuan * 100 + fen;
}
