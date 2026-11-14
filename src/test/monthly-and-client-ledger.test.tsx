import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';
import { DynamicRemoteTheme } from '../themes/DynamicRemoteTheme';
import { defaultOptions } from '../types';
import { recalculate } from '../utils/buildRenderData';
import type { InvoiceRenderData } from '../types';

const TestClientLedgerConsumer: React.FC = () => {
  const {
    invoices,
    clients,
    createInvoice,
    createMonthlyInvoice,
    getClientInvoices,
    getClientMetrics,
  } = useInvoices();

  return (
    <div>
      <div data-testid="invoices-count">{invoices.length}</div>
      <div data-testid="clients-count">{clients.length}</div>

      <button
        data-testid="btn-create-daily"
        onClick={() => {
          createInvoice({
            type: 'goods',
            invoiceType: 'daily',
            clientName: 'Tata Projects Ltd',
            initialItems: [
              {
                id: 'item-1',
                sno: 1,
                date: '2026-04-02',
                description: 'Ready Mix Concrete M25',
                quantity: 10,
                unit: 'Brass',
                rate: 4500,
                taxableAmount: 45000,
                gstRate: 18,
                gstAmount: 8100,
                total: 53100,
              },
            ],
          });
        }}
      >
        Create Daily Bill 1
      </button>

      <button
        data-testid="btn-create-daily-2"
        onClick={() => {
          createInvoice({
            type: 'goods',
            invoiceType: 'daily',
            clientName: 'Tata Projects Ltd',
            initialItems: [
              {
                id: 'item-2',
                sno: 1,
                date: '2026-04-15',
                description: 'River Sand Fine Grade',
                quantity: 20,
                unit: 'Brass',
                rate: 3200,
                taxableAmount: 64000,
                gstRate: 5,
                gstAmount: 3200,
                total: 67200,
              },
            ],
          });
        }}
      >
        Create Daily Bill 2
      </button>

      <button
        data-testid="btn-create-monthly-consolidated"
        onClick={() => {
          createMonthlyInvoice(
            'Tata Projects Ltd',
            '2026-04',
            'April 2026'
          );
        }}
      >
        Create Monthly Consolidated Bill
      </button>

      {/* Render Tata Projects metrics */}
      {(() => {
        const m = getClientMetrics('Tata Projects Ltd');
        const invs = getClientInvoices('Tata Projects Ltd');
        return (
          <div data-testid="tata-metrics">
            <span data-testid="tata-count">{m.invoiceCount}</span>
            <span data-testid="tata-total">{m.totalBilled}</span>
            <span data-testid="tata-latest-date">{m.latestInvoiceDate || 'none'}</span>
            <span data-testid="tata-items">{m.itemsSummary.join(', ')}</span>
            <span data-testid="tata-inv-ids">{invs.map((i) => i.invoiceNumber).join(' ')}</span>
          </div>
        );
      })()}
    </div>
  );
};

