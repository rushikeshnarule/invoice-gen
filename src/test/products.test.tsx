import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LicenseProvider } from '../context/LicenseContext';
import { ProductsView } from '../routes/ProductsView';
import { InvoiceEditor } from '../components/InvoiceEditor/InvoiceEditor';
import { App } from '../App';
import { DEFAULT_BUSINESS_PROFILE, DEFAULT_BUSINESS_PROFILE_US } from '../utils/initialOfflineData';

const ProductContextHarness: React.FC = () => {
  const {
    products,
    saveProduct,
    updateProduct,
    deleteProduct,
    createInvoice,
    exportOfflineBackup,
    importOfflineBackup,
    completeSetup,
  } = useInvoices();
  const [lastId, setLastId] = React.useState<string>('');
  const [backupJson, setBackupJson] = React.useState<string>('');

  return (
    <div>
      <div data-testid="product-count">{products.length}</div>
      <div data-testid="product-names">{products.map((p) => p.name).join(', ')}</div>
      <div data-testid="product-rates">{products.map((p) => `${p.name}:${p.rate}`).join(', ')}</div>
      <div data-testid="backup-json">{backupJson}</div>
      <button
        onClick={() => {
          const created = saveProduct({
            name: 'Industrial Router X1',
            description: 'Dual WAN Gigabit Router',
            hsnSac: '851762',
            unit: 'Nos',
            rate: 12500,
            gstRate: 18,
            defaultQuantity: 2,
            discount: 10,
            category: 'Hardware',
          });
          setLastId(created.id);
        }}
      >
        Add Product
      </button>
      <button
        onClick={() => {
          if (lastId) {
            updateProduct(lastId, { name: 'Industrial Router X2', rate: 14000 });
          }
        }}
      >
        Update Product
      </button>
      <button
        onClick={() => {
          if (lastId) deleteProduct(lastId);
        }}
      >
        Delete Product
      </button>
      <button
        onClick={() => {
          createInvoice('goods');
        }}
      >
        Create Invoice
      </button>
      <button
        onClick={() => {
          setBackupJson(exportOfflineBackup());
        }}
      >
        Export Backup
      </button>
      <button
        onClick={() => {
          if (backupJson) importOfflineBackup(backupJson);
        }}
      >
        Restore Backup
      </button>
      <button
        onClick={() => completeSetup({ name: 'Clean Biz' }, { cleanLedger: true })}
      >
        Clean Setup
      </button>
    </div>
  );
};

describe('Product Catalog in InvoiceContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supports saving, updating, deleting, and persisting products', () => {
    render(
      <InvoiceProvider>
        <ProductContextHarness />
      </InvoiceProvider>
    );

    expect(Number(screen.getByTestId('product-count').textContent)).toBe(0);

    // Add product
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    expect(Number(screen.getByTestId('product-count').textContent)).toBe(1);
    expect(screen.getByTestId('product-names').textContent).toContain('Industrial Router X1');

    const stored = JSON.parse(localStorage.getItem('offline-software-products-v1') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].hsnSac).toBe('851762');
    expect(stored[0].rate).toBe(12500);

    // Update product
    fireEvent.click(screen.getByRole('button', { name: 'Update Product' }));
    expect(screen.getByTestId('product-rates').textContent).toContain('Industrial Router X2:14000');

    // Delete product
    fireEvent.click(screen.getByRole('button', { name: 'Delete Product' }));
    expect(Number(screen.getByTestId('product-count').textContent)).toBe(0);
  });

  it('includes products in offline backup export/restore and clears on clean setup', () => {
    render(
      <InvoiceProvider>
        <ProductContextHarness />
      </InvoiceProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Backup' }));

    const backupText = screen.getByTestId('backup-json').textContent || '{}';
    const parsed = JSON.parse(backupText);
    expect(Array.isArray(parsed.products)).toBe(true);
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0].name).toBe('Industrial Router X1');
    expect(parsed.invoices).toHaveLength(1);

    // Clean setup clears products
    fireEvent.click(screen.getByRole('button', { name: 'Clean Setup' }));
    expect(Number(screen.getByTestId('product-count').textContent)).toBe(0);

    // Restore brings product back
    fireEvent.click(screen.getByRole('button', { name: 'Restore Backup' }));
    expect(Number(screen.getByTestId('product-count').textContent)).toBe(1);
    expect(screen.getByTestId('product-names').textContent).toContain('Industrial Router X1');
  });
});

