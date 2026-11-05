# Bug Report — Invoice Gen — 2026-11-04

## Summary
- Critical: 0 open, 5 fixed
- Intermediate: 0 open, 7 fixed
- Normal: 0 open, 7 fixed

---

## 🔴 Critical
*(All critical bugs resolved)*

---

## 🟡 Intermediate
*(All intermediate bugs resolved)*

---

## 🟢 Normal
*(All normal bugs resolved)*

---

## ✅ Resolved

### BUG-001: Pseudo-Random Noise Generator in UPI QR Engine Generates Invalid Barcodes — Fixed 2026-11-04
- **File:** `src/utils/qrcode.tsx:1-49`
- **Issue:** The QR code generator did not produce a valid ISO/IEC 18004 compliant QR matrix. Instead of encoding the UPI payment string, error correction, and format metadata, it populated the 25x25 grid with a linear congruential pseudo-random number formula (`(seed * 9301 + 49297) % 233280 > 0.5`) seeded with a string hash.
- **Trigger:** Any printed commercial invoice or preview where UPI QR code is enabled.
- **Impact:** Commercial invoices handed to buyers contained scannable visual noise rather than a decodable QR code. When customers scanned it with UPI applications (Google Pay, PhonePe, Paytm, BHIM), camera scanners failed with "Cannot read QR code" or parsed invalid gibberish, preventing payment collection.
- **Fix Applied:** Integrated standard, compliant `qrcode` matrix encoder (`QRCode.create(data, { errorCorrectionLevel: 'M' })`) to convert actual payload bytes with Reed-Solomon ECC into crisp SVG elements.
- **Status:** Resolved

### BUG-002: GST Inter-State vs Intra-State False Positive Matching from Arbitrary 2-Digit Numbers — Fixed 2026-11-04
- **File:** `src/utils/gst.ts:8-48`
- **Issue:** `determineGSTType` extracted state codes using regex `/\b\d{2}\b/` against the entire business and client state/address strings. If either string contained any 2-digit number (e.g., street, sector, plot, flat, or pin code number such as "Shop 24, Sector 18, Gurugram, Haryana (06)" and "24 - Gujarat"), `match(/\b\d{2}\b/)?.[0]` matched `"24"` from both strings and asserted `code1 === code2`.
- **Trigger:** Business address contains a 2-digit number and client address contains the same 2-digit number, even when their states are completely different.
- **Impact:** Erroneously classified inter-state supplies as intra-state (`cgst_sgst` instead of `igst`). This generated non-compliant tax invoices under the Indian CGST/IGST Act, causing Input Tax Credit (ITC) rejection and tax penalties.
- **Fix Applied:** Replaced broad `\b\d{2}\b` matching with `extractStateCode`, strictly identifying parenthesized state codes (`/\((\d{2})\)/`), prefix state codes (`/^(\d{2})\s*[-:]/`), or standalone 2-digit codes. When two explicit state codes differ, it correctly returns `'igst'`.
- **Status:** Resolved

### BUG-003: Corrupted Backup Import Causes Permanent Application Crash (`TypeError: Cannot read properties of undefined`) — Fixed 2026-11-04
- **File:** `src/context/InvoiceContext.tsx:371-408` & `src/routes/InvoicesView.tsx:70-82`
- **Issue:** `importOfflineBackup` wrote parsed JSON directly to `localStorage` after merely checking `Array.isArray(parsed.invoices)` without validating the object schema or the presence of required fields (`inv.data`, `inv.data.business`, `inv.clientName`). In `InvoicesView.tsx`, the search filter unconditionally evaluated `inv.data.business.name.toLowerCase()`.
- **Trigger:** Importing a backup JSON containing an invoice with missing/null `data` or `data.business` (or from an older version/external tool).
- **Impact:** Permanent application crash upon reload. The corrupted record was persisted in `localStorage`, so every subsequent page visit failed with an uncaught `TypeError` before the UI could render, locking the user out of the software.
- **Fix Applied:** Implemented item-by-item structural validation and recalculation in `importOfflineBackup` before persisting to `localStorage`. Added optional chaining and defensive fallbacks in `InvoicesView.tsx` search filters.
- **Status:** Resolved