describe('Client Transaction Ledger & Monthly Invoices Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('tracks client invoice counts, revenue, dates, and items bought across ledger', async () => {
    const { getByTestId } = render(
      <InvoiceProvider>
        <TestClientLedgerConsumer />
      </InvoiceProvider>
    );

    // Initial state
    expect(getByTestId('tata-count').textContent).toBe('0');
    expect(getByTestId('tata-total').textContent).toBe('0');

    // Create daily bill 1
    act(() => {
      fireEvent.click(getByTestId('btn-create-daily'));
    });
    expect(getByTestId('tata-count').textContent).toBe('1');
    expect(Number(getByTestId('tata-total').textContent)).toBe(53100);
    expect(getByTestId('tata-items').textContent).toContain('Ready Mix Concrete M25');

    // Create daily bill 2
    act(() => {
      fireEvent.click(getByTestId('btn-create-daily-2'));
    });
    expect(getByTestId('tata-count').textContent).toBe('2');
    expect(Number(getByTestId('tata-total').textContent)).toBe(53100 + 67200);
    expect(getByTestId('tata-items').textContent).toContain('Ready Mix Concrete M25');
    expect(getByTestId('tata-items').textContent).toContain('River Sand Fine Grade');
  });

  it('consolidates daily invoices into a monthly invoice with date and items', async () => {
    const { getByTestId } = render(
      <InvoiceProvider>
        <TestClientLedgerConsumer />
      </InvoiceProvider>
    );

    // Create two daily delivery slips
    act(() => {
      fireEvent.click(getByTestId('btn-create-daily'));
    });
    act(() => {
      fireEvent.click(getByTestId('btn-create-daily-2'));
    });

    // Now consolidate into a monthly bill
    act(() => {
      fireEvent.click(getByTestId('btn-create-monthly-consolidated'));
    });

    // Total invoices for Tata Projects is now 3 (2 daily + 1 consolidated monthly)
    expect(getByTestId('tata-count').textContent).toBe('3');
  });

  it('renders monthly contractor template with dedicated Date column and Monthly Tax Invoice header', () => {
    const rawData: InvoiceRenderData = {
      invoiceType: 'monthly',
      billingPeriod: 'April 2026',
      billingMonth: '2026-04',
      invoiceNumber: 'INV-2026-088',
      invoiceDate: '2026-04-30',
      status: 'draft',
      business: {
        name: 'Mali Construction Infrastructure',
        address: 'Sector 18, Hinjewadi Phase 3',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411057',
        phone: '9822001122',
        email: 'info@maliconstruction.in',
        gstin: '27AABCM1234F1Z8',
      },
      client: {
        name: 'Bhartiya Construction Ltd',
        address: 'Kalyani Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411006',
        gstin: '27AAACB5555G1Z1',
      },
      items: [
        {
          id: '1',
          sno: 1,
          date: '2026-04-04',
          description: 'Ordinary Portland Cement 53 Grade',
          hsnSac: '252329',
          quantity: 100,
          unit: 'Bags',
          rate: 380,
          taxableAmount: 38000,
          gstRate: 28,
          gstAmount: 10640,
          total: 48640,
        },
        {
          id: '2',
          sno: 2,
          date: '2026-04-12',
          description: 'River Sand Grade 1',
          hsnSac: '250510',
          quantity: 20,
          unit: 'Brass',
          rate: 3400,
          taxableAmount: 68000,
          gstRate: 5,
          gstAmount: 3400,
          total: 71400,
        },
      ],
      gstType: 'cgst_sgst',
      taxSummary: [],
      subtotal: 0,
      totalDiscount: 0,
      totalTaxableAmount: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalTax: 0,
      grandTotal: 0,
      roundOff: 0,
      grandTotalRounded: 0,
      amountInWords: '',
      payments: [],
      amountPaid: 0,
      balanceDue: 0,
      currencySymbol: '₹',
      currencyCode: 'INR',
    };

    const cleanData = recalculate(rawData);

    render(
      <DynamicRemoteTheme
        data={cleanData}
        options={{
          ...defaultOptions,
          templateId: 'contractor',
        }}
      />
    );

    // Verify Monthly Tax Invoice header
    expect(screen.getByText(/MONTHLY TAX INVOICE/i)).toBeInTheDocument();
    expect(screen.getByText(/April 2026/i)).toBeInTheDocument();

    // Verify Date column header in contractor table
    expect(screen.getByRole('columnheader', { name: /^Date$/i })).toBeInTheDocument();

    // Verify item dates are displayed
    expect(screen.getByText(/04 Apr 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/12 Apr 2026/i)).toBeInTheDocument();

    // Verify descriptions
    expect(screen.getByText('Ordinary Portland Cement 53 Grade')).toBeInTheDocument();
    expect(screen.getByText('River Sand Grade 1')).toBeInTheDocument();
  });
});
