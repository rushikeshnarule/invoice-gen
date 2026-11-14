import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { DynamicRemoteTheme } from '@/themes/DynamicRemoteTheme';
import { DEFAULT_THEME_OPTIONS } from '@/types/theme';
import type { InvoiceRenderData } from '@/types';
import { BUNDLED_REMOTE_TEMPLATES } from '@/services/templateSyncService';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

describe('Construction Contractor Template & Customization Bug Hunter Suite', () => {
  const sampleInvoiceData: InvoiceRenderData = {
    invoiceNumber: 'SS-MALI-26-27-02',
    invoiceDate: '2026-04-15',
    dueDate: '2026-05-15',
    placeOfSupply: 'Pune, Maharashtra',
    status: 'draft',
    business: {
      name: 'S.S. MALI & CO.',
      address: 'Plot No. 42, Industrial Area, Hadapsar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411028',
      gstin: '27AABCS1429B1Z1',
      phone: '+91 98765 43210',
      email: 'ssmali@example.com',
      logoUrl: 'https://example.com/logo.png',
      stampUrl: 'https://example.com/stamp.png',
      signatureUrl: 'https://example.com/signature.png',
    },
    client: {
      name: 'Riddhi Siddhi Infrastructure Ltd.',
      address: 'Sky Vista, 5th Floor, Viman Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411014',
      gstin: '27AAECR5512D1Z9',
      phone: '+91 99887 76655',
    },
    items: [
      {
        id: 'item-1',
        description: 'Crushed Metal Aggregate (10mm)',
        hsnSac: '25171010',
        quantity: 50,
        unit: 'Brass',
        rate: 2400,
        discount: 0,
        taxableAmount: 120000,
        gstRate: 5,
        cgst: 3000,
        sgst: 3000,
        igst: 0,
        total: 126000,
      },
      {
        id: 'item-2',
        description: 'River Sand / Natural Sand Class II',
        hsnSac: '25051000',
        quantity: 30,
        unit: 'Brass',
        rate: 4500,
        discount: 5,
        taxableAmount: 128250,
        gstRate: 5,
        cgst: 3206.25,
        sgst: 3206.25,
        igst: 0,
        total: 134662.5,
      },
    ],
    subtotal: 255000,
    totalDiscount: 6750,
    totalTaxableAmount: 248250,
    gstType: 'cgst_sgst',
    totalCgst: 6206.25,
    totalSgst: 6206.25,
    totalIgst: 0,
    totalTax: 12412.5,
    taxSummary: [
      {
        gstRate: 5,
        taxableAmount: 248250,
        cgst: 6206.25,
        sgst: 6206.25,
        igst: 0,
        totalTax: 12412.5,
      },
    ],
    roundOff: -0.5,
    grandTotal: 260662.5,
    grandTotalRounded: 260662,
    amountInWords: 'Two Lakh Sixty Thousand Six Hundred Sixty Two',
    amountPaid: 0,
    balanceDue: 260662,
    bankDetails: {
      bankName: 'HDFC Bank Ltd.',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0000123',
      branch: 'Camp Branch, Pune',
      upiId: 'ssmali@hdfcbank',
    },
    notes: 'Material delivered at project site.',
    terms: 'Payment due within 15 days of invoice date.',
  };

  const contractorTemplateDef = BUNDLED_REMOTE_TEMPLATES.find(
    (t) => t.id === 'construction-contractor'
  )!;

  it('renders construction contractor template with exact commercial sections', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{ ...DEFAULT_THEME_OPTIONS, ...contractorTemplateDef.defaultOptions }}
        templateDef={contractorTemplateDef}
      />
    );

    // Verify main root class and header
    expect(container.querySelector('.contractor-invoice-root')).toBeTruthy();
    expect(container.textContent).toContain('TAX INVOICE');
    expect(container.textContent).toContain('Invoice No.: SS-MALI-26-27-02');
    expect(container.textContent).toContain('S.S. MALI & CO.');
    expect(container.textContent).toContain('GST TIN/UIN: 27AABCS1429B1Z1');
    expect(container.textContent).toContain('Riddhi Siddhi Infrastructure Ltd.');
    expect(container.textContent).toContain('Destination: Pune, Maharashtra');
    expect(container.textContent).toContain('Authorised Signatory');
  });

  it('dynamically maps actual HSN codes per line item and tax rate (no hardcoded 2517)', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{ ...DEFAULT_THEME_OPTIONS, ...contractorTemplateDef.defaultOptions }}
        templateDef={contractorTemplateDef}
      />
    );

    // Table rows should show actual item HSN codes
    expect(container.textContent).toContain('25171010');
    expect(container.textContent).toContain('25051000');

    // Tax schedule should group the actual HSN codes
    const taxSchedule = container.querySelector('.contractor-tax-schedule');
    expect(taxSchedule).toBeTruthy();
    expect(taxSchedule?.textContent).toContain('25171010, 25051000');
  });

  it('aligns HSN/SAC table header and body cells to center', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{ ...DEFAULT_THEME_OPTIONS, ...contractorTemplateDef.defaultOptions }}
        templateDef={contractorTemplateDef}
      />
    );

    const table = container.querySelector('.contractor-table');
    expect(table).toBeTruthy();

    const hsnTh = table?.querySelectorAll('th')[1];
    expect(hsnTh?.textContent).toContain('HSN');
    expect(hsnTh?.getAttribute('style')).toContain('text-align: center');

    const firstRowHsnTd = table?.querySelectorAll('tbody tr')[0]?.querySelectorAll('td')[1];
    expect(firstRowHsnTd?.textContent).toBe('25171010');
    expect(firstRowHsnTd?.getAttribute('style')).toContain('text-align: center');
  });

  it('dynamically computes colSpan in table footer when HSN and Discount columns are toggled', () => {
    // 1. Both columns enabled: 8 total columns (footer label colSpan=7)
    const { container: c1 } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          showHsnSacColumn: true,
          showDiscountColumn: true,
        }}
        templateDef={contractorTemplateDef}
      />
    );
    const taxableRow1 = c1.querySelector('.contractor-total-row td');
    expect(taxableRow1?.getAttribute('colspan')).toBe('7');

    // 2. Disable HSN column: 7 total columns (footer label colSpan=6)
    const { container: c2 } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          showHsnSacColumn: false,
          showDiscountColumn: true,
        }}
        templateDef={contractorTemplateDef}
      />
    );
    const taxableRow2 = c2.querySelector('.contractor-total-row td');
    expect(taxableRow2?.getAttribute('colspan')).toBe('6');

    // 3. Disable both HSN and Discount: 6 total columns (footer label colSpan=5)
    const { container: c3 } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          showHsnSacColumn: false,
          showDiscountColumn: false,
        }}
        templateDef={contractorTemplateDef}
      />
    );
    const taxableRow3 = c3.querySelector('.contractor-total-row td');
    expect(taxableRow3?.getAttribute('colspan')).toBe('5');
  });

  it('respects theme customization options (accent color, font family, font size, toggles)', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          accentColor: '#b45309',
          fontFamily: 'serif',
          fontSize: 'large',
          paper: 'A4',
          showLogo: true,
          logoPosition: 'center',
          showNotes: true,
          showTerms: true,
          showThankYouFooter: true,
          footerText: 'Licensed Civil Contractor Government of Maharashtra',
        }}
        templateDef={contractorTemplateDef}
      />
    );

    const root = container.querySelector('.contractor-invoice-root') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--accent')).toBe('#b45309');
    expect(root.style.getPropertyValue('--font-family')).toContain('Georgia');
    expect(root.style.getPropertyValue('--font-size-base')).toBe('13pt');

    // Check notes, terms, and thank you footer
    expect(container.textContent).toContain('Material delivered at project site.');
    expect(container.textContent).toContain('Payment due within 15 days of invoice date.');
    expect(container.textContent).toContain('Thank you for your business!');
    expect(container.textContent).toContain('Licensed Civil Contractor Government of Maharashtra');
  });

  it('supports hiding optional sections via switches without layout breaks', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          showBankDetails: false,
          showTaxSummaryTable: false,
          showAmountInWords: false,
          showThankYouFooter: false,
          showNotes: false,
          showTerms: false,
        }}
        templateDef={contractorTemplateDef}
      />
    );

    expect(container.querySelector('.contractor-bank-bar')).toBeNull();
    expect(container.querySelector('.contractor-tax-schedule')).toBeNull();
    expect(container.querySelector('.contractor-words-box')).toBeNull();
    expect(container.textContent).not.toContain('Thank you for your business!');
  });

  it('guarantees HSN cells have nowrap styling so tax codes never break or misalign', () => {
    const { container } = render(
      <DynamicRemoteTheme
        data={sampleInvoiceData}
        options={{
          ...DEFAULT_THEME_OPTIONS,
          showHsnSacColumn: true,
        }}
        templateDef={contractorTemplateDef}
      />
    );

    const hsnTh = container.querySelector('th[style*="white-space: nowrap"], th[style*="whiteSpace: nowrap"]');
    expect(hsnTh).toBeTruthy();
    expect(hsnTh?.textContent).toContain('HSN');

    const hsnTd = container.querySelector('td[style*="white-space: nowrap"], td[style*="whiteSpace: nowrap"]');
    expect(hsnTd).toBeTruthy();
    expect(hsnTd?.textContent).toContain('25171010');
  });

  it('isolates options per theme so custom styling in one theme does not pollute another', () => {
    let testContext: any = null;

    const TestConsumer: React.FC = () => {
      testContext = useTheme();
      return (
        <div>
          <span data-testid="theme-id">{testContext.currentThemeId}</span>
          <span data-testid="accent">{testContext.options.accentColor}</span>
          <span data-testid="paper">{testContext.options.paper}</span>
        </div>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // Initial theme defaults
    expect(getByTestId('theme-id').textContent).toBe('classic');

    // Customize classic to orange
    act(() => {
      testContext.setOptions({ accentColor: '#ea580c' });
    });
    expect(getByTestId('accent').textContent).toBe('#ea580c');

    // Switch to thermal theme: should use thermal paper 80mm and its own default accent (#000000), not classic's orange
    act(() => {
      testContext.setThemeId('thermal');
    });
    expect(getByTestId('theme-id').textContent).toBe('thermal');
    expect(getByTestId('paper').textContent).toBe('80mm');
    expect(getByTestId('accent').textContent).toBe('#000000');

    // Switch back to classic: classic should retain its orange customization!
    act(() => {
      testContext.setThemeId('classic');
    });
    expect(getByTestId('theme-id').textContent).toBe('classic');
    expect(getByTestId('paper').textContent).toBe('A4');
    expect(getByTestId('accent').textContent).toBe('#ea580c');
  });
});