### BUG-004: React 19 State Mutation and Asynchronous Desync in Invoice Creation and Duplication — Fixed 2026-11-04
- **File:** `src/context/InvoiceContext.tsx:196-265` & `src/context/InvoiceContext.tsx:285-330`
- **Issue:** `createInvoice` and `duplicateInvoice` declared an uninitialized local variable `let createdRecord!: InvoiceRecord;`, assigned it inside the `setInvoices((prev) => ...)` updater callback, and immediately called `setActiveInvoiceId(createdRecord.id)` and `return createdRecord;` synchronously outside the callback.
- **Trigger:** Calling `createInvoice` or `duplicateInvoice` in React 19 / Concurrent Mode or batching environments.
- **Impact:** In concurrent mode or deferred state scheduling, `createdRecord` was undefined when returned or when `setActiveInvoiceId` was invoked, causing `Cannot read properties of undefined (reading 'id')` or returning `undefined` to caller `InvoicesView`. Also triggered the React Compiler lint violation `react(immutability): Cannot reassign variable after render completes`.
- **Fix Applied:** Calculated the new invoice record and its ID outside the state updater, passed the finished record into `setInvoices((prev) => [createdRecord, ...prev])`, and synchronously returned `createdRecord`.
- **Status:** Resolved

### BUG-005: `PrintInvoice` Silently Drops `variant` Parameter on Print Route — Fixed 2026-11-04
- **File:** `src/routes/PrintInvoice.tsx:20-41`
- **Issue:** When printing from ThemePicker with a chosen test variant (e.g., `variant=multipage`, `variant=devanagari`, `variant=igst`, `variant=nogst`), `ThemePicker.tsx` included `&variant=${dataVariant}` in the URL. However, `PrintInvoice.tsx` did not pass the variant to `buildRenderData`.
- **Trigger:** Printing a preview variant from the Theme Studio.
- **Impact:** The print page ignored the requested variant and printed standard sample instead of the selected multipage/devanagari/IGST test variant.
- **Fix Applied:** Extracted `const variantParam = searchParams.get('variant')` in `PrintInvoice.tsx` and passed it directly to `buildRenderData(invoiceId || 'sample', variantParam)`.
- **Status:** Resolved

### BUG-006: Client ID Generation Collapses Non-ASCII / Regional Script Client Names to Collision Key `'client-'` — Fixed 2026-11-04
- **File:** `src/utils/initialOfflineData.ts:20-33` & `src/routes/ClientsView.tsx:144`
- **Issue:** `getClientId` used `name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')`. For client names in Devanagari, Hindi, Tamil, or other non-Latin scripts (e.g. `श्री गणेश ट्रेडर्स`), all characters were stripped, resulting in `'client-'`.
- **Trigger:** Adding clients with non-Latin / Unicode business names, or assigning template defaults in `ClientsView`.
- **Impact:** Multiple regional language clients collided on the identical key `'client-'`, overwriting each other's template defaults in `clientDefaults`.
- **Fix Applied:** Updated `getClientId` to preserve Unicode letters, numbers, and marks (`/[^\p{L}\p{N}\p{M}]+/gu`) with a hash fallback, generating stable unique IDs (e.g. `client-श्री-गणेश-ट्रेडर्स`). Unified usage in `ClientsView.tsx`.
- **Status:** Resolved

### BUG-007: Empty / Invalid Date String Throws Unhandled `RangeError` in All Theme Renderers — Fixed 2026-11-04
- **File:** `src/utils/numberFormat.ts:44-59`
- **Issue:** `formatDate` unconditionally called `new Intl.DateTimeFormat(...).format(new Date(dateStr))`. If a user cleared the `invoiceDate` field in `InvoiceEditor`, `dateStr` was `""`. `new Date("")` produced `Invalid Date`, which threw `RangeError: Invalid time value`.
- **Trigger:** Clearing or backspacing the date field in `InvoiceEditor` or importing an invoice without a valid date.
- **Impact:** Unhandled `RangeError` crashed the live preview and entire workstation tab because `ThemePreview` lacked an error boundary.
- **Fix Applied:** Added guard clauses in `formatDate` for falsy dates, NaN timestamps, and invalid locale tags with fallback to ISO date or empty string.
- **Status:** Resolved

