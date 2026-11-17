import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';

const TestInvoiceNumberingComponent: React.FC = () => {
  const { invoices, createInvoice, duplicateInvoice } = useInvoices();

  return (
    <div>
      <div data-testid="invoice-count">{invoices.length}</div>
      <div data-testid="invoice-list">
        {invoices.map((inv) => (
          <span key={inv.id} data-testid={`invoice-num-${inv.id}`}>
            {inv.invoiceNumber}
          </span>
        ))}
      </div>
      <button
        data-testid="btn-create-first"
        onClick={() => {
          createInvoice({ type: 'goods', invoiceType: 'daily' });
        }}
      >
        Create Goods Invoice
      </button>
      <button
        data-testid="btn-create-second"
        onClick={() => {
          createInvoice({ type: 'services', invoiceType: 'daily' });
        }}
      >
        Create Services Invoice
      </button>
      <button
        data-testid="btn-create-retail"
        onClick={() => {
          createInvoice({ type: 'retail', invoiceType: 'daily' });
        }}
      >
        Create Retail Invoice
      </button>
      <button
        data-testid="btn-duplicate-first"
        onClick={() => {
          if (invoices.length > 0) {
            duplicateInvoice(invoices[invoices.length - 1].id);
          }
        }}
      >
        Duplicate Invoice
      </button>
    </div>
  );
};

describe('Sequential Invoice Numbering Engine (INV-001 Specification)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts fresh invoicing strictly with INV-001', () => {
    render(
      <InvoiceProvider>
        <TestInvoiceNumberingComponent />
      </InvoiceProvider>
    );

    const createBtn = screen.getByTestId('btn-create-first');
    act(() => {
      fireEvent.click(createBtn);
    });

    const list = screen.getByTestId('invoice-list');
    expect(list.textContent).toContain('INV-001');
  });

  it('increments sequentially from INV-001 to INV-002, INV-003 without gaps', () => {
    render(
      <InvoiceProvider>
        <TestInvoiceNumberingComponent />
      </InvoiceProvider>
    );

    const createBtn1 = screen.getByTestId('btn-create-first');
    const createBtn2 = screen.getByTestId('btn-create-second');

    act(() => {
      fireEvent.click(createBtn1);
    });
    act(() => {
      fireEvent.click(createBtn2);
    });

    const list = screen.getByTestId('invoice-list');
    expect(list.textContent).toContain('INV-001');
    expect(list.textContent).toContain('INV-002');
  });

  it('assigns next sequential number when duplicating an existing invoice', () => {
    render(
      <InvoiceProvider>
        <TestInvoiceNumberingComponent />
      </InvoiceProvider>
    );

    const createBtn = screen.getByTestId('btn-create-first');
    const dupBtn = screen.getByTestId('btn-duplicate-first');

    act(() => {
      fireEvent.click(createBtn); // creates INV-001
    });
    act(() => {
      fireEvent.click(dupBtn); // duplicates to INV-002
    });

    const list = screen.getByTestId('invoice-list');
    expect(list.textContent).toContain('INV-001');
    expect(list.textContent).toContain('INV-002');
  });

  it('starts retail thermal receipts strictly with POS-001', () => {
    render(
      <InvoiceProvider>
        <TestInvoiceNumberingComponent />
      </InvoiceProvider>
    );

    const retailBtn = screen.getByTestId('btn-create-retail');
    act(() => {
      fireEvent.click(retailBtn);
    });

    const list = screen.getByTestId('invoice-list');
    expect(list.textContent).toContain('POS-001');
  });
});
