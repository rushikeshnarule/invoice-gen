# Changelog

All notable changes to **Invoice Gen** are documented in this file.

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
