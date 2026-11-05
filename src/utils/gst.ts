// ─── GST computation utilities ──────────────────────────────────────
import type { GSTType, TaxSummaryRow, LineItem } from '../types';

/**
 * Standard Indian GST state and union territory code mapping.
 * Maps 2-digit codes, official names, common aliases, and 2-letter state abbreviations.
 */
export const GST_STATE_MAP: Record<string, string> = {
  '01': '01', 'jammu and kashmir': '01', 'jammu & kashmir': '01', 'jk': '01',
  '02': '02', 'himachal pradesh': '02', 'hp': '02',
  '03': '03', 'punjab': '03', 'pb': '03',
  '04': '04', 'chandigarh': '04', 'ch': '04',
  '05': '05', 'uttarakhand': '05', 'uk': '05', 'ua': '05',
  '06': '06', 'haryana': '06', 'hr': '06',
  '07': '07', 'delhi': '07', 'new delhi': '07', 'dl': '07',
  '08': '08', 'rajasthan': '08', 'rj': '08',
  '09': '09', 'uttar pradesh': '09', 'up': '09',
  '10': '10', 'bihar': '10', 'br': '10',
  '11': '11', 'sikkim': '11', 'sk': '11',
  '12': '12', 'arunachal pradesh': '12', 'ar': '12',
  '13': '13', 'nagaland': '13', 'nl': '13',
  '14': '14', 'manipur': '14', 'mn': '14',
  '15': '15', 'mizoram': '15', 'mz': '15',
  '16': '16', 'tripura': '16', 'tr': '16',
  '17': '17', 'meghalaya': '17', 'ml': '17',
  '18': '18', 'assam': '18', 'as': '18',
  '19': '19', 'west bengal': '19', 'wb': '19',
  '20': '20', 'jharkhand': '20', 'jh': '20',
  '21': '21', 'odisha': '21', 'orissa': '21', 'od': '21', 'or': '21',
  '22': '22', 'chhattisgarh': '22', 'cg': '22', 'ct': '22',
  '23': '23', 'madhya pradesh': '23', 'mp': '23',
  '24': '24', 'gujarat': '24', 'gj': '24',
  '25': '25', 'daman and diu': '25',
  '26': '26', 'dadra and nagar haveli and daman and diu': '26', 'dnh': '26', 'dd': '26',
  '27': '27', 'maharashtra': '27', 'mh': '27',
  '28': '28', 'andhra pradesh (old)': '28',
  '29': '29', 'karnataka': '29', 'ka': '29',
  '30': '30', 'goa': '30', 'ga': '30',
  '31': '31', 'lakshadweep': '31', 'ld': '31',
  '32': '32', 'kerala': '32', 'kl': '32',
  '33': '33', 'tamil nadu': '33', 'tn': '33',
  '34': '34', 'puducherry': '34', 'pondicherry': '34', 'py': '34',
  '35': '35', 'andaman and nicobar islands': '35', 'an': '35',
  '36': '36', 'telangana': '36', 'ts': '36', 'tg': '36',
  '37': '37', 'andhra pradesh': '37', 'ap': '37',
  '38': '38', 'ladakh': '38', 'la': '38',
  '97': '97', 'other territory': '97',
};

/**
 * Extracts a 2-digit GST state code from a state string or a 15-char GSTIN.
 * Supports:
 * - 15-digit GSTIN prefix (e.g. "27AABCT1234F1ZP" -> "27")
 * - Direct 2-digit code (e.g. "27")
 * - Parenthesized code (e.g. "Maharashtra (27)")
 * - Prefixed code (e.g. "27 - Maharashtra" or "27: Maharashtra")
 * - Full state name lookup (e.g. "Maharashtra" -> "27")
 * - State abbreviation lookup (e.g. "MH" -> "27", "KA" -> "29")
 */