### BUG-008: Removing Recorded Payment Leaves Invoice Stuck in `'paid'` Status with Active Balance Due — Fixed 2026-11-04
- **File:** `src/components/InvoiceEditor/InvoiceEditor.tsx:243-255`
- **Issue:** When a payment was recorded, `handleAddPayment` automatically transitioned `invoiceData.status` to `'paid'`. When a payment was deleted via `handleRemovePayment`, the status was NOT recalculated or reverted to `'draft'` or `'sent'`.
- **Trigger:** Adding a payment and subsequently removing it in `InvoiceEditor`.
- **Impact:** Invoices with ₹0 paid and a full balance due remained marked as `status: 'paid'`. Theme watermarks stamped a prominent green "PAID" badge over invoices that were completely unpaid.
- **Fix Applied:** In `handleRemovePayment`, recalculated the remaining balance and reverted `status` to `'sent'` when `totalPaid < calculatedData.grandTotalRounded`.
- **Status:** Resolved

### BUG-009: Place of Supply Ignored in GST Rate Determination — Fixed 2026-11-04
- **File:** `src/utils/buildRenderData.ts:87-91`
- **Issue:** `recalculate` passed `data.client.state` to `determineGSTType` instead of `data.placeOfSupply`. Under Indian GST rules, Place of Supply dictates whether the supply is inter-state (IGST) or intra-state (CGST+SGST).
- **Trigger:** Editing "Place of Supply" to a different state than `client.state` in `InvoiceEditor`.
- **Impact:** Changes to Place of Supply were ignored by the tax computation engine; an invoice delivering to an out-of-state facility continued to calculate intra-state CGST+SGST.
- **Fix Applied:** In `recalculate`, prioritized `data.placeOfSupply` when calling `determineGSTType`, falling back to `data.client?.state`.
- **Status:** Resolved

### BUG-010: Root URL (`/`) Causes Sidebar Navigation State Desync — Fixed 2026-11-04
- **File:** `src/App.tsx:37-41`
- **Issue:** `activeKey` checked `location.pathname.includes('/invoices') ? 'invoices' : ... : 'design'`. When navigating to `/` (which renders `<InvoicesView />`), `activeKey` fell back to `'design'`.
- **Trigger:** Navigating to the app root `http://localhost:5173/`.
- **Impact:** The invoices list was displayed in the main pane, but the sidebar highlighted the "Invoice Design & Themes" button.
- **Fix Applied:** Updated `activeKey` check to `location.pathname === '/' || location.pathname.includes('/invoices')`.
- **Status:** Resolved

### BUG-011: Uncontrolled Textareas with Per-Keystroke Storage Write in Settings Modal — Fixed 2026-11-04
- **File:** `src/components/application/settings/settings-modal.tsx:61-165, 552-575`
- **Issue:** Notes and terms textareas in SettingsModal used `defaultValue` and called `updateBusinessProfile` on every `onChange` keystroke, writing directly to `localStorage` synchronously while remaining out-of-sync with the form's "Save Changes" workflow.
- **Trigger:** Typing customer notes or terms in Settings Modal.
- **Impact:** Unnecessary high-frequency storage writes on every character typed, and desynchronization with `formData`.
- **Fix Applied:** Converted `notes` and `terms` to controlled inputs bound to `formData` and saved in `handleSaveSubmit`.
- **Status:** Resolved

### BUG-012: Missing `try/catch` around `localStorage.setItem` in `ThemeContext` — Fixed 2026-11-04
- **File:** `src/context/ThemeContext.tsx:46-52`
- **Issue:** `saveToStorage` in `ThemeContext.tsx` did not wrap `localStorage.setItem` in `try / catch`, unlike `InvoiceContext.tsx`.
- **Trigger:** LocalStorage quota exceeded (e.g. lots of large presets) or private/incognito browsing storage restrictions.
- **Impact:** Uncaught `DOMException: QuotaExceededError` crashed preset/theme saving.
- **Fix Applied:** Wrapped `localStorage.setItem` in `try / catch` with error logging.
- **Status:** Resolved

### BUG-013: Zero / Paid Balance Due Results in `am=0` in UPI QR Intent URL — Fixed 2026-11-04
- **File:** `src/themes/themeHelpers.ts:73-78`
- **Issue:** If an invoice was fully paid (`balanceDue <= 0`), `getUpiQrString` generated `am=0` in the UPI string.
- **Trigger:** Viewing or printing a fully paid invoice with UPI QR option enabled.
- **Impact:** Banking apps rejected `am=0` transactions.
- **Fix Applied:** In `getUpiQrString`, if `dueAmount <= 0`, suppressed generating a payment URI (returns empty string). When positive, formatted `payAmount` to standard 2 decimal places with URL encoded UPI ID.
- **Status:** Resolved

