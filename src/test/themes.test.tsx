import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Direct synchronous theme imports for deterministic snapshot tests
import ClassicTheme from '../themes/classic';
import MinimalTheme from '../themes/minimal';
import ModernTheme from '../themes/modern';
import CompactTheme from '../themes/compact';
import CorporateTheme from '../themes/corporate';
import BoldTheme from '../themes/bold';
import ElegantTheme from '../themes/elegant';
import ThermalTheme from '../themes/thermal';

import {
  createSampleData,
  createSampleDataDevanagari,
  createSampleDataIGST,
  createSampleDataNoGST,
} from '../utils/sampleData';
import { resolveOptions } from '../themes';
import { ThemePreview } from '../components/ThemePreview/ThemePreview';
import type { InvoiceRenderData } from '../types';

const THEMES = [
  { id: 'classic', component: ClassicTheme },
  { id: 'minimal', component: MinimalTheme },
  { id: 'modern', component: ModernTheme },
  { id: 'compact', component: CompactTheme },
  { id: 'corporate', component: CorporateTheme },
  { id: 'bold', component: BoldTheme },
  { id: 'elegant', component: ElegantTheme },
  { id: 'thermal', component: ThermalTheme },
];

describe('Invoice Themes Suite', () => {
  // 1. Snapshot test for all 8 themes
  describe('All 8 Themes Base Rendering & Snapshots', () => {
    const baseData = createSampleData(3);

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`renders theme "${id}" without throwing and matches snapshot`, () => {
        const options = resolveOptions(id);
        const { container } = render(<ThemeComponent data={baseData} options={options} />);
        expect(container.firstChild).toBeInTheDocument();
        expect(container).toMatchSnapshot();
      });
    });
  });

  // 2. Edge case: 1 item
  describe('Edge case: 1 item', () => {
    const singleItemData = createSampleData(1);
    const targetDesc = singleItemData.items[0].description;

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" renders single item correctly`, () => {
        const options = resolveOptions(id);
        const { getAllByText } = render(<ThemeComponent data={singleItemData} options={options} />);
        const matches = getAllByText((_, node) => node?.textContent?.includes(targetDesc) || false);
        expect(matches.length).toBeGreaterThan(0);
      });
    });
  });

  // 3. Edge case: 40 items (multi-page scenario)
  describe('Edge case: 40 items multi-page', () => {
    const largeData = createSampleData(40);

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" handles 40 line items without crashing`, () => {
        const options = resolveOptions(id);
        const { container } = render(<ThemeComponent data={largeData} options={options} />);
        const rows = container.querySelectorAll('tbody tr, [class*="itemRow"]');
        expect(rows.length).toBeGreaterThanOrEqual(40);
      });
    });
  });

  // 4. Edge case: Long item names
  describe('Edge case: Long item names', () => {
    const longNameData: InvoiceRenderData = {
      ...createSampleData(2),
      items: [
        {
          id: 'long-1',
          sno: 1,
          description:
            'Enterprise High-Performance Multi-Region Distributed Kubernetes Microservices Architecture Consultation & Security Penetration Testing Service with Round-the-Clock On-Call Reliability Support',
          hsnSac: '998313',
          quantity: 1,
          unit: 'Units',
          rate: 150000,
          taxableAmount: 150000,
          gstRate: 18,
          gstAmount: 27000,
          total: 177000,
        },
      ],
    };

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" wraps and renders long item descriptions`, () => {
        const options = resolveOptions(id);
        const { getAllByText } = render(<ThemeComponent data={longNameData} options={options} />);
        const found = getAllByText((_, node) => node?.textContent?.includes('Distributed Kubernetes') || false);
        expect(found.length).toBeGreaterThan(0);
      });
    });
  });

  // 5. Edge case: Missing logo
  describe('Edge case: Missing logo', () => {
    const noLogoData: InvoiceRenderData = {
      ...createSampleData(2),
      business: {
        ...createSampleData(2).business,
        logoUrl: undefined,
      },
    };

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" gracefully handles missing logo`, () => {
        const options = resolveOptions(id, { showLogo: true });
        const { queryByRole } = render(<ThemeComponent data={noLogoData} options={options} />);
        expect(queryByRole('img', { name: noLogoData.business.name })).toBeNull();
      });
    });
  });

  // 6. Edge case: No GST (unregistered business)
  describe('Edge case: Unregistered business (no GST)', () => {
    const noGstData = createSampleDataNoGST();

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" renders correctly without GST fields`, () => {
        const options = resolveOptions(id);
        const { queryByText } = render(<ThemeComponent data={noGstData} options={options} />);
        expect(queryByText('CGST')).toBeNull();
        expect(queryByText('SGST')).toBeNull();
        expect(queryByText('IGST')).toBeNull();
      });
    });
  });

  // 7. Edge case: IGST (Inter-state) vs CGST+SGST (Intra-state)
  describe('Edge case: IGST vs CGST+SGST', () => {
    const igstData = createSampleDataIGST();

    it('Classic theme renders IGST correctly for inter-state', () => {
      const options = resolveOptions('classic');
      const { getAllByText, queryByText } = render(<ClassicTheme data={igstData} options={options} />);
      expect(getAllByText(/IGST/).length).toBeGreaterThan(0);
      expect(queryByText(/^CGST$/)).toBeNull();
    });

    const intraStateData = createSampleData(2);
    it('Classic theme renders CGST and SGST for intra-state', () => {
      const options = resolveOptions('classic');
      const { getAllByText, queryByText } = render(<ClassicTheme data={intraStateData} options={options} />);
      expect(getAllByText(/CGST/).length).toBeGreaterThan(0);
      expect(getAllByText(/SGST/).length).toBeGreaterThan(0);
      expect(queryByText(/^IGST$/)).toBeNull();
    });
  });

  // 8. Edge case: Discounts and Partial Payments
  describe('Edge case: Discounts and Partial Payments', () => {
    const paymentData: InvoiceRenderData = {
      ...createSampleData(2),
      totalDiscount: 500,
      amountPaid: 3000,
      balanceDue: 2500,
      payments: [{ date: '2024-11-20', amount: 3000, method: 'UPI' }],
    };

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" shows discount and payment breakdown`, () => {
        const options = resolveOptions(id, { showDiscountColumn: true });
        const { getAllByText } = render(<ThemeComponent data={paymentData} options={options} />);
        const found = getAllByText((_, el) => el?.textContent?.toLowerCase().includes('discount') || false);
        expect(found.length).toBeGreaterThan(0);
      });
    });
  });

  // 9. Edge case: Hindi / Marathi (Devanagari) script
  describe('Edge case: Devanagari text (Hindi / Marathi)', () => {
    const devanagariData = createSampleDataDevanagari();

    THEMES.forEach(({ id, component: ThemeComponent }) => {
      it(`theme "${id}" renders Devanagari text without encoding loss`, () => {
        const options = resolveOptions(id);
        const { getAllByText } = render(<ThemeComponent data={devanagariData} options={options} />);
        const bizMatches = getAllByText((_, el) => el?.textContent?.includes('टेककॉर्प सॉल्यूशन्स') || false);
        const clientMatches = getAllByText((_, el) => el?.textContent?.includes('सनराइज एंटरप्राइजेज') || false);
        expect(bizMatches.length).toBeGreaterThan(0);
        expect(clientMatches.length).toBeGreaterThan(0);
      });
    });
  });

  // 10. Invariance principle: switching themes never mutates invoice data
  describe('Theme Invariance Principle', () => {
    it('switching theme does not mutate or alter the original invoice data', () => {
      const originalData = createSampleData(3);
      const frozenData = JSON.parse(JSON.stringify(originalData));

      THEMES.forEach(({ id, component: ThemeComponent }) => {
        const options = resolveOptions(id);
        render(<ThemeComponent data={originalData} options={options} />);
      });

      // Assert data hasn't mutated
      expect(originalData).toEqual(frozenData);
    });
  });

  // 11. ThemePreview rendering and scaled wrapper stability
  describe('ThemePreview Rendering and Scaled Wrapper', () => {
    it('renders ThemePreview in full scale mode without crashing', async () => {
      const data = createSampleData(5);
      const options = resolveOptions('classic');
      const { container, findAllByText } = render(
        <ThemePreview themeId="classic" data={data} options={options} scale={0.82} />
      );
      expect(container.firstChild).toBeInTheDocument();
      const elements = await findAllByText(/tax invoice|invoice/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders ThemePreview in thumbnail mode without crashing', async () => {
      const data = createSampleData(3);
      const options = resolveOptions('modern');
      const { container, findAllByText } = render(
        <ThemePreview themeId="modern" data={data} options={options} isThumbnail={true} />
      );
      expect(container.firstChild).toBeInTheDocument();
      const elements = await findAllByText(/invoice/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders multi-page 40 items in ThemePreview with scale without crashing', async () => {
      const data = createSampleData(40);
      const options = resolveOptions('corporate');
      const { container, findAllByText } = render(
        <ThemePreview themeId="corporate" data={data} options={options} scale={0.75} />
      );
      expect(container.firstChild).toBeInTheDocument();
      const elements = await findAllByText(/invoice/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('renders thermal receipt in ThemePreview without crashing', async () => {
      const data = createSampleData(3);
      const options = resolveOptions('thermal');
      const { container, findAllByText } = render(
        <ThemePreview themeId="thermal" data={data} options={options} scale={1.0} />
      );
      expect(container.firstChild).toBeInTheDocument();
      const elements = await findAllByText(/scan & pay/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
