// ─── Cloud Remote Template Sync Service ───────────────────────────────────
// Fetches template manifests & CSS assets from Cloud or any HTTPS server.
// Caches assets locally in localStorage / IndexedDB so they run 100% offline.

import type { RemoteTemplateDefinition, RemoteTemplateManifest } from '../types';
import { sanitizeTemplateCss } from '../utils';

export const STORAGE_REMOTE_URL_KEY = 'invoice-remote-template-url';
export const STORAGE_CACHED_TEMPLATES_KEY = 'invoice-cached-remote-templates';
export const STORAGE_LAST_SYNC_KEY = 'invoice-remote-template-last-sync';
export const STORAGE_AUTOSYNC_ENABLED_KEY = 'invoice-remote-template-autosync';

export const REMOTE_TEMPLATES_UPDATED_EVENT = 'remote-templates-updated';

export interface SyncResult {
  success: boolean;
  status: 'synced' | 'up-to-date' | 'offline' | 'error' | 'no-url';
  message: string;
  addedCount?: number;
  updatedCount?: number;
  totalCount?: number;
  lastSync?: string;
}

export const DEFAULT_REMOTE_URL = 'https://rushi-invoice-templates.netlify.app';

export const BUNDLED_REMOTE_TEMPLATES: RemoteTemplateDefinition[] = [
  {
    id: 'excel-sales-invoice',
    name: 'Excel Sales Invoice (Simple Lines)',
    version: '1.0.0',
    description: 'Microsoft Excel official sales invoice template with classic accounting green header, ruled lines, HSN/quantity breakdown, and double-underline total.',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/excel-sales-invoice.css',
    defaultOptions: {
      accentColor: '#107c41',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: true,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'excel-small-business-invoice',
    name: 'Excel Small Business Invoice',
    version: '1.0.0',
    description: 'Microsoft Excel commercial small business sales invoice with dual billing/shipping addresses, purchase order terms, alternating rows, and GST balance due.',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/excel-small-business-invoice.css',
    defaultOptions: {
      accentColor: '#1e3a8a',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: true,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'excel-service-invoice',
    name: 'Excel Service & Consulting Invoice',
    version: '1.0.0',
    description: 'Microsoft Excel service invoice (blocky design) with charcoal block headers, consulting hours/SAC schedules, bank transfer details, and UPI QR code.',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/excel-service-invoice.css',
    defaultOptions: {
      accentColor: '#1e293b',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: false,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'excel-corporate-invoice',
    name: 'Excel Corporate Standard Invoice',
    version: '1.0.0',
    description: 'Microsoft Excel corporate purple & black standard commercial invoice with formal multi-tier GST breakdown, tax ID compliance, and executive seal.',
    paper: ['A4'],
    cssUrl: '/assets/excel-corporate-invoice.css',
    defaultOptions: {
      accentColor: '#4c1d95',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: true,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'excel-simple-business-invoice',
    name: 'Excel Simple Business Invoice',
    version: '1.0.0',
    description: 'Microsoft Excel simple business invoice with clean cobalt styling, borderless item rows, payment terms, and instant settlement QR code.',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/excel-simple-business-invoice.css',
    defaultOptions: {
      accentColor: '#2563eb',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: true,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'construction-contractor',
    name: 'Construction Contractor Tax Invoice',
    version: '1.0.0',
    description: 'Standard Indian construction & civil contractor template with HSN schedules, Brass/MT units, destination, tax in words & declaration',
    paper: ['A4'],
    layout: 'contractor',
    cssUrl: '/assets/construction-contractor.css',
    defaultOptions: {
      accentColor: '#0f172a',
      fontFamily: 'system',
      fontSize: 'normal',
      showHsnSacColumn: true,
      showDiscountColumn: true,
      showTaxSummaryTable: true,
      showAmountInWords: true,
      showBankDetails: true,
      showSignature: true,
      showStamp: true,
    },
  },
  {
    id: 'minimal-gold',
    name: 'Minimalist Gold Edition',
    version: '1.0.0',
    description: 'Warm amber & gold accents with clean serif headers and compact GST summary',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/minimal-gold.css',
    defaultOptions: {
      accentColor: '#b45309',
      fontFamily: 'serif',
      fontSize: 'normal',
    },
  },
  {
    id: 'express-pos-thermal',
    name: 'Express POS Thermal (80mm)',
    version: '1.0.0',
    description: 'High-density 80mm thermal receipt with instant UPI QR code & tax summary',
    paper: ['80mm'],
    cssUrl: '/assets/express-pos-thermal.css',
    defaultOptions: {
      accentColor: '#000000',
      fontFamily: 'mono',
      fontSize: 'small',
      paper: '80mm',
    },
  },
  {
    id: 'emerald-corporate',
    name: 'Emerald Corporate',
    version: '1.0.0',
    description: 'Executive emerald green theme with professional GST tax schedules',
    paper: ['A4', 'A5'],
    cssUrl: '/assets/emerald-corporate.css',
    defaultOptions: {
      accentColor: '#047857',
      fontFamily: 'system',
      fontSize: 'normal',
    },
  },
  {
    id: 'cyber-slate',
    name: 'Cyber Slate Modern',
    version: '1.0.0',
    description: 'Modern slate styling with crisp cobalt accents and bold totals',
    paper: ['A4'],
    cssUrl: '/assets/cyber-slate.css',
    defaultOptions: {
      accentColor: '#2563eb',
      fontFamily: 'system',
      fontSize: 'normal',
    },
  },
];

export function getRemoteServerUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_REMOTE_URL_KEY);
    if (stored !== null) return stored;
    return DEFAULT_REMOTE_URL;
  } catch {
    return DEFAULT_REMOTE_URL;
  }
}

export function setRemoteServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_REMOTE_URL_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save remote template URL:', e);
  }
}