### BUG-014: `ThemePreview` Truncated Bottom and Sides of Scaled Invoices — Fixed 2026-11-04
- **File:** `src/components/ThemePreview/ThemePreview.tsx` & `src/components/InvoiceEditor/InvoiceEditor.tsx:1015` & `src/components/ThemePicker/ThemePicker.tsx:204`
- **Issue:** `transform: scale` does not adjust the element's layout footprint in the document flow. When scaling up (>100%) or rendering long invoices (multi-page with 40 items), the rendered visual content expanded beyond the unscaled DOM bounding box, while the preview scroll container only scrolled to the unscaled height. In addition, the parent container used `flex justify-center` with `overflow: auto`, which clipped the left side of invoices when the viewport was narrower than the paper width.
- **Trigger:** Zooming in, editing multi-page invoices with many items, or viewing on narrower laptop screens.
- **Impact:** Critical parts of invoices (terms, bank details, grand total, UPI QR code, notes, signatures) were sliced off at the bottom and unreachable via scrollbar.
- **Fix Applied:** Re-architected `ThemePreview.tsx` to measure unscaled dimensions with a `ResizeObserver` and apply the exact scaled width and height (`scaledSize = { width * currentScale, height * currentScale }`) to an outer wrapper with `position: relative` and `margin: 0 auto`. Positioned the scaled content with `top: 0; left: 0; transform-origin: top left;`. Replaced `flex justify-center` on the parent scroll panes with standard overflow auto, guaranteeing 100% full scrollability to every edge with generous bottom padding.
- **Status:** Resolved

### BUG-015: Modern Theme Container `overflow: hidden` Cut Off Multi-Page Content and Subsequent Print Pages — Fixed 2026-11-04
- **File:** `src/themes/modern/styles.module.css:1-12`
- **Issue:** `.invoiceContainer` in `modern` theme had `overflow: hidden;`.
- **Trigger:** Rendering an invoice with more than 8 items or printing multi-page invoices in the Modern theme.
- **Impact:** Any content extending beyond 297mm was completely truncated, and browser print engines refused to paginate onto subsequent sheets.
- **Fix Applied:** Removed `overflow: hidden;` from `.invoiceContainer` in `src/themes/modern/styles.module.css`.
- **Status:** Resolved

### BUG-016: Global `select-none` on Root Containers Prevented Copying Sensitive Financial Data — Fixed 2026-11-04
- **File:** `src/App.tsx:71`, `src/routes/InvoicesView.tsx:178`, `src/routes/ClientsView.tsx:84`, `src/components/InvoiceEditor/InvoiceEditor.tsx:302`, `src/components/ThemePicker/ThemePicker.tsx:110, 229`, `src/components/application/settings/settings-modal.tsx:207`, `src/components/ThemeOptions/ThemeOptionsPanel.tsx:96`
- **Issue:** `select-none` was blanket applied across top-level workspace views, modal backdrops, and form containers.
- **Trigger:** User attempting to highlight, copy, or paste invoice numbers, client GSTIN/PAN numbers, bank IFSC, account numbers, or JSON backups.
- **Impact:** Prevented commercial operators from copying critical accounting data and led to selection glitches in input fields.
- **Fix Applied:** Removed `select-none` from all main document bodies, workspaces, and modal containers while preserving it solely on buttons and icons.
- **Status:** Resolved

### BUG-017: Unanchored `step="50"` and `min="1"` on InvoiceEditor Quantity and Rate Inputs Restricted Fractional Amounts — Fixed 2026-11-04
- **File:** `src/components/InvoiceEditor/InvoiceEditor.tsx:520-565`
- **Issue:** Rate input had `step="50"`, and quantity had `min="1"` without `step="any"`.
- **Trigger:** Entering fractional quantities (e.g. 1.5 hours, 2.5 kg) or decimal unit rates (e.g. ₹499.50, ₹15.75).
- **Impact:** Up/down arrow stepping jumped by 50, and browsers raised validation errors for non-integer hours or decimal rates.
- **Fix Applied:** Configured `min="0" step="any"` on both quantity and unit rate inputs.
- **Status:** Resolved

