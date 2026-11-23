# Changelog

All notable changes to **Invoice Gen** are documented in this file.

---

## [1.4.2.1] - 2026-11-23

### 🔢 Invoice Numbering Sequence
* **Strict Sequential Starting Sequence (`INV-001`)**: Sequential generator now starts strictly with `INV-001` (followed by `INV-002`, `INV-003`, etc.) across all new installations, setups, and sample datasets, adhering to statutory commercial standards.

### ⚡ Seamless In-App Hot Updates (Zero Setup Wizard)
* **Direct `.asar` Binary Hot-Swap**: Solved the issue where clicking "Update" re-downloaded the setup wizard and forced users to run installation setup again.
* **Automatic In-Place Reload**: Both Windows and macOS updates now download the packaged bundle and seamlessly hot-swap the internal core runtime in the background, relaunching the app directly into the updated version without displaying setup wizards or touching persistent Documents data.
* **Fallback Silent Mode**: Added `/S` silent switch to Windows `.exe` installers and background `/bin/bash` / `open` wrappers on macOS to ensure automated silent transitions.

### 🛡️ Static Application Security Testing (SAST) & Supply-Chain Hardening
* **Supply-Chain Remediation (CWE-1321 & CWE-400)**: Pruned legacy SheetJS `xlsx` and `xlsx-js-style` packages containing unpatched prototype pollution and ReDoS vulnerabilities. Fully transitioned test harnesses to modern `ExcelJS 4.4.0`. Achieved **0 high / critical vulnerabilities** in `npm audit`.
* **Insecure IPC Execution Guard (CWE-78 & CWE-426)**: Added in-memory updater verification tokens (`validDownloadedUpdates`) and strict temporary directory containment checks (`app.getPath('temp')`) in `desktop:install-update` to prevent arbitrary binary execution via IPC.
* **SSRF Prevention (CWE-918)**: Implemented `isTrustedDownloadUrl()` enforcing HTTPS and strict domain allowlists across all updater downloads and HTTP redirect chains.
* **Prototype Pollution Immunity (CWE-1321)**: Replaced raw `JSON.parse` with `safeJsonParse()` revivers across all system storage endpoints (`/api/system-storage`), stripping `__proto__`, `constructor`, and `prototype` keys during deserialization.
* **CSS & URI Injection Protection (CWE-79 & CWE-20)**: Enhanced `sanitizeTemplateCss` to strip `@import` external stylesheet leakage and `url(javascript:...)` execution. Added `sanitizeSafeUrl()` to validate all user-supplied links.
* **Reverse Tabnabbing Prevention**: Enforced `noopener,noreferrer` on all `window.open(..., '_blank')` calls across Invoice Editor, Theme Picker, Clients View, and Invoices View.

### 📱 Mobile UI Refinements & Android Physical Device Verification
* **Physical Hardware Validation**: Tested extensively on a physical OnePlus 8T (`KB2001`, Android 14) connected via USB tethering/debugging.
* **Fixed Tab Collision in Invoice Editor**: Resolved crushed tab headers (`Items (1)Buyer & DatesLogo & Stamp...`) by adding horizontal smooth scrolling (`overflow-x-auto [scrollbar-width:none] min-w-max`) to `SegmentedControl`.
* **Fixed Invoice Number & Badge Collisions**: Added `whitespace-nowrap font-mono` to invoice numbers and converted the mobile snapshot card to a responsive layout, preventing line-wrapping and badge overlap.
* **Android Native File Sharing**: Mapped `Directory.Cache` in `file_paths.xml` as `<cache-path name="my_cache_images" path="." />`. Shares real binary `.pdf` and `.xlsx` files via native `Intent.ACTION_CHOOSER`, completely eliminating broken `http://localhost/...` links.
* **Root Crash Isolation**: Wrapped application roots in an `ErrorBoundary` component with offline state preservation and safe session restart options.

### 🧪 Test Coverage & Quality
* Expanded automated Vitest suite to **194 passed tests across 17 test files (100% pass rate)**.
* Verified 0 TypeScript compilation errors (`npx tsc -b`) and 0 linter errors (`oxlint`).

---

## [1.4.2] - 2026-11-15

