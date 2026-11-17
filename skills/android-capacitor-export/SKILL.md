---
name: android-capacitor-export
description: Production guide and patterns for Android Capacitor file export, PDF generation, native file sharing via FileProvider, and preventing broken localhost links.
---

# Android Capacitor File Export, Sharing & Adaptive UI Guide

This skill documents the production-grade architecture for handling file downloads (Excel, PDF, JSON), direct vector PDF generation, native Android file sharing, and adaptive layout across all devices (Mobile, Laptops, Mac, Windows desktop apps).

---

## 1. Android Scoped Storage & FileProvider Sharing

### The Android 11+ Scoped Storage Trap
* **The Problem:** Writing directly to `Directory.Documents` (`Environment.getExternalStoragePublicDirectory(...)`) on Android 10+ (API 29+) throws `SecurityException` or `Permission denied` without `MANAGE_EXTERNAL_STORAGE`.
* **The FileProvider Rule:** When sharing a file via `@capacitor/share` (`Intent.ACTION_SEND` with `content://` URI), the file **MUST** reside in a directory declared in `file_paths.xml` that does not require runtime storage permissions.

### The Bulletproof Dual-Write Solution:
```ts
// 1. Write to Directory.Cache first:
// context.cacheDir requires ZERO runtime permissions on Android (API 21-35)
// and maps directly to <cache-path name="my_cache_images" path="." /> in FileProvider.
await Filesystem.writeFile({
  path: fileName,
  data: base64Data,
  directory: Directory.Cache,
  recursive: true,
});

// Retrieve native URI from Cache
const cacheUriResult = await Filesystem.getUri({
  path: fileName,
  directory: Directory.Cache,
});

// 2. Also persist to internal app Data directory so it's permanently kept on-device
try {
  await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data,
    recursive: true,
  });
} catch (e) {}

// 3. Share immediately via native Android Intent
if (shareImmediately) {
  await Share.share({
    title: fileName,
    files: [cacheUriResult.uri],
    dialogTitle,
  });
}
```

---

## 2. WhatsApp & Messenger Sharing on Native Mobile

* **The Problem:** In Android WebView, calling `window.open("https://wa.me/...?text=...", "_blank")` does not attach documents, often fails to launch the native WhatsApp app, and leaks internal `localhost` links.
* **The Solution:** On native mobile (`Capacitor.isNativePlatform()`), sharing to WhatsApp **must** generate the authentic PDF document and invoke native system share (`@capacitor/share`).
* In the Android Share Sheet, WhatsApp appears prominently at the top. When selected, WhatsApp automatically sends the real `.pdf` (or `.xlsx`) document directly to the chosen contact or group.

---

## 3. Eliminating Localhost Leaks

* Never display `http://localhost/...` links in UI inputs, WhatsApp messages, or clipboard copies.
* In Capacitor / Electron, `window.location.origin` is `http://localhost` (or `capacitor://localhost`).
* Guard all share links with:
  ```ts
  const isLocalEnvironment =
    Capacitor.isNativePlatform() ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('file:') ||
    origin.startsWith('capacitor:');
  ```
* On mobile/desktop apps, hide the "Printable Invoice Link" input box entirely; provide direct document export buttons (PDF, Excel, JSON).

---

## 4. Cross-Platform Adaptive UI: Pinned Sticky Footers

### The Laptop & Short-Viewport UI Smells:
* On laptops (e.g. 1366x768 or 1080p with 125%/150% Windows display scaling) or desktop windows, viewport height is often only 550px - 700px.
* If a modal has a fixed height or places the "Save Changes" button at the bottom of a scrollable form, the Save button is pushed far below the fold. Users never see it, close the modal, and lose their inputs.

### The Permanent Solution:
Wrap dialogs in a flex column with a **pinned sticky footer**:
```tsx
<div role="dialog" className="flex flex-col md:flex-row h-dvh w-screen md:h-[85vh] md:max-h-[720px] md:min-h-[480px] md:w-[880px] md:max-w-[calc(100vw-32px)] overflow-hidden rounded-none md:rounded-3xl bg-white shadow-xl border-0 md:border md:border-slate-200 outline-none safe-area-top safe-area-bottom">
  {/* Left Rail: Multi-tab navigation with overflow-y-auto */}
  <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/70 p-3.5 hidden md:flex flex-col justify-between overflow-y-auto">
    ...
  </nav>

  {/* Right Content Pane: Form with sticky pinned footer */}
  <form onSubmit={handleSaveSubmit} className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
    {/* Header: shrink-0 */}
    <div className="py-2.5 sm:py-3.5 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
      ...
    </div>

    {/* Body: flex-1 overflow-y-auto */}
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
      ...form fields...
    </div>

    {/* Footer: shrink-0 - Pinned at bottom on all screen sizes */}
    <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-50/95 border-t border-slate-200 flex items-center justify-between gap-3 safe-area-bottom">
      <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      <Button type="submit" variant="primary">Save Changes</Button>
    </div>
  </form>
</div>
```
This guarantees that "Save Changes" is **always visible** without scrolling on:
1. Android & iOS phones (full screen)
2. Small laptops (1366x768, 1280x800)
3. Windows Electron desktop apps (`.exe`)
4. macOS Electron desktop apps (`.pkg` / `.dmg`)