### BUG-018: InvoicesView and ClientsView Missing Empty State Handlers — Fixed 2026-11-04
- **File:** `src/routes/InvoicesView.tsx:315-340` & `src/routes/ClientsView.tsx:140-165`
- **Issue:** When search filters yielded 0 results, the tables displayed an empty blank white rectangle with no message or clear-filter button.
- **Trigger:** Searching for an invoice or client name that doesn't exist or filtering by an empty status.
- **Impact:** Confused operators who couldn't tell if the application was loading, broken, or simply returning zero matches.
- **Fix Applied:** Added dedicated empty state illustrations with explanatory text and a one-click "Clear Search & Filters" button in both views.
- **Status:** Resolved

### BUG-019: Incomplete GST Line Breakdown, Missing Gross Subtotal & Discount, and False Positive IGST Determination — Fixed 2026-11-04
- **Files:** `src/utils/gst.ts`, `src/utils/buildRenderData.ts`, `src/components/InvoiceEditor/InvoiceEditor.tsx`, `src/themes/*`
- **Issue:** 
  1. The InvoiceEditor calculation strip lumped CGST and SGST into a single line "Total CGST + SGST: ₹0.00" even when tax was 0% or business was non-GST unregistered, and omitted the Gross Subtotal and Discount amount.
  2. State extraction in `determineGSTType` did not support statutory 15-digit GSTIN state prefixes or standard Indian state abbreviations (MH, DL, KA, TN, etc.), resulting in false positive IGST determinations for intra-state supplies.
  3. Themes omitted the "Taxable Subtotal" row when line discounts existed.
- **Trigger:** Creating invoices with discounts, zero-rated GST items, non-GST businesses, or using state abbreviations / GSTIN inputs.
- **Impact:** Caused confusion, non-compliance with statutory Indian GST reporting rules (CGST Act Sec 31 / Rule 46), and obscured the discount deductions from the customer.
- **Fix Applied:** 
  - Added full Indian GST state dictionary with 37 state/UT codes, official names, and 2-letter abbreviations.
  - Added GSTIN prefix extraction (first 2 digits) in `extractStateCode` and `determineGSTType`.
  - Re-architected InvoiceEditor Calculation Summary Strip to display Gross Subtotal, Total Discount, Taxable Subtotal, separate CGST and SGST lines, IGST, Non-GST status, and amount paid / balance due.
  - Added Taxable Subtotal rows across all 8 theme templates when discounts are applied.
- **Status:** Resolved

### BUG-020: QR Code Scanner Failure due to Non-Compliant Margin, Transparent SVG Background, and Malformed NPCI UPI Intent — Fixed 2026-11-04
- **Files:** `src/utils/qrcode.tsx`, `src/themes/themeHelpers.ts`, `src/themes/*`
- **Issue:**
  1. QR code generator used `margin = 1`, violating the ISO/IEC 18004 specification requiring a minimum 4-module quiet zone, causing phone cameras to fail decoding.
  2. SVG output lacked a solid white background rectangle, rendering transparently on styled themes or printed stationery.
  3. UPI URL generation lacked exact 2-decimal amount formatting (`am=950.00`), included special characters in payee names, and lacked transaction notes and reference IDs.
  4. Themes rendered empty broken placeholder boxes when `balanceDue <= 0`.
- **Trigger:** Generating and scanning UPI QR codes with mobile banking apps (GPay, PhonePe, Paytm) or viewing fully settled invoices.
- **Impact:** Payment scanner apps failed to read the QR code or rejected payment intents due to unformatted parameters, and fully settled invoices showed broken empty squares.
- **Fix Applied:**
  - Enforced standard 4-module quiet zone margin and added solid `<rect width="100%" height="100%" fill="#ffffff"/>` in `generateQRCodeSvg`.
  - Formatted NPCI UPI intent with 2-decimal amount (`payAmount.toFixed(2)`), sanitized alphanumeric payee names, transaction reference (`tr`), and transaction note (`tn`).
  - Guarded theme QR blocks to hide cleanly when no payment is due and returned `null` from `QRCodeView` for empty inputs.
- **Status:** Resolved

