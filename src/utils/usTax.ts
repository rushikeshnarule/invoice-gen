// ─── United States Sales Tax & Regional Engine ───────────────────────
// Implements US Sales Tax rules, 50 States + DC + PR tax definitions,
// Federal Tax ID (EIN), ABA Routing Number, and US currency conventions.

export interface USStateTaxInfo {
  code: string;
  name: string;
  baseRate: number; // Base state sales tax percentage (e.g. 7.25 for CA)
  avgCombinedRate: number; // Average combined state + local sales tax rate
  hasLocalTax: boolean;
  notes?: string;
}

/**
 * 50 US States + District of Columbia + Puerto Rico tax registry.
 * Accurately reflects state base sales tax rates and typical combined local rates.
 */
export const US_STATES: Record<string, USStateTaxInfo> = {
  AL: { code: 'AL', name: 'Alabama', baseRate: 4.0, avgCombinedRate: 9.29, hasLocalTax: true },
  AK: { code: 'AK', name: 'Alaska', baseRate: 0.0, avgCombinedRate: 1.82, hasLocalTax: true, notes: 'No state sales tax; local jurisdictions may levy tax' },
  AZ: { code: 'AZ', name: 'Arizona', baseRate: 5.6, avgCombinedRate: 8.37, hasLocalTax: true },
  AR: { code: 'AR', name: 'Arkansas', baseRate: 6.5, avgCombinedRate: 9.47, hasLocalTax: true },
  CA: { code: 'CA', name: 'California', baseRate: 7.25, avgCombinedRate: 8.85, hasLocalTax: true, notes: 'State base rate 7.25%; local districts up to 10.25%' },
  CO: { code: 'CO', name: 'Colorado', baseRate: 2.9, avgCombinedRate: 7.81, hasLocalTax: true },
  CT: { code: 'CT', name: 'Connecticut', baseRate: 6.35, avgCombinedRate: 6.35, hasLocalTax: false },
  DE: { code: 'DE', name: 'Delaware', baseRate: 0.0, avgCombinedRate: 0.0, hasLocalTax: false, notes: 'No state or local sales tax (Tax-Exempt)' },
  DC: { code: 'DC', name: 'District of Columbia', baseRate: 6.0, avgCombinedRate: 6.0, hasLocalTax: false },
  FL: { code: 'FL', name: 'Florida', baseRate: 6.0, avgCombinedRate: 7.02, hasLocalTax: true },
  GA: { code: 'GA', name: 'Georgia', baseRate: 4.0, avgCombinedRate: 7.40, hasLocalTax: true },
  HI: { code: 'HI', name: 'Hawaii', baseRate: 4.0, avgCombinedRate: 4.50, hasLocalTax: true, notes: 'General Excise Tax (GET)' },
  ID: { code: 'ID', name: 'Idaho', baseRate: 6.0, avgCombinedRate: 6.03, hasLocalTax: true },
  IL: { code: 'IL', name: 'Illinois', baseRate: 6.25, avgCombinedRate: 8.86, hasLocalTax: true, notes: 'Chicago combined rate up to 10.25%' },
  IN: { code: 'IN', name: 'Indiana', baseRate: 7.0, avgCombinedRate: 7.0, hasLocalTax: false },
  IA: { code: 'IA', name: 'Iowa', baseRate: 6.0, avgCombinedRate: 6.94, hasLocalTax: true },
  KS: { code: 'KS', name: 'Kansas', baseRate: 6.5, avgCombinedRate: 8.71, hasLocalTax: true },
  KY: { code: 'KY', name: 'Kentucky', baseRate: 6.0, avgCombinedRate: 6.0, hasLocalTax: false },
  LA: { code: 'LA', name: 'Louisiana', baseRate: 4.45, avgCombinedRate: 9.56, hasLocalTax: true },
  ME: { code: 'ME', name: 'Maine', baseRate: 5.5, avgCombinedRate: 5.5, hasLocalTax: false },
  MD: { code: 'MD', name: 'Maryland', baseRate: 6.0, avgCombinedRate: 6.0, hasLocalTax: false },
  MA: { code: 'MA', name: 'Massachusetts', baseRate: 6.25, avgCombinedRate: 6.25, hasLocalTax: false },
  MI: { code: 'MI', name: 'Michigan', baseRate: 6.0, avgCombinedRate: 6.0, hasLocalTax: false },
  MN: { code: 'MN', name: 'Minnesota', baseRate: 6.875, avgCombinedRate: 7.52, hasLocalTax: true },
  MS: { code: 'MS', name: 'Mississippi', baseRate: 7.0, avgCombinedRate: 7.07, hasLocalTax: true },
  MO: { code: 'MO', name: 'Missouri', baseRate: 4.225, avgCombinedRate: 8.39, hasLocalTax: true },
  MT: { code: 'MT', name: 'Montana', baseRate: 0.0, avgCombinedRate: 0.0, hasLocalTax: false, notes: 'No state or local sales tax (Tax-Exempt)' },
  NE: { code: 'NE', name: 'Nebraska', baseRate: 5.5, avgCombinedRate: 6.97, hasLocalTax: true },
  NV: { code: 'NV', name: 'Nevada', baseRate: 6.85, avgCombinedRate: 8.24, hasLocalTax: true },
  NH: { code: 'NH', name: 'New Hampshire', baseRate: 0.0, avgCombinedRate: 0.0, hasLocalTax: false, notes: 'No general sales tax (Tax-Exempt)' },
  NJ: { code: 'NJ', name: 'New Jersey', baseRate: 6.625, avgCombinedRate: 6.60, hasLocalTax: false },
  NM: { code: 'NM', name: 'New Mexico', baseRate: 4.875, avgCombinedRate: 7.62, hasLocalTax: true, notes: 'Gross Receipts Tax' },
  NY: { code: 'NY', name: 'New York', baseRate: 4.0, avgCombinedRate: 8.53, hasLocalTax: true, notes: 'NYC combined rate 8.875%' },
  NC: { code: 'NC', name: 'North Carolina', baseRate: 4.75, avgCombinedRate: 7.00, hasLocalTax: true },
  ND: { code: 'ND', name: 'North Dakota', baseRate: 5.0, avgCombinedRate: 7.04, hasLocalTax: true },
  OH: { code: 'OH', name: 'Ohio', baseRate: 5.75, avgCombinedRate: 7.24, hasLocalTax: true },
  OK: { code: 'OK', name: 'Oklahoma', baseRate: 4.5, avgCombinedRate: 8.99, hasLocalTax: true },
  OR: { code: 'OR', name: 'Oregon', baseRate: 0.0, avgCombinedRate: 0.0, hasLocalTax: false, notes: 'No state or local sales tax (Tax-Exempt)' },
  PA: { code: 'PA', name: 'Pennsylvania', baseRate: 6.0, avgCombinedRate: 6.34, hasLocalTax: true, notes: 'Philadelphia 8.0%, Allegheny 7.0%' },
  RI: { code: 'RI', name: 'Rhode Island', baseRate: 7.0, avgCombinedRate: 7.0, hasLocalTax: false },
  SC: { code: 'SC', name: 'South Carolina', baseRate: 6.0, avgCombinedRate: 7.50, hasLocalTax: true },
  SD: { code: 'SD', name: 'South Dakota', baseRate: 4.2, avgCombinedRate: 6.11, hasLocalTax: true },
  TN: { code: 'TN', name: 'Tennessee', baseRate: 7.0, avgCombinedRate: 9.55, hasLocalTax: true },
  TX: { code: 'TX', name: 'Texas', baseRate: 6.25, avgCombinedRate: 8.20, hasLocalTax: true, notes: 'Combined state + local max 8.25%' },
  UT: { code: 'UT', name: 'Utah', baseRate: 6.1, avgCombinedRate: 7.25, hasLocalTax: true },
  VT: { code: 'VT', name: 'Vermont', baseRate: 6.0, avgCombinedRate: 6.36, hasLocalTax: true },
  VA: { code: 'VA', name: 'Virginia', baseRate: 5.3, avgCombinedRate: 5.77, hasLocalTax: true },
  WA: { code: 'WA', name: 'Washington', baseRate: 6.5, avgCombinedRate: 9.38, hasLocalTax: true, notes: 'Seattle combined rate 10.35%' },
  WV: { code: 'WV', name: 'West Virginia', baseRate: 6.0, avgCombinedRate: 6.57, hasLocalTax: true },
  WI: { code: 'WI', name: 'Wisconsin', baseRate: 5.0, avgCombinedRate: 5.70, hasLocalTax: true },
  WY: { code: 'WY', name: 'Wyoming', baseRate: 4.0, avgCombinedRate: 5.44, hasLocalTax: true },
  PR: { code: 'PR', name: 'Puerto Rico', baseRate: 10.5, avgCombinedRate: 11.5, hasLocalTax: true },
};