export function extractStateCode(str: string, gstin?: string): string | null {
  // 1. If a GSTIN is provided, the first two digits are the statutory state code
  if (gstin) {
    const trimmedGstin = gstin.trim().toUpperCase();
    if (/^\d{2}/.test(trimmedGstin)) {
      const gstinCode = trimmedGstin.slice(0, 2);
      if (GST_STATE_MAP[gstinCode]) return gstinCode;
    }
  }

  if (!str) return null;
  const trimmed = str.trim();

  // 2. Direct 2-digit code
  if (/^\d{2}$/.test(trimmed) && GST_STATE_MAP[trimmed]) {
    return trimmed;
  }

  // 3. Parenthesized code e.g. "Maharashtra (27)"
  const parenMatch = trimmed.match(/\((\d{2})\)/);
  if (parenMatch && GST_STATE_MAP[parenMatch[1]]) {
    return parenMatch[1];
  }

  // 4. Prefix code e.g. "27 - Maharashtra" or "27: Maharashtra"
  const prefixMatch = trimmed.match(/^(\d{2})\s*[-:]/);
  if (prefixMatch && GST_STATE_MAP[prefixMatch[1]]) {
    return prefixMatch[1];
  }

  // 5. Normalized state name or abbreviation lookup
  const clean = trimmed.toLowerCase().replace(/[^a-z0-9\s&]/g, '').trim();
  if (GST_STATE_MAP[clean]) {
    return GST_STATE_MAP[clean];
  }

  return null;
}

/**
 * Normalizes a state name for comparison when codes cannot be extracted.
 */
function normalizeState(state: string): string {
  if (!state) return '';
  return state
    .replace(/\(\d+\)/g, '')
    .replace(/^\d+\s*[-:]\s*/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Determine GST type based on business and client state / GSTIN.
 * Same state = CGST + SGST (intra-state), different state = IGST (inter-state).
 * If supplier has no GSTIN, returns 'none'.
 */
export function determineGSTType(
  businessState: string,
  clientState: string,
  hasGstin: boolean,
  businessGstin?: string,
  clientGstin?: string
): GSTType {
  if (!hasGstin && !businessGstin) return 'none';

  const code1 = extractStateCode(businessState, businessGstin);
  const code2 = extractStateCode(clientState, clientGstin);

  if (code1 && code2) {
    return code1 === code2 ? 'cgst_sgst' : 'igst';
  }

  // Fallback: compare normalized state names if code extraction is unavailable
  if (businessState && clientState) {
    if (normalizeState(businessState) === normalizeState(clientState)) {
      return 'cgst_sgst';
    }
    return 'igst';
  }

  return 'cgst_sgst';
}

/**
 * Build tax summary rows grouped by GST rate.
 * Ensures half-paise rounding splits CGST/SGST cleanly without cumulative drift.
 */
export function buildTaxSummary(items: LineItem[], gstType: GSTType): TaxSummaryRow[] {
  if (gstType === 'none') return [];

  const grouped = new Map<number, { taxable: number; tax: number }>();

  for (const item of items) {
    const rate = Number(item.gstRate) || 0;
    const existing = grouped.get(rate) || { taxable: 0, tax: 0 };
    existing.taxable += item.taxableAmount;
    existing.tax += item.gstAmount;
    grouped.set(rate, existing);
  }

  const rows: TaxSummaryRow[] = [];

  for (const [rate, { taxable, tax }] of grouped) {
    const taxableRounded = Math.round((taxable + Number.EPSILON) * 100) / 100;
    const taxRounded = Math.round((tax + Number.EPSILON) * 100) / 100;
    const cgst = gstType === 'cgst_sgst' ? Math.round((taxRounded / 2 + Number.EPSILON) * 100) / 100 : 0;
    const sgst = gstType === 'cgst_sgst' ? Math.round((taxRounded - cgst + Number.EPSILON) * 100) / 100 : 0;
    const igst = gstType === 'igst' ? taxRounded : 0;

    rows.push({
      gstRate: rate,
      taxableAmount: taxableRounded,
      cgst,
      sgst,
      igst,
      totalTax: taxRounded,
    });
  }

  return rows.sort((a, b) => a.gstRate - b.gstRate);
}

/**
 * Round to nearest rupee with clean 2-decimal round-off tracking.
 */
export function roundTotal(amount: number): { rounded: number; roundOff: number } {
  const rounded = Math.round(amount);
  const roundOff = Math.round((rounded - amount + Number.EPSILON) * 100) / 100;
  return { rounded, roundOff };
}
