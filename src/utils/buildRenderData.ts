// ─── buildRenderData ────────────────────────────────────────────────
// Assembles everything a theme needs to render an invoice.
// Connects to local persistent offline storage for desktop PC execution.

import type { InvoiceRenderData, GSTType, TaxSummaryRow } from '../types';
import {
  createSampleData,
  createSampleDataDevanagari,
  createSampleDataIGST,
  createSampleDataNoGST,
  createSampleDataUS,
} from './sampleData';
import { amountInWords } from './amountInWords';
import { buildTaxSummary, determineGSTType, roundTotal, round2 } from './gst';

export type RenderDataWithTheme = InvoiceRenderData & {
  _themeId?: string;
};

/**
 * Build the complete render data for an invoice from offline local storage.
 * Themes receive the result of this function — they never query the DB.
 */
export async function buildRenderData(
  invoiceId: string,
  variant?: string | null
): Promise<RenderDataWithTheme> {
  // Support variant previews
  if (variant) {
    let sample: InvoiceRenderData;
    switch (variant) {
      case 'us':
        sample = createSampleDataUS(3);
        break;
      case 'multipage':
        sample = createSampleData(40);
        break;
      case 'single':
        sample = createSampleData(1);
        break;
      case 'devanagari':
        sample = createSampleDataDevanagari();
        break;
      case 'igst':
        sample = createSampleDataIGST();
        break;
      case 'nogst':
        sample = createSampleDataNoGST();
        break;
      case 'standard':
      default:
        sample = createSampleData(5);
        break;
    }
    return recalculate(sample);
  }

  try {
    const raw = localStorage.getItem('offline-software-invoices-v2');
    const records = raw ? JSON.parse(raw) : [];
    if (Array.isArray(records) && records.length > 0) {
      const found = records.find(
        (r: any) => r.id === invoiceId || r.invoiceNumber === invoiceId
      );
      if (found && found.data) {
        const clean = recalculate(found.data);
        return { ...clean, _themeId: found.themeId };
      }
      // If 'sample' requested, return the first real invoice
      if (invoiceId === 'sample' && records[0]?.data) {
        const clean = recalculate(records[0].data);
        return { ...clean, _themeId: records[0].themeId };
      }
    }
  } catch (e) {
    console.warn('Could not read from offline storage, falling back to sample', e);
  }

  const data = createSampleData(5);
  return recalculate(data);
}

/**
 * Recalculate all derived fields from raw invoice data.
 * Guarantees zero floating-point accumulation errors on all sums and taxes.
 * Supports both United States Sales Tax & Indian GST regional structures.
 */
