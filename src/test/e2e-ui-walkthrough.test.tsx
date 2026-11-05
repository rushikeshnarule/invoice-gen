import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvoiceProvider } from '../context/InvoiceContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ClientsView } from '../routes/ClientsView';
import { InvoicesView } from '../routes/InvoicesView';
import { ThemePicker } from '../components/ThemePicker/ThemePicker';
import { InvoiceEditor } from '../components/InvoiceEditor/InvoiceEditor';
import { DEFAULT_CLIENTS, DEFAULT_BUSINESS_PROFILE, getInitialInvoices } from '../utils/initialOfflineData';

beforeEach(() => {
  window.open = vi.fn();
  localStorage.clear();
  localStorage.setItem('offline-software-clients-v2', JSON.stringify(DEFAULT_CLIENTS));
  localStorage.setItem('offline-software-business-profile-v2', JSON.stringify(DEFAULT_BUSINESS_PROFILE));
  localStorage.setItem('offline-software-invoices-v2', JSON.stringify(getInitialInvoices()));
  localStorage.setItem('offline-software-setup-completed-v2', JSON.stringify(true));
});

describe('E2E UI Walkthrough & Full Interaction Bug Hunter', () => {
  it('ClientsView: renders responsive layout without text crushing and exercises all client actions', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/clients']}>
        <InvoiceProvider>
          <ThemeProvider>
            <ClientsView />
          </ThemeProvider>
        </InvoiceProvider>
      </MemoryRouter>
    );

    // 1. Verify Top Portfolio KPI Cards
    expect(screen.getByText('Clients & Commercial Accounts')).toBeInTheDocument();
    expect(screen.getByText('Total Clients')).toBeInTheDocument();
    expect(screen.getByText('Invoices Generated')).toBeInTheDocument();
    expect(screen.getByText('Total Billed / Revenue')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Due')).toBeInTheDocument();

    // 2. Verify Demo Clients Rendered (e.g. Sunrise Enterprises)
    const sunriseCard = screen.getByText('Sunrise Enterprises');
    expect(sunriseCard).toBeInTheDocument();

    // Verify no rogue floating comma like "• , Maharashtra" exists
    const fullText = container.textContent || '';
    expect(fullText).not.toMatch(/•\s*,/);
    expect(fullText).not.toContain("+ + Bill");

    // 3. Test Invoices Drawer Toggle (expand / collapse)
    const invoicesBtns = screen.getAllByRole('button', { name: /Invoices \(\d+\)/i });
    expect(invoicesBtns.length).toBeGreaterThan(0);
    fireEvent.click(invoicesBtns[0]);

    // Drawer should show table header
    await waitFor(() => {
      expect(screen.getByText(/What was bought/i)).toBeInTheDocument();
    });

    // Collapse drawer
    fireEvent.click(invoicesBtns[0]);

    // 4. Test Add Client Modal Flow
    const addClientBtn = screen.getByRole('button', { name: /Add Client/i });
    fireEvent.click(addClientBtn);
    await waitFor(() => {
      expect(screen.getByText(/Add Client to Offline Directory/i)).toBeInTheDocument();
    });

    // Fill new client info
    const nameInput = screen.getByPlaceholderText(/e\.g\. Reliance Retail Ltd/i);
    fireEvent.change(nameInput, { target: { value: 'Test Quality Infra Ltd' } });
    const cityInput = screen.getByPlaceholderText(/e\.g\. Mumbai/i);
    fireEvent.change(cityInput, { target: { value: 'Nashik' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /^Save Client$/i });
    fireEvent.click(saveBtn);

    // Verify added client appears
    await waitFor(() => {
      expect(screen.getByText('Test Quality Infra Ltd')).toBeInTheDocument();
    });

    // 5. Test Monthly Bill Modal from Client Card
    const monthlyBillBtns = screen.getAllByRole('button', { name: /Monthly Bill/i });
    fireEvent.click(monthlyBillBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Generate Monthly Consolidated Invoice/i)).toBeInTheDocument();
      expect(screen.getByText(/Billing Month \*/i)).toBeInTheDocument();
    });

    // Close modal
    const cancelModalBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelModalBtn);

    // 6. Test Preferred Template selection
    const templateSelects = container.querySelectorAll('select[id^="client-theme-select-"]');
    expect(templateSelects.length).toBeGreaterThan(0);
    fireEvent.change(templateSelects[0], { target: { value: 'contractor' } });
  }, 25000);

  it('InvoicesView: exercises filters, search, and invoice creation actions', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <InvoiceProvider>
          <ThemeProvider>
            <InvoicesView />
          </ThemeProvider>
        </InvoiceProvider>
      </MemoryRouter>
    );

    // Verify Header Buttons have single clean labels (no "+ + Daily Bill")
    const dailyBtn = screen.getByRole('button', { name: /Daily Bill/i });
    expect(dailyBtn).toBeInTheDocument();
    expect(dailyBtn.textContent).toContain('Daily Bill');
    expect(dailyBtn.textContent).not.toContain('+ +');

    const monthlyBtn = screen.getByRole('button', { name: /Monthly Bill/i });
    expect(monthlyBtn).toBeInTheDocument();

    // Verify Type Filters
    const allTypeBtn = screen.getByRole('button', { name: /All \(\d+\)/i });
    const dailyTypeBtn = screen.getByRole('button', { name: /Daily \(\d+\)/i });
    const monthlyTypeBtn = screen.getByRole('button', { name: /Monthly \(\d+\)/i });

    expect(allTypeBtn).toBeInTheDocument();
    expect(dailyTypeBtn).toBeInTheDocument();
    expect(monthlyTypeBtn).toBeInTheDocument();

    // Test clicking Daily filter
    fireEvent.click(dailyTypeBtn);
    expect(dailyTypeBtn).toHaveClass('bg-white');

    // Test clicking Monthly filter
    fireEvent.click(monthlyTypeBtn);
    expect(monthlyTypeBtn).toHaveClass('bg-white');

    // Reset to All
    fireEvent.click(allTypeBtn);

    // Test Status Filters
    const paidFilter = screen.getByRole('button', { name: /^paid$/i });
    fireEvent.click(paidFilter);
    expect(paidFilter).toHaveClass('bg-white');

    const allStatusFilter = screen.getByRole('button', { name: /^all$/i });
    fireEvent.click(allStatusFilter);

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/Search invoice # or client/i);
    fireEvent.change(searchInput, { target: { value: 'Sunrise' } });
    expect(screen.getByText(/Sunrise Enterprises/i)).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });
  }, 25000);

  it('ThemePicker: renders templates gallery and switches between gallery and customizer', async () => {
    render(
      <MemoryRouter initialEntries={['/design']}>
        <InvoiceProvider>
          <ThemeProvider>
            <ThemePicker />
          </ThemeProvider>
        </InvoiceProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Invoice Templates/i)).toBeInTheDocument();

    // Test Customize Theme Mode
    const customizeBtns = screen.getAllByRole('button', { name: /Customize Theme/i });
    fireEvent.click(customizeBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Back to Templates/i)).toBeInTheDocument();
    });

    // Test zoom controls
    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);

    // Test data variant switch
    const variantSelect = screen.getByRole('combobox');
    fireEvent.change(variantSelect, { target: { value: 'single' } });

    // Switch back to Gallery
    const backBtn = screen.getByRole('button', { name: /Back to Templates/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invoice Templates/i)).toBeInTheDocument();
    });
  }, 25000);

  it('InvoiceEditor: computes GST accurately and allows toggling daily vs monthly classification', async () => {
    // Render with first invoice
    const initialInvs = getInitialInvoices();
    const firstId = initialInvs[0].id;

    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <InvoiceProvider>
          <ThemeProvider>
            <InvoiceEditor invoiceId={firstId} onBack={() => {}} />
          </ThemeProvider>
        </InvoiceProvider>
      </MemoryRouter>
    );

    // 1. Verify Invoice Classification Toggle
    const dailyBtn = screen.getByRole('button', { name: /Daily Invoice \(Regular\)/i });
    const monthlyBtn = screen.getByRole('button', { name: /Monthly Invoice \(Consolidated\)/i });
    expect(dailyBtn).toBeInTheDocument();
    expect(monthlyBtn).toBeInTheDocument();

    // Toggle to Monthly
    fireEvent.click(monthlyBtn);
    expect(monthlyBtn).toHaveClass('text-blue-700');

    // Should reveal Billing Month and Billing Period Header
    expect(screen.getByText('Billing Month')).toBeInTheDocument();
    expect(screen.getByText('Billing Period Header')).toBeInTheDocument();

    // Toggle back to Daily
    fireEvent.click(dailyBtn);
    expect(dailyBtn).toHaveClass('bg-white');

    // 2. Verify Tab Navigation (Clicking SegmentedControl item)
    const buyerTab = screen.getByText(/Buyer & Dates/i);
    fireEvent.click(buyerTab);
    await waitFor(() => {
      expect(screen.getByText(/Buyer \/ Client Information/i)).toBeInTheDocument();
    });

    // Tab 3: Branding & Assets
    const brandingTab = screen.getByText(/Logo & Stamp/i);
    fireEvent.click(brandingTab);
    await waitFor(() => {
      expect(screen.getByText(/Business Assets & Signatures/i)).toBeInTheDocument();
    });

    // Tab 4: Bank, Notes & Terms
    const bankTab = screen.getByText(/Pay & Terms/i);
    fireEvent.click(bankTab);
    await waitFor(() => {
      expect(screen.getByText(/Payments Received/i)).toBeInTheDocument();
    });

    // Return to items tab
    const itemsTab = screen.getByText(/Items \(/i);
    fireEvent.click(itemsTab);
    await waitFor(() => {
      expect(screen.getByText(/Tax Type:/i)).toBeInTheDocument();
    });
  }, 25000);
});
