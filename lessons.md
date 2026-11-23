# Engineering Lessons Learned & Anti-Patterns — Invoice Gen

This document records technical defects, debugging insights, architectural lessons, and permanent solutions discovered during development, cross-platform builds, and real hardware testing.

---

## 1. Mobile & Android (Capacitor)

### Lesson 1.1: The Localhost URL Share Trap vs. Native FileProvider
- **Defect:** Tapping "Share" on Android opened WhatsApp or share sheet with a useless `http://localhost/...` link or raw text instead of attaching the actual PDF invoice.
- **Root Cause:** In Capacitor Android, the web application runs inside a local WebView served from `http://localhost`. While Web Share API on desktop browsers can share web URLs, sharing `localhost` to third-party recipients (e.g., WhatsApp, Gmail, Drive) results in broken, unopenable links.
- **Permanent Solution:**
  1. Generate authentic binary documents (PDF via `pdfGeneratorService.ts`, Excel via `exportToExcel.ts`).
  2. Write binary base64 directly to `Directory.Cache` (and persist to `Directory.Documents`).
  3. Map `Directory.Cache` in `android/app/src/main/res/xml/file_paths.xml` as `<cache-path name="my_cache_images" path="." />`.
  4. Obtain the content URI via `Filesystem.getUri()`.
  5. Pass `files: [cacheUriResult.uri]` to `@capacitor/share` without any `url` parameter.
  6. Android's native `Intent.ACTION_CHOOSER` launches attaching the real binary `.pdf` / `.xlsx` file with the official file icon.

### Lesson 1.2: Hardware Back Button Handling on Android
- **Defect:** Pressing the Android hardware back button closed or minimized the entire app when a modal (Share Modal, Client Modal, Settings Modal) was open.
- **Root Cause:** Android OS default activity back event terminates the current activity if unhandled by web history.
- **Permanent Solution:**
  - Implemented `useNativeBackButton` hook utilizing `@capacitor/app` `backButton` listener with priority queues. Modals register with high priority (200+), intercept the back event, close the modal, and prevent app exit.

---

## 2. Responsive UI & Layout Engineering

### Lesson 2.1: Horizontal Tab Collisions in Segmented Controls
- **Defect:** In the Invoice Editor on OnePlus 8T (1080×2400), the form tabs collided into a single unreadable mashed string: `Items (1)Buyer & DatesLogo & StampPay & TermsStyle & Theme`.
- **Root Cause:** The `SegmentedControl` component had `w-full` with 5 fixed child elements inside an `inline-flex` without horizontal overflow scrolling. In viewports below 480px, the 5 tabs exceeded available screen width and collapsed into each other.
- **Permanent Solution:**
  - Wrapped `SegmentedControl` in `overflow-x-auto [scrollbar-width:none]`.
  - Added `flex min-w-max w-full` to the control and `shrink-0 px-2.5 whitespace-nowrap` to each tab item.
  - Tabs now retain proper spacing and scroll smoothly on all mobile screens.

### Lesson 2.2: Line-Wrapping and Badge Crushing on Narrow Viewports
- **Defect:** Invoice number in Share Modal wrapped into three separate lines (`INV-`, `2026-`, `101`) while `🟡 Due: ₹1,000.00` badge crashed horizontally against the Grand Total.
- **Root Cause:** Unconstrained flex container with `min-w-0` on left and fixed text on right without `whitespace-nowrap`.
- **Permanent Solution:**
  - Added `whitespace-nowrap font-mono` to the invoice number.
  - Converted the snapshot card from a rigid single-row flex into a responsive `flex flex-col sm:flex-row`.
  - Shifted Grand Total to a dedicated row on mobile devices to prevent horizontal collision.