/**
 * Clean list of US States for dropdowns and pickers.
 * e.g. "California (CA - 7.25%)"
 */
export const US_STATES_LIST = Object.values(US_STATES).map(
  (s) => `${s.name} (${s.code}${s.baseRate > 0 ? ` - ${s.baseRate}%` : ' - Exempt'})`
);

/**
 * Standard common tax rate options for US invoices.
 */
export const US_TAX_PRESETS = [
  { label: '0% Tax-Exempt / Services / B2B', rate: 0 },
  { label: '5.00% Standard Local Rate', rate: 5.0 },
  { label: '6.00% Standard State Rate (FL, MD, PA, MI)', rate: 6.0 },
  { label: '6.25% Texas State Rate', rate: 6.25 },
  { label: '7.00% State Rate (IN, MS, RI, TN)', rate: 7.0 },
  { label: '7.25% California Base Rate', rate: 7.25 },
  { label: '8.25% Texas Combined (Austin, Dallas, Houston)', rate: 8.25 },
  { label: '8.875% New York City Combined Rate', rate: 8.875 },
  { label: '9.50% California / Tennessee Combined Rate', rate: 9.5 },
  { label: '10.25% Chicago / Seattle High District Rate', rate: 10.25 },
];

/**
 * Extract US State code from a state string.
 * Supports:
 * - Direct 2-letter abbreviation e.g. "CA", "NY"
 * - Full name e.g. "California"
 * - Formatted e.g. "California (CA - 7.25%)" or "New York (NY)"
 */
