// 數字格式化工具（臺灣慣用千分位）

/** 依數值大小決定小數位數 */
export const fmt = (n: number, digits?: number): string => {
  if (!Number.isFinite(n)) return '0';
  const d = digits ?? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : Math.abs(n) >= 1 ? 2 : 3);
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: d });
};

export const pct = (part: number, total: number, digits = 1): string =>
  total > 0 ? `${(Math.round((part / total) * 100 * 10 ** digits) / 10 ** digits).toFixed(digits)}%` : '—';

export const signed = (n: number, digits?: number): string => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), digits);
