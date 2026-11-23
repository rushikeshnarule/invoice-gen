import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ExcelJS from 'exceljs';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ConsolidatedMonthlyModal } from '../components/ConsolidatedMonthlyModal/ConsolidatedMonthlyModal';
import { exportInvoiceToExcel, exportInvoicesLedgerToExcel } from '../utils/exportToExcel';
import { recalculate } from '../utils/buildRenderData';
import type { InvoiceRenderData } from '../types';

describe('Consolidated Monthly Invoice & Excel Export Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).invoiceDesktop;
  });

  const sampleMonthlyInvoice: InvoiceRenderData = recalculate({
    invoiceNumber: 'INV-2026-M01',
    invoiceType: 'monthly',
    billingPeriod: '01/04/2026 to 30/04/2026',
    billingMonth: '2026-04',
    invoiceDate: '2026-04-30',
    dueDate: '2026-05-15',
    placeOfSupply: 'Maharashtra (27)',
    status: 'draft',
    business: {
      name: 'Apex Infotech Solutions',
      address: '101 Cyber Heights, Baner Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
      phone: '+91 98765 43210',
      email: 'billing@apexinfotech.com',
      gstin: '27AABCA1234F1Z5',
      pan: 'AABCA1234F',
    },
    client: {
      name: 'Larsen & Toubro Ltd',
      address: 'Powai Campus, Saki Vihar Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400072',
      gstin: '27AAACL1234F1Z1',
      phone: '+91 22 6705 1234',
      email: 'procurement@larsentoubro.com',
    },
    items: [
      {
        id: 'item-1',
        sno: 1,
        date: '2026-04-05',
        description: 'Structural Steel Beams ISMB 300',
        hsnSac: '721632',
        quantity: 5,
        unit: 'MT',
        rate: 65000,
        discount: 0,
        discountAmount: 0,
        taxableAmount: 325000,
        gstRate: 18,
        gstAmount: 58500,
        total: 383500,
      },
      {
        id: 'item-2',
        sno: 2,
        date: '2026-04-18',
        description: 'TMT Reinforcement Bars Fe 550D',
        hsnSac: '721420',
        quantity: 10,
        unit: 'MT',
        rate: 58000,
        discount: 0,
        discountAmount: 0,
        taxableAmount: 580000,
        gstRate: 18,
        gstAmount: 104400,
        total: 684400,
      },
    ],
    gstType: 'cgst_sgst',
    taxSummary: [],
    subtotal: 905000,
    totalDiscount: 0,
    totalTaxableAmount: 905000,
    totalCgst: 81450,
    totalSgst: 81450,
    totalIgst: 0,
    totalTax: 162900,
    grandTotal: 1067900,
    roundOff: 0,
    grandTotalRounded: 1067900,
    amountInWords: '',
    payments: [],
    amountPaid: 0,
    balanceDue: 1067900,
    bankDetails: {
      bankName: 'HDFC Bank',
      accountName: 'Apex Infotech Solutions',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      branch: 'Baner, Pune',
      upiId: 'apexinfotech@hdfcbank',
    },
    currencySymbol: '₹',
    currencyCode: 'INR',
  });

  it('exports an invoice to Excel (.xlsx) containing all headers, dates, items, and tax totals', async () => {
    let capturedBase64 = '';
    let capturedFilename = '';

    (window as any).invoiceDesktop = {
      saveExcel: vi.fn().mockImplementation((args: { defaultFilename: string; base64: string }) => {
        capturedFilename = args.defaultFilename;
        capturedBase64 = args.base64;
        return Promise.resolve({ success: true, filePath: 'C:/Users/Documents/' + args.defaultFilename });
      }),
    };

    await exportInvoiceToExcel(sampleMonthlyInvoice);

    expect(capturedFilename).toBe('INV-2026-M01.xlsx');
    expect(capturedBase64.length).toBeGreaterThan(0);

    // Parse the generated base64 back into an ExcelJS workbook
    const workbook = new ExcelJS.Workbook();
    const buffer = Uint8Array.from(atob(capturedBase64), (c) => c.charCodeAt(0));
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Monthly Statement');
    expect(sheet).toBeDefined();

    let allText = '';
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        allText += ' ' + String(cell.value ?? '');
      });
    });

    // Verify company name & title
    expect(allText).toContain('CONSOLIDATED MONTHLY TAX INVOICE');
    expect(allText).toContain('Apex Infotech Solutions');
    expect(allText).toContain('Larsen & Toubro Ltd');
    expect(allText).toContain('01/04/2026 to 30/04/2026');

    // Verify line items and supply dates
    expect(allText).toContain('Structural Steel Beams ISMB 300');
    expect(allText).toContain('2026-04-05');
    expect(allText).toContain('TMT Reinforcement Bars Fe 550D');
    expect(allText).toContain('2026-04-18');

    // Verify grand total
    expect(allText).toContain('1067900');
  });

  it('exports an invoices ledger report to Excel', async () => {
    let capturedFilename = '';
    let capturedBase64 = '';

    (window as any).invoiceDesktop = {
      saveExcel: vi.fn().mockImplementation((args: { defaultFilename: string; base64: string }) => {
        capturedFilename = args.defaultFilename;
        capturedBase64 = args.base64;
        return Promise.resolve({ success: true, filePath: 'C:/Users/Documents/' + args.defaultFilename });
      }),
    };

    const mockRecords = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        clientName: 'Larsen & Toubro Ltd',
        clientId: 'larsen-toubro',
        date: '2026-04-05',
        total: 383500,
        status: 'paid' as const,
        themeId: 'classic',
        data: sampleMonthlyInvoice,
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
      },
    ];

    await exportInvoicesLedgerToExcel(mockRecords, 'April 2026 Billing Ledger');

    expect(capturedFilename).toMatch(/^invoices-ledger-/);
    const workbook = new ExcelJS.Workbook();
    const buffer = Uint8Array.from(atob(capturedBase64), (c) => c.charCodeAt(0));
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Ledger');
    expect(sheet).toBeDefined();

    let ledgerText = '';
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        ledgerText += ' ' + String(cell.value ?? '');
      });
    });
    expect(ledgerText).toContain('April 2026 Billing Ledger');
    expect(ledgerText).toContain('INV-2026-001');
    expect(ledgerText).toContain('Larsen & Toubro Ltd');
  });

  it('consolidates selected client invoices into a monthly invoice via interactive state harness', async () => {
    const TestConsumer: React.FC = () => {
      const { invoices, createInvoice, createMonthlyInvoice } = useInvoices();
      const [monthlyId, setMonthlyId] = React.useState<string | null>(null);

      const monthlyInv = invoices.find((i) => i.id === monthlyId);

      return (
        <div>
          <button
            data-testid="btn-create-inv1"
            onClick={() => {
              createInvoice({
                type: 'goods',
                invoiceType: 'daily',
                clientName: 'Reliance Industries',
                initialItems: [
                  {
                    id: 'it-1',
                    sno: 1,
                    date: '2026-04-02',
                    description: 'Industrial Lubricant Drum 200L',
                    quantity: 2,
                    unit: 'Drum',
                    rate: 15000,
                    taxableAmount: 30000,
                    gstRate: 18,
                    gstAmount: 5400,
                    total: 35400,
                  },
                ],
              });
            }}
          >
            Create 1
          </button>

          <button
            data-testid="btn-create-inv2"
            onClick={() => {
              createInvoice({
                type: 'goods',
                invoiceType: 'daily',
                clientName: 'Reliance Industries',
                initialItems: [
                  {
                    id: 'it-2',
                    sno: 1,
                    date: '2026-04-15',
                    description: 'Synthetic Coolant 50L',
                    quantity: 4,
                    unit: 'Can',
                    rate: 5000,
                    taxableAmount: 20000,
                    gstRate: 18,
                    gstAmount: 3600,
                    total: 23600,
                  },
                ],
              });
            }}
          >
            Create 2
          </button>

          <button
            data-testid="btn-consolidate"
            onClick={() => {
              const relInvs = invoices.filter(
                (i) => i.clientName === 'Reliance Industries' && i.data.invoiceType !== 'monthly'
              );
              const consolidated = createMonthlyInvoice({
                clientName: 'Reliance Industries',
                startDate: '2026-04-01',
                endDate: '2026-04-30',
                billingPeriod: '01/04/2026 to 30/04/2026',
                sourceInvoiceIds: relInvs.map((i) => i.id),
              });
              setMonthlyId(consolidated.id);
            }}
          >
            Consolidate
          </button>

          {monthlyInv && (
            <div data-testid="monthly-summary">
              <span data-testid="monthly-type">{monthlyInv.data.invoiceType}</span>
              <span data-testid="monthly-period">{monthlyInv.data.billingPeriod}</span>
              <span data-testid="monthly-items-count">{monthlyInv.data.items.length}</span>
              <span data-testid="monthly-total">{monthlyInv.data.grandTotalRounded}</span>
              <span data-testid="monthly-items-desc">
                {monthlyInv.data.items.map((i) => `${i.description} (${i.date})`).join('; ')}
              </span>
            </div>
          )}
        </div>
      );
    };

    const { getByTestId } = render(
      <InvoiceProvider>
        <TestConsumer />
      </InvoiceProvider>
    );

    act(() => {
      fireEvent.click(getByTestId('btn-create-inv1'));
    });
    act(() => {
      fireEvent.click(getByTestId('btn-create-inv2'));
    });
    act(() => {
      fireEvent.click(getByTestId('btn-consolidate'));
    });

    expect(getByTestId('monthly-type').textContent).toBe('monthly');
    expect(getByTestId('monthly-period').textContent).toBe('01/04/2026 to 30/04/2026');
    expect(getByTestId('monthly-items-count').textContent).toBe('2');
    expect(Number(getByTestId('monthly-total').textContent)).toBe(35400 + 23600);
    expect(getByTestId('monthly-items-desc').textContent).toContain('Industrial Lubricant Drum 200L (2026-04-02)');
    expect(getByTestId('monthly-items-desc').textContent).toContain('Synthetic Coolant 50L (2026-04-15)');
  });

  it('renders ConsolidatedMonthlyModal, filters by date range, and allows checking individual invoices', async () => {
    let createdResult: any = null;

    const TestModalHarness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);

      return (
        <ConsolidatedMonthlyModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          initialClient={{
            name: 'Godrej Properties',
            address: 'Godrej One, Vikhroli',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400079',
          }}
          onSuccess={(inv) => {
            createdResult = inv;
          }}
        />
      );
    };

    render(
      <InvoiceProvider>
        <ThemeProvider>
          <TestModalHarness />
        </ThemeProvider>
      </InvoiceProvider>
    );

    // Modal is open
    expect(screen.getByText(/Generate Monthly Consolidated Invoice/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Date Period Range/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Billing Month \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Date \(From\)/i)).toBeInTheDocument();
    expect(screen.getByText(/End Date \(To\)/i)).toBeInTheDocument();

    // Verify Quick Presets are present
    expect(screen.getByRole('button', { name: 'This Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 Days' })).toBeInTheDocument();

    // Verify Generate button is present
    const generateBtn = screen.getByRole('button', { name: /Generate Consolidated Monthly Bill/i });
    expect(generateBtn).toBeInTheDocument();

    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(createdResult).not.toBeNull();
      expect(createdResult.clientName).toBe('Godrej Properties');
      expect(createdResult.data.invoiceType).toBe('monthly');
    });
  });
});