describe('ProductsView Interface', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('offline-software-business-profile-v2', JSON.stringify(DEFAULT_BUSINESS_PROFILE));
  });

  it('allows adding, searching, editing, and deleting a product', async () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <ThemeProvider>
          <InvoiceProvider>
            <ProductsView />
          </InvoiceProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Products & Service Catalog/i })).toBeInTheDocument();
    expect(screen.getByText(/No products found/i)).toBeInTheDocument();

    // Open Add Product modal
    fireEvent.click(screen.getByRole('button', { name: /Add Product/i }));
    expect(screen.getByText(/Add Product to Catalog/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Product \/ Service Name/i), {
      target: { value: 'Cat6 Cable Box 305m' },
    });
    fireEvent.change(screen.getByLabelText(/Details \/ Specifications/i), {
      target: { value: 'Pure Copper Solid UTP' },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'Networking' },
    });
    fireEvent.change(screen.getByLabelText(/HSN \/ SAC Code/i), {
      target: { value: '854449' },
    });
    fireEvent.change(screen.getByLabelText(/Unit Rate/i), {
      target: { value: '6800' },
    });
    fireEvent.change(screen.getByLabelText(/Default Quantity/i), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Product/i }));

    await waitFor(() => {
      expect(screen.getByText('Cat6 Cable Box 305m')).toBeInTheDocument();
    });
    expect(screen.getByText('Pure Copper Solid UTP')).toBeInTheDocument();
    expect(screen.getByText('854449')).toBeInTheDocument();

    // Edit product
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    expect(screen.getByText(/Edit Product: Cat6 Cable Box 305m/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Unit Rate/i), {
      target: { value: '7200' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Edit Product:/i)).not.toBeInTheDocument();
    });
    expect(screen.getAllByText(/7,200/).length).toBeGreaterThan(0);

    // Filter by search
    const searchInput = screen.getByPlaceholderText(/Search products/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } });
    expect(screen.getByText(/No products found/i)).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: '' } });

    // Delete product
    fireEvent.click(screen.getByTitle('Delete Cat6 Cable Box 305m'));
    expect(screen.getByRole('heading', { level: 2, name: /Delete Product/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Delete Product$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cat6 Cable Box 305m')).not.toBeInTheDocument();
    });
  });
});

