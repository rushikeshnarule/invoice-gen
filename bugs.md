# Bug Report — Invoice Gen (v1.3.3) — 2026-11-11

## Summary
- Critical: 0 open, 4 fixed
- Intermediate: 0 open, 11 fixed
- Normal: 0 open, 9 fixed

---

## 🔴 Critical

### BUG-001: Consolidated Monthly Modal Timezone UTC Date Shift
- **File:** `src/components/ConsolidatedMonthlyModal/ConsolidatedMonthlyModal.tsx:52-53, 68-69, 78-80, 200-201`
- **Issue:** Using `date.toISOString().split('T')[0]` on local midnight dates (`new Date(year, month, 1)`) converts to UTC. In any timezone ahead of UTC (such as India IST UTC+5:30), `2026-04-01 00:00:00 IST` converts to `2026-03-31T18:30:00Z`. Consequently, `startStr` is set to the last day of the previous month (`2026-03-31`), and `endStr` is set to `2026-04-29` instead of `2026-04-30`. Any invoice dated on the last day of the month is silently excluded from consolidation.
- **Trigger:** Opening the Consolidated Monthly Invoice modal in IST or any positive UTC timezone.
- **Impact:** Invoices dated on the 30th/31st are omitted from monthly bills, leading to underbilling.
- **Suggested Fix:** Replace `toISOString().split('T')[0]` with local date string formatter `toLocalDateString(date)`.
- **Status:** Resolved

### BUG-002: String Concatenation and NaN Propagation in Payments Summation
- **File:** `src/utils/buildRenderData.ts:147`
- **Issue:** `(data.payments || []).reduce((s, p) => s + p.amount, 0)` does not coerce `p.amount` to a number. If `p.amount` is a string (e.g. `"500"` from JSON storage or manual input), `0 + "500"` evaluates to `"0500"`, corrupting `amountPaid`, `balanceDue`, and invoice status.
- **Trigger:** An invoice record loaded with string-typed payment amounts.
- **Impact:** Corrupts financial balances, prevents marking invoices as paid or triggers incorrect balance due.
- **Suggested Fix:** Use `s + (Number(p?.amount) || 0)`.
- **Status:** Resolved

### BUG-003: Session Secret Token Exposed via Process Command-Line Arguments
- **File:** `electron/main.cjs:498`
- **Issue:** The session auth token was passed to renderer via `additionalArguments: ['--invoice-session-token=' + sessionAuthToken]`. On Windows, any unprivileged local process can read command line arguments of all running processes via WMI or task query.
- **Trigger:** Any local script or co-tenant process inspecting process arguments.
- **Impact:** Leaks the local storage loopback server auth token.
- **Suggested Fix:** Remove the CLI argument entirely. Use synchronous IPC `desktop:get-session-token-sync` which is already implemented and private to the Electron process.
- **Status:** Resolved

### BUG-004: Unbounded Request Body on Desktop HTTP API Endpoints (DoS Vulnerability)
- **File:** `electron/main.cjs:192, 261`
- **Issue:** POST request handlers for `/api/system-storage` and `/api/system-storage/license` accumulate chunks into `body += chunk` with no size threshold.
- **Trigger:** A large payload sent to the local HTTP server.
- **Impact:** Memory exhaustion (Node heap crash) taking down the desktop application.
- **Suggested Fix:** Enforce a 50MB payload limit; terminate connection with 413 Payload Too Large if exceeded.
- **Status:** Resolved

---

## 🟡 Intermediate

### BUG-005: Inconsistent Rounding Between Line Item Form and buildRenderData
- **File:** `src/components/InvoiceEditor/InvoiceEditor.tsx:262, 298`
- **Issue:** `handleUpdateItem` and `handleAddItem` compute discount and taxable amounts with `Math.round(val * 100) / 100` without `Number.EPSILON`, whereas `buildRenderData.ts` uses `Math.round((val + Number.EPSILON) * 100) / 100`. In JavaScript floating point, `1.005 * 100` is `100.49999999999999`, which rounds to 1 instead of 1.01, creating 1-paise discrepancies.
- **Trigger:** Line items with fractional rates or discounts yielding half-paise values.
- **Impact:** 1-paise jitter between the editing form display and final invoice totals.
- **Suggested Fix:** Standardize on `round2(val)` with `Number.EPSILON`.
- **Status:** Resolved

### BUG-006: GST Type Erroneously Reverted to 'none' When Business Profile Lacks GSTIN
- **File:** `src/utils/buildRenderData.ts:93-106`
- **Issue:** When a user sets `gstType` to `cgst_sgst` or `igst` on an invoice, if their business profile does not yet have a GSTIN and all current items have 0% GST, `recalculate` overrides `gstType` to `'none'`, which then zeroes out all tax rates on subsequent items.
- **Trigger:** Editing an invoice with 0% initial item before saving a business GSTIN.
- **Impact:** Prevents user from configuring tax rates on items.
- **Suggested Fix:** Preserve explicit user selection of `gstType`.
- **Status:** Resolved

