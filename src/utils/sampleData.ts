// ─── Sample invoice data for preview and testing ────────────────────
import type { InvoiceRenderData } from '../types';

/**
 * Returns sample data with configurable item count for testing themes.
 */
export function createSampleData(itemCount = 5): InvoiceRenderData {
  const items = Array.from({ length: itemCount }, (_, i) => {
    const qty = ((i * 3 + 2) % 8) + 1;
    const rate = [250, 500, 1200, 3500, 750, 150, 8999, 450, 2100, 6500][i % 10];
    const gstRate = [18, 12, 5, 28, 18][i % 5];
    const discount = i % 3 === 0 ? 10 : 0;
    const baseAmount = qty * rate;
    const discountAmount = (baseAmount * discount) / 100;
    const taxableAmount = baseAmount - discountAmount;
    const gstAmount = (taxableAmount * gstRate) / 100;

    return {
      id: `item-${i + 1}`,
      sno: i + 1,
      description: SAMPLE_DESCRIPTIONS[i % SAMPLE_DESCRIPTIONS.length],
      hsnSac: SAMPLE_HSN[i % SAMPLE_HSN.length],
      quantity: qty,
      unit: SAMPLE_UNITS[i % SAMPLE_UNITS.length],
      rate,
      discount: discount || undefined,
      discountAmount: discountAmount || undefined,
      taxableAmount,
      gstRate,
      gstAmount,
      total: taxableAmount + gstAmount,
    };
  });

  const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const totalDiscount = items.reduce((s, it) => s + (it.discountAmount || 0), 0);
  const totalTaxableAmount = items.reduce((s, it) => s + it.taxableAmount, 0);
  const totalTax = items.reduce((s, it) => s + it.gstAmount, 0);
  const grandTotal = totalTaxableAmount + totalTax;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const grandTotalRounded = Math.round(grandTotal);

  return {
    invoiceNumber: 'INV-2024-0042',
    invoiceDate: '2024-11-15',
    dueDate: '2024-12-15',
    placeOfSupply: 'Maharashtra (27)',
    status: 'sent',

    business: {
      name: 'TechCraft Solutions Pvt. Ltd.',
      address: '301, Pinnacle Business Park, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400069',
      phone: '+91 98765 43210',
      email: 'billing@techcraft.in',
      website: 'www.techcraft.in',
      gstin: '27AABCT1234F1ZP',
      pan: 'AABCT1234F',
    },

    client: {
      name: 'Sunrise Enterprises',
      address: '45, Industrial Area, Phase II',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411018',
      phone: '+91 98210 12345',
      email: 'accounts@sunrise.co.in',
      gstin: '27AADCS5678G1Z9',
    },

    items,
    gstType: 'cgst_sgst',
    taxSummary: buildSampleTaxSummary(items),

    subtotal,
    totalDiscount,
    totalTaxableAmount,
    totalCgst: totalTax / 2,
    totalSgst: totalTax / 2,
    totalIgst: 0,
    totalTax,
    grandTotal,
    roundOff,
    grandTotalRounded,

    amountInWords: 'Fifteen Thousand Three Hundred and Forty Two Rupees Only',

    payments: [
      { date: '2024-11-20', amount: 5000, method: 'NEFT', reference: 'UTR123456' },
    ],
    amountPaid: 5000,
    balanceDue: grandTotalRounded - 5000,

    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'TechCraft Solutions Pvt. Ltd.',
      accountNumber: '50100123456789',
      ifsc: 'HDFC0001234',
      branch: 'Andheri East, Mumbai',
      upiId: 'billing@techcraft.upi',
    },

    notes: 'Thank you for your business. Payment is expected within 30 days.',
    terms:
      '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue invoices.\n3. Subject to Mumbai jurisdiction.',
    copyLabel: 'Original for Recipient',

    currencySymbol: '₹',
    currencyCode: 'INR',
  };
}

