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

### Lesson 5.9: In-App Desktop Update Asset Prioritization (.asar vs Setup Installer Exe)
- **Defect:** Updating from an installed Electron desktop app downloaded and launched `Invoice-Gen-Setup-1.5.0.exe` instead of `Invoice-Gen-Update-1.5.0.asar`, displaying the setup installer wizard.
- **Root Cause:** Legacy `getRecommendedAsset` prioritized `.exe` installers when platform was `"windows"`, and `detectPlatform()` relied solely on `navigator.userAgent` which could misclassify desktop environments or fall back to `.exe` when both were present.
- **Permanent Solution:**
  1. Updated `detectPlatform()` to check the native desktop bridge (`window.invoiceDesktop.platform`) first.
  2. Enforced strict `.asar` bundle resolution in `getRecommendedAsset()`, `UpdateModal.tsx`, and `settings-updates-tab.tsx` whenever `isDesktopEnvironment()` is true.
  3. Guaranteed that clicking "Update Now" on Windows and macOS workstations always pulls `Invoice-Gen-Update-*.asar` for seamless in-place hot reloads without installer wizards.

---

## 6. Cross-Platform OTA Updating

### Lesson 6.1: Desktop File Locks & Process Contention ("App is already running in background")
- **Defect:** On Windows and macOS, when initiating an in-app update or running the installer, setup failed with *"the app is already running in background, setup won't work"*, or file replacement failed due to file locks on `app.asar`.
- **Root Cause:**
  1. Missing single-instance enforcement in Electron: multiple background instances could run simultaneously.
  2. Spawning NSIS setup or running `.asar` replacement while parent Electron process and its child processes (renderer, GPU, utility) were still actively holding file handles.
  3. NSIS setup lacked custom termination hooks to kill running instances prior to file extraction.
- **Permanent Solution:**
  1. In `electron/main.cjs`, enforced `app.requestSingleInstanceLock()` and `second-instance` focus restoration.
  2. Created `build/installer.nsh` with `!macro customInit` and `!macro customUnInit` running `cmd.exe /c taskkill /f /t /im "Invoice Gen.exe"` before installer initialization.
  3. Replaced direct installer spawning in `electron/main.cjs` with detached helper scripts (`.cmd` on Windows, `.sh` on macOS) that forcefully terminate the parent process tree (`taskkill /f /pid %PARENT_PID%` and `taskkill /f /im "%EXE_NAME%"`) before copying `.asar` files or executing setup with `/S`.

### Lesson 6.2: Android In-App OTA Updates (Zero Browser, Zero File Hunting)
- **Defect:** On Android, tapping "Update Now" kicked the user out of the application into an external browser or Android DownloadManager, leaving the user to manually search their notifications or downloads folder to tap the APK.
- **Root Cause:**
  1. Missing `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />` in `AndroidManifest.xml`.
  2. Update service fell back to `window.open(url, "_system")` instead of downloading inside the app.
  3. Lack of a native streaming engine with real-time progress callbacks and `PackageInstaller` launch bridge.
- **Permanent Solution:**
  1. Added `REQUEST_INSTALL_PACKAGES` permission to `android/app/src/main/AndroidManifest.xml`.
  2. Implemented `downloadAndInstallUpdate()` in `MainActivity.java` with background thread streaming, multi-hop redirect traversal (for GitHub CDN redirects), and real-time JS progress dispatch (`window.__onAndroidUpdateProgress`).
  3. Saved the update APK into `context.getCacheDir()` (mapped in `file_paths.xml`) and launched `Intent.ACTION_VIEW` with `FileProvider.getUriForFile()` and `FLAG_GRANT_READ_URI_PERMISSION`.
  4. Added `onResume()` permission detection in `MainActivity.java` so if the user grants "Install unknown apps", the installer prompt appears immediately upon returning to the app.
  5. Connected `downloadUpdate()` and `installUpdate()` in `updateService.ts` to `window.invoiceAndroid`, providing the exact same progress bar and seamless in-app experience on Android as on desktop.

### Lesson 6.3: Electron ASAR Virtual-FS Interception (`"Invalid package ...asar"`) During In-App OTA Updates
- **Defect:** Downloading `Invoice-Gen-Update-*.asar` from within the Electron desktop app threw `Invalid package C:\Users\<user>\AppData\Local\Temp\Invoice-Gen-Update-*.asar` immediately when creating the write stream.
- **Root Cause:** Electron monkey-patches Node's `fs` module so that paths ending in `.asar` are interpreted as read-only virtual ASAR archives (`fs.createWriteStream`, `fs.existsSync`, `fs.unlinkSync`). Writing a fresh `.asar` update file via patched `fs` fails before any bytes are written. In addition, prior releases still running unpatched `electron/main.cjs` pick `.asar` first if attached to a GitHub Release, hitting the same error unless the upgrade release omits `.asar` and delivers silent `.exe` / `.dmg` / `.apk` installers.
- **Permanent Solution:**
  1. In `electron/main.cjs`, imported `original-fs` (`const originalFs = require('original-fs')`), staged update downloads to `${destPath}.part` via `originalFs.createWriteStream`, verified the Chromium Pickle ASAR header (`validateAsarPackage`), and replaced `fs.existsSync`/`unlinkSync` in update handlers with `originalFs`.
  2. Added `getFallbackInstallerAsset()` and `runInAppUpdate()` in `src/services/updateService.ts` (shared across `UpdateModal.tsx` and `settings-updates-tab.tsx`) so install errors are surfaced and failed `.asar` updates automatically fall back to the native platform installer.
  3. Shipped `v1.5.1.2` as a silent-installer transition release (no `.asar` attached on `v1.5.1.2`) so `v1.5.1.1` installs upgrade seamlessly via `Invoice-Gen-Setup-1.5.1.2.exe /S` (and `.dmg`/`.apk`), unlocking `.asar` hot-updates for `v1.5.1.3+`.

---

## 7. Product Catalog & Editor Ergonomics

### Lesson 7.1: Placeholder Replacement vs. Append When Loading Catalog Products
- **Context:** Newly created invoices initialize with a single blank `₹0` placeholder row (`"Goods Supply"` / `"Consulting & Professional Services"` / `"Retail Item"`). Appending a selected catalog product unconditionally would leave an unused `₹0` dummy row at line 1, while checking only `rate === 0` would wrongly overwrite a real zero-rated catalog item on the second selection.
- **Permanent Solution:**
  - Tagged catalog-loaded `LineItem` entries with optional `productId`.
  - `isDefaultPlaceholderItem()` in `src/utils/productCatalog.ts` matches only `!item.productId && Number(item.rate) === 0` with default placeholder descriptions, replacing row 1 cleanly on first selection and appending cleanly on all subsequent selections.

### Lesson 7.2: Backup Restoration With Empty Invoice Ledgers
- **Defect:** `importOfflineBackup()` rejected valid JSON backups whenever `cleanInvoices.length === 0`, preventing restoration of backups containing only saved `products` or `clients`.
- **Permanent Solution:**
  - Allowed restoration when a backup has valid `invoices`, `products`, or `clients`.
