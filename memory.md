# Persistent Memory Bank — Invoice Gen

This document stores persistent project knowledge, current architecture, environment details, active configurations, and ongoing commitments across all sessions.

---

## 1. Project Identification & Versioning

- **Application Name:** Invoice Gen
- **Current Version:** `1.4.2.1`
- **Application ID:** `com.invoicegen.desktop` (Electron) / `com.invoicegen.app` (Android Capacitor)
- **License Model:** Commercial Standalone / Fully Offline Workstation
- **Default Invoice Numbering:** Starts at `INV-001` (e.g., `INV-001`, `INV-002`, `INV-003`).

---

## 2. Active Devices & Testing Environments

### Primary Android Test Hardware
- **Model:** OnePlus 8T (`KB2001`, Product: `OnePlus8T_IND`)
- **ADB Serial:** `93d59762`
- **Resolution:** `1080 × 2400` physical pixels (480 dpi, 20:9 ratio)
- **Android Version:** Android 14 / OxygenOS
- **Connection Mode:** USB Debugging + USB Tethering active

### Desktop Environments
- **Windows Host:** Windows 11 (PowerShell environment)
- **Build Targets:**
  - Windows: NSIS Setup (`.exe`) + Portable Executable
  - macOS: Apple Installer Package (`.pkg`) + Disk Image (`.dmg`)

---

## 3. Technology Stack & Key Subsystems

| Subsystem | Technology | Purpose / Architectural Notes |
|---|---|---|
| **UI Framework** | React 19 + TypeScript | Strict typing (`tsc -b`), zero unused locals. |
| **Styling** | Tailwind CSS + BoardUI Primitives | Fully responsive across mobile (360px–480px), laptop (1366×768), and desktop (1920×1080+). |
| **Mobile Runtime** | Capacitor 8 | Native bridge for Filesystem, FileProvider, Share, Status Bar, and Haptics. |
| **Desktop Runtime** | Electron 33+ | Desktop window management, native file dialogues, IPC storage, auto-updates. |
| **PDF Engine** | `pdfGeneratorService.ts` | 100% deterministic pure vector PDF generation. Zero DOM/canvas dependency. Multi-page support. |
| **Excel Engine** | `exportToExcel.ts` via ExcelJS | Publication-grade OpenXML spreadsheets with A4 portrait Fit-to-Page settings. |
| **Data Layer** | LocalStorage + `systemStorage.ts` | Complete offline resilience with zero external cloud requirements. |
| **Test Engine** | Vitest + jsdom + testing-library | 17 test suites, 194 unit and integration tests (100% pass). |
| **Security / SAST** | OWASP Top 10 + CWE Compliance | Safe JSON deserialization, IPC updater verification, zero high CVEs. |

---

## 4. Key Architectural Decisions

1. **Android File Sharing (FileProvider Architecture):**
   - Capacitor's `Directory.Cache` is mapped directly in `android/app/src/main/res/xml/file_paths.xml` as `<cache-path name="my_cache_images" path="." />`.
   - Files are written to Cache first, resolved via `Filesystem.getUri()`, and passed to `Share.share({ files: [uri] })`.
   - Never pass `url: "http://localhost..."` or web share URLs when running inside native mobile environments.

2. **Invoice Numbering Engine:**
   - Sequential generator configured to default starting sequence `INV-001`.
   - Supports custom prefix patterns while honoring sequential progression.

3. **Responsive Two-Pane vs. Single-Pane Editing:**
   - **Laptops & Desktops (≥ 1024px):** Dual-pane layout (Form on left, live responsive A4 preview on right).
   - **Smartphones (< 1024px):** Single-pane layout with persistent segmented toggle between `✍️ Edit Invoice` and `👁️ Live Preview`.

---

## 5. Directory Structure Reference

```
Invoice Gen/
├── Agent.md                         # Operational rules for AI agents
├── memory.md                        # Persistent state & architecture memory (This file)
├── lessons.md                       # Historical defects, root causes & solutions
├── features.md                      # Catalog of features and functional specs
├── CHANGELOG.md                     # Release notes and version changelog
├── android/                         # Capacitor native Android Gradle project
│   └── app/build/outputs/apk/debug/ # Generated debug APKs
├── electron/                        # Electron main process & IPC handlers
├── src/
│   ├── components/                  # BoardUI primitives & business modals
│   │   ├── InvoiceEditor/           # Invoice editor with line items, tax & themes
│   │   ├── ShareInvoiceModal/       # PDF/Excel/WhatsApp share sheet modal
│   │   ├── application/settings/    # Multi-tab business settings modal
│   │   └── ErrorBoundary/           # Root crash isolation error boundary
│   ├── routes/                      # Views: InvoicesView, ClientsView, PrintInvoice
│   ├── services/                    # fileExportService, pdfGeneratorService, nativeMobileService
│   ├── themes/                      # 18 commercial invoice rendering templates
│   ├── utils/                       # Calculations, tax rules, Excel exports
│   └── test/                        # 17 Vitest test suites (194 tests)
└── dist/                            # Production web bundle
```