/** Sample with Hindi/Marathi text for Devanagari font testing */
export function createSampleDataDevanagari(): InvoiceRenderData {
  const base = createSampleData(3);
  return {
    ...base,
    invoiceNumber: 'INV-2024-0099',
    business: {
      ...base.business,
      name: 'टेककॉर्प सॉल्यूशन्स प्रा. लि.',
      address: '३०१, पिनॅकल बिझनेस पार्क, अंधेरी पूर्व',
    },
    client: {
      ...base.client,
      name: 'सनराइज एंटरप्राइजेज',
      address: '४५, औद्योगिक क्षेत्र, फेज II',
    },
    items: base.items.map((item, i) => ({
      ...item,
      description: SAMPLE_DESCRIPTIONS_DEVANAGARI[i % SAMPLE_DESCRIPTIONS_DEVANAGARI.length],
    })),
  };
}

/** Sample for IGST (inter-state) scenario */
export function createSampleDataIGST(): InvoiceRenderData {
  const base = createSampleData(4);
  return {
    ...base,
    gstType: 'igst',
    client: { ...base.client, state: 'Karnataka', pincode: '560001', city: 'Bangalore' },
    placeOfSupply: 'Karnataka (29)',
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: base.totalTax,
    taxSummary: base.taxSummary.map((row) => ({
      ...row,
      cgst: 0,
      sgst: 0,
      igst: row.totalTax,
    })),
  };
}

/** Sample for unregistered business (no GST) */
export function createSampleDataNoGST(): InvoiceRenderData {
  const base = createSampleData(3);
  return {
    ...base,
    gstType: 'none',
    business: { ...base.business, gstin: undefined },
    client: { ...base.client, gstin: undefined },
    taxSummary: [],
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalTax: 0,
    grandTotal: base.totalTaxableAmount,
    grandTotalRounded: Math.round(base.totalTaxableAmount),
    roundOff: Math.round(base.totalTaxableAmount) - base.totalTaxableAmount,
    items: base.items.map((it) => ({
      ...it,
      gstRate: 0,
      gstAmount: 0,
      total: it.taxableAmount,
      hsnSac: undefined,
    })),
  };
}

// ── helpers ──

function buildSampleTaxSummary(items: InvoiceRenderData['items']) {
  const map = new Map<number, { taxable: number; tax: number }>();
  for (const it of items) {
    const e = map.get(it.gstRate) || { taxable: 0, tax: 0 };
    e.taxable += it.taxableAmount;
    e.tax += it.gstAmount;
    map.set(it.gstRate, e);
  }
  return Array.from(map.entries()).map(([rate, { taxable, tax }]) => ({
    gstRate: rate,
    taxableAmount: taxable,
    cgst: tax / 2,
    sgst: tax / 2,
    igst: 0,
    totalTax: tax,
  }));
}

const SAMPLE_DESCRIPTIONS = [
  'Web Application Development — React + Node.js (Phase 1)',
  'UI/UX Design — Mobile App Wireframes & Prototypes',
  'Cloud Infrastructure Setup — AWS EC2, RDS, S3',
  'Annual Maintenance Contract — Software Support',
  'Data Analytics Dashboard — Power BI Integration',
  'API Integration — Payment Gateway (Razorpay)',
  'SSL Certificate — Wildcard (*.example.com) 2yr',
  'Domain Registration — .in + .com (5 years)',
  'Staff Training — Cybersecurity Awareness Workshop',
  'Server Migration — On-premise to AWS Cloud',
];

const SAMPLE_DESCRIPTIONS_DEVANAGARI = [
  'वेब अॅप्लिकेशन विकास — रिॲक्ट + नोड.जेएस',
  'यूआई/यूएक्स डिझाइन — मोबाइल अॅप वायरफ्रेम',
  'क्लाउड इन्फ्रास्ट्रक्चर सेटअप — एडब्ल्यूएस',
];

const SAMPLE_HSN = ['998314', '998313', '998315', '998316', '998319'];
const SAMPLE_UNITS = ['Nos', 'Hrs', 'Nos', 'Lic', 'Nos'];

/**
 * Returns professional sample invoice data for the United States edition.
 * Features US Federal EIN, California sales tax, ABA Routing, and USD ($).
 */
