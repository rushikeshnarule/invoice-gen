// ─── Desktop System Storage Service ────────────────────────────────────
// Persistent storage service that ensures data survives app uninstallation,
// reinstalls, updates, and computer restarts.
//
// Dual-layer architecture:
// 1. Primary: Documents/Invoice Gen Data/database.json on the user's PC filesystem.
// 2. Synchronous cache: localStorage on fixed loopback origin.

import type { BusinessInfo, BankDetails, ClientInfo } from '../types';
import type { InvoiceRecord } from '../utils/initialOfflineData';

export interface SystemStorageDatabase {
  invoices: InvoiceRecord[];
  businessProfile: BusinessInfo & { bankDetails: BankDetails };
  clients: ClientInfo[];
  hasCompletedSetup: boolean;
  themeSettings?: {
    currentThemeId?: string;
    optionsByTheme?: Record<string, any>;
    presets?: any[];
  };
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
const STORAGE_SETUP_KEY = 'offline-software-setup-completed-v1';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Checks whether persistent system memory exists on the user's PC filesystem.
 */
export async function getSystemMemoryInfo(): Promise<SystemMemoryInfo> {
  try {
    const res = await fetch('/api/system-storage/info', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      return (await res.json()) as SystemMemoryInfo;
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
      const parsedInvoices = rawInvoices ? JSON.parse(rawInvoices) : [];
      if (parsedBusiness?.name?.trim() || (Array.isArray(parsedInvoices) && parsedInvoices.length > 0)) {
        return {
          exists: true,
          businessName: parsedBusiness?.name || '',
          invoiceCount: Array.isArray(parsedInvoices) ? parsedInvoices.length : 0,
          hasCompletedSetup: Boolean(hasSetup),
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
  try {
    const res = await fetch('/api/system-storage', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
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
    const rawSetup = localStorage.getItem(STORAGE_SETUP_KEY);

    if (rawBusiness || rawInvoices) {
      return {
        invoices: rawInvoices ? JSON.parse(rawInvoices) : [],
        businessProfile: rawBusiness ? JSON.parse(rawBusiness) : null,
        clients: rawClients ? JSON.parse(rawClients) : [],
        hasCompletedSetup: Boolean(rawSetup),
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
    try {
      const fullDb: SystemStorageDatabase = {
        ...payload,
        updatedAt: new Date().toISOString(),
        version: 2,
      };

      await fetch('/api/system-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullDb),
      });
    } catch {
      // Electron API unavailable (pure browser)
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
    const res = await fetch('/api/system-storage/open-folder', {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return false;
  }
}