### BUG-021: AI Slop Text and Hardcoded Theme Defaults during Invoice Creation — Fixed 2026-11-04
- **Files:** `src/context/InvoiceContext.tsx`, `src/routes/InvoicesView.tsx`, `src/utils/initialOfflineData.ts`, `src/themes/*`
- **Issue:**
  1. Creating a new invoice hardcoded themes (`modern` for goods, `thermal` for retail, `classic` for services) instead of respecting the user's currently selected theme.
  2. Default descriptions contained pseudo-corporate AI buzzword filler (e.g. "Enterprise ERP System Customization & API Integration (Sprint 14-16)", "Commercial Hardware Equipment / Supply", "SOC2 Security Hardening & Zero-Trust Boundary Audit").
  3. Themes displayed informal slogans like "Fast UPI checkout", "Immediate credit", and "Instant clearance".
  4. Non-GST invoices were titled "TAX INVOICE" even when no tax was levied.
- **Trigger:** Clicking "Create Invoice" or generating seed offline records.
- **Impact:** Disregarded the user's theme selection and produced invoices with tacky, unrealistic AI placeholder copy.
- **Fix Applied:**
  - Updated `createInvoice` to accept `themeId` and default to the user's selected theme (`currentThemeId`).
  - Replaced buzzwords with clean, standard, general commercial line items ("Consulting & Professional Services", "Goods / Product Supply", "Retail Sale Item").
  - Cleaned theme payment labels to standard "Scan with any UPI app" and set document title to "INVOICE" when GST is disabled.
- **Status:** Resolved

### BUG-022: Paid Status Invoices Still Displaying "Due: ₹1,000.00" and Distorted QR Code Generator — Fixed 2026-11-04
- **Files:** `src/utils/buildRenderData.ts`, `src/context/InvoiceContext.tsx`, `src/components/InvoiceEditor/InvoiceEditor.tsx`, `src/routes/InvoicesView.tsx`, `src/utils/qrcode.tsx`, `src/themes/themeHelpers.ts`
- **Issue:**
  1. When an invoice status was changed to `Paid` in the editor dropdown, it updated `status: 'paid'` without updating the payment entries. Because payments remained empty, `recalculate` computed `balanceDue = 1000.00`, causing the invoice row in InvoicesView to display `Paid` alongside `Due: ₹1,000.00` in red text.
  2. `getUpiQrString` checked `if (data.amountPaid > 0 && due <= 0) return ''`. When an invoice was marked `Paid` without payments, it continued generating a payment QR code for ₹1,000.00.
  3. The QR SVG generator computed module coordinates using floating-point `cellSize.toFixed(2)` on user-space bounds, introducing subpixel gaps and distorted finder pattern ratios that caused phone scanners to fail decoding.
  4. `tr` in the UPI intent contained hyphens (`INV-2026-001`), which violates NPCI UPI PSP requirements for strictly alphanumeric transaction references.
- **Trigger:** Marking an invoice as Paid via the status dropdown or scanning a generated UPI QR code.
- **Impact:** Paid invoices displayed as owing their full balance, QR codes continued demanding payment on paid invoices, and cameras failed to scan generated QR codes.
- **Fix Applied:**
  - Enforced strict financial consistency in `recalculate`: when `status === 'paid'`, `balanceDue` is guaranteed to be `0` and `amountPaid` equals `grandTotalRounded`. When full payments are recorded, status auto-promotes to `paid`.
  - Added synchronized status transition in `InvoiceEditor`: selecting `Paid` auto-records full settlement in `payments`, while selecting `Draft` or `Sent` clears the auto-settlement.
  - Sanitized loaded invoices in `InvoiceContext` so existing records with status `paid` immediately recalculate with `balanceDue: 0`.
  - In `InvoicesView.tsx`, ensured paid invoices display `Settled` in green text.
  - Re-architected `generateQRCodeSvg` using integer grid `viewBox="0 0 totalSize totalSize"` and continuous `<path fill="#000000" />` instructions, guaranteeing zero subpixel gaps and perfect finder ratios.
  - Sanitized UPI intent parameters (`tr` alphanumeric without hyphens, `am` formatted to 2 decimals) and suppressed QR generation when `status === 'paid'` or `balanceDue <= 0`.
- **Status:** Resolved

