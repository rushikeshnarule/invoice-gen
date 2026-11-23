# Product Features & Functional Capabilities — Invoice Gen

**Invoice Gen** is a commercial offline invoice and billing workstation designed for high-speed, zero-cloud invoicing across Windows, macOS, Android, and Web.

---

## 1. Core Billing & Invoicing Engine

### 1.1 Invoice Classification & Workflows
- **Daily Invoices (Regular):** Fast single-order billing for retail counter sales, daily goods supply, or individual consulting gigs.
- **Monthly Consolidated Invoices:** Aggregates multiple daily delivery slips or service logs for a client into a single statutory monthly tax statement with date-by-date itemized breakdowns.
- **Sequential Numbering:** Standard sequential generator defaulting to `INV-001`, `INV-002`, `INV-003`, with custom prefix support.
- **Status Lifecycle:** Tracks states (`Draft`, `Sent`, `Paid`, `Overdue`) with real-time balance due calculations.

### 1.2 Line Item Architecture
- Dynamic table editing: Item description, HSN/SAC codes, quantities, customizable units (`Nos`, `Kg`, `Mtr`, `Hours`, `Pcs`), unit rates, item discounts, and tax rates.
- Row-level tax computations and automatic amount-in-words generation in Indian numbering system (Lakhs/Crores) and Western format (Millions/Billions).

---

## 2. Multi-Regional Tax Editions

### 2.1 India Edition (INR ₹)
- **GST Compliance:** Intelligent detection of intra-state supply (CGST + SGST split) vs. inter-state supply (IGST) based on business and client state codes.
- **Statutory Identifiers:** Business PAN, GSTIN, HSN/SAC code tracking, State Code lookup.
- **Automated UPI QR Generation:** Generates dynamic `upi://pay` payment QR codes containing business UPI ID, payee name, and exact outstanding balance.

### 2.2 United States Edition (USD $)
- **Sales Tax Presets:** Multi-state sales tax rate presets and state tax jurisdiction handling.
- **US Business Identifiers:** Federal EIN (Employer Identification Number), State Tax ID, and US Zip+4 formatting.
- **Remittance Options:** Bank ABA routing numbers, account numbers, and Zelle / Wire instructions.

---

## 3. High-Fidelity Export & Sharing Subsystems

### 3.1 Pure Vector PDF Generation
- **Engine:** Built with deterministic vector drawing (`pdfGeneratorService.ts`).
- **Zero DOM / Canvas:** Generates PDFs without html2canvas rendering, eliminating blurriness, font rasterization, and scaling glitches.
- **A4 / A5 Multi-Page Pagination:** Automatically calculates row heights and inserts clean page headers/footers across long line-item tables.

### 3.2 Publication-Grade Excel Export (.xlsx)
- **Engine:** OpenXML engine via `ExcelJS` (`exportToExcel.ts`).
- **A4 Portrait Fit-To-Page:** Programmed with `fitToWidth=1` and standard A4 portrait boundaries so printing directly from Microsoft Excel prints cleanly on 1 page without horizontal truncation.
- **Formula Integration:** Native Excel formulas for subtotal, discount, tax, and net payable.

### 3.3 Mobile Sharing via Android FileProvider
- Direct one-click share to WhatsApp, Gmail, Google Drive, Quick Share, or device storage.
- Real binary `.pdf` and `.xlsx` files attached through Android's system `Intent.ACTION_CHOOSER` without exposing `localhost` URLs.

---

## 4. Theme & Template Gallery (18 Themes)

- **A4 / A5 Document Themes:**
  1. **Classic:** Full-border table with centered header and complete GST tax blocks.
  2. **Modern:** Clean top header with colored accent bar and sleek minimal borders.
  3. **Minimal:** High-density whitespace with subtle divider lines and modern typography.
  4. **Corporate:** Formal enterprise layout with structured metadata panels.
  5. **Elegant:** Serif typography with refined margins for luxury brands and studios.
  6. **Bold:** High-contrast header banner designed for trades and industrial supply.
  7. **Compact:** Space-efficient layout fitting up to 25 items on a single A4 page.
  8. **Contractor:** Dedicated construction and service bill template with daily work dates and milestone columns.
  *(Plus 8 additional specialized commercial variants)*.
- **Thermal POS Themes (80mm):**
  - Ultra-compact receipts designed for thermal roll printers and counter point-of-sale.
- **Customization Controls:**
  - Dynamic brand color palettes (Emerald, Blue, Violet, Amber, Slate, Rose, Custom Hex).
  - Typography selection (System, Inter, Serif, Monospace).
  - Font scaling (Small 9pt, Normal 11pt, Large 13pt).
  - Stamp, signature, and watermark overlays (`PAID`, `DRAFT`, Custom).

---

## 5. Offline Client Directory & Commercial Ledger

- **Client Directory:** Local database of corporate buyers, GSTINs, addresses, phone numbers, and email contacts.
- **Customer Transaction Ledger:** Tracks total invoices issued, cumulative revenue billed, payments collected, and outstanding receivables per client.
- **History View:** One-click drill down to inspect previous bills and materials purchased by any client.

---

## 6. Offline Data Durability & System Protection

- **100% On-Device:** Data is stored locally in browser/app storage without external network calls.
- **JSON Backup & Restore:** One-click full database export and restore functionality.
- **Crash Isolation:** Wrapped in an application-level `ErrorBoundary` with session restore safeguards.

---

## 7. Security Architecture & SAST Compliance

- **Zero-Cloud Local Storage:** Invoices, business profiles, and customer details remain strictly on the host device.
- **Hardened Electron IPC & Auto-Updater:**
  - Whitelisted download hosts restricted to official HTTPS GitHub releases and AWS asset endpoints.
  - In-memory execution verification ensuring only binaries fetched and validated by the updater service can be installed.
  - Path containment checks restricting update execution exclusively to verified temporary directories.
- **Prototype Pollution Immunity (CWE-1321):**
  - Recursive reviver deserializer stripping `__proto__`, `constructor`, and `prototype` keys across all system storage endpoints.
- **Strict Content & URI Sanitization:**
  - Remote CSS styles sanitized against breakout tags, `@import` fetching, and JavaScript URL expressions.
  - Safe protocol enforcement (`https:`, `http:`, `mailto:`, `tel:`) on all user-supplied links.
- **Reverse Tabnabbing Protection:**
  - All new window targets isolated with `noopener,noreferrer`.
- **Modern Supply Chain:**
  - Zero high-severity vulnerabilities; 100% migrated to verified modern libraries (`ExcelJS 4.4.0`, `PDFKit`, `React 19`, `Zod 4.6.6`).