describe('InvoiceEditor "Select the Product" Dropdown Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('replaces blank placeholder row on first selection and appends on subsequent selections with full calculation', async () => {
    localStorage.setItem('offline-software-business-profile-v2', JSON.stringify(DEFAULT_BUSINESS_PROFILE));
    localStorage.setItem('offline-software-setup-completed-v1', 'true');
    localStorage.setItem(
      'offline-software-products-v1',
      JSON.stringify([
        {
          id: 'prod-1',
          name: 'Managed PoE Switch',
          description: '24-Port Gigabit',
          hsnSac: '851762',
          unit: 'Nos',
          rate: 40000,
          gstRate: 18,
          defaultQuantity: 2,
          discount: 10,
        },
        {
          id: 'prod-2',
          name: 'Installation Service',
          hsnSac: '998314',
          unit: 'Job',
          rate: 5000,
          gstRate: 18,
          defaultQuantity: 1,
        },
      ])
    );

    const EditorWithCreate: React.FC = () => {
      const { createInvoice, activeInvoiceId } = useInvoices();
      React.useEffect(() => {
        createInvoice('goods');
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      if (!activeInvoiceId) return null;
      return <InvoiceEditor invoiceId={activeInvoiceId} onBack={() => {}} />;
    };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <InvoiceProvider>
            <EditorWithCreate />
          </InvoiceProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const productSelect = await screen.findByLabelText('Select the Product');
    expect(productSelect).toBeInTheDocument();
    expect(screen.getByText('Line items (1)')).toBeInTheDocument();

    // Select first product -> should replace untouched ₹0 "Goods Supply" placeholder
    fireEvent.change(productSelect, { target: { value: 'prod-1' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Managed PoE Switch - 24-Port Gigabit')).toBeInTheDocument();
    });
    expect(screen.getByText('Line items (1)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('851762')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40000')).toBeInTheDocument();

    // Select second product -> should append as item 2
    fireEvent.change(productSelect, { target: { value: 'prod-2' } });

    await waitFor(() => {
      expect(screen.getByText('Line items (2)')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Installation Service')).toBeInTheDocument();
    expect(screen.getByDisplayValue('998314')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument();

    // Verify calculation:
    // Item 1: 2 * 40,000 = 80,000 - 10% (8,000) = 72,000 + 18% (12,960) = 84,960
    // Item 2: 1 * 5,000 = 5,000 + 18% (900) = 5,900
    // Grand total = 90,860.00
    expect(screen.getAllByText(/90,860\.00/).length).toBeGreaterThan(0);
  });

  it('loads SKU and US sales tax properly in US region and supports saving an item back to catalog', async () => {
    localStorage.setItem('offline-software-business-profile-v2', JSON.stringify(DEFAULT_BUSINESS_PROFILE_US));
    localStorage.setItem('offline-software-setup-completed-v1', 'true');
    localStorage.setItem(
      'offline-software-products-v1',
      JSON.stringify([
        {
          id: 'prod-us-1',
          name: 'Cloud Security Audit',
          sku: 'SRV-SEC-01',
          unit: 'hrs',
          rate: 200,
          gstRate: 7.25,
          defaultQuantity: 3,
          taxable: true,
        },
      ])
    );

    const USHarness: React.FC = () => {
      const { createInvoice, activeInvoiceId, products } = useInvoices();
      React.useEffect(() => {
        createInvoice('services');
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      if (!activeInvoiceId) return null;
      return (
        <div>
          <div data-testid="catalog-size">{products.length}</div>
          <InvoiceEditor invoiceId={activeInvoiceId} onBack={() => {}} />
        </div>
      );
    };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <InvoiceProvider>
            <USHarness />
          </InvoiceProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const productSelect = await screen.findByLabelText('Select the Product');
    fireEvent.change(productSelect, { target: { value: 'prod-us-1' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Cloud Security Audit')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('SRV-SEC-01')).toBeInTheDocument();

    // Add a custom line item and save it to catalog
    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
    const descInputs = screen.getAllByPlaceholderText(/Item Description/i);
    fireEvent.change(descInputs[1], { target: { value: 'Custom Hardware Cable' } });

    const saveBtns = screen.getAllByTitle('Save item to Product Catalog');
    fireEvent.click(saveBtns[1]);

    await waitFor(() => {
      expect(Number(screen.getByTestId('catalog-size').textContent)).toBe(2);
    });
    const productOptions = Array.from((productSelect as HTMLSelectElement).options).map((o) => o.textContent || '');
    expect(productOptions.some((t) => t.includes('Custom Hardware Cable'))).toBe(true);
  });
});

describe('App Navigation Integration for Products Menu', () => {
  beforeEach(() => {
    localStorage.clear();
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }
    // Unlock commercial license and mark setup complete so AppShell renders sidebar & routes
    localStorage.setItem(
      'invoice_gen_cloud_license_data',
      JSON.stringify({
        licenseKey: 'INVG-PRO-20271231-A9F4',
        status: 'active',
        tier: 'Commercial Pro',
        tierCode: 'PRO',
        licensedTo: 'Commercial License Holder',
        expiresAt: '2027-12-31T23:59:59.000Z',
        daysRemaining: 399,
        seats: 5,
        features: ['commercial_invoicing'],
        lastVerifiedAt: '2026-11-20T00:00:00.000Z',
        verificationSource: 'offline_signature',
      })
    );
    localStorage.setItem('offline-software-business-profile-v2', JSON.stringify(DEFAULT_BUSINESS_PROFILE));
    localStorage.setItem('offline-software-setup-completed-v1', 'true');
  });

  it('places Products below Clients in the left menu bar and navigates to ProductsView', async () => {
    render(
      <LicenseProvider>
        <ThemeProvider>
          <InvoiceProvider>
            <App />
          </InvoiceProvider>
        </ThemeProvider>
      </LicenseProvider>
    );

    const clientsLinks = await screen.findAllByRole('link', { name: 'Clients' });
    const productsLinks = await screen.findAllByRole('link', { name: 'Products' });
    expect(clientsLinks.length).toBeGreaterThan(0);
    expect(productsLinks.length).toBeGreaterThan(0);

    // Verify Products appears after Clients in DOM order
    const position = clientsLinks[0].compareDocumentPosition(productsLinks[0]);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(productsLinks[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Products & Service Catalog/i })).toBeInTheDocument();
    });
  });
});
