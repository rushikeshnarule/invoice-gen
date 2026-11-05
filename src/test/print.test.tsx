import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PrintInvoice } from '../routes/PrintInvoice';
import { ThemeProvider } from '../context/ThemeContext';
import * as buildRenderDataModule from '../utils/buildRenderData';
import { createSampleData } from '../utils/sampleData';

describe('PrintInvoice and PDF Filename Synchronization', () => {
  const originalTitle = document.title;
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.title = 'invoice-gen';
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    document.title = originalTitle;
    printSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('sets document.title to the exact invoice number so the Save as PDF dialog defaults to it', async () => {
    const mockData = {
      ...createSampleData(2),
      invoiceNumber: 'INV-001',
      _themeId: 'classic',
    };

    vi.spyOn(buildRenderDataModule, 'buildRenderData').mockResolvedValue(mockData as any);

    render(
      <MemoryRouter initialEntries={['/print/inv-1']}>
        <ThemeProvider>
          <Routes>
            <Route path="/print/:invoiceId" element={<PrintInvoice />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Initial state: preparing
    expect(screen.getByText(/Preparing invoice for print/i)).toBeInTheDocument();

    // After loading: document.title should be the invoice number
    await waitFor(() => {
      expect(document.title).toBe('INV-001');
    });

    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });

  it('sanitizes illegal path/filename characters like slashes in invoiceNumber for valid PDF saving', async () => {
    const mockData = {
      ...createSampleData(1),
      invoiceNumber: 'INV/2026/089',
      _themeId: 'classic',
    };

    vi.spyOn(buildRenderDataModule, 'buildRenderData').mockResolvedValue(mockData as any);

    render(
      <MemoryRouter initialEntries={['/print/inv-slash']}>
        <ThemeProvider>
          <Routes>
            <Route path="/print/:invoiceId" element={<PrintInvoice />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('INV-2026-089');
    });
  });

  it('triggers window.print with invoice title set when auto=true is passed', async () => {
    const mockData = {
      ...createSampleData(1),
      invoiceNumber: 'INV-AUTO-777',
      _themeId: 'classic',
    };

    vi.spyOn(buildRenderDataModule, 'buildRenderData').mockResolvedValue(mockData as any);

    render(
      <MemoryRouter initialEntries={['/print/inv-auto?auto=true']}>
        <ThemeProvider>
          <Routes>
            <Route path="/print/:invoiceId" element={<PrintInvoice />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(
      () => {
        expect(printSpy).toHaveBeenCalled();
        expect(document.title).toBe('INV-AUTO-777');
      },
      { timeout: 1500 }
    );
  });

  it('restores previous document.title upon unmounting PrintInvoice', async () => {
    const mockData = {
      ...createSampleData(1),
      invoiceNumber: 'INV-RESTORE-123',
      _themeId: 'classic',
    };

    vi.spyOn(buildRenderDataModule, 'buildRenderData').mockResolvedValue(mockData as any);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/print/inv-restore']}>
        <ThemeProvider>
          <Routes>
            <Route path="/print/:invoiceId" element={<PrintInvoice />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('INV-RESTORE-123');
    });

    unmount();

    expect(document.title).toBe('invoice-gen');
  });
});