export function recalculate(
  data: InvoiceRenderData
): InvoiceRenderData {

  const isUS =
    data.region === 'US'
      ? true
      : data.region === 'IN'
      ? false
      : data.business?.region === 'US'
      ? true
      : data.business?.region === 'IN'
      ? false
      : data.currencySymbol === '$' || data.taxType === 'sales_tax';

  // ─── UNITED STATES SALES TAX ENGINE ────────────────────────────────
  if (isUS) {
    const currencySymbol = data.currencySymbol || '$';
    const currencyCode = data.currencyCode || 'USD';
    const region = 'US';
    const taxType = 'sales_tax';

    const cleanItems = (data.items || []).map((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.rate) || 0;
      const discount = Number(it.discount) || 0;
      const baseAmount = round2(qty * rate);
      const discountAmount = discount > 0 ? round2((baseAmount * discount) / 100) : 0;
      const taxableAmount = round2(baseAmount - discountAmount);

      // If taxable is explicitly false or client is tax exempt, tax rate is 0
      const isTaxable = it.taxable !== false && !data.client?.taxExempt;
      const taxRate = isTaxable ? (Number(it.gstRate) || 0) : 0;
      const taxAmount = round2((taxableAmount * taxRate) / 100);
      const total = round2(taxableAmount + taxAmount);

      return {
        ...it,
        quantity: qty,
        rate,
        discount: discount || undefined,
        discountAmount: discountAmount || undefined,
        taxableAmount,
        taxable: isTaxable,
        gstRate: taxRate,
        gstAmount: taxAmount,
        total,
        sku: it.sku || it.hsnSac,
      };
    });

    const subtotal = round2(cleanItems.reduce((s, it) => s + it.quantity * it.rate, 0));
    const totalDiscount = round2(cleanItems.reduce((s, it) => s + (it.discountAmount || 0), 0));
    const totalTaxableAmount = round2(
      cleanItems
        .filter((it) => it.taxable !== false && it.gstRate > 0)
        .reduce((s, it) => s + it.taxableAmount, 0)
    );
    const totalSalesTax = round2(cleanItems.reduce((s, it) => s + it.gstAmount, 0));
    const totalTax = totalSalesTax;

    // US tax summary grouped by tax rate
    const grouped = new Map<number, { taxable: number; tax: number }>();
    for (const item of cleanItems) {
      const r = Number(item.gstRate) || 0;
      const existing = grouped.get(r) || { taxable: 0, tax: 0 };
      existing.taxable += item.taxableAmount;
      existing.tax += item.gstAmount;
      grouped.set(r, existing);
    }

    const taxSummary: TaxSummaryRow[] = Array.from(grouped.entries())
      .map(([rate, { taxable, tax }]) => ({
        gstRate: rate,
        taxableAmount: round2(taxable),
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: round2(tax),
        label: rate === 0 ? 'Tax-Exempt' : `Sales Tax (${rate}%)`,
      }))
      .sort((a, b) => a.gstRate - b.gstRate);

    const grandTotal = round2(subtotal - totalDiscount + totalSalesTax);
    const roundOff = 0;
    const grandTotalRounded = grandTotal;

    let amountPaid = round2((data.payments || []).reduce((s, p) => s + (Number(p?.amount) || 0), 0));
    let status = data.status || 'draft';
    let balanceDue = Math.max(0, round2(grandTotalRounded - amountPaid));

    if (status === 'paid') {
      if (amountPaid < grandTotalRounded) {
        amountPaid = grandTotalRounded;
      }
      balanceDue = 0;
    } else if (amountPaid >= grandTotalRounded && grandTotalRounded > 0) {
      status = 'paid';
      balanceDue = 0;
    }

    return {
      ...data,
      region,
      taxType,
      invoiceType: data.invoiceType || 'daily',
      billingPeriod: data.billingPeriod,
      billingMonth: data.billingMonth,
      status,
      items: cleanItems,
      gstType: 'none',
      subtotal,
      totalDiscount,
      totalTaxableAmount,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalTax,
      totalSalesTax,
      grandTotal,
      roundOff,
      grandTotalRounded,
      amountInWords: amountInWords(grandTotalRounded, 'Dollars', 'Cents'),
      taxSummary,
      amountPaid,
      balanceDue,
      currencySymbol,
      currencyCode,
    };
  }

  // ─── INDIAN GST TAX ENGINE ─────────────────────────────────────────
  const hasGstRateOnItems = (data.items || []).some((it) => (Number(it.gstRate) || 0) > 0);
  const hasGstin = Boolean(data.business?.gstin?.trim()) || hasGstRateOnItems;

  let gstType: GSTType = data.gstType || 'cgst_sgst';
  if (data.gstType === 'cgst_sgst' || data.gstType === 'igst') {
    gstType = data.gstType;
  } else if (data.gstType === 'none' && !hasGstRateOnItems) {
    gstType = 'none';
  } else {
    gstType = determineGSTType(
      data.business?.state || '',
      data.placeOfSupply || data.client?.state || '',
      hasGstin,
      data.business?.gstin,
      data.client?.gstin
    );
    if (gstType === 'none' && hasGstRateOnItems) {
      gstType = 'cgst_sgst';
    }
  }

  // Normalize and recalculate items cleanly
  const cleanItems = (data.items || []).map((it) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const discount = Number(it.discount) || 0;
    const baseAmount = round2(qty * rate);
    const discountAmount = discount > 0 ? round2((baseAmount * discount) / 100) : 0;
    const taxableAmount = round2(baseAmount - discountAmount);
    const gstRate = gstType === 'none' ? 0 : (Number(it.gstRate) || 0);
    const gstAmount = gstType === 'none' ? 0 : round2((taxableAmount * gstRate) / 100);
    const total = round2(taxableAmount + gstAmount);

    return {
      ...it,
      quantity: qty,
      rate,
      discount: discount || undefined,
      discountAmount: discountAmount || undefined,
      taxableAmount,
      gstRate,
      gstAmount,
      total,
    };
  });

  const subtotal = round2(cleanItems.reduce((s, it) => s + it.quantity * it.rate, 0));
  const totalDiscount = round2(cleanItems.reduce((s, it) => s + (it.discountAmount || 0), 0));
  const totalTaxableAmount = round2(cleanItems.reduce((s, it) => s + it.taxableAmount, 0));

  const taxSummary = buildTaxSummary(cleanItems, gstType);
  const totalCgst = gstType === 'cgst_sgst' ? round2(taxSummary.reduce((s, r) => s + r.cgst, 0)) : 0;
  const totalSgst = gstType === 'cgst_sgst' ? round2(taxSummary.reduce((s, r) => s + r.sgst, 0)) : 0;
  const totalIgst = gstType === 'igst' ? round2(taxSummary.reduce((s, r) => s + r.igst, 0)) : 0;
  const totalTax = gstType === 'none' ? 0 : round2(totalCgst + totalSgst + totalIgst);

  const grandTotal = round2(totalTaxableAmount + totalTax);
  const { rounded: grandTotalRounded, roundOff } = roundTotal(grandTotal);
  let amountPaid = round2((data.payments || []).reduce((s, p) => s + (Number(p?.amount) || 0), 0));
  let status = data.status || 'draft';
  let balanceDue = Math.max(0, round2(grandTotalRounded - amountPaid));

  // Guarantee strict financial consistency between status and balance due
  if (status === 'paid') {
    if (amountPaid < grandTotalRounded) {
      amountPaid = grandTotalRounded;
    }
    balanceDue = 0;
  } else if (amountPaid >= grandTotalRounded && grandTotalRounded > 0) {
    status = 'paid';
    balanceDue = 0;
  }

  return {
    ...data,
    region: 'IN',
    taxType: 'gst',
    invoiceType: data.invoiceType || 'daily',
    billingPeriod: data.billingPeriod,
    billingMonth: data.billingMonth,
    status,
    items: cleanItems,
    gstType,
    subtotal,
    totalDiscount,
    totalTaxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    roundOff,
    grandTotalRounded,
    amountInWords: amountInWords(grandTotalRounded, data.currencyCode === 'USD' ? 'Dollars' : 'Rupees'),
    taxSummary,
    amountPaid,
    balanceDue,
    currencySymbol: data.currencySymbol || '₹',
    currencyCode: data.currencyCode || 'INR',
  };
}