### Lesson 2.3: Overzealous Text Truncation in Mobile Action Buttons
- **Defect:** System Share Sheet button subtitle clipped to `"Share PDF file directly through Andr..."`.
- **Root Cause:** Applying CSS `truncate` (which enforces `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) to descriptive button subtitles.
- **Permanent Solution:**
  - Replaced `truncate` with `leading-tight mt-0.5` allowing natural multi-line text wrapping.

### Lesson 2.4: Empty State Interpolation Prepositions
- **Defect:** Share Modal subtitle displayed `"Send or copy invoice INV-2026-101 for"` when client name was empty.
- **Root Cause:** Naive string template `` `... for ${invoice.client.name}` `` without checking for undefined or empty string.
- **Permanent Solution:**
  - Added guard: `invoice.client?.name?.trim() ? `Send or copy invoice ${num} for ${name}` : `Send or copy invoice ${num}``.

---

## 3. Financial Calculation & State Integrity

### Lesson 3.1: Statutory Clamp on Invoice Balances
- **Defect:** An invoice with a total of ₹47,643 and payments of ₹47,643 + ₹5,000 computed a balance due of `-5000` instead of `+0`.
- **Root Cause:** Removal of `Math.max(0, ...)` clamp in `buildRenderData.ts` broke statutory accounting tests.
- **Permanent Solution:**
  - Invoices must always clamp balance due: `balanceDue = Math.max(0, round2(grandTotalRounded - amountPaid))`.
  - If status is `'paid'`, `balanceDue` is strictly `0`.

---

## 5. Security & Static Application Security Testing (SAST)

### Lesson 5.1: Legacy `xlsx` Supply Chain Vulnerabilities (CWE-1321 / CWE-400)
- **Defect:** `npm audit` flagged two high-severity CVEs (`GHSA-4r6h-8v6p-xvw6` and `GHSA-5pgg-2g8v-p4x9`) inside legacy SheetJS `xlsx` and `xlsx-js-style`.
- **Root Cause:** Legacy `xlsx` contains unpatched prototype pollution and regular expression denial of service (ReDoS). Although the application had previously migrated its production exporter to modern `exceljs`, the legacy package remained in `package.json` for an integration test.
- **Permanent Solution:**
  1. Migrated `src/test/monthly-consolidation-and-excel-export.test.tsx` to read base64 buffers directly via `ExcelJS.Workbook.xlsx.load(buffer)`.
  2. Pruned `xlsx` and `xlsx-js-style` completely from `package.json` and `package-lock.json`.
  3. All high-severity dependency vulnerabilities resolved to 0.

### Lesson 5.2: Insecure IPC Binary Execution in Desktop Auto-Updater (CWE-78 / CWE-426)
- **Defect:** `desktop:install-update` IPC handler accepted an arbitrary `filePath` argument and spawned it via `cmd.exe /c` or direct child process without path containment or origin validation.
- **Root Cause:** If renderer code or an embedded asset was compromised, arbitrary binaries could be passed over IPC and executed with host user privileges.
- **Permanent Solution:**
  1. Maintained an in-memory `validDownloadedUpdates = new Set()` in `electron/main.cjs`.
  2. Enforced strict path containment: `path.resolve(filePath).startsWith(path.resolve(app.getPath('temp')))`.
  3. Verified that `filePath` was downloaded and validated in the current session by `desktop:download-update`.
  4. Whitelisted permitted file extensions: strictly `.asar`, `.exe`, `.pkg`, `.dmg`.

### Lesson 5.3: SSRF & Host Validation in Updater Downloads (CWE-918)
- **Defect:** `desktop:download-update` accepted arbitrary download URLs without verifying protocol or domain.
- **Root Cause:** Missing host and protocol whitelist allowed potential internal network scanning (SSRF).
- **Permanent Solution:**
  1. Implemented `isTrustedDownloadUrl(url)` requiring strict `https:` and whitelisting official release hosts: `github.com`, `api.github.com`, `*.githubusercontent.com`, and official AWS release asset buckets.
  2. Enforced URL validation across HTTP redirects in `downloadFileWithRedirects`.

### Lesson 5.4: Prototype Pollution in System Storage Deserialization (CWE-1321)
- **Defect:** `JSON.parse(body)` in `/api/system-storage` and `/api/system-storage/license` merged incoming objects with existing storage without filtering prototype keys.
- **Root Cause:** Object spread `{ ...existing, ...parsed }` can pollute object prototypes if malicious keys (`__proto__`, `constructor`, `prototype`) are supplied.
- **Permanent Solution:**
  - Implemented `safeJsonParse()` with a recursive reviver function that discards `__proto__`, `constructor`, and `prototype` keys during JSON deserialization.

### Lesson 5.5: CSS Injection & Remote Stylesheet Leakage
- **Defect:** `sanitizeTemplateCss` only stripped `</style>` and `<script>`, but did not sanitize `@import` rules or `javascript:` pseudo-protocols inside `url()`.
- **Root Cause:** Malicious remote CSS templates could trigger external network requests via `@import` or attempt script execution in older browser engines.
- **Permanent Solution:**
  1. Updated `sanitizeTemplateCss` to strip `@import` rules and neutralize `url(javascript:...)` / `expression()`.
  2. Added `sanitizeSafeUrl()` to enforce safe protocols (`http:`, `https:`, `mailto:`, `tel:`) on all user-supplied links.

### Lesson 5.6: Reverse Tabnabbing via `window.open` (Window Opener Leaks)
- **Defect:** `window.open(url, '_blank')` in print and preview actions did not specify `'noopener,noreferrer'`.
- **Root Cause:** The opened window maintains a reference to `window.opener`, allowing the target page to navigate the origin tab or access properties.
- **Permanent Solution:**
  - Updated all `window.open(..., '_blank', 'noopener,noreferrer')` calls across `InvoiceEditor`, `ThemePicker`, `ClientsView`, and `InvoicesView`.

### Lesson 5.7: Asynchronous State Deferral in Vitest/JSDOM Test Harnesses
- **Defect:** Consolidated Monthly Modal test timed out or asserted `expect(createdResult).not.toBeNull()` failure when generating an invoice.
- **Root Cause:** Wrapping synchronous state initializers in `requestAnimationFrame` inside React modals causes the state update to be deferred until after immediate DOM simulated click events in virtual JSDOM environments, leaving client selection empty.
- **Permanent Solution:**
  - Retain direct, synchronous state initialization for default selections (`selectedClientName`, `selectedInvoiceIds`) while reserving animation frames strictly for visual animations and DOM scroll measurements.

### Lesson 5.8: Cross-Platform Version Synchronization & SemVer Precedence
- **Defect:** Upgrading from legacy 4-digit version strings (e.g., `1.4.2.1`) requires higher SemVer versioning (`1.5.0`) so desktop in-app hot-updaters and Android package managers trigger without rejection.
- **Root Cause:** Android package managers enforce strictly incrementing integer `versionCode` (e.g., `versionCode 3`), while GitHub Releases and desktop SemVer comparators evaluate `1.5.0 > 1.4.2.1`.
- **Permanent Solution:**
  - Increment Android `versionCode` atomically with each release.
  - Standardize major/minor/patch SemVer progression across `package.json`, `android/app/build.gradle`, `updateService.ts`, and release manifests.
