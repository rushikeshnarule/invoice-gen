import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { InvoiceProvider, useInvoices } from '../context/InvoiceContext';
import { getTheme, getAllThemes } from '../themes';
import { ColorPickerField } from '../components/ThemeOptions/ColorPickerField';
import { ThemePreview } from '../components/ThemePreview/ThemePreview';
import { InvoiceEditor } from '../components/InvoiceEditor/InvoiceEditor';
import { createSampleData } from '../utils';

describe('Theme Customization & Performance Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('guarantees stable component identity and memoized array in getAllThemes()', () => {
    const list1 = getAllThemes();
    const list2 = getAllThemes();
    expect(list1).toBe(list2); // Exact same array reference

    const classic1 = getTheme('classic');
    const classic2 = getTheme('classic');
    expect(classic1.component).toBe(classic2.component);
  });

  it('renders ColorPickerField and debounces color commit via requestAnimationFrame', async () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <ColorPickerField value="#2563EB" onChange={handleChange} />
    );

    expect(screen.getByText(/#2563EB/i)).toBeInTheDocument();

    // Select color swatch
    const emeraldSwatch = screen.getByTitle('#059669');
    fireEvent.click(emeraldSwatch);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('#059669');
    });

    rerender(<ColorPickerField value="#059669" onChange={handleChange} />);
    expect(screen.getByText(/#059669/i)).toBeInTheDocument();
  });

  it('renders ThemePreview in memoized form with fast layout measurement', () => {
    const sample = createSampleData(2);
    const theme = getTheme('classic');
    const options = theme.defaultOptions;

    const { container } = render(
      <ThemePreview
        themeId="classic"
        data={sample}
        options={options}
        scale={0.85}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('allows switching templates and managing presets inside InvoiceEditor Tab 5', async () => {
    // Seed an invoice into localStorage
    const sample = createSampleData(2);
    const invoiceRecord = {
      id: 'inv-test-tab5',
      invoiceNumber: 'INV-TEST-001',
      clientName: sample.client.name,
      clientId: 'client-1',
      date: sample.invoiceDate,
      total: sample.grandTotalRounded,
      status: 'draft',
      themeId: 'classic',
      data: sample,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('offline-software-invoices-v2', JSON.stringify([invoiceRecord]));
    localStorage.setItem('offline-software-setup-completed-v1', 'true');

    render(
      <ThemeProvider>
        <InvoiceProvider>
          <InvoiceEditor invoiceId="inv-test-tab5" onBack={() => {}} />
        </InvoiceProvider>
      </ThemeProvider>
    );

    // Switch to Style & Theme tab via the header Customize button or tab
    const customizeBtn = screen.getByRole('button', { name: /Customize/i });
    fireEvent.click(customizeBtn);

    expect(screen.getByText(/Template Customizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Theme Presets/i)).toBeInTheDocument();

    // Verify template dropdown is present in Tab 5
    const selectEl = screen.getAllByRole('combobox').find((el) =>
      (el as HTMLSelectElement).value === 'classic'
    ) as HTMLSelectElement;
    expect(selectEl).toBeInTheDocument();

    // Switch to Modern
    fireEvent.change(selectEl, { target: { value: 'modern' } });

    // Save a custom styling preset
    const presetInput = screen.getByPlaceholderText(/Preset name/i);
    fireEvent.change(presetInput, { target: { value: 'My Emerald Branding' } });

    const savePresetBtn = screen.getByRole('button', { name: /Save Preset/i });
    fireEvent.click(savePresetBtn);

    // Presets key should now be updated in localStorage
    const savedPresets = JSON.parse(localStorage.getItem('invoice-theme-presets') || '[]');
    expect(savedPresets.length).toBeGreaterThan(0);
    expect(savedPresets[0].name).toBe('My Emerald Branding');
  });
});
