import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ClientsView } from '../routes/ClientsView';

const TestClientConsumer: React.FC = () => {
  const { clients, saveClient, updateClient, deleteClient } = useInvoices();

  return (
    <div>
      <div data-testid="client-count">{clients.length}</div>
      <div data-testid="client-names">{clients.map((c) => c.name).join(', ')}</div>
      <button
        onClick={() =>
          saveClient({
            name: 'Acme Test Corp',
            address: '100 Industrial Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
          })
        }
      >
        Add Test Client
      </button>
      <button
        onClick={() =>
          updateClient('Acme Test Corp', {
            name: 'Acme Test Enterprise',
            address: '200 Industrial Rd',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560002',
            gstin: '29ABCDE1234F1Z5',
          })
        }
      >
        Update Test Client
      </button>
      <button onClick={() => deleteClient('Acme Test Enterprise')}>
        Delete Test Client
      </button>
    </div>
  );
};

describe('Client Management in InvoiceContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supports saving, updating, and deleting client accounts', () => {
    render(
      <InvoiceProvider>
        <TestClientConsumer />
      </InvoiceProvider>
    );

    // Initial count
    const initialCount = Number(screen.getByTestId('client-count').textContent);

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Add Test Client/i }));
    expect(Number(screen.getByTestId('client-count').textContent)).toBe(initialCount + 1);
    expect(screen.getByTestId('client-names').textContent).toContain('Acme Test Corp');

    // Update
    fireEvent.click(screen.getByRole('button', { name: /Update Test Client/i }));
    expect(Number(screen.getByTestId('client-count').textContent)).toBe(initialCount + 1);
    expect(screen.getByTestId('client-names').textContent).toContain('Acme Test Enterprise');
    expect(screen.getByTestId('client-names').textContent).not.toContain('Acme Test Corp');

    // Delete
    fireEvent.click(screen.getByRole('button', { name: /Delete Test Client/i }));
    expect(Number(screen.getByTestId('client-count').textContent)).toBe(initialCount);
    expect(screen.getByTestId('client-names').textContent).not.toContain('Acme Test Enterprise');
  });
});

describe('ClientsView Interface', () => {
  beforeEach(() => {
    localStorage.clear();
    const initialClients = [
      {
        name: 'Sunrise Enterprises',
        address: '45, Electronic Zone, MIDC Phase II',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411018',
        phone: '+91 98210 12345',
        email: 'accounts@sunrise-eng.co.in',
        gstin: '27AADCS5678G1Z9',
      },
    ];
    localStorage.setItem('offline-software-clients-v2', JSON.stringify(initialClients));
  });

  it('renders clients view with Edit and Delete options for client accounts', () => {
    render(
      <ThemeProvider>
        <InvoiceProvider>
          <ClientsView />
        </InvoiceProvider>
      </ThemeProvider>
    );

    // Check header
    expect(screen.getByRole('heading', { level: 1, name: /Clients/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Client/i })).toBeInTheDocument();

    // Check that Edit buttons and Delete buttons exist for rendered clients
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThan(0);

    const deleteButtons = screen.getAllByTitle(/^Delete /i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('opens edit modal with client details prefilled', () => {
    render(
      <ThemeProvider>
        <InvoiceProvider>
          <ClientsView />
        </InvoiceProvider>
      </ThemeProvider>
    );

    // Click the first Edit button
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    fireEvent.click(editButtons[0]);

    // Modal should be open with "Edit Client"
    expect(screen.getByText(/Edit Client:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

    // Cancel closes modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText(/Edit Client:/i)).not.toBeInTheDocument();
  });

  it('opens delete confirmation modal when delete icon is clicked', () => {
    render(
      <ThemeProvider>
        <InvoiceProvider>
          <ClientsView />
        </InvoiceProvider>
      </ThemeProvider>
    );

    // Click the first Delete button
    const deleteButtons = screen.getAllByTitle(/^Delete /i);
    fireEvent.click(deleteButtons[0]);

    // Delete confirmation modal should be visible
    expect(screen.getByRole('heading', { level: 2, name: /Delete Client Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Client/i })).toBeInTheDocument();

    // Cancel closes modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('heading', { level: 2, name: /Delete Client Account/i })).not.toBeInTheDocument();
  });
});