### 🚀 Resilient Auto-Update Architecture & Dynamic Version Resolution
* **Eliminated Hardcoded Version Numbers**: Dynamic runtime resolution via Electron native IPC (`window.invoiceDesktop.appVersion`) with Vite build-time `__APP_VERSION__` injection.
* **Native Desktop IPC Update Bridge**: Routed GitHub API update checks through Node.js secure `https` module (`desktop:check-updates`), resolving `TypeError: Failed to fetch` caused by Chromium CSP/CORS limitations.
* **Content Security Policy Expansion**: Explicitly whitelisted GitHub API and artifact hosting domains in both `index.html` and the loopback Express server.
* **Dynamic Direct Downloads**: Settings Software Updates tab dynamically reflects release assets without static version fallbacks.
* **Instant Mount Sync**: Automatically queries update health upon opening the Updates tab.

---

## [1.4.1] - 2026-11-15

### 🚀 In-App Seamless Auto-Updater Engine
* **Native In-App Downloader**: Download update packages directly within the desktop interface.
* **Real-time Download Telemetry**: Live progress bar showing percentage, transferred megabytes, and transfer speeds (MB/s).
* **Automatic Installation**: Automatically launches the installer and restarts upon download completion.
* **Settings & Command Palette Access**: Dedicated Updates tab in Settings and instant keyboard shortcut (`Ctrl+K` -> `U`).

---

## [1.4.0] - 2026-11-15

### 🚀 Major Additions: Cross-Platform Native Installers & Mobile Overhaul

#### 🍏 macOS Native PKG Wizard Installer
* **One-Click Native Setup Wizard**: Replaced messy manual drag-and-drop `.dmg` disk image mounting with a standard Apple `.pkg` installer package.
* **Apple Silicon M-Series Native**: Built with dedicated `arm64` architecture target for MacBook Air / Pro M1, M2, M3, and M4, plus universal `x64` Intel fallback.
* **Direct `/Applications` Destination**: Automatically installs `Invoice Gen.app` straight into `/Applications/` without requiring users to copy or drag icons.
* **Automated Cloud CI/CD**: Added `.github/workflows/build-mac.yml` running on genuine `macos-latest` runners to generate authentic Apple package archives with icon bundling and code-signing readiness.

---

#### 📱 Native Android APK Application
* **Capacitor 7 Integration**: Native Android mobile wrapper preserving 100% of all React features, business logic, calculations, and PDF generation.
* **Offline-First Data Storage**: All invoices, clients, and company preferences persist directly on mobile storage (`localStorage` / IndexedDB).
* **Multi-Density Adaptive Icons**: Generated sharp launcher icons across all screen densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
* **Automated Cloud APK Compiler**: Added `.github/workflows/build-android.yml` powered by Java 21, Gradle 8.14, and Android SDK tooling to output installable debug and release `.apk` binaries.

---

#### 📱 Mobile Responsiveness & Touch Ergonomics Overhaul
* **Native Mobile Bottom Navigation**:
  * On mobile viewports (`<md`), the desktop 260px floating sidebar is seamlessly replaced by a sleek, thumb-friendly bottom navigation bar.
  * Real-time badges for active invoices and template counts.
  * Native touch active indicators with haptic-feel transitions.
* **Adaptive Invoice Editor (Mobile vs Desktop)**:
  * Replaced the hardcoded desktop two-column split (`520px` form + preview) with an intelligent mobile segmented toggle:
    * `✍️ Edit Invoice`: Full-screen touch-optimized form with enlarged touch targets.
    * `👁️ Live Preview`: Auto-scaled, edge-to-edge invoice document preview.
  * Retained full side-by-side workstation ergonomics on desktop screens (`lg:`).
* **Responsive Invoice Ledger & Rows**:
  * Transformed desktop invoice rows into adaptive mobile cards.
  * Clean layout separating client name, invoice number, status chips, amount due, and quick-action toolbars.
* **Touch & Safe-Area Optimization**:
  * Updated `index.html` viewport with `viewport-fit=cover` and `user-scalable=no`.
  * Added CSS safe-area insets (`safe-area-bottom`, `safe-area-top`) for notched mobile displays.
  * Added `no-scrollbar` smooth horizontal scrolling for toolbars and buttons.
  * Prevented iOS/Android WebView auto-zoom by enforcing standardized input font sizes.

---

## [1.3.3] - 2026-11-12
* Added US Sales Tax and State-specific Tax presets.
* Introduced US Edition portable and installer bundles.
* High-density invoice preview zooming and layout enhancements.

---

## [1.3.0] - 2026-11-05
* Added live template customization and offline template syncing.
* Fixed print and PDF export separation.
* Implemented persistent system storage surviving reinstalls.
