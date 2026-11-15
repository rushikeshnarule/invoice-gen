// ─── Electron Desktop Preload ──────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

let sessionToken = '';
let appVersion = '';

// 1. Secure synchronous IPC directly to main process
try {
  sessionToken = ipcRenderer.sendSync('desktop:get-session-token-sync') || '';
  appVersion = ipcRenderer.sendSync('desktop:get-app-version-sync') || '';
} catch {}

// 3. Process environment fallback
if (!sessionToken && typeof process !== 'undefined' && process.env && process.env.INVOICE_SESSION_TOKEN) {
  sessionToken = process.env.INVOICE_SESSION_TOKEN;
}

contextBridge.exposeInMainWorld('invoiceDesktop', {
  isDesktop: true,
  platform: process.platform,
  appVersion: appVersion,
  getAppVersion: () => ipcRenderer.invoke('desktop:get-app-version'),
  sessionToken: sessionToken,
  getSessionToken: () => sessionToken,
  savePdf: (options) => ipcRenderer.invoke('desktop:save-pdf', options),
  saveExcel: (options) => ipcRenderer.invoke('desktop:save-excel', options),
  print: () => ipcRenderer.invoke('desktop:print'),
  getMachineInfo: () => ipcRenderer.invoke('desktop:get-machine-info'),
  getOpenedFile: () => ipcRenderer.invoke('desktop:get-opened-file'),
  checkUpdates: () => ipcRenderer.invoke('desktop:check-updates'),
  downloadUpdate: (options) => ipcRenderer.invoke('desktop:download-update', options),
  installUpdate: (options) => ipcRenderer.invoke('desktop:install-update', options),
  onUpdateProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('desktop:update-progress', handler);
    return () => ipcRenderer.removeListener('desktop:update-progress', handler);
  },
});