export function extractUSStateCode(stateStr?: string | null): string | null {
  if (!stateStr) return null;
  const trimmed = stateStr.trim();

  // 1. Direct 2-letter code check
  const upper = trimmed.toUpperCase();
  if (US_STATES[upper]) return upper;

  // 2. Parenthesized code e.g. "California (CA...)"
  const parenMatch = trimmed.match(/\(([A-Za-z]{2})/);
  if (parenMatch && US_STATES[parenMatch[1].toUpperCase()]) {
    return parenMatch[1].toUpperCase();
  }

  // 3. Prefix code e.g. "CA - California"
  const prefixMatch = trimmed.match(/^([A-Za-z]{2})\s*[-:]/);
  if (prefixMatch && US_STATES[prefixMatch[1].toUpperCase()]) {
    return prefixMatch[1].toUpperCase();
  }

  // 4. State full name match
  const clean = trimmed.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  for (const [code, info] of Object.entries(US_STATES)) {
    if (info.name.toLowerCase() === clean) return code;
  }

  return null;
}

/**
 * Returns default base sales tax rate for a US state.
 */
export function getUSStateTaxRate(stateStr?: string | null): number {
  const code = extractUSStateCode(stateStr);
  if (!code || !US_STATES[code]) return 0;
  return US_STATES[code].baseRate;
}

/**
 * Returns whether a state has 0% state sales tax.
 */
export function isUSTaxExemptState(stateStr?: string | null): boolean {
  const code = extractUSStateCode(stateStr);
  if (!code || !US_STATES[code]) return false;
  return US_STATES[code].baseRate === 0;
}

/**
 * Validates and formats a Federal Employer Identification Number (EIN).
 * Standard format: XX-XXXXXXX (9 digits).
 */
export function formatEIN(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Validates whether an EIN is complete (9 digits).
 */
export function isValidEIN(val?: string | null): boolean {
  if (!val) return false;
  const digits = val.replace(/\D/g, '');
  return digits.length === 9;
}

/**
 * Formats a 9-digit ABA Routing Number.
 */
export function formatRoutingNumber(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 9);
}

/**
 * Validates 9-digit ABA routing transit number using federal checksum algorithm.
 */
export function isValidRoutingNumber(val?: string | null): boolean {
  if (!val) return false;
  const digits = val.replace(/\D/g, '');
  if (digits.length !== 9) return false;

  const d = digits.split('').map(Number);
  const checksum =
    (3 * (d[0] + d[3] + d[6]) +
     7 * (d[1] + d[4] + d[7]) +
     1 * (d[2] + d[5] + d[8])) % 10;

  return checksum === 0;
}

/**
 * Formats standard US ZIP code (5 digits or ZIP+4: 12345 or 12345-6789).
 */
export function formatUSZip(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
