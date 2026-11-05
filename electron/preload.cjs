// ─── Electron Desktop Preload ──────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('invoiceDesktop', {
  isDesktop: true,
  platform: process.platform,
});
