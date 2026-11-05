# Adding a New Invoice Theme

This document guides developers on how to create and register a new invoice theme in the Billing Studio.

## Architecture Principles

1. **Pure Presentation**: Themes must NEVER query the database or invoke network APIs. They receive `data: InvoiceRenderData` and `options: ThemeOptions` as typed props.
2. **Self-Contained**: Themes are pure HTML + scoped CSS (CSS Modules). No external fonts or images that require a network connection.
3. **One Folder Per Theme**: Every theme lives in `src/themes/<theme-id>/`.
4. **Lazy Loading**: Themes are lazy-loaded on demand to keep initial bundle size minimal (<150 KB gzipped).

---

## Directory Structure

To create a new theme with ID `cyberpunk`, create a directory:
`src/themes/cyberpunk/` containing three files:

```
src/themes/cyberpunk/
├── index.tsx          # The React component
├── styles.module.css  # Scoped CSS Module
└── meta.ts            # Theme metadata & registration definition
```

---

## Step 1: Create `meta.ts`

```typescript
// src/themes/cyberpunk/meta.ts
import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'cyberpunk',
  name: 'Cyberpunk Neon',
  description: 'High-contrast dark-edge borders with vibrant neon accent stripes and monospace accents.',
  paper: ['A4', 'A5'], // Supported paper sizes: 'A4' | 'A5' | '80mm'
  component: lazy(() => import('./index')),
  defaultOptions: {
    accentColor: '#06b6d4',
    fontFamily: 'mono',
    fontSize: 'normal',
    paper: 'A4',
  },
};

export default definition;
```

---

## Step 2: Create `styles.module.css`

Use CSS custom properties set dynamically by the options helper (`themeVars(options)`):
- `var(--accent)`: User-chosen accent colour
- `var(--font-family)`: Chosen font family (bundled Inter, Devanagari, Serif, or Mono)
- `var(--font-size-base)`: Scaled base font size
- `var(--font-size-sm)`, `var(--font-size-lg)`, `var(--font-size-xl)`

### Essential Print CSS Rules:
Every theme stylesheet must respect print page breaks:
```css
/* Container paper sizes */
.paperA4 {
  width: 210mm;
  min-height: 297mm;
  padding: 14mm;
}

.paperA5 {
  width: 148mm;
  min-height: 210mm;
  padding: 8mm;
}

/* Repeat table header on every page in print */
.table thead {
  display: table-header-group;
}

/* Prevent splitting individual line items across page breaks */
.table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Ensure totals block never splits */
.totalsSection {
  page-break-inside: avoid;
  break-inside: avoid;
}

@media print {
  .invoiceContainer {
    margin: 0 !important;
    box-shadow: none !important;
  }
}
```

---

## Step 3: Create `index.tsx`

```tsx
// src/themes/cyberpunk/index.tsx
import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const CyberpunkTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* 1. Header (Logo, Company, Title) */}
      <div className={styles.header}>
        {options.showLogo && data.business.logoUrl && (
          <img src={data.business.logoUrl} alt={data.business.name} />
        )}
        <h1>{data.business.name}</h1>
      </div>

      {/* 2. Client & Metadata */}
      <div>
        <strong>Billed To:</strong> {data.client.name}
      </div>

      {/* 3. Line Items Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            {options.showHsnSacColumn && <th>HSN/SAC</th>}
            <th>Qty</th>
            <th>Rate</th>
            {options.showDiscountColumn && <th>Disc</th>}
            {showGst && <th>GST%</th>}
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.sno || idx + 1}</td>
              <td>{item.description}</td>
              {options.showHsnSacColumn && <td>{item.hsnSac || '—'}</td>}
              <td>{item.quantity}</td>
              <td>{formatNumber(item.rate, options.numberFormat)}</td>
              {options.showDiscountColumn && <td>{item.discount ? `${item.discount}%` : '—'}</td>}
              {showGst && <td>{item.gstRate}%</td>}
              <td>{formatNumber(item.total, options.numberFormat)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Totals Block */}
      <div className={styles.totalsSection}>
        <div>Grand Total: {formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}</div>
      </div>

      {/* 5. UPI QR & Bank Details */}
      {options.showUpiQr && (data.bankDetails?.upiId || data.upiQrDataUrl) && (
        <QRCodeView
          data={data.upiQrDataUrl || `upi://pay?pa=${data.bankDetails?.upiId}&pn=${encodeURIComponent(data.business.name)}&am=${data.balanceDue}&cu=INR`}
          size={70}
        />
      )}
    </div>
  );
};

export default CyberpunkTheme;
```

---

## Step 4: Register in `src/themes/index.ts`

Add two lines to `src/themes/index.ts`:

```typescript
// 1. Import definition
import cyberpunkMeta from './cyberpunk/meta';

// 2. Add to registry object
export const themeRegistry: Record<string, ThemeDefinition> = {
  // ...existing
  cyberpunk: cyberpunkMeta,
};

// 3. Add to display order
export const themeOrder = [
  // ...existing
  'cyberpunk',
] as const;
```

---

## Step 5: Add Snapshot Test

Add a snapshot test case in `src/test/themes.test.tsx` verifying:
- Render with 1 item
- Render with 40 items (multi-page)
- Render without GST
- Render with Devanagari Hindi/Marathi script

Run `npm test` to verify.
