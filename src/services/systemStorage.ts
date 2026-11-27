// ─── Desktop System Storage Service ────────────────────────────────────
// Persistent storage service that ensures data survives app uninstallation,
// reinstalls, updates, and computer restarts.
//
// Dual-layer architecture:
// 1. Primary: Documents/Invoice Gen Data/database.json on the user's PC filesystem.
// 2. Synchronous cache: localStorage on fixed loopback origin.

import type { BusinessInfo, BankDetails, ClientInfo, ProductItem } from '../types';
import type { InvoiceRecord } from '../utils/initialOfflineData';
import { isDemoInvoice } from '../utils/initialOfflineData';

export interface SystemStorageDatabase {
  invoices: InvoiceRecord[];
  businessProfile: BusinessInfo & { bankDetails: BankDetails };
  clients: ClientInfo[];
  products?: ProductItem[];
  hasCompletedSetup: boolean;
  themeSettings?: {
    currentThemeId?: string;
    optionsByTheme?: Record<string, any>;
    presets?: any[];
  };
  licenseData?: any;
  updatedAt: string;
  version: number;
}

export interface SystemMemoryInfo {
  exists: boolean;
  path?: string;
  businessName?: string;
  invoiceCount?: number;
  lastModified?: string;
  hasCompletedSetup?: boolean;
}

const STORAGE_INVOICES_KEY = 'offline-software-invoices-v2';
const STORAGE_BUSINESS_KEY = 'offline-software-business-profile-v2';
const STORAGE_CLIENTS_KEY = 'offline-software-clients-v2';
const STORAGE_PRODUCTS_KEY = 'offline-software-products-v1';
const STORAGE_SETUP_KEY = 'offline-software-setup-completed-v1';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function getSessionToken(): string {
  try {
    if (typeof window !== 'undefined') {
      const desktop = (window as any).invoiceDesktop;
      return (
        desktop?.sessionToken ||
        (typeof desktop?.getSessionToken === 'function' ? desktop.getSessionToken() : '') ||
        ''
      );
    }
  } catch {}
  return '';
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getSessionToken();
  return {
    ...extraHeaders,
    ...(token ? { 'x-invoice-token': token } : {}),
  };
}

