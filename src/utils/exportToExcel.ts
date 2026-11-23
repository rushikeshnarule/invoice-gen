// ─── Commercial Invoice Excel Export (.xlsx) ─────────────────────────
// Generates publication-grade, beautifully formatted OpenXML (.xlsx) spreadsheets
// with vertical A4 portrait layout matching the app's invoice preview.
// Configured with fitToWidth=1 and A4 portrait print settings so pressing Ctrl+P
// in Excel prints the entire invoice on a single page without cutting in half.
// Works seamlessly across Electron desktop app and web browsers.

import ExcelJS from 'exceljs';
import type { InvoiceRenderData } from '../types';
import type { InvoiceRecord } from '../utils/initialOfflineData';
import { formatDate } from './numberFormat';
import { toast } from '@/components/base/toast/toast';
import { exportAndSaveFile } from '../services/fileExportService';

// ─── Style Tokens & Palettes ────────────────────────────────────────────────

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const headerStyle = {
  font: { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E293B' },
  },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { argb: 'FF0F172A' } },
    bottom: { style: 'medium' as const, color: { argb: 'FF0F172A' } },
    left: { style: 'thin' as const, color: { argb: 'FF334155' } },
    right: { style: 'thin' as const, color: { argb: 'FF334155' } },
  },
};

const metaSectionHeaderStyle = {
  font: { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF0F172A' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFE2E8F0' },
  },
  alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const metaLabelStyle = {
  font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF475569' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFF8FAFC' },
  },
  alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const metaValueStyle = {
  font: { name: 'Calibri', bold: false, size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const metaValueBoldStyle = {
  font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const cellLeft = {
  font: { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true },
  border: thinBorder,
};

const cellCenter = {
  font: { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const cellNumber = {
  font: { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: thinBorder,
  numFmt: '#,##0.00',
};

const cellNumberBold = {
  font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: thinBorder,
  numFmt: '#,##0.00',
};

const totalLabelStyle = {
  font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF334155' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFF8FAFC' },
  },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: thinBorder,
};

const totalValueStyle = {
  font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF0F172A' } },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: thinBorder,
  numFmt: '#,##0.00',
};

const grandTotalLabelStyle = {
  font: { name: 'Calibri', bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E293B' },
  },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: {
    top: { style: 'medium' as const, color: { argb: 'FF0F172A' } },
    bottom: { style: 'medium' as const, color: { argb: 'FF0F172A' } },
  },
};

const grandTotalValueStyle = {
  font: { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E293B' },
  },
  alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
  border: {
    top: { style: 'medium' as const, color: { argb: 'FF0F172A' } },
    bottom: { style: 'medium' as const, color: { argb: 'FF0F172A' } },
  },
  numFmt: '#,##0.00',
};

// ─── Helpers to populate cells and merged regions ───────────────────────────

function mergeAndStyle(
  ws: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  value: any,
  style?: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  }
) {
  if (startRow > endRow || startCol > endCol) {
    return;
  }

  const cleanVal = typeof value === 'number' && isNaN(value) ? 0 : (value ?? '');

  if (startRow === endRow && startCol === endCol) {
    const cell = ws.getCell(startRow, startCol);
    cell.value = cleanVal;
    if (style?.font) cell.font = style.font;
    if (style?.fill) cell.fill = style.fill;
    if (style?.border) cell.border = style.border;
    if (style?.alignment) cell.alignment = style.alignment;
    if (style?.numFmt) cell.numFmt = style.numFmt;
    return;
  }

  ws.mergeCells(startRow, startCol, endRow, endCol);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      if (style?.border) cell.border = style.border;
      if (style?.fill) cell.fill = style.fill;
    }
  }

  const mainCell = ws.getCell(startRow, startCol);
  mainCell.value = cleanVal;
  if (style?.font) mainCell.font = style.font;
  if (style?.alignment) mainCell.alignment = style.alignment;
  if (style?.numFmt) mainCell.numFmt = style.numFmt;
}

function setCell(
  ws: ExcelJS.Worksheet,
  r: number,
  c: number,
  value: any,
  style?: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  }
) {
  const cell = ws.getCell(r, c);
  const cleanVal = typeof value === 'number' && isNaN(value) ? 0 : (value ?? '');
  cell.value = cleanVal;
  if (style?.font) cell.font = style.font;
  if (style?.fill) cell.fill = style.fill;
  if (style?.border) cell.border = style.border;
  if (style?.alignment) cell.alignment = style.alignment;
  if (style?.numFmt) cell.numFmt = style.numFmt;
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer as any).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Export a single invoice (Daily or Consolidated Monthly) to an Excel (.xlsx) workbook.
 * Designed in vertical A4 portrait format to match the app preview and fit on 1 page wide when printed.
 */
