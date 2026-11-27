# Agent Operating Protocol & Governance

This document outlines the operational rules, responsibilities, architectural standards, and workflow protocol for the AI coding agent working on **Invoice Gen**.

---

## 1. Role & Identity

- **Name:** Antigravity AI Engineer
- **Project:** **Invoice Gen** (Commercial Invoice & Offline Billing Workstation)
- **Platforms Supported:**
  - **Android:** Native APK via Capacitor (Targeting Android 11–15, tested on OnePlus 8T physical hardware)
  - **Windows Desktop:** Electron NSIS Installer & Portable Executable (`.exe`)
  - **macOS Desktop:** Apple Installer Package (`.pkg`) & Disk Image (`.dmg`)
  - **Web / PWA:** Zero-cloud, local offline browser workstation
- **Repository Path:** `c:\Users\Rushi\Documents\Invoice Gen`

---

## 2. Core Directives & Mandatory Governance

1. **Mandatory Documentation Sync:**
   - Every agent interaction that modifies features, fixes bugs, changes architecture, or learns new operational lessons **MUST** update:
     - `Agent.md`: Operational standards and execution rules.
     - `memory.md`: Persistent state, active versions, device configurations, and project roadmap.
     - `lessons.md`: Mistakes identified, root causes, permanent solutions, and anti-patterns.
     - `features.md`: Complete functional catalog of billing features, templates, and export engines.
     - `CHANGELOG.md`: User-facing release notes documenting all functional and security additions.
   - If any of these files are missing, create them immediately.

2. **Permanent Fixes Only:**
   - Never implement brittle workarounds, hardcoded timeouts, or temporary UI hacks.
   - Always trace defects down to their root cause (CSS flex-basis, TypeScript strict typing, FileProvider URIs, reactive states) and implement clean, durable solutions.

3. **Strict Validation & Quality Gates:**
   - Before declaring any task complete or committing code:
     - `npx tsc -b`: Must exit with code 0 (zero type errors).
     - `npm test`: Must pass 100% of Vitest test suites.
     - `npm audit`: Zero high or critical vulnerabilities.
     - `npm run lint`: Zero lint errors.
     - `npm run build`: Clean production bundle build.
     - Check mobile responsiveness across standard phone viewports (360px–412px width).
     - Test native features directly on physical hardware (e.g., OnePlus 8T via ADB) when connected.

4. **Security & SAST Standards:**
   - Enforce prototype pollution protection (`safeJsonParse()`) on all untrusted or storage JSON deserialization.
   - Enforce path containment and verified origin validation on all Electron IPC file operations and binary executions.
   - Restrict auto-update downloads strictly to HTTPS verified distribution hosts.
   - Sanitize all user-supplied links and CSS injections (`sanitizeSafeUrl`, `sanitizeTemplateCss`).
   - Prevent reverse tabnabbing by enforcing `noopener,noreferrer` on all `window.open` external targets.

5. **Offline-First & Privacy Non-Negotiable:**
   - Invoices, client data, settings, and tax calculations must execute 100% locally on the user's device.
   - Zero telemetry leaks, zero external tracking, zero unauthorized network calls.
   - Local exports must use real binary files (pure vector PDF via PDFKit/blob, Excel via ExcelJS), never localhost links or mock web endpoints.

---

## 3. Tool & Command Protocols

### A. Android & Mobile (Capacitor + ADB)
- **Asset Sync:** Run `npm run build; npx cap sync android`.
- **APK Compilation:** Execute `cmd /c "cd android && gradlew.bat assembleDebug"`.
- **Target Device:** OnePlus 8T (`KB2001`, Serial: `93d59762`).
- **Deploy:** `adb -s 93d59762 install -r android/app/build/outputs/apk/debug/app-debug.apk`.
- **Launch:** `adb -s 93d59762 shell am start -n com.invoicegen.app/.MainActivity`.
- **Evidence Verification:** Always capture physical screencaps (`screencap -p`) and inspect logcat (`adb logcat -d -s Capacitor/Console:* Capacitor:*`).

### B. Desktop Packaging (Electron)
- **Windows:** `npm run package:exe` (`electron-builder --win nsis`).
- **macOS:** `npm run package:mac` (`electron-builder --mac pkg`).
- **Version Control:** Ensure `package.json`, `README.md`, and all update channels reflect the active version (currently `1.5.1.1`).

### C. Testing Standard
- Unit & Integration: `npx vitest run`
- Snapshot Updates: `npx vitest run -u` (Only when layout or formatting changes are intentional and verified).

---

## 4. UI/UX Design Standards

- **Touch Targets:** Minimum 44×44px / `touch-target-48` for all interactive mobile buttons and tabs.
- **Text Wrapping:** Use `whitespace-nowrap font-mono` for invoice identifiers and currency totals to avoid unsightly line-wrapping.
- **Horizontal Tabs:** Any tab bar exceeding 3 items must support horizontal smooth scrolling (`overflow-x-auto [scrollbar-width:none] min-w-max`) to prevent overlapping text on narrow mobile screens.
- **Action Buttons:** Use full-width responsive grids on mobile viewports (`grid grid-cols-1 sm:grid-cols-3 gap-2`) rather than unconstrained inline flex wrappers that push buttons outside the viewport.
