// ─── Core Invoice Data Types ────────────────────────────────────────
// These types represent the RENDER data passed to every theme.
// Themes never touch the database — they receive InvoiceRenderData.

export type PaperSize = 'A4' | 'A5' | '80mm';

export type GSTType = 'igst' | 'cgst_sgst' | 'none';
export type RegionalTaxType = 'gst' | 'sales_tax' | 'none';
export type AppRegion = 'US' | 'IN';

export interface BusinessInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  region?: AppRegion;
  taxType?: RegionalTaxType;
  // Indian Identifiers
  gstin?: string;
  pan?: string;
  // US Identifiers
  ein?: string; // Federal Employer Identification Number (XX-XXXXXXX)
  stateTaxId?: string; // State Sales Tax Permit / Resale Certificate #
  logoUrl?: string; // base64 data URI or local path
  stampUrl?: string; // base64 data URI of company seal/stamp
  signatureUrl?: string; // base64 data URI of authorized signatory
  notes?: string;
  terms?: string;
}

export interface ClientInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  // Indian Identifiers
  gstin?: string;
  // US Identifiers
  ein?: string;
  taxExempt?: boolean;
  resaleCertificate?: string;
}

export interface LineItem {
  id: string;
  sno: number;
  date?: string;            // Date of purchase/delivery for this item (crucial for monthly invoices)
  description: string;
  hsnSac?: string;          // Indian HSN/SAC code
  sku?: string;             // US SKU / Product / Service code
  taxable?: boolean;        // US Sales Tax taxable flag (defaults to true if rate > 0)
  quantity: number;
  unit: string;
  rate: number;
  discount?: number;        // percentage
  discountAmount?: number;  // calculated
  taxableAmount: number;
  gstRate: number;          // percentage (serves as Sales Tax % in US mode)
  gstAmount: number;        // tax amount (serves as Sales Tax in US mode)
  total: number;
}

export interface TaxSummaryRow {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  label?: string;           // Optional display label e.g. "Sales Tax (7.25%)"
}

export interface PaymentInfo {
  date: string;
  amount: number;
  method: string;
  reference?: string;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;             // Indian IFSC code
  routingNumber?: string;   // US 9-digit ABA Routing Number
  branch?: string;
  upiId?: string;           // Indian UPI ID
  zelleId?: string;         // US Zelle phone or email
  paymentLink?: string;     // US / Global online payment link
}

export interface InvoiceRenderData {
  // Region & Tax System
  region?: AppRegion;
  taxType?: RegionalTaxType;
  salesTaxRate?: number;    // Overall sales tax percentage in US mode
  totalSalesTax?: number;   // Total sales tax in US mode

  // Invoice type & billing period
  invoiceType?: 'daily' | 'monthly'; // 'daily' is standard single-day bill; 'monthly' is consolidated monthly invoice
  billingPeriod?: string;            // e.g. "April 2026" or "01-04-2026 to 30-04-2026"
  billingMonth?: string;             // e.g. "2026-04"

  // Invoice metadata
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupply?: string;

  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

  // Parties
  business: BusinessInfo;
  client: ClientInfo;
  shipTo?: ClientInfo;

  // Line items
  items: LineItem[];

  // GST / Tax
  gstType: GSTType;
  taxSummary: TaxSummaryRow[];

  // Totals
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  grandTotalRounded: number;

  // Amount in words
  amountInWords: string;

  // Payments
  payments: PaymentInfo[];
  amountPaid: number;
  balanceDue: number;

  // Bank / UPI / ACH
  bankDetails?: BankDetails;
  upiQrDataUrl?: string; // base64 data URI of QR

  // Additional
  notes?: string;
  terms?: string;
  logoUrl?: string;      // base64 data URI of company logo/photo
  signatureUrl?: string; // base64 data URI
  stampUrl?: string;     // base64 data URI of company seal/stamp
  copyLabel?: string;    // "Original for Recipient", "Duplicate", etc.

  // Currency
  currencySymbol: string;
  currencyCode: string;
}