export async function exportInvoiceToExcel(invoice: InvoiceRenderData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const isMonthly = invoice.invoiceType === 'monthly';
  const docTitle = isMonthly ? 'CONSOLIDATED MONTHLY TAX INVOICE' : 'TAX INVOICE';
  const sheetName = isMonthly ? 'Monthly Statement' : 'Tax Invoice';

  // Create worksheet with A4 Portrait and Fit-To-Width print setup
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1, // Fit all 8 columns on 1 page wide
      fitToHeight: 0, // Allow vertical flow across pages if items are numerous
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: true }],
  });

  // Total grid width: 8 columns (Col 1 = A, Col 8 = H)
  // Perfectly proportioned for Portrait A4 without horizontal clipping
  ws.columns = [
    { width: 5 },  // Col A (1): S.No
    { width: 12 }, // Col B (2): Date
    { width: 32 }, // Col C (3): Description of Goods / Services
    { width: 10 }, // Col D (4): HSN/SAC
    { width: 10 }, // Col E (5): Qty (with Unit)
    { width: 12 }, // Col F (6): Rate (₹)
    { width: 8 },  // Col G (7): GST %
    { width: 15 }, // Col H (8): Amount (₹)
  ];

  let curRow = 1;

  // ─── 1. Brand Header Banner ────────────────────────────────────────────────
  // Row 1: Document Title Bar (Dark Navy, 13pt Bold)
  ws.getRow(curRow).height = 28;
  mergeAndStyle(ws, curRow, 1, curRow, 8, docTitle, {
    font: { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  curRow++;

  // Row 2: Company Name (Brand Blue, 12pt Bold)
  ws.getRow(curRow).height = 26;
  mergeAndStyle(ws, curRow, 1, curRow, 8, invoice.business?.name || 'Commercial Billing', {
    font: { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  curRow++;

  // Row 3: Company Address
  ws.getRow(curRow).height = 20;
  const companyLoc = [
    invoice.business?.address,
    invoice.business?.city,
    invoice.business?.state,
    invoice.business?.pincode ? `- ${invoice.business.pincode}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  mergeAndStyle(ws, curRow, 1, curRow, 8, companyLoc, {
    font: { name: 'Calibri', italic: true, size: 9, color: { argb: 'FF475569' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  curRow++;

  // Row 4: Company Tax & Contact Line
  ws.getRow(curRow).height = 20;
  const companyContacts = [
    invoice.business?.gstin ? `GSTIN: ${invoice.business.gstin}` : null,
    invoice.business?.pan ? `PAN: ${invoice.business.pan}` : null,
    invoice.business?.phone ? `Phone: ${invoice.business.phone}` : null,
    invoice.business?.email ? `Email: ${invoice.business.email}` : null,
  ]
    .filter(Boolean)
    .join('   |   ');
  mergeAndStyle(ws, curRow, 1, curRow, 8, companyContacts || 'Commercial Billing Workstation', {
    font: { name: 'Calibri', size: 9, color: { argb: 'FF334155' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  curRow++;

  // Row 5: Spacer
  ws.getRow(curRow).height = 8;
  curRow++;

  // ─── 2. Invoice & Client Metadata (Two-Card Layout) ────────────────────────
  // Left: Cols 1-4 (A-D)  |  Right: Cols 5-8 (E-H)

  // Section Headers
  ws.getRow(curRow).height = 22;
  mergeAndStyle(ws, curRow, 1, curRow, 4, '  INVOICE DETAILS', metaSectionHeaderStyle);
  mergeAndStyle(ws, curRow, 5, curRow, 8, '  BILL TO (CLIENT DETAILS)', metaSectionHeaderStyle);
  curRow++;

  // Row 1: Invoice # & Client Name
  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 1, curRow, 2, 'Invoice Number:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 3, curRow, 4, invoice.invoiceNumber, metaValueBoldStyle);
  mergeAndStyle(ws, curRow, 5, curRow, 6, 'Client Name:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 7, curRow, 8, invoice.client?.name || 'Cash Customer', metaValueBoldStyle);
  curRow++;

  // Row 2: Date & Client Address
  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 1, curRow, 2, 'Invoice Date:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 3, curRow, 4, formatDate(invoice.invoiceDate), metaValueStyle);
  mergeAndStyle(ws, curRow, 5, curRow, 6, 'Address:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 7, curRow, 8, invoice.client?.address || 'Local Customer', metaValueStyle);
  curRow++;

  // Row 3: Period/Due Date & City / State
  ws.getRow(curRow).height = 20;
  mergeAndStyle(
    ws,
    curRow,
    1,
    curRow,
    2,
    isMonthly ? 'Billing Period:' : 'Due Date:',
    metaLabelStyle
  );
  mergeAndStyle(
    ws,
    curRow,
    3,
    curRow,
    4,
    isMonthly
      ? invoice.billingPeriod || invoice.billingMonth || 'N/A'
      : formatDate(invoice.dueDate || invoice.invoiceDate),
    metaValueBoldStyle
  );
  mergeAndStyle(ws, curRow, 5, curRow, 6, 'City / State:', metaLabelStyle);
  const clientCityState = [
    invoice.client?.city,
    invoice.client?.state,
    invoice.client?.pincode ? `- ${invoice.client.pincode}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  mergeAndStyle(ws, curRow, 7, curRow, 8, clientCityState || 'Local', metaValueStyle);
  curRow++;

  // Row 4: Place of Supply & GSTIN
  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 1, curRow, 2, 'Place of Supply:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 3, curRow, 4, invoice.placeOfSupply || 'N/A', metaValueStyle);
  mergeAndStyle(ws, curRow, 5, curRow, 6, 'GSTIN:', metaLabelStyle);
  mergeAndStyle(ws, curRow, 7, curRow, 8, invoice.client?.gstin || 'Unregistered', metaValueStyle);
  curRow++;

  // Row 5: Status & Contact
  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 1, curRow, 2, 'Status:', metaLabelStyle);
  mergeAndStyle(
    ws,
    curRow,
    3,
    curRow,
    4,
    (invoice.status || 'draft').toUpperCase(),
    invoice.status === 'paid'
      ? {
          font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF15803D' } },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          },
          alignment: { horizontal: 'left', vertical: 'middle' },
          border: thinBorder,
        }
      : metaValueBoldStyle
  );
  mergeAndStyle(ws, curRow, 5, curRow, 6, 'Phone / Email:', metaLabelStyle);
  const clientContact = [invoice.client?.phone, invoice.client?.email].filter(Boolean).join('  |  ');
  mergeAndStyle(ws, curRow, 7, curRow, 8, clientContact || 'N/A', metaValueStyle);
  curRow++;

  // Spacer row
  ws.getRow(curRow).height = 8;
  curRow++;

  // ─── 3. Line Items Table (8 Columns Matching Preview) ─────────────────────
  // Table Headers: #, Date, Description, HSN/SAC, Qty, Rate, GST %, Amount
  ws.getRow(curRow).height = 26;
  setCell(ws, curRow, 1, '#', headerStyle);
  setCell(ws, curRow, 2, 'Date', headerStyle);
  setCell(ws, curRow, 3, 'Description of Goods / Services', headerStyle);
  setCell(ws, curRow, 4, 'HSN/SAC', headerStyle);
  setCell(ws, curRow, 5, 'Qty', headerStyle);
  setCell(ws, curRow, 6, 'Rate (₹)', headerStyle);
  setCell(ws, curRow, 7, 'GST %', headerStyle);
  setCell(ws, curRow, 8, 'Amount (₹)', headerStyle);
  curRow++;

  // Table Data Rows
  invoice.items.forEach((it, idx) => {
    ws.getRow(curRow).height = 24;
    const rowBg = idx % 2 === 1
      ? {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFF8FAFC' },
        }
      : undefined;

    const itemLeftStyle = rowBg ? { ...cellLeft, fill: rowBg } : cellLeft;
    const itemCenterStyle = rowBg ? { ...cellCenter, fill: rowBg } : cellCenter;
    const itemNumStyle = rowBg ? { ...cellNumber, fill: rowBg } : cellNumber;
    const itemNumBoldStyle = rowBg ? { ...cellNumberBold, fill: rowBg } : cellNumberBold;

    const qtyString = `${it.quantity}${it.unit ? ` ${it.unit}` : ''}`;

    setCell(ws, curRow, 1, it.sno || idx + 1, itemCenterStyle);
    setCell(ws, curRow, 2, it.date || invoice.invoiceDate, itemCenterStyle);
    setCell(ws, curRow, 3, it.description, itemLeftStyle);
    setCell(ws, curRow, 4, it.hsnSac || '-', itemCenterStyle);
    setCell(ws, curRow, 5, qtyString, itemCenterStyle);
    setCell(ws, curRow, 6, it.rate, itemNumStyle);
    setCell(ws, curRow, 7, `${it.gstRate}%`, itemCenterStyle);
    setCell(ws, curRow, 8, it.total, itemNumBoldStyle);
    curRow++;
  });

  // ─── 4. Financial Totals & Remittance Block ────────────────────────────────
  // Left: Cols 1-5 (A-E) hold Amount In Words & Bank Remittance info
  // Right: Cols 6-8 (F-H) hold Financial Summary (F-G label, H value)
  const totalsStartRow = curRow;

  // Row 1: Subtotal & Discount Breakdown
  if (invoice.totalDiscount > 0) {
    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Gross Subtotal:', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.subtotal, totalValueStyle);
    curRow++;

    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Total Discount (-):', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalDiscount, totalValueStyle);
    curRow++;

    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Taxable Value:', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalTaxableAmount, totalValueStyle);
    curRow++;
  } else {
    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Taxable Value (Subtotal):', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalTaxableAmount, totalValueStyle);
    curRow++;
  }

  // Tax breakdown
  if (invoice.gstType === 'cgst_sgst') {
    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Central GST (CGST):', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalCgst, totalValueStyle);
    curRow++;

    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'State GST (SGST):', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalSgst, totalValueStyle);
    curRow++;
  } else if (invoice.gstType === 'igst') {
    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Integrated GST (IGST):', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.totalIgst, totalValueStyle);
    curRow++;
  }

  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 6, curRow, 7, 'Total GST Tax:', totalLabelStyle);
  setCell(ws, curRow, 8, invoice.totalTax, totalValueStyle);
  curRow++;

  if (invoice.roundOff !== 0) {
    ws.getRow(curRow).height = 20;
    mergeAndStyle(ws, curRow, 6, curRow, 7, 'Round Off:', totalLabelStyle);
    setCell(ws, curRow, 8, invoice.roundOff, totalValueStyle);
    curRow++;
  }

  // Grand Total Highlight Bar
  ws.getRow(curRow).height = 26;
  mergeAndStyle(ws, curRow, 6, curRow, 7, 'GRAND TOTAL (₹):', grandTotalLabelStyle);
  setCell(ws, curRow, 8, invoice.grandTotalRounded, grandTotalValueStyle);
  curRow++;

  // Amount Paid
  ws.getRow(curRow).height = 20;
  mergeAndStyle(ws, curRow, 6, curRow, 7, 'Amount Paid (₹):', totalLabelStyle);
  setCell(ws, curRow, 8, invoice.amountPaid, totalValueStyle);
  curRow++;

  // Balance Due
  ws.getRow(curRow).height = 22;
  const hasDue = invoice.balanceDue > 0;
  mergeAndStyle(
    ws,
    curRow,
    6,
    curRow,
    7,
    'BALANCE DUE (₹):',
    hasDue
      ? {
          font: { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF991B1B' } },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: thinBorder,
        }
      : {
          font: { name: 'Calibri', bold: true, size: 9.5, color: { argb: 'FF166534' } },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: thinBorder,
        }
  );
  setCell(
    ws,
    curRow,
    8,
    invoice.balanceDue,
    hasDue
      ? {
          font: { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF991B1B' } },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: thinBorder,
          numFmt: '#,##0.00',
        }
      : {
          font: { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF166534' } },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: thinBorder,
          numFmt: '#,##0.00',
        }
  );
  const totalsEndRow = curRow;
  curRow++;

  // ── Left Card: Amount In Words & Bank Details (Cols 1-5) ──
  // Amount in words box
  mergeAndStyle(
    ws,
    totalsStartRow,
    1,
    totalsStartRow,
    5,
    `Amount in Words: ${invoice.amountInWords || 'Zero Rupees Only'}`,
    {
      font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF1E3A8A' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' },
      },
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
      border: thinBorder,
    }
  );

  // Bank remittance box (occupies remaining rows on the left)
  if (totalsEndRow > totalsStartRow + 1) {
    mergeAndStyle(
      ws,
      totalsStartRow + 1,
      1,
      totalsStartRow + 1,
      5,
      'BANK REMITTANCE & PAYMENT DETAILS',
      {
        font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF0F172A' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: thinBorder,
      }
    );

    const bankDetailsStr = [
      invoice.bankDetails?.bankName ? `Bank: ${invoice.bankDetails.bankName}` : null,
      invoice.bankDetails?.accountName ? `A/C Name: ${invoice.bankDetails.accountName}` : null,
      invoice.bankDetails?.accountNumber ? `A/C No: ${invoice.bankDetails.accountNumber}` : null,
      invoice.bankDetails?.ifsc ? `IFSC: ${invoice.bankDetails.ifsc}` : null,
      invoice.bankDetails?.upiId ? `UPI ID: ${invoice.bankDetails.upiId}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    mergeAndStyle(
      ws,
      totalsStartRow + 2,
      1,
      totalsEndRow,
      5,
      bankDetailsStr || 'Payment due as per agreed credit terms.',
      {
        font: { name: 'Calibri', size: 9, color: { argb: 'FF334155' } },
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
        border: thinBorder,
      }
    );
  }

  // Spacer
  ws.getRow(curRow).height = 10;
  curRow++;

  // ─── 5. Terms & Conditions and Authorized Signatory Block ─────────────────
  ws.getRow(curRow).height = 22;
  mergeAndStyle(ws, curRow, 1, curRow, 5, 'TERMS & CONDITIONS', metaSectionHeaderStyle);
  mergeAndStyle(ws, curRow, 6, curRow, 8, `For ${invoice.business?.name || 'Company'}`, {
    font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF0F172A' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: thinBorder,
  });
  curRow++;

  const termsText = [
    invoice.terms || '1. Subject to local jurisdiction.\n2. Payment is due within agreed credit terms.',
    invoice.notes ? `Note: ${invoice.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  ws.getRow(curRow).height = 55;
  mergeAndStyle(ws, curRow, 1, curRow, 5, termsText, {
    font: { name: 'Calibri', size: 8.5, color: { argb: 'FF475569' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: thinBorder,
  });

  mergeAndStyle(ws, curRow, 6, curRow, 8, '\n\n\nAuthorized Signatory', {
    font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF334155' } },
    alignment: { horizontal: 'center', vertical: 'bottom' },
    border: thinBorder,
  });

  // ─── Save & Deliver File ───────────────────────────────────────────────────
  const cleanNum = invoice.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
  const defaultFilename = `${cleanNum}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  await exportAndSaveFile({
    fileName: defaultFilename,
    data: buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Share Invoice ${invoice.invoiceNumber} Excel`,
    successMessage: `Exported Excel: ${defaultFilename}`,
  });
}

/**
 * Export a batch ledger of invoices to an Excel (.xlsx) workbook.
 * Configured in A4 Landscape with Fit-To-Width for executive directory printouts.
 */
export async function exportInvoicesLedgerToExcel(
  invoices: InvoiceRecord[],
  reportTitle = 'Invoices Ledger Report'
): Promise<void> {
  if (invoices.length === 0) {
    toast.error('No invoices to export');
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ledger', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: true }],
  });

  const cols = [
    { header: 'Invoice #', width: 16 },
    { header: 'Date', width: 13 },
    { header: 'Type', width: 10 },
    { header: 'Billing Period', width: 22 },
    { header: 'Client Name', width: 28 },
    { header: 'Items', width: 8 },
    { header: 'Status', width: 11 },
    { header: 'Taxable (₹)', width: 16 },
    { header: 'Tax (₹)', width: 14 },
    { header: 'Grand Total (₹)', width: 18 },
    { header: 'Paid (₹)', width: 15 },
    { header: 'Balance Due (₹)', width: 16 },
  ];

  ws.columns = cols.map((c) => ({ width: c.width }));

  let curRow = 1;

  // Title Banner
  ws.getRow(curRow).height = 28;
  mergeAndStyle(ws, curRow, 1, curRow, 12, reportTitle, {
    font: { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  curRow++;

  const nowFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  ws.getRow(curRow).height = 20;
  mergeAndStyle(
    ws,
    curRow,
    1,
    curRow,
    12,
    `Generated on: ${nowFormatted}   |   Total Records: ${invoices.length}`,
    {
      font: { name: 'Calibri', size: 9, color: { argb: 'FF475569' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      },
      alignment: { horizontal: 'center', vertical: 'middle' },
    }
  );
  curRow++;

  // Spacer
  ws.getRow(curRow).height = 8;
  curRow++;

  // Table Headers
  ws.getRow(curRow).height = 26;
  cols.forEach((col, idx) => {
    setCell(ws, curRow, idx + 1, col.header, headerStyle);
  });
  curRow++;

  let sumTaxable = 0;
  let sumTax = 0;
  let sumGrand = 0;
  let sumPaid = 0;
  let sumDue = 0;

  invoices.forEach((inv, idx) => {
    ws.getRow(curRow).height = 22;
    const isMonthly = inv.data?.invoiceType === 'monthly';
    const isConsolidated = inv.isConsolidated || inv.data?.isConsolidated;
    const taxable = inv.data?.totalTaxableAmount || 0;
    const tax = inv.data?.totalTax || 0;
    const total = inv.total || 0;
    const paid = inv.data?.amountPaid || 0;
    const due = inv.data?.balanceDue || 0;

    if (!isConsolidated) {
      sumTaxable += taxable;
      sumTax += tax;
      sumGrand += total;
      sumPaid += paid;
      sumDue += due;
    }

    const rowBg = idx % 2 === 1
      ? {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFF8FAFC' },
        }
      : undefined;

    const rowLeft = rowBg ? { ...cellLeft, fill: rowBg } : cellLeft;
    const rowCenter = rowBg ? { ...cellCenter, fill: rowBg } : cellCenter;
    const rowNum = rowBg ? { ...cellNumber, fill: rowBg } : cellNumber;

    setCell(ws, curRow, 1, inv.invoiceNumber, rowCenter);
    setCell(ws, curRow, 2, formatDate(inv.date), rowCenter);
    setCell(ws, curRow, 3, isMonthly ? 'Monthly' : 'Daily', rowCenter);
    setCell(ws, curRow, 4, inv.data?.billingPeriod || '-', rowCenter);
    setCell(ws, curRow, 5, inv.clientName || inv.data?.client?.name || '', rowLeft);
    setCell(ws, curRow, 6, inv.data?.items?.length || 0, rowCenter);
    setCell(
      ws,
      curRow,
      7,
      isConsolidated ? 'CONSOLIDATED' : (inv.status || 'draft').toUpperCase(),
      inv.status === 'paid'
        ? {
            font: { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF15803D' } },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFDCFCE7' },
            },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: thinBorder,
          }
        : rowCenter
    );
    setCell(ws, curRow, 8, taxable, rowNum);
    setCell(ws, curRow, 9, tax, rowNum);
    setCell(ws, curRow, 10, total, rowNum);
    setCell(ws, curRow, 11, paid, rowNum);
    setCell(ws, curRow, 12, due, rowNum);
    curRow++;
  });

  // Summary Totals Row
  ws.getRow(curRow).height = 26;
  mergeAndStyle(ws, curRow, 1, curRow, 7, 'SUMMARY TOTALS:', grandTotalLabelStyle);
  setCell(ws, curRow, 8, sumTaxable, grandTotalValueStyle);
  setCell(ws, curRow, 9, sumTax, grandTotalValueStyle);
  setCell(ws, curRow, 10, sumGrand, grandTotalValueStyle);
  setCell(ws, curRow, 11, sumPaid, grandTotalValueStyle);
  setCell(ws, curRow, 12, sumDue, grandTotalValueStyle);

  const filename = `invoices-ledger-${Date.now()}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  await exportAndSaveFile({
    fileName: filename,
    data: buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Share Invoices Ledger Excel`,
    successMessage: `Exported Ledger: ${filename}`,
  });
}
