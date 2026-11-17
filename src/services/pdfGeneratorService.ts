// ─── High-Resolution Production Invoice PDF Generator ──────────────────────
// Generates publication-grade, self-contained vector A4 PDF documents directly
// from InvoiceRenderData without requiring DOM rendering or canvas capturing.
// Fast, robust, and guaranteed to work across Android, iOS, Windows, Mac, and Linux.

import { jsPDF } from 'jspdf';
import type { InvoiceRenderData } from '../types';
import { formatNumber, amountInWords } from '../utils';

export interface GeneratePdfResult {
  buffer: ArrayBuffer;
  blob: Blob;
  fileName: string;
}

/**
 * Cleanly format currency amount for PDF text without character encoding glitches.
 */
function formatPdfCurrency(amount: number, isUS: boolean, currencySymbol = '₹'): string {
  const formatted = formatNumber(amount);
  if (isUS || currencySymbol === '$') {
    return `$${formatted}`;
  }
  // Standard PDF Helvetica font reliably renders "INR " or "Rs." across all PDF readers
  return `INR ${formatted}`;
}

/**
 * Generates an executive, ISO A4 vector PDF document for commercial invoices.
 */
export function generateInvoicePdf(invoice: InvoiceRenderData): GeneratePdfResult {
  const isUS = invoice.region === 'US' || invoice.currencySymbol === '$';
  const cleanNum = (invoice.invoiceNumber || 'INV-001').trim().replace(/[\\/:*?"<>|]/g, '-');
  const fileName = `Invoice-${cleanNum}.pdf`;

  // Create A4 Portrait PDF (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const marginX = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let curY = 16;

  // ─── 1. Header Banner & Business Identity ──────────────────────────────────
  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(invoice.business.name || 'Commercial Business', marginX, curY);

  // Document Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(isUS ? 'COMMERCIAL INVOICE' : 'TAX INVOICE', pageWidth - marginX, curY, { align: 'right' });

  curY += 6;

  // Business Metadata & Address (Left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate-600

  const busLines: string[] = [];
  if (invoice.business.address) busLines.push(invoice.business.address);
  const cityStateZip = [invoice.business.city, invoice.business.state, invoice.business.pincode].filter(Boolean).join(', ');
  if (cityStateZip) busLines.push(cityStateZip);
  if (invoice.business.gstin) busLines.push(isUS ? `EIN / Tax ID: ${invoice.business.gstin}` : `GSTIN: ${invoice.business.gstin}`);
  if (invoice.business.phone) busLines.push(`Phone: ${invoice.business.phone}`);
  if (invoice.business.email) busLines.push(`Email: ${invoice.business.email}`);

  busLines.slice(0, 4).forEach((line) => {
    doc.text(line, marginX, curY);
    curY += 4.2;
  });

  // Invoice Meta Box (Right side)
  let metaY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No:`, pageWidth - marginX - 45, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, pageWidth - marginX, metaY, { align: 'right' });

  metaY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice Date:`, pageWidth - marginX - 45, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceDate, pageWidth - marginX, metaY, { align: 'right' });

  metaY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Due Date:`, pageWidth - marginX - 45, metaY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.dueDate || invoice.invoiceDate, pageWidth - marginX, metaY, { align: 'right' });

  metaY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Status:`, pageWidth - marginX - 45, metaY);
  const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
  if (isPaid) {
    doc.setTextColor(22, 101, 52); // Green
    doc.text('PAID / SETTLED', pageWidth - marginX, metaY, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72); // Rose
    doc.text(`DUE: ${formatPdfCurrency(invoice.balanceDue, isUS, invoice.currencySymbol)}`, pageWidth - marginX, metaY, { align: 'right' });
  }

  curY = Math.max(curY + 4, metaY + 6);

  // Thin separator rule
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(marginX, curY, pageWidth - marginX, curY);

  curY += 5;

  // ─── 2. Bill To & Client Information Card ──────────────────────────────────
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(marginX, curY, contentWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('BILL TO / CLIENT DETAILS', marginX + 4, curY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(invoice.client.name || 'Valued Customer', marginX + 4, curY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const clientInfoParts: string[] = [];
  if (invoice.client.address) clientInfoParts.push(invoice.client.address);
  const clientCityState = [invoice.client.city, invoice.client.state, invoice.client.pincode].filter(Boolean).join(', ');
  if (clientCityState) clientInfoParts.push(clientCityState);
  if (invoice.client.gstin) clientInfoParts.push(isUS ? `Tax ID: ${invoice.client.gstin}` : `GSTIN: ${invoice.client.gstin}`);
  if (invoice.client.phone) clientInfoParts.push(`Phone: ${invoice.client.phone}`);
  if (invoice.client.email) clientInfoParts.push(`Email: ${invoice.client.email}`);

  const clientLine1 = clientInfoParts.slice(0, 2).join(' • ');
  const clientLine2 = clientInfoParts.slice(2, 4).join(' • ');
  if (clientLine1) doc.text(clientLine1, marginX + 4, curY + 16);
  if (clientLine2) doc.text(clientLine2, marginX + 4, curY + 20.5);

  curY += 28;

  // ─── 3. Line Items Table Header ────────────────────────────────────────────
  const colX = {
    index: marginX + 2,
    desc: marginX + 12,
    qty: marginX + 104,
    rate: marginX + 128,
    tax: marginX + 152,
    total: pageWidth - marginX - 3,
  };

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(marginX, curY, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('#', colX.index, curY + 4.8);
  doc.text('ITEM / DESCRIPTION', colX.desc, curY + 4.8);
  doc.text('QTY', colX.qty, curY + 4.8, { align: 'right' });
  doc.text('RATE', colX.rate, curY + 4.8, { align: 'right' });
  doc.text(isUS ? 'TAX' : 'GST', colX.tax, curY + 4.8, { align: 'right' });
  doc.text('AMOUNT', colX.total, curY + 4.8, { align: 'right' });

  curY += 7;

  // ─── Line Items Rows ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const items = invoice.items || [];
  items.forEach((item, idx) => {
    // Page break protection
    if (curY > 250) {
      doc.addPage();
      curY = 16;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginX, curY, contentWidth, 7, 'F');
    }

    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), colX.index, curY + 4.8);

    doc.setTextColor(15, 23, 42);
    // Truncate long description to fit column width
    const cleanDesc = item.description || `Item ${idx + 1}`;
    doc.text(cleanDesc.slice(0, 48), colX.desc, curY + 4.8);

    doc.setTextColor(51, 65, 85);
    doc.text(`${item.quantity} ${item.unit || ''}`.trim(), colX.qty, curY + 4.8, { align: 'right' });
    doc.text(formatPdfCurrency(item.rate, isUS, invoice.currencySymbol), colX.rate, curY + 4.8, { align: 'right' });
    doc.text(`${item.gstRate ?? 18}%`, colX.tax, curY + 4.8, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(item.total, isUS, invoice.currencySymbol), colX.total, curY + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Row bottom border
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, curY + 7, pageWidth - marginX, curY + 7);

    curY += 7;
  });

  curY += 4;

  // ─── 4. Totals Calculation Block ───────────────────────────────────────────
  const totalsBoxX = pageWidth - marginX - 78;
  const totalsBoxWidth = 78;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, curY, totalsBoxWidth, 36, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, curY, totalsBoxWidth, 36, 2, 2, 'S');

  let tY = curY + 5.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Taxable Subtotal:', totalsBoxX + 4, tY);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(invoice.subtotal, isUS, invoice.currencySymbol), totalsBoxX + totalsBoxWidth - 4, tY, { align: 'right' });

  tY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text(isUS ? 'Sales Tax Total:' : 'Total Tax (GST):', totalsBoxX + 4, tY);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(invoice.totalTax, isUS, invoice.currencySymbol), totalsBoxX + totalsBoxWidth - 4, tY, { align: 'right' });

  // Grand Total Highlight Bar
  tY += 6;
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(totalsBoxX, tY - 4, totalsBoxWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', totalsBoxX + 4, tY + 1.8);
  doc.text(formatPdfCurrency(invoice.grandTotalRounded, isUS, invoice.currencySymbol), totalsBoxX + totalsBoxWidth - 4, tY + 1.8, { align: 'right' });

  tY += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  if (invoice.balanceDue <= 0 || invoice.status === 'paid') {
    doc.setTextColor(22, 101, 52);
    doc.text('Amount Due:', totalsBoxX + 4, tY);
    doc.text(formatPdfCurrency(0, isUS, invoice.currencySymbol), totalsBoxX + totalsBoxWidth - 4, tY, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text('Balance Due:', totalsBoxX + 4, tY);
    doc.text(formatPdfCurrency(invoice.balanceDue, isUS, invoice.currencySymbol), totalsBoxX + totalsBoxWidth - 4, tY, { align: 'right' });
  }

  // ─── 5. Bank Remittance & UPI Details (Left of Totals) ────────────────────
  const bankBoxWidth = contentWidth - totalsBoxWidth - 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, curY, bankBoxWidth, 36, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, curY, bankBoxWidth, 36, 2, 2, 'S');

  let bY = curY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(isUS ? 'PAYMENT / REMITTANCE DETAILS' : 'BANK REMITTANCE & UPI PAYMENT', marginX + 4, bY);

  bY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const bank = invoice.bankDetails;
  if (bank?.bankName) {
    doc.text(`Bank: ${bank.bankName}`, marginX + 4, bY);
    bY += 4;
  }
  if (bank?.accountName || bank?.accountNumber) {
    doc.text(`A/C: ${bank.accountNumber || '—'} (${bank.accountName || invoice.business.name})`, marginX + 4, bY);
    bY += 4;
  }
  if (isUS && (bank?.routingNumber || bank?.ifsc)) {
    doc.text(`ABA Routing #: ${bank.routingNumber || bank.ifsc}`, marginX + 4, bY);
    bY += 4;
  } else if (!isUS && bank?.ifsc) {
    doc.text(`IFSC Code: ${bank.ifsc}`, marginX + 4, bY);
    bY += 4;
  }
  if (bank?.upiId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(isUS ? `Zelle / Pay: ${bank.upiId}` : `UPI ID: ${bank.upiId}`, marginX + 4, bY);
  }

  curY += 40;

  // ─── 6. Amount in Words & Notes ────────────────────────────────────────────
  try {
    const words = invoice.amountInWords || amountInWords(invoice.grandTotalRounded, isUS ? 'Dollars' : 'Rupees');
    if (words) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Amount in Words: ${words}`, marginX, curY);
      curY += 5;
    }
  } catch {}

  if (invoice.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Notes: ${invoice.notes.slice(0, 120)}`, marginX, curY);
    curY += 4.5;
  }

  // ─── 7. Signatory & Bottom Footer ──────────────────────────────────────────
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, footerY - 14, marginX + 50, footerY - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized Signatory`, marginX, footerY - 10);
  doc.text(`For ${invoice.business.name}`, marginX, footerY - 6);

  doc.text(`Generated by Invoice Gen Commercial Workstation • 100% Offline & Private`, pageWidth / 2, footerY, { align: 'center' });

  // Output as ArrayBuffer & Blob
  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

  return {
    buffer: arrayBuffer,
    blob,
    fileName,
  };
}