export function createSampleDataUS(itemCount = 3): InvoiceRenderData {
  const allItems: InvoiceRenderData['items'] = [
    {
      id: 'us-item-1',
      sno: 1,
      sku: 'DEV-SRV-01',
      description: 'Full-Stack Software Architecture & Cloud Migration',
      quantity: 40,
      unit: 'Hrs',
      rate: 150,
      taxable: true,
      taxableAmount: 6000,
      gstRate: 7.25, // California State Sales Tax %
      gstAmount: 435,
      total: 6435,
    },
    {
      id: 'us-item-2',
      sno: 2,
      sku: 'SaaS-LIC-ENT',
      description: 'Commercial Enterprise Workstation License (Annual)',
      quantity: 1,
      unit: 'Lic',
      rate: 1200,
      taxable: true,
      taxableAmount: 1200,
      gstRate: 7.25,
      gstAmount: 87,
      total: 1287,
    },
    {
      id: 'us-item-3',
      sno: 3,
      sku: 'SEC-AUD-01',
      description: 'Zero-Trust Security & SOC2 Compliance Consultation',
      quantity: 10,
      unit: 'Hrs',
      rate: 180,
      taxable: false, // Tax-Exempt B2B consulting
      taxableAmount: 1800,
      gstRate: 0,
      gstAmount: 0,
      total: 1800,
    },
  ];

  const items = allItems.slice(0, itemCount);
  const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const totalTaxableAmount = items.filter((it) => it.taxable !== false && it.gstRate > 0).reduce((s, it) => s + it.taxableAmount, 0);
  const totalTax = Math.round(items.reduce((s, it) => s + it.gstAmount, 0) * 100) / 100;
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

  return {
    region: 'US',
    taxType: 'sales_tax',
    invoiceNumber: 'INV-2026-101',
    invoiceDate: '2026-04-15',
    dueDate: '2026-05-15',
    placeOfSupply: 'California (CA)',
    status: 'sent',
    business: {
      name: 'Pacific Apex Technologies LLC',
      address: '500 Howard Street, Suite 400',
      city: 'San Francisco',
      state: 'California (CA)',
      pincode: '94105',
      phone: '+1 (415) 890-1200',
      email: 'invoicing@pacificapex.com',
      website: 'www.pacificapex.com',
      ein: '94-3829104',
      stateTaxId: 'CA-9438291',
      region: 'US',
    },
    client: {
      name: 'Beacon Horizon Ventures Inc.',
      address: '100 Montgomery Street, Floor 18',
      city: 'San Francisco',
      state: 'California (CA)',
      pincode: '94104',
      phone: '+1 (415) 555-0199',
      email: 'ap@beaconhorizon.com',
      ein: '82-1928374',
    },
    items,
    gstType: 'none',
    taxSummary: [
      { gstRate: 0, taxableAmount: 1800, cgst: 0, sgst: 0, igst: 0, totalTax: 0, label: 'Tax-Exempt' },
      { gstRate: 7.25, taxableAmount: 7200, cgst: 0, sgst: 0, igst: 0, totalTax: 522, label: 'Sales Tax (7.25%)' },
    ],
    subtotal,
    totalDiscount: 0,
    totalTaxableAmount,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalTax,
    totalSalesTax: totalTax,
    grandTotal,
    roundOff: 0,
    grandTotalRounded: grandTotal,
    amountInWords: 'Nine Thousand Five Hundred Twenty-Two Dollars Only',
    payments: [],
    amountPaid: 0,
    balanceDue: grandTotal,
    bankDetails: {
      bankName: 'JPMorgan Chase Bank, N.A.',
      accountName: 'Pacific Apex Technologies LLC',
      accountNumber: '984029104820',
      ifsc: '',
      routingNumber: '121000248',
      zelleId: 'payments@pacificapex.com',
    },
    notes: 'Payment is due within 30 days. Wire / ACH transfer preferred.',
    terms: '1. Standard terms: Net 30.\n2. Overdue balances are subject to a 1.5% monthly finance charge.',
    currencySymbol: '$',
    currencyCode: 'USD',
  };
}