function appendTokenQuery(url: string): string {
  const token = getSessionToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Checks whether persistent system memory exists on the user's PC filesystem.
 */
export async function getSystemMemoryInfo(): Promise<SystemMemoryInfo> {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return { exists: false };
  }
  try {
    const res = await fetch(appendTokenQuery('/api/system-storage/info'), {
      method: 'GET',
      headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok) {
      const info = (await res.json()) as SystemMemoryInfo;
      if (
        info.businessName?.includes('Apex Infotech') ||
        ((info.invoiceCount ?? 0) === 0 && (!info.businessName || info.businessName === 'My Business'))
      ) {
        return { exists: false };
      }
      return info;
    }
  } catch {
    // If running in browser or unit test without Electron backend
  }

  // Fallback: Check local storage
  try {
    const rawBusiness = localStorage.getItem(STORAGE_BUSINESS_KEY);
    const rawInvoices = localStorage.getItem(STORAGE_INVOICES_KEY);
    const hasSetup = localStorage.getItem(STORAGE_SETUP_KEY);

    if (rawBusiness || rawInvoices) {
      const parsedBusiness = rawBusiness ? JSON.parse(rawBusiness) : null;
      const rawRecords = rawInvoices ? JSON.parse(rawInvoices) : [];
      const parsedInvoices = Array.isArray(rawRecords)
        ? rawRecords.filter((inv) => !isDemoInvoice(inv))
        : [];
      const bizName = parsedBusiness?.name?.trim() || '';
      const isDemoBiz = bizName.includes('Apex Infotech') || bizName === 'My Business';

      if ((bizName && !isDemoBiz) || parsedInvoices.length > 0) {
        return {
          exists: true,
          businessName: bizName,
          invoiceCount: parsedInvoices.length,
          hasCompletedSetup: hasSetup === 'true',
          path: 'Local Storage / PC Memory',
        };
      }
    }
  } catch {
    // ignore
  }

  return { exists: false };
}

/**
 * Loads the complete database from the user's Documents/Invoice Gen Data/database.json.
 */
export async function loadSystemMemory(): Promise<SystemStorageDatabase | null> {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return null;
  }
  try {
    const res = await fetch(appendTokenQuery('/api/system-storage'), {
      method: 'GET',
      headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.exists && json.data) {
        return json.data as SystemStorageDatabase;
      }
    }
  } catch {
    // Electron server not available (e.g. pure browser)
  }

  // Fallback to localStorage
  try {
    const rawInvoices = localStorage.getItem(STORAGE_INVOICES_KEY);
    const rawBusiness = localStorage.getItem(STORAGE_BUSINESS_KEY);
    const rawClients = localStorage.getItem(STORAGE_CLIENTS_KEY);
    const rawProducts = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    const rawSetup = localStorage.getItem(STORAGE_SETUP_KEY);

    if (rawBusiness || rawInvoices || rawProducts) {
      return {
        invoices: rawInvoices ? JSON.parse(rawInvoices) : [],
        businessProfile: rawBusiness ? JSON.parse(rawBusiness) : null,
        clients: rawClients ? JSON.parse(rawClients) : [],
        products: rawProducts ? JSON.parse(rawProducts) : [],
        hasCompletedSetup: rawSetup === 'true',
        updatedAt: new Date().toISOString(),
        version: 2,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Persists the database immediately to localStorage and schedules an atomic write
 * to the PC filesystem (Documents/Invoice Gen Data/database.json).
 */
export function saveSystemMemory(
  payload: {
    invoices: InvoiceRecord[];
    businessProfile: BusinessInfo & { bankDetails: BankDetails };
    clients: ClientInfo[];
    products?: ProductItem[];
    hasCompletedSetup: boolean;
    themeSettings?: {
      currentThemeId?: string;
      optionsByTheme?: Record<string, any>;
      presets?: any[];
    };
  },
  immediate = false
): void {
  // 1. Synchronously sync to localStorage for instant reload cache
  try {
    localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(payload.invoices));
    localStorage.setItem(STORAGE_BUSINESS_KEY, JSON.stringify(payload.businessProfile));
    localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(payload.clients));
    if (payload.products !== undefined) {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(payload.products));
    }
    localStorage.setItem(STORAGE_SETUP_KEY, JSON.stringify(payload.hasCompletedSetup));
    if (payload.themeSettings) {
      if (payload.themeSettings.currentThemeId) {
        localStorage.setItem('invoice-theme-settings', JSON.stringify({ themeId: payload.themeSettings.currentThemeId }));
      }
      if (payload.themeSettings.optionsByTheme) {
        localStorage.setItem('invoice-theme-options-map', JSON.stringify(payload.themeSettings.optionsByTheme));
      }
      if (payload.themeSettings.presets) {
        localStorage.setItem('invoice-theme-presets', JSON.stringify(payload.themeSettings.presets));
      }
    }
  } catch (e) {
    console.warn('localStorage save warning:', e);
  }

  // 2. Persist to PC file system via Electron server
  const sendToFileSystem = async () => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return;
    }
    try {
      const fullDb: SystemStorageDatabase = {
        ...payload,
        updatedAt: new Date().toISOString(),
        version: 2,
      };

      const res = await fetch(appendTokenQuery('/api/system-storage'), {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(fullDb),
      });
      if (!res.ok) {
        console.warn('System storage write response not OK:', res.status);
      }
    } catch (e) {
      console.warn('System storage write failed:', e);
    }
  };

  if (immediate) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    void sendToFileSystem();
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void sendToFileSystem();
    }, 400);
  }
}

/**
 * Opens the persistent storage folder in Windows File Explorer.
 */
export async function openStorageDirectory(): Promise<boolean> {
  try {
    const res = await fetch(appendTokenQuery('/api/system-storage/open-folder'), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Loads the saved license data from the desktop PC filesystem if available.
 */
export async function loadSystemLicense(): Promise<any | null> {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return null;
  }
  try {
    const res = await fetch(appendTokenQuery('/api/system-storage/license'), {
      method: 'GET',
      headers: getAuthHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.exists && json.licenseData) {
        return json.licenseData;
      }
    }
  } catch {
    // browser or offline
  }
  return null;
}

/**
 * Saves the license data to the desktop PC filesystem (Documents/Invoice Gen Data/database.json).
 */
export async function saveSystemLicense(licenseData: any): Promise<boolean> {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return true;
  }
  try {
    const res = await fetch(appendTokenQuery('/api/system-storage/license'), {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(licenseData),
    });
    return res.ok;
  } catch {
    return false;
  }
}