### BUG-007: Cancelled Invoices Included in Revenue and Receivable Totals
- **File:** `src/routes/InvoicesView.tsx:94-97` and `src/routes/ClientsView.tsx:92-95`
- **Issue:** Dashboard metrics (`grossInvoiced`, `totalDue`, `totalGstLiabilities`) sum across all invoices including those marked `cancelled`.
- **Trigger:** User cancels an invoice.
- **Impact:** Inflated revenue and receivables on dashboard.
- **Suggested Fix:** Filter out `inv.status === 'cancelled'`.
- **Status:** Resolved

### BUG-008: Excel Export Subtotal and Discount Accounting Display Inversion
- **File:** `src/utils/exportToExcel.ts:498-508`
- **Issue:** Row 1 is labeled `Taxable Value (Subtotal):` and assigned `totalTaxableAmount` (post-discount), and Row 2 is labeled `Total Discount:`, presenting discount after it was already deducted.
- **Trigger:** Exporting an invoice with item discounts to Excel.
- **Impact:** Misleading financial summary in exported Excel spreadsheets.
- **Suggested Fix:** Display `Gross Subtotal: invoice.subtotal`, then `Total Discount: -invoice.totalDiscount`, then `Taxable Amount: invoice.totalTaxableAmount`.
- **Status:** Resolved

### BUG-009: Duplicated Invoices Retain Identical Line Item IDs
- **File:** `src/context/InvoiceContext.tsx:590-598`
- **Issue:** `duplicateInvoice` shallow-clones the items array without regenerating unique `id` properties for each line item.
- **Trigger:** User duplicates an invoice and edits line items.
- **Impact:** React key collisions and cross-item state anomalies.
- **Suggested Fix:** Map line items with fresh unique IDs during duplication.
- **Status:** Resolved

### BUG-010: Stale Calculated Data in Invoice Status Change Handler
- **File:** `src/components/InvoiceEditor/InvoiceEditor.tsx:430-444`
- **Issue:** `handleStatusChange` reads `calculatedData.grandTotalRounded` from outer scope rather than computing from the latest `prev.items`.
- **Trigger:** Fast status change right after modifying an item.
- **Impact:** Auto-settlement payment recorded for incorrect amount.
- **Suggested Fix:** Calculate total directly using `recalculate(prev)`.
- **Status:** Resolved

### BUG-011: Auth Token Accepted via URL Query Parameter
- **File:** `electron/main.cjs:120`
- **Issue:** Local server accepts authentication token via `?token=...` query string, which risks logging or token exposure.
- **Trigger:** Any request sending token in query parameter.
- **Impact:** Token leakage risk.
- **Suggested Fix:** Accept auth token strictly via `x-invoice-token` header.
- **Status:** Resolved

### BUG-012: Recursive Port Scanning Without Loop Guard
- **File:** `electron/main.cjs:55-66`
- **Issue:** `findAvailablePort` used unbounded promise recursion.
- **Trigger:** Multiple port collisions.
- **Impact:** Call stack growth.
- **Suggested Fix:** Convert to iterative `for` loop.
- **Status:** Resolved

### BUG-013: Unhandled decodeURIComponent on Server Pathname
- **File:** `electron/main.cjs:116`
- **Issue:** `decodeURIComponent(parsedUrl.pathname)` can throw `URIError` on malformed percent sequences like `%ZZ`.
- **Trigger:** Malformed URL request.
- **Impact:** Unhandled server error response.
- **Suggested Fix:** Wrap in try/catch fallback.
- **Status:** Resolved

### BUG-014: Unsanitized Share Invoice URL Parameters
- **File:** `src/components/ShareInvoiceModal/ShareInvoiceModal.tsx:42`
- **Issue:** `shareUrl` concatenated `invoice.invoiceNumber` and `themeId` without `encodeURIComponent`.
- **Trigger:** Invoice numbers containing `#`, `&`, `?`, or `/`.
- **Impact:** Broken share URLs or parameter injection.
- **Suggested Fix:** Wrap parameters with `encodeURIComponent`.
- **Status:** Resolved

---

## 🟢 Normal

### BUG-015: UTC Timezone Shift in formatDate Display Utility
- **File:** `src/utils/numberFormat.ts:49`
- **Issue:** `new Date('2026-04-15')` parses as UTC midnight. In timezones behind UTC (such as UTC-5 to UTC-12), formatting this date shifts it to the previous day (April 14).
- **Trigger:** Viewing invoices in UTC-negative timezones.
- **Impact:** Display date off by 1 day.
- **Suggested Fix:** Parse `YYYY-MM-DD` strings as local dates.
- **Status:** Resolved