### BUG-023: PDF Export Filename Defaults to Generic Page Title Instead of Generated Invoice Number — Fixed 2026-11-04
- **Files:** `src/routes/PrintInvoice.tsx:43-73, 137-145`, `src/components/InvoiceEditor/InvoiceEditor.tsx:116-128`, `src/test/print.test.tsx`
- **Issue:** In Chromium, Edge, Firefox, and Safari, when printing or exporting via "Save as PDF", the browser print dialog defaults the suggested file name to `document.title`. Because `document.title` remained statically set to `'invoice-gen'` from `index.html`, any printed invoice was saved with the generic filename `invoice-gen.pdf` instead of the invoice's identifier (e.g. `INV-001.pdf`).
- **Trigger:** Clicking "Print / Save as PDF", quick-printing with `auto=true`, or pressing `Ctrl+P` / `Cmd+P`.
- **Impact:** Users had to manually retype the invoice number for every single exported invoice, leading to misnamed documents, accidental file overwrites, and slower billing workflows.
- **Fix Applied:**
  - In `PrintInvoice.tsx`, synchronized `document.title` to the loaded invoice number as soon as `data.invoiceNumber` is resolved.
  - Added filesystem-safe character sanitization (`/[\\/:*?"<>|]/g` replaced with `-`) preventing OS file dialog errors.
  - Attached a `beforeprint` event listener to ensure `document.title` is guaranteed to be set to the invoice title even when users trigger printing via keyboard shortcuts (`Ctrl+P`).
  - In `InvoiceEditor.tsx`, synchronized `document.title` during active editing sessions so browser tabs and in-editor print flows immediately adopt the invoice title.
  - Restored original `document.title` on unmount to prevent title leaks across views.
- **Status:** Resolved

---

## 🚀 Feature Enhancements — 2026-11-04

### FEAT-001: Initial Setup Screen with Step-by-Step Loading Initialization & Personalized Workspace Boot
- **Files:** `src/components/SetupScreen/SetupScreen.tsx`, `src/context/InvoiceContext.tsx`, `src/App.tsx`, `src/components/application/dashboard/dashboard-sidebar.tsx`, `src/test/setup-and-share.test.tsx`
- **Feature Overview:**
  - Guides new operators through an onboarding wizard across 3 core steps:
    1. **Business Identity & Contact**: Business name, industry category, billing email, phone, and website.
    2. **Registered Location & Tax**: Street address, city, full 33+ Indian state selector with statutory codes, PIN code, 15-char GSTIN, and 10-char PAN.
    3. **Banking & UPI Remittance**: Bank name, account holder name, account number, IFSC code, and VPA UPI ID for instant customer QR codes.
  - **Step-by-Step Loading & Initialization Sequence**: When clicking "Finish & Start Software", transitions into an animated system initialization screen with real-time progress indicators:
    1. Saving business identity & tax credentials
    2. Configuring GST state jurisdiction & statutory rules
    3. Generating offline local database & cryptographic seed tables
    4. Calibrating vector QR payment generator & theme typography
    5. Starting Invoice Gen offline workstation
  - Propagates newly entered business profile credentials to all existing invoices and seed records so all templates immediately display the user's business.
  - Added a "Setup Wizard" quick action in the dashboard sidebar to allow re-running setup at any time.

### FEAT-002: Universal Invoice Sharing System (WhatsApp, Email, Native OS Share, Link & Plaintext Summary)
- **Files:** `src/components/ShareInvoiceModal/ShareInvoiceModal.tsx`, `src/routes/InvoicesView.tsx`, `src/components/InvoiceEditor/InvoiceEditor.tsx`, `src/routes/PrintInvoice.tsx`, `src/test/setup-and-share.test.tsx`
- **Feature Overview:**
  - Added a dedicated **Share** button (`RiShareForwardLine`) to:
    - InvoicesView table rows (next to Print and Edit)
    - InvoiceEditor workstation header bar
    - PrintInvoice top sticky navigation bar
  - **Share Options Available in `ShareInvoiceModal`**:
    - **WhatsApp Web & Mobile (`https://wa.me`)**: Formats professional invoice message with invoice number, client name, grand total, status, dynamic UPI pay link (if unpaid), and direct document link. Auto-detects client phone number.
    - **Direct Email (`mailto:`)**: Auto-fills client email, formatted commercial subject, item breakdown, tax subtotal, grand total, bank details, and invoice link.
    - **Native OS Share Sheet (`navigator.share`)**: Seamlessly triggers Windows/macOS native app sharing sheet (WhatsApp Desktop, Outlook, Nearby Share, Teams) when available.
    - **Copy Printable Link**: Copies the direct view/print URL (`window.location.origin + /print/...`) with instant toast notification.
    - **Copy Plaintext Summary**: Copies structured plaintext invoice details to clipboard.
    - **Download Offline JSON**: One-click download of the invoice data file for backup or audit.
