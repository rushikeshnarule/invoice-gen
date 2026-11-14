import { describe, it, expect } from 'vitest';
import { amountInWords } from '../utils/amountInWords';
import { determineGSTType, buildTaxSummary, roundTotal, extractStateCode } from '../utils/gst';
import { recalculate } from '../utils/buildRenderData';
import { createSampleData } from '../utils/sampleData';
import { formatDate } from '../utils/numberFormat';
import { getClientId } from '../utils/initialOfflineData';
import { getUpiQrString } from '../themes/themeHelpers';
import { generateQRCodeSvg } from '../utils/qrcode';

describe('Calculation Engine & Number in Words Suite', () => {
  describe('amountInWords', () => {
    it('handles zero correctly', () => {
      expect(amountInWords(0)).toBe('Zero Rupees Only');
    });

    it('handles single digits and tens', () => {
      expect(amountInWords(1)).toBe('One Rupee Only');
      expect(amountInWords(15)).toBe('Fifteen Rupees Only');
      expect(amountInWords(99)).toBe('Ninety Nine Rupees Only');
    });

    it('handles hundreds and thousands', () => {
      expect(amountInWords(100)).toBe('One Hundred Rupees Only');
      expect(amountInWords(105)).toBe('One Hundred and Five Rupees Only');
      expect(amountInWords(1250)).toBe('One Thousand Two Hundred and Fifty Rupees Only');
    });

    it('handles lakhs and crores with Indian numbering', () => {
      expect(amountInWords(100000)).toBe('One Lakh Rupees Only');
      expect(amountInWords(10000000)).toBe('One Crore Rupees Only');
      expect(amountInWords(1234567)).toBe(
        'Twelve Lakh Thirty Four Thousand Five Hundred and Sixty Seven Rupees Only'
      );
    });

    it('handles paise subunits cleanly', () => {
      expect(amountInWords(0.5)).toBe('Fifty Paise Only');
      expect(amountInWords(0.01)).toBe('One Paisa Only');
      expect(amountInWords(100.5)).toBe('One Hundred Rupees and Fifty Paise Only');
      expect(amountInWords(1234.56)).toBe(
        'One Thousand Two Hundred and Thirty Four Rupees and Fifty Six Paise Only'
      );
    });

    it('handles decimal rounding boundary edge cases without undefined Paise', () => {
      // 19.996 should round to 20.00 Rupees, NOT 'undefined Paise'
      expect(amountInWords(19.996)).toBe('Twenty Rupees Only');
      // 0.999 should round to 1 Rupee
      expect(amountInWords(0.999)).toBe('One Rupee Only');
      // 0.001 rounds to 0
      expect(amountInWords(0.001)).toBe('Zero Rupees Only');
    });

    it('handles negative numbers', () => {
      expect(amountInWords(-500)).toBe('Minus Five Hundred Rupees Only');
    });
  });

  describe('GST determinations', () => {
    it('returns none if business has no GSTIN', () => {
      expect(determineGSTType('Maharashtra', 'Maharashtra', false)).toBe('none');
    });

    it('returns cgst_sgst for same state', () => {
      expect(determineGSTType('Maharashtra', 'Maharashtra', true)).toBe('cgst_sgst');
      expect(determineGSTType('Maharashtra (27)', 'Maharashtra', true)).toBe('cgst_sgst');
      expect(determineGSTType('27 - Maharashtra', 'Maharashtra (27)', true)).toBe('cgst_sgst');
    });

    it('returns igst for different states', () => {
      expect(determineGSTType('Maharashtra', 'Karnataka', true)).toBe('igst');
      expect(determineGSTType('Maharashtra (27)', 'Karnataka (29)', true)).toBe('igst');
    });

    it('does not falsely match arbitrary 2-digit street or sector numbers', () => {
      // Both addresses contain '24', but states are Maharashtra (27) and Haryana (06)
      expect(
        determineGSTType(
          'Shop 24, Link Road, Maharashtra (27)',
          'Sector 24, Cyber City, Haryana (06)',
          true
        )
      ).toBe('igst');
    });

    it('extracts state codes from standard 15-digit GSTIN prefix', () => {
      expect(extractStateCode('', '27AABCT1234F1ZP')).toBe('27');
      expect(extractStateCode('', '29AADCS5678G1Z9')).toBe('29');
      expect(extractStateCode('', '07AAAAA0000A1Z5')).toBe('07');
    });

    it('determines GST type from GSTIN prefixes when state strings are messy or abbreviated', () => {
      // Supplier in MH (27), Client in MH (27) via GSTIN
      expect(
        determineGSTType('MH', 'Pune', true, '27AABCT1234F1ZP', '27AADCS5678G1Z9')
      ).toBe('cgst_sgst');

      // Supplier in MH (27), Client in KA (29) via GSTIN
      expect(
        determineGSTType('Maharashtra', 'Bangalore', true, '27AABCT1234F1ZP', '29AADCS5678G1Z9')
      ).toBe('igst');
    });

    it('resolves state abbreviations like MH, DL, KA, TN', () => {
      expect(determineGSTType('MH', 'Maharashtra', true)).toBe('cgst_sgst');
      expect(determineGSTType('DL', 'Delhi', true)).toBe('cgst_sgst');
      expect(determineGSTType('MH', 'KA', true)).toBe('igst');
    });
  });

  describe('Bug fix verifications', () => {
    it('formats invalid or empty dates gracefully without throwing RangeError', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('generates non-colliding client IDs for Unicode / Devanagari names', () => {
      const id1 = getClientId('श्री गणेश ट्रेडर्स');
      const id2 = getClientId('साई इंटरप्रायझेस');
      expect(id1).not.toBe('client-');
      expect(id2).not.toBe('client-');
      expect(id1).not.toBe(id2);
      expect(id1).toBe('client-श्री-गणेश-ट्रेडर्स');
    });

    it('suppresses UPI payment intent amount when balance due is zero or fully paid', () => {
      const sample = createSampleData(1);
      sample.amountPaid = sample.grandTotalRounded;
      sample.balanceDue = 0;
      expect(getUpiQrString(sample)).toBe('');
    });

    it('generates compliant NPCI UPI payment intent URL with 2 decimal places and clean parameters', () => {
      const sample = createSampleData(1);
      sample.amountPaid = 0;
      sample.balanceDue = 950;
      sample.grandTotalRounded = 950;
      sample.invoiceNumber = 'INV-2026-001';
      sample.business.name = 'TechCraft Solutions & Trading Pvt. Ltd.';
      sample.bankDetails = {
        bankName: 'HDFC Bank',
        accountName: 'TechCraft',
        accountNumber: '123456789',
        ifsc: 'HDFC0001234',
        upiId: 'billing@techcraft.upi',
      };

      const upiUrl = getUpiQrString(sample);
      expect(upiUrl).toContain('upi://pay?');
      expect(upiUrl).toContain('pa=billing@techcraft.upi');
      expect(upiUrl).toContain('am=950.00');
      expect(upiUrl).toContain('cu=INR');
      expect(upiUrl).toContain('tr=INV2026001');
      expect(upiUrl).toContain('tn=Invoice%20INV-2026-001');
      // Should not contain special characters like & in payee name
      expect(upiUrl).not.toContain('%26');
    });

    it('generates valid SVG QR code with quiet zone margin and solid white background', () => {
      const svg = generateQRCodeSvg('upi://pay?pa=test@upi&pn=Test&am=100.00&cu=INR', 120);
      expect(svg).toContain('<svg');
      expect(svg).toContain('<rect width="100%" height="100%" fill="#ffffff" />');
      expect(svg).toContain('fill="#000000"');
      expect(svg).toContain('shape-rendering="crispEdges"');
    });

    it('returns empty string for empty QR input preventing ghost frames', () => {
      expect(generateQRCodeSvg('')).toBe('');
      expect(generateQRCodeSvg('   ')).toBe('');
    });
  });

  describe('roundTotal & tax summaries', () => {
    it('rounds total with exact 2-decimal roundOff and zero float jitter', () => {
      const res = roundTotal(100.3);
      expect(res.rounded).toBe(100);
      expect(res.roundOff).toBe(-0.3);

      const res2 = roundTotal(100.75);
      expect(res2.rounded).toBe(101);
      expect(res2.roundOff).toBe(0.25);
    });

    it('builds tax summary with exact half-paise splitting', () => {
      const sample = createSampleData(2);
      const summary = buildTaxSummary(sample.items, 'cgst_sgst');
      for (const row of summary) {
        expect(Number((row.cgst + row.sgst).toFixed(2))).toBe(row.totalTax);
      }
    });

    it('recalculates without float drift', () => {
      const sample = createSampleData(5);
      const rec = recalculate(sample);
      expect(rec.totalCgst + rec.totalSgst).toBe(rec.totalTax);
      expect(rec.grandTotalRounded).toBe(Math.round(rec.grandTotal));
      expect(rec.balanceDue).toBe(rec.grandTotalRounded - rec.amountPaid);
    });

    it('clamps balance due to zero when invoice is paid in full or overpaid', () => {
      const sample = createSampleData(1);
      sample.payments = [
        { date: '2026-11-04', amount: sample.grandTotalRounded, method: 'UPI' },
        { date: '2026-11-04', amount: 5000, method: 'UPI' },
      ];
      const rec = recalculate(sample);
      expect(rec.amountPaid).toBe(sample.grandTotalRounded + 5000);
      expect(rec.balanceDue).toBe(0);
      expect(rec.status).toBe('paid');
    });

    it('handles exact screenshot scenario: ₹47,643 invoice with ₹47,643 + ₹5,000 payments without negative balance', () => {
      const sample = createSampleData(1);
      sample.items = [
        {
          id: 'item-1',
          sno: 1,
          description: 'Consulting Services',
          quantity: 1,
          unit: 'Nos',
          rate: 40375.42,
          gstRate: 18,
          taxableAmount: 40375.42,
          gstAmount: 7267.58,
          total: 47643,
        },
      ];
      sample.payments = [
        { date: '2026-11-04', amount: 47643, method: 'UPI', reference: 'REF-338749' },
        { date: '2026-11-04', amount: 5000, method: 'UPI', reference: 'REF-342693' },
      ];
      const rec = recalculate(sample);
      expect(rec.grandTotalRounded).toBe(47643);
      expect(rec.amountPaid).toBe(52643);
      expect(rec.balanceDue).toBe(0); // Strictly zero, NEVER negative -5000
      expect(rec.status).toBe('paid');
    });

    it('adds up GST to total when item has GST rate even if business GSTIN is missing or empty', () => {
      // User scenario: Cement, Qty 1, Rate 1000, GST 5% -> GST ₹50, Grand Total ₹1,050
      const raw = createSampleData(1);
      raw.business.gstin = '';
      raw.items = [
        {
          id: 'test-item-cement',
          sno: 1,
          description: 'Cement',
          hsnSac: '998314',
          quantity: 1,
          unit: 'Hrs',
          rate: 1000,
          discount: 0,
          taxableAmount: 1000,
          gstRate: 5,
          gstAmount: 50,
          total: 1050,
        },
      ];

      const rec = recalculate(raw);
      expect(rec.subtotal).toBe(1000);
      expect(rec.totalTaxableAmount).toBe(1000);
      expect(rec.totalTax).toBe(50);
      expect(rec.totalCgst).toBe(25);
      expect(rec.totalSgst).toBe(25);
      expect(rec.grandTotal).toBe(1050);
      expect(rec.grandTotalRounded).toBe(1050);
    });

    it('correctly calculates Gross Subtotal, Discount, Taxable Subtotal and zero GST breakdown', () => {
      // Scenario from user screenshot: Qty 1, Rate 1000, 5% Disc, 0% GST
      const raw = createSampleData(1);
      raw.items = [
        {
          id: 'test-item-1',
          sno: 1,
          description: 'Hardware Equipment',
          quantity: 1,
          unit: 'Nos',
          rate: 1000,
          discount: 5,
          taxableAmount: 950,
          gstRate: 0,
          gstAmount: 0,
          total: 950,
        },
      ];

      const rec = recalculate(raw);
      expect(rec.subtotal).toBe(1000);
      expect(rec.totalDiscount).toBe(50);
      expect(rec.totalTaxableAmount).toBe(950);
      expect(rec.totalCgst).toBe(0);
      expect(rec.totalSgst).toBe(0);
      expect(rec.totalTax).toBe(0);
      expect(rec.grandTotalRounded).toBe(950);
    });

    it('guarantees balanceDue is 0 when invoice status is set to paid even without prior payment entries', () => {
      // Direct reproduction of user issue: invoice set to paid has zero due and amountPaid = total
      const raw = createSampleData(1);
      raw.status = 'paid';
      raw.payments = [];
      const rec = recalculate(raw);

      expect(rec.status).toBe('paid');
      expect(rec.balanceDue).toBe(0);
      expect(rec.amountPaid).toBe(rec.grandTotalRounded);
      // And UPI QR code is completely suppressed on paid invoices
      expect(getUpiQrString(rec)).toBe('');
    });

    it('retains correct balanceDue when invoice status is draft or sent', () => {
      const raw = createSampleData(1);
      raw.status = 'draft';
      raw.payments = [];
      const recDraft = recalculate(raw);
      expect(recDraft.status).toBe('draft');
      expect(recDraft.balanceDue).toBe(recDraft.grandTotalRounded);
      expect(recDraft.amountPaid).toBe(0);

      raw.status = 'sent';
      const recSent = recalculate(raw);
      expect(recSent.status).toBe('sent');
      expect(recSent.balanceDue).toBe(recSent.grandTotalRounded);
      expect(recSent.amountPaid).toBe(0);
    });

    it('safely handles string-typed payment amounts without string concatenation or NaN', () => {
      const raw = createSampleData(1);
      raw.status = 'sent';
      // Payments with string values (from JSON or user input)
      raw.payments = [
        { date: '2026-04-10', amount: '250.50' as any, method: 'UPI' },
        { date: '2026-04-11', amount: '249.50' as any, method: 'Cash' },
      ];
      const rec = recalculate(raw);
      expect(typeof rec.amountPaid).toBe('number');
      expect(rec.amountPaid).toBe(500);
      expect(rec.balanceDue).toBe(Math.max(0, rec.grandTotalRounded - 500));
    });

    it('preserves user chosen gstType when business has no gstin configured yet', () => {
      const raw = createSampleData(1);
      raw.business.gstin = '';
      raw.gstType = 'cgst_sgst';
      raw.items = [
        {
          id: 'item-1',
          sno: 1,
          description: 'Initial Item',
          quantity: 1,
          unit: 'Nos',
          rate: 500,
          discount: 0,
          taxableAmount: 500,
          gstRate: 0,
          gstAmount: 0,
          total: 500,
        },
      ];
      const rec = recalculate(raw);
      expect(rec.gstType).toBe('cgst_sgst');
    });

    it('formatDate formats YYYY-MM-DD consistently without UTC date-shift', () => {
      const formatted = formatDate('2026-04-15');
      // Must display 15 Apr 2026, never 14 Apr 2026
      expect(formatted).toContain('15');
      expect(formatted).toMatch(/Apr|04/);
      expect(formatted).toContain('2026');
    });
  });
});
