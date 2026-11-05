// ─── Shared theme utilities ─────────────────────────────────────────
// Helpers that any theme component can import.

import type { ThemeOptions, ThemeFontFamily, ThemeFontSize, WatermarkType, InvoiceRenderData } from '../types';

/** Map font family option to CSS font-family string */
export function getFontFamily(family: ThemeFontFamily): string {
  switch (family) {
    case 'inter':
      return "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif";
    case 'serif':
      return "Georgia, 'Noto Sans Devanagari', 'Times New Roman', serif";
    case 'mono':
      return "'SFMono-Regular', Consolas, 'Noto Sans Devanagari', 'Liberation Mono', Menlo, monospace";
    case 'system':
    default:
      return "system-ui, -apple-system, 'Noto Sans Devanagari', 'Segoe UI', Roboto, sans-serif";
  }
}

/** Map font size option to base font size in pt */
export function getBaseFontSize(size: ThemeFontSize): number {
  switch (size) {
    case 'small': return 9;
    case 'large': return 13;
    case 'normal':
    default: return 11;
  }
}

/** Get effective watermark text */
export function getWatermarkText(
  watermark: WatermarkType,
  customText: string,
  _status: string
): string | null {
  switch (watermark) {
    case 'PAID': return 'PAID';
    case 'DRAFT': return 'DRAFT';
    case 'custom': return customText || null;
    case 'none':
    default: return null;
  }
}

/** CSS variables from theme options */
export function themeVars(options: ThemeOptions): React.CSSProperties {
  return {
    '--accent': options.accentColor,
    '--font-family': getFontFamily(options.fontFamily),
    '--font-size-base': `${getBaseFontSize(options.fontSize)}pt`,
    '--font-size-sm': `${getBaseFontSize(options.fontSize) - 1}pt`,
    '--font-size-lg': `${getBaseFontSize(options.fontSize) + 2}pt`,
    '--font-size-xl': `${getBaseFontSize(options.fontSize) + 5}pt`,
    '--font-size-2xl': `${getBaseFontSize(options.fontSize) + 10}pt`,
  } as React.CSSProperties;
}

/** Paper dimensions */
export function getPaperDimensions(paper: 'A4' | 'A5' | '80mm') {
  switch (paper) {
    case 'A5': return { width: '148mm', height: '210mm' };
    case '80mm': return { width: '80mm', height: 'auto' };
    case 'A4':
    default: return { width: '210mm', height: '297mm' };
  }
}

/**
 * Generate standard compliant Indian UPI Intent URL for QR code (NPCI Specification).
 * Formats amount to 2 decimal places, removes illegal characters from tr/tn, and suppresses when invoice is paid.
 */
export function getUpiQrString(data: InvoiceRenderData): string {
  if (data.upiQrDataUrl) return data.upiQrDataUrl;
  if (!data.bankDetails?.upiId) return '';
  const due = typeof data.balanceDue === 'number' ? Math.max(0, data.balanceDue) : data.grandTotalRounded;
  // If invoice is marked as paid or has zero balance due, do not request payment
  if (data.status === 'paid' || due <= 0) return '';
  const payAmount = due > 0 ? due : data.grandTotalRounded;
  const vpa = data.bankDetails.upiId.trim().toLowerCase();
  const rawName = (data.business?.name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50);
  const payeeName = encodeURIComponent(rawName || 'Merchant');
  // NPCI requires transaction reference (tr) to be alphanumeric only (max 35 chars, no hyphens)
  const invNum = (data.invoiceNumber || '').replace(/[^a-zA-Z0-9]/g, '').trim().slice(0, 35);
  const note = encodeURIComponent(`Invoice ${data.invoiceNumber || ''}`.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 50));
  return `upi://pay?pa=${vpa}&pn=${payeeName}&am=${payAmount.toFixed(2)}&cu=INR&tr=${invNum}&tn=${note}`;
}