export function isAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_AUTOSYNC_ENABLED_KEY);
    return val === null ? true : val === 'true'; // Default true
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_AUTOSYNC_ENABLED_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to set auto-sync preference:', e);
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function getCachedRemoteTemplates(): RemoteTemplateDefinition[] {
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_TEMPLATES_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return BUNDLED_REMOTE_TEMPLATES;
  } catch (e) {
    console.error('Failed to read cached remote templates:', e);
    return BUNDLED_REMOTE_TEMPLATES;
  }
}

export function saveCachedRemoteTemplates(templates: RemoteTemplateDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_CACHED_TEMPLATES_KEY, JSON.stringify(templates));
    window.dispatchEvent(new CustomEvent(REMOTE_TEMPLATES_UPDATED_EVENT, { detail: templates }));
  } catch (e) {
    console.error('Failed to save cached remote templates:', e);
  }
}

export function deleteRemoteTemplate(id: string): void {
  const current = getCachedRemoteTemplates();
  const next = current.filter((t) => t.id !== id);
  saveCachedRemoteTemplates(next);
}

/**
 * Normalizes user input into a valid manifest endpoint URL.
 * e.g. "https://my-site.netlify.app" -> "https://my-site.netlify.app/templates.json"
 */
export function normalizeManifestUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = `https://${url.slice(7)}`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  // If no path or ends in slash or doesn't have .json, append /templates.json
  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/templates.json';
    } else if (!parsed.pathname.endsWith('.json')) {
      parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/templates.json`;
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const normalizeRemoteManifestUrl = normalizeManifestUrl;

/**
 * Primary synchronization method.
 * Fetches templates from Cloud, downloads CSS assets once, and caches them offline.
 */
export async function syncRemoteTemplates(overrideUrl?: string): Promise<SyncResult> {
  const targetUrl = overrideUrl || getRemoteServerUrl();
  const manifestUrl = normalizeManifestUrl(targetUrl);

  if (!manifestUrl) {
    return {
      success: false,
      status: 'no-url',
      message: 'No Cloud template server URL configured.',
    };
  }

  // Check online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      status: 'offline',
      message: 'Computer is currently offline. Using locally cached templates.',
      totalCount: getCachedRemoteTemplates().length,
      lastSync: getLastSyncTime() || undefined,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const manifestRes = await fetch(manifestUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!manifestRes.ok) {
      throw new Error(`Server returned HTTP ${manifestRes.status}: ${manifestRes.statusText}`);
    }

    const manifest: RemoteTemplateManifest = await manifestRes.json();
    if (!manifest || !Array.isArray(manifest.templates)) {
      throw new Error('Invalid templates.json format: "templates" must be an array.');
    }

    const existingCached = getCachedRemoteTemplates();
    const cachedMap = new Map(existingCached.map((t) => [t.id, t]));

    let addedCount = 0;
    let updatedCount = 0;
    const updatedList: RemoteTemplateDefinition[] = [];

    for (const remote of manifest.templates) {
      if (!remote.id || !remote.name) continue;

      const cached = cachedMap.get(remote.id);
      const isNew = !cached;
      const isVersionChanged = cached && cached.version !== remote.version;
      const isMissingCss = cached && !cached.cachedCss;

      let cssText = cached?.cachedCss || '';

      // Download CSS asset if new, version changed, or missing cached CSS
      if (isNew || isVersionChanged || isMissingCss) {
        if (remote.cssUrl) {
          try {
            // Resolve relative URLs against the manifest URL
            const fullCssUrl = new URL(remote.cssUrl, manifestUrl).toString();
            const cssRes = await fetch(fullCssUrl);
            if (cssRes.ok) {
              cssText = sanitizeTemplateCss(await cssRes.text());
            }
          } catch (cssErr) {
            console.warn(`Failed to fetch CSS for remote template "${remote.name}":`, cssErr);
          }
        }

        if (isNew) addedCount++;
        else if (isVersionChanged) updatedCount++;
      }

      updatedList.push({
        ...remote,
        cachedCss: cssText,
        updatedAt: remote.updatedAt || new Date().toISOString(),
      });
    }

    // Persist all templates locally for 100% offline operation
    saveCachedRemoteTemplates(updatedList);
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, now);

    const total = updatedList.length;
    const isUpToDate = addedCount === 0 && updatedCount === 0;

    return {
      success: true,
      status: isUpToDate ? 'up-to-date' : 'synced',
      message: isUpToDate
        ? `All ${total} template(s) from Cloud are up to date.`
        : `Synced ${total} template(s) from Cloud (${addedCount} added, ${updatedCount} updated).`,
      addedCount,
      updatedCount,
      totalCount: total,
      lastSync: now,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown network error';
    return {
      success: false,
      status: 'error',
      message: `Failed to fetch from Cloud: ${errMessage}`,
      totalCount: getCachedRemoteTemplates().length,
      lastSync: getLastSyncTime() || undefined,
    };
  }
}

/**
 * Initializes auto-sync on `window.online` and at application startup when connected.
 */
export function initAutoSyncListener(onSyncComplete?: (res: SyncResult) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    if (!isAutoSyncEnabled()) return;
    const serverUrl = getRemoteServerUrl();
    if (!serverUrl) return;

    try {
      const res = await syncRemoteTemplates(serverUrl);
      if (onSyncComplete) onSyncComplete(res);
    } catch (e) {
      console.warn('Auto-sync on connect failed silently:', e);
    }
  };

  window.addEventListener('online', handleOnline);

  // Initial check on load if already online and configured
  if (navigator.onLine && getRemoteServerUrl() && isAutoSyncEnabled()) {
    // Delay slightly so app initialization completes first
    setTimeout(handleOnline, 1500);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