### BUG-016: Potential TypeError on Undefined Payments Array
- **File:** `src/components/InvoiceEditor/InvoiceEditor.tsx:1684`
- **Issue:** `invoiceData.payments.length === 0` assumes `payments` is always defined.
- **Trigger:** Legacy imported invoice with omitted `payments` key.
- **Impact:** React render crash.
- **Suggested Fix:** Guard with `(invoiceData.payments || []).length === 0`.
- **Status:** Resolved

### BUG-017: Unhandled Promise Rejection in License Key Clipboard Copy
- **File:** `src/components/LicenseModal/LicenseModal.tsx:61`
- **Issue:** `navigator.clipboard.writeText` called without `.catch()`.
- **Trigger:** Clipboard permission denied by OS or environment.
- **Impact:** Unhandled promise rejection.
- **Suggested Fix:** Add `.catch()` handler with user feedback.
- **Status:** Resolved

### BUG-018: License Cloud Verification Triggered With Empty Key
- **File:** `src/components/LicenseModal/LicenseModal.tsx:88`
- **Issue:** `verifyLicense(license.licenseKey)` called without checking if key is non-empty.
- **Trigger:** Clicking verify when no key is entered.
- **Impact:** Spurious error toast.
- **Suggested Fix:** Guard with `if (!license?.licenseKey?.trim()) return`.
- **Status:** Resolved

### BUG-019: Missing noopener noreferrer on External WhatsApp Links
- **File:** `src/components/ShareInvoiceModal/ShareInvoiceModal.tsx:101`
- **Issue:** `window.open(waBase, '_blank')` called without window feature security flags.
- **Trigger:** User shares invoice to WhatsApp.
- **Impact:** Window opener vulnerability.
- **Suggested Fix:** Pass `'noopener,noreferrer'`.
- **Status:** Resolved

### BUG-020: Unbounded Daily Backup File Accumulation
- **File:** `electron/main.cjs:207-212`
- **Issue:** `backup-YYYY-MM-DD.json` created every day without rotation policy.
- **Trigger:** Extended application usage over months.
- **Impact:** Disk space clutter.
- **Suggested Fix:** Retain the latest 30 daily backups and prune older ones.
- **Status:** Resolved

### BUG-021: Non-Constant-Time Token Comparison
- **File:** `electron/main.cjs:121`
- **Issue:** String comparison `reqToken !== sessionAuthToken` susceptible to timing differences.
- **Trigger:** Local process timing attack.
- **Impact:** Theoretical token inference.
- **Suggested Fix:** Use `crypto.timingSafeEqual`.
- **Status:** Resolved

### BUG-022: Uncleaned Temp File on Database Save Failure
- **File:** `electron/main.cjs:203-206`
- **Issue:** Temp file left behind if rename fails.
- **Trigger:** Filesystem I/O error during file rename.
- **Impact:** Orphaned temporary file in data directory.
- **Suggested Fix:** Clean up `tmpFile` in catch block.
- **Status:** Resolved

### BUG-023: Template Manifest Protocol Vulnerability
- **File:** `src/services/templateSyncService.ts:285`
- **Issue:** Allows unencrypted `http://` manifest URLs.
- **Trigger:** Unencrypted sync URL.
- **Impact:** MITM vector for style injection.
- **Suggested Fix:** Require `https://` protocol.
- **Status:** Resolved

### BUG-024: Skip to Dashboard / Fresh Setup Inadvertently Loaded Demo Data
- **File:** `src/components/SetupScreen/SetupScreen.tsx:166-187`, `src/context/InvoiceContext.tsx:171-197, 815-879`
- **Issue:** When the user clicked "Skip to Dashboard" or completed fresh setup, `completeSetup()` updated `hasCompletedSetup` from `false` to `true`. An asynchronous `useEffect([hasCompletedSetup])` immediately invoked `loadSystemMemory()`, reading existing demo invoices (`inv-089` through `inv-093` from Pune clients) and demo clients from `Documents/Invoice Gen Data/database.json` and overwriting the user's dashboard with demo records. Additionally, `completeSetup` mapped over existing state without clearing pre-seeded demo records.
- **Trigger:** Clicking "Skip to Dashboard" or finishing Step 1 setup on a workstation that had previous demo seed files on disk.
- **Impact:** The user's dashboard was unexpectedly populated with 5 dummy invoices totaling ₹1,67,619 and 5 demo clients rather than a 100% clean commercial ledger.
- **Suggested Fix:**
  1. Pass `{ cleanLedger: true, isSkip: true }` from `SetupScreen.tsx` on skip and fresh setup.
  2. In `completeSetup()`, enforce a clean empty ledger (`invoices: []`, `clients: []`) when `cleanLedger` is requested and mark a ref (`hasJustCompletedSetupRef.current = true`) to prevent subsequent async hydration from disk.
  3. Filter out all demo invoices and demo business records from `database.json` and localStorage hydration.
  4. Ensure `database.json` on disk is purged of demo data.
- **Status:** Resolved
