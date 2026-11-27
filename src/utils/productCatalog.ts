import type { LineItem, ProductItem } from '../types';
import { round2 } from './gst';

export const US_UNITS = [
  { value: 'ea', label: 'ea (each)' },
  { value: 'hrs', label: 'hrs (hours)' },
  { value: 'days', label: 'days' },
  { value: 'units', label: 'units' },
  { value: 'box', label: 'box' },
  { value: 'pk', label: 'pk (pack)' },
  { value: 'lbs', label: 'lbs' },
  { value: 'sq ft', label: 'sq ft' },
  { value: 'ft', label: 'ft' },
  { value: 'Nos', label: 'Nos' },
  { value: 'Pcs', label: 'Pcs' },
] as const;

export const IN_UNITS = [
  { value: 'Nos', label: 'Nos' },
  { value: 'Pcs', label: 'Pcs' },
  { value: 'Brass', label: 'Brass' },
  { value: 'Sqft', label: 'Sqft' },
  { value: 'Sqm', label: 'Sqm' },
  { value: 'Mtr', label: 'Mtr' },
  { value: 'Feet', label: 'Feet' },
  { value: 'Ton', label: 'Ton' },
  { value: 'Bags', label: 'Bags' },
  { value: 'Boxes', label: 'Boxes' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Ltr', label: 'Ltr' },
  { value: 'Hrs', label: 'Hrs' },
  { value: 'Days', label: 'Days' },
  { value: 'Job', label: 'Job' },
  { value: 'Lic', label: 'Lic' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Packet', label: 'Packet' },
  { value: 'Set', label: 'Set' },
] as const;

export const ALL_KNOWN_UNITS: string[] = Array.from(
  new Set([...US_UNITS.map((u) => u.value), ...IN_UNITS.map((u) => u.value)])
);

export const IN_GST_RATES = [0, 5, 12, 18, 28] as const;

export const DEFAULT_PLACEHOLDER_DESCRIPTIONS = new Set([
  'Retail Item',
  'Goods Supply',
  'Consulting & Professional Services',
  'New Service / Product Description',
  'Contract Work & Services Executed',
  'Material Supply / Work Executed',
]);

/**
 * Returns true if a line item is still an untouched auto-generated placeholder row.
 */
export function isDefaultPlaceholderItem(item: LineItem): boolean {
  if (!item || item.productId) return false;
  return Number(item.rate) === 0 && DEFAULT_PLACEHOLDER_DESCRIPTIONS.has((item.description || '').trim());
}

/**
 * Formats a product's name and optional details into a clean invoice line item description.
 */
export function formatProductLineDescription(product: Pick<ProductItem, 'name' | 'description'>): string {
  const name = (product.name || '').trim();
  const details = (product.description || '').trim();
  if (!details || details.toLowerCase() === name.toLowerCase()) {
    return name;
  }
  return `${name} - ${details}`;
}

/**
 * Converts a catalog ProductItem into a fully calculated invoice LineItem.
 */
export function productToLineItem(
  product: ProductItem,
  options: {
    isUS: boolean;
    isClientTaxExempt?: boolean;
    sno: number;
    id?: string;
    date?: string;
  }
): LineItem {
  const { isUS, isClientTaxExempt = false, sno, id, date } = options;
  const qty = Number(product.defaultQuantity) > 0 ? Number(product.defaultQuantity) : 1;
  const rate = Number(product.rate) >= 0 ? Number(product.rate) : 0;
  const discount = Number(product.discount) > 0 ? Math.min(100, Number(product.discount)) : 0;
  const rawTaxRate = Number(product.gstRate) >= 0 ? Number(product.gstRate) : 0;
  const isTaxable = isUS ? (!isClientTaxExempt && product.taxable !== false && rawTaxRate > 0) : rawTaxRate > 0;
  const gstRate = isUS && isClientTaxExempt ? 0 : rawTaxRate;

  const baseAmount = round2(qty * rate);
  const discountAmount = discount > 0 ? round2((baseAmount * discount) / 100) : 0;
  const taxableAmount = round2(baseAmount - discountAmount);
  const gstAmount = round2((taxableAmount * gstRate) / 100);
  const total = round2(taxableAmount + gstAmount);

  const code = isUS ? (product.sku || product.hsnSac || '') : (product.hsnSac || product.sku || '');

  return {
    id: id || `item-${Date.now()}-${sno}`,
    sno,
    productId: product.id,
    date,
    description: formatProductLineDescription(product),
    hsnSac: isUS ? undefined : (code || undefined),
    sku: isUS ? (code || undefined) : undefined,
    taxable: isTaxable,
    quantity: qty,
    unit: product.unit || (isUS ? 'ea' : 'Nos'),
    rate,
    discount: discount > 0 ? discount : undefined,
    discountAmount: discountAmount > 0 ? discountAmount : undefined,
    taxableAmount,
    gstRate,
    gstAmount,
    total,
  };
}
