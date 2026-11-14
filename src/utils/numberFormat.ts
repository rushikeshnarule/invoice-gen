// ─── Number & Date formatting for Regional currencies (India & US) ──────

/**
 * Format a number as currency.
 * Automatically defaults to en-US for '$' and en-IN for '₹'.
 * e.g. 1234567.89 (₹) → "₹12,34,567.89"
 * e.g. 1234567.89 ($) → "$1,234,567.89"
 */
export function formatCurrency(
  amount: number,
  symbol = '₹',
  locale?: string
): string {
  const safeAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  const effectiveLocale = locale || (symbol === '$' ? 'en-US' : 'en-IN');
  const formatted = new Intl.NumberFormat(effectiveLocale, {
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
  const trimmed = String(dateStr).trim();
  // If YYYY-MM-DD format, construct local date to avoid UTC midnight timezone rollback
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(trimmed);
  }
  if (isNaN(date.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
