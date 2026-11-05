// ─── buildRenderData ────────────────────────────────────────────────
// Assembles everything a theme needs to render an invoice.
// Connects to local persistent offline storage for desktop PC execution.

import type { InvoiceRenderData } from '../types';
import {
  createSampleData,
  createSampleDataDevanagari,
  createSampleDataIGST,
  createSampleDataNoGST,
} from './sampleData';
import { amountInWords } from './amountInWords';
import { buildTaxSummary, determineGSTType, roundTotal } from './gst';
import { getInitialInvoices } from './initialOfflineData';

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
    const records = raw ? JSON.parse(raw) : getInitialInvoices();
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
 */
export function recalculate(
  data: InvoiceRenderData
): InvoiceRenderData {
  const hasGstRateOnItems = (data.items || []).some((it) => (Number(it.gstRate) || 0) > 0);
  const hasGstin = Boolean(data.business?.gstin?.trim()) || hasGstRateOnItems;

  let gstType = data.gstType;
  if (data.gstType === 'none' && !hasGstRateOnItems) {
    gstType = 'none';
  } else if ((data.gstType === 'cgst_sgst' || data.gstType === 'igst') && (Boolean(data.business?.gstin?.trim()) || hasGstRateOnItems)) {
    gstType = data.gstType;
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

  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

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
  let amountPaid = round2((data.payments || []).reduce((s, p) => s + p.amount, 0));
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
    amountInWords: amountInWords(grandTotalRounded),
    taxSummary,
    amountPaid,
    balanceDue,
  };
}
