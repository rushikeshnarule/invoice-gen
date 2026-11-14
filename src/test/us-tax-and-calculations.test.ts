import { describe, it, expect } from 'vitest';
import {
  extractUSStateCode,
  getUSStateTaxRate,
  isUSTaxExemptState,
  formatEIN,
  isValidEIN,
  formatRoutingNumber,
  isValidRoutingNumber,
  formatUSZip,
  US_STATES,
} from '../utils/usTax';
import { amountInWords } from '../utils/amountInWords';
import { recalculate } from '../utils/buildRenderData';
import { createSampleDataUS } from '../utils/sampleData';
import { formatCurrency } from '../utils/numberFormat';

describe('United States Regional Tax & Calculation Engine', () => {
  it('identifies US states and provides statutory sales tax rates', () => {
    expect(extractUSStateCode('California')).toBe('CA');
    expect(extractUSStateCode('California (CA - 7.25%)')).toBe('CA');
    expect(extractUSStateCode('NY')).toBe('NY');
    expect(extractUSStateCode('Texas (TX)')).toBe('TX');
    expect(extractUSStateCode('Delaware')).toBe('DE');

    expect(getUSStateTaxRate('CA')).toBe(7.25);
    expect(getUSStateTaxRate('TX')).toBe(6.25);
    expect(getUSStateTaxRate('FL')).toBe(6.0);
    expect(getUSStateTaxRate('DE')).toBe(0.0);

    expect(isUSTaxExemptState('DE')).toBe(true);
    expect(isUSTaxExemptState('MT')).toBe(true);
    expect(isUSTaxExemptState('OR')).toBe(true);
    expect(isUSTaxExemptState('NH')).toBe(true);
    expect(isUSTaxExemptState('CA')).toBe(false);
  });

  it('validates and formats Federal EIN and ABA Routing numbers', () => {
    expect(formatEIN('123456789')).toBe('12-3456789');
    expect(isValidEIN('12-3456789')).toBe(true);
    expect(isValidEIN('12345')).toBe(false);

    // Chase routing number: 021000021
    expect(isValidRoutingNumber('021000021')).toBe(true);
    expect(isValidRoutingNumber('123456789')).toBe(false);

    expect(formatUSZip('941051234')).toBe('94105-1234');
    expect(formatUSZip('94105')).toBe('94105');
  });

  it('converts dollar amounts into standard American English words', () => {
    expect(amountInWords(1234.56, 'Dollars')).toBe(
      'One Thousand Two Hundred Thirty-Four Dollars and Fifty-Six Cents Only'
    );
    expect(amountInWords(100.0, 'USD')).toBe('One Hundred Dollars Only');
    expect(amountInWords(1.0, 'Dollars')).toBe('One Dollar Only');
    expect(amountInWords(1.01, 'Dollars')).toBe('One Dollar and One Cent Only');
    expect(amountInWords(0, 'Dollars')).toBe('Zero Dollars Only');
    expect(amountInWords(1000000, 'USD')).toBe('One Million Dollars Only');
  });

  it('recalculates US invoices with accurate sales tax and tax-exempt line items', () => {
    const raw = createSampleDataUS(3);
    const calculated = recalculate(raw);

    expect(calculated.region).toBe('US');
    expect(calculated.taxType).toBe('sales_tax');
    expect(calculated.currencySymbol).toBe('$');
    expect(calculated.currencyCode).toBe('USD');

    // Item 1: 40 * 150 = 6000 @ 7.25% = 435 tax
    // Item 2: 1 * 1200 = 1200 @ 7.25% = 87 tax
    // Item 3: 10 * 180 = 1800 @ 0% (exempt) = 0 tax
    // Subtotal: 9000
    // Total Tax: 522
    // Grand Total: 9522
    expect(calculated.subtotal).toBe(9000);
    expect(calculated.totalTaxableAmount).toBe(7200);
    expect(calculated.totalSalesTax).toBe(522);
    expect(calculated.grandTotal).toBe(9522);
    expect(calculated.grandTotalRounded).toBe(9522);
    expect(calculated.roundOff).toBe(0);
    expect(calculated.amountInWords).toContain('Nine Thousand Five Hundred Twenty-Two Dollars Only');

    // Formatting check
    expect(formatCurrency(calculated.grandTotal, '$')).toBe('$9,522.00');
  });

  it('preserves Indian GST calculation when region is IN or currency is ₹', () => {
    const indianData = {
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-04-15',
      business: {
        name: 'Mumbai Tech Solutions',
        state: 'Maharashtra (27)',
        gstin: '27AABCT1234F1ZP',
        address: 'Andheri',
        city: 'Mumbai',
        pincode: '400069',
        phone: '9820011223',
        email: 'info@mumbaitech.in',
      },
      client: {
        name: 'Delhi Client',
        state: 'Delhi (07)',
        gstin: '07AABCT1234F1ZP',
        address: 'Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
      },
      items: [
        {
          id: 'item-1',
          sno: 1,
          description: 'Consulting',
          quantity: 1,
          unit: 'Hrs',
          rate: 10000,
          taxableAmount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          total: 11800,
        },
      ],
      gstType: 'igst' as const,
      taxSummary: [],
      subtotal: 10000,
      totalDiscount: 0,
      totalTaxableAmount: 10000,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 1800,
      totalTax: 1800,
      grandTotal: 11800,
      roundOff: 0,
      grandTotalRounded: 11800,
      amountInWords: '',
      payments: [],
      amountPaid: 0,
      balanceDue: 11800,
      currencySymbol: '₹',
      currencyCode: 'INR',
      status: 'draft' as const,
    };

    const calculated = recalculate(indianData);
    expect(calculated.region).toBe('IN');
    expect(calculated.gstType).toBe('igst');
    expect(calculated.totalIgst).toBe(1800);
    expect(calculated.currencySymbol).toBe('₹');
    expect(calculated.amountInWords).toContain('Eleven Thousand Eight Hundred Rupees Only');
  });

  it('seamlessly switches between India (GST) and US (Sales Tax) with exact nomenclature', () => {
    // 1. Initial State: Indian GST invoice
    const baseInvoice = {
      region: 'IN' as const,
      taxType: 'gst' as const,
      currencySymbol: '₹',
      currencyCode: 'INR',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-05-01',
      placeOfSupply: 'Maharashtra (27)',
      status: 'draft' as const,
      business: {
        name: 'Apex Solutions India',
        region: 'IN' as const,
        gstin: '27AABCA1234F1ZX',
        pan: 'AABCA1234F',
        address: 'MG Road',
        city: 'Pune',
        state: 'Maharashtra (27)',
        pincode: '411001',
      },
      client: {
        name: 'Global Client Corp',
        state: 'Maharashtra (27)',
        gstin: '27BBBCB5678G1ZY',
      },
      items: [
        {
          id: 'item-1',
          sno: 1,
          description: 'Software Engineering Services',
          hsnSac: '998314',
          quantity: 10,
          unit: 'Hrs',
          rate: 1000,
          taxableAmount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          total: 11800,
        },
      ],
      gstType: 'cgst_sgst' as const,
      taxSummary: [],
      subtotal: 10000,
      totalDiscount: 0,
      totalTaxableAmount: 10000,
      totalCgst: 900,
      totalSgst: 900,
      totalIgst: 0,
      totalTax: 1800,
      grandTotal: 11800,
      roundOff: 0,
      grandTotalRounded: 11800,
      amountInWords: '',
      payments: [],
      amountPaid: 0,
      balanceDue: 11800,
    };

    // Calculate India Invoice
    const inCalculated = recalculate(baseInvoice);
    expect(inCalculated.region).toBe('IN');
    expect(inCalculated.currencySymbol).toBe('₹');
    expect(inCalculated.totalCgst).toBe(900);
    expect(inCalculated.totalSgst).toBe(900);
    expect(inCalculated.amountInWords).toContain('Rupees Only');

    // 2. Toggle to US (Sales Tax, USD $, SKU, EIN)
    const toggledToUS = recalculate({
      ...baseInvoice,
      region: 'US',
      taxType: 'sales_tax',
      currencySymbol: '$',
      currencyCode: 'USD',
      gstType: 'none',
      placeOfSupply: 'California (CA - 7.25%)',
      business: {
        ...baseInvoice.business,
        region: 'US',
        ein: '12-3456789',
        stateTaxId: 'CA-9876543',
      },
      client: {
        ...baseInvoice.client,
        state: 'California (CA)',
        ein: '98-7654321',
      },
      items: [
        {
          id: 'item-1',
          sno: 1,
          description: 'Software Engineering Services',
          sku: 'SRV-998314',
          taxable: true,
          quantity: 10,
          unit: 'hrs',
          rate: 100,
          taxableAmount: 1000,
          gstRate: 7.25,
          gstAmount: 72.5,
          total: 1072.5,
        },
      ],
    });

    expect(toggledToUS.region).toBe('US');
    expect(toggledToUS.currencySymbol).toBe('$');
    expect(toggledToUS.currencyCode).toBe('USD');
    expect(toggledToUS.totalSalesTax).toBe(72.5);
    expect(toggledToUS.grandTotalRounded).toBe(1072.5);
    expect(toggledToUS.amountInWords).toBe('One Thousand Seventy-Two Dollars and Fifty Cents Only');

    // 3. Toggle back to India (GST)
    const toggledBackToIndia = recalculate({
      ...toggledToUS,
      region: 'IN',
      taxType: 'gst',
      currencySymbol: '₹',
      currencyCode: 'INR',
      gstType: 'cgst_sgst',
      placeOfSupply: 'Maharashtra (27)',
      items: [
        {
          id: 'item-1',
          sno: 1,
          description: 'Software Engineering Services',
          hsnSac: '998314',
          quantity: 10,
          unit: 'Hrs',
          rate: 1000,
          taxableAmount: 10000,
          gstRate: 18,
          gstAmount: 1800,
          total: 11800,
        },
      ],
    });

    expect(toggledBackToIndia.region).toBe('IN');
    expect(toggledBackToIndia.currencySymbol).toBe('₹');
    expect(toggledBackToIndia.totalCgst).toBe(900);
    expect(toggledBackToIndia.totalSgst).toBe(900);
    expect(toggledBackToIndia.amountInWords).toContain('Eleven Thousand Eight Hundred Rupees Only');
  });
});
