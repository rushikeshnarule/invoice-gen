// ─── Electron Desktop Preload ──────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('invoiceDesktop', {
  isDesktop: true,
  platform: process.platform,
  savePdf: (options) => ipcRenderer.invoke('desktop:save-pdf', options),
  print: () => ipcRenderer.invoke('desktop:print'),
});
