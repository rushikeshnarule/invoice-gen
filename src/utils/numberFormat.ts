// ─── Number formatting for Indian currency ─────────────────────────

/**
 * Format a number as Indian currency.
 * e.g. 1234567.89 → "₹12,34,567.89"
 */
export function formatCurrency(
  amount: number,
  symbol = '₹',
  locale = 'en-IN'
): string {
  const safeAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safeAmount));
  const sign = safeAmount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

/**
 * Format a number with locale grouping (no currency symbol).
 */
export function formatNumber(
  num: number,
  locale = 'en-IN',
  decimals = 2
): string {
  const safeNum = isNaN(num) || !isFinite(num) ? 0 : num;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeNum);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number): string {
  const safeVal = isNaN(value) || !isFinite(value) ? 0 : value;
  return `${safeVal}%`;
}

/**
 * Format a date string for display safely.
 */
export function formatDate(dateStr?: string | null, locale = 'en-IN'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}
