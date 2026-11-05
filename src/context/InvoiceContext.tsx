// ─── Offline Invoice Data Layer ──────────────────────────────────────
// Persistent offline storage for desktop PC software.
// Stores real commercial invoices, client profiles, and business settings locally.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BusinessInfo, BankDetails, ClientInfo, InvoiceRenderData } from '../types';
import type {
  InvoiceRecord,
} from '../utils/initialOfflineData';
import {
  EMPTY_BUSINESS_PROFILE,
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_CLIENTS,
  getInitialInvoices,
  getClientId,
} from '../utils/initialOfflineData';
import { recalculate } from '../utils/buildRenderData';
import { loadSystemMemory, saveSystemMemory } from '../services/systemStorage';

interface InvoiceContextValue {
  invoices: InvoiceRecord[];
  businessProfile: BusinessInfo & { bankDetails: BankDetails };
  clients: ClientInfo[];
  activeInvoiceId: string | null;
  setActiveInvoiceId: (id: string | null) => void;

  // Invoice CRUD
  getInvoice: (id: string) => InvoiceRecord | undefined;
  createInvoice: (type?: 'services' | 'goods' | 'retail', themeId?: string) => InvoiceRecord;
  updateInvoice: (id: string, data: InvoiceRenderData, themeId?: string) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => InvoiceRecord;

  // Master Data
  updateBusinessProfile: (profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>) => void;
  saveClient: (client: ClientInfo) => void;
  updateClient: (originalName: string, updated: ClientInfo) => void;
  deleteClient: (clientName: string) => void;

  // Offline Backups & Export
  exportOfflineBackup: () => string;
  importOfflineBackup: (json: string) => boolean;
  resetToDefaultRealData: () => void;

  // Setup & Onboarding
  hasCompletedSetup: boolean;
  completeSetup: (profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>) => void;
  reopenSetup: () => void;
  restorePreviousSession: () => Promise<boolean>;
}

export const InvoiceContext = createContext<InvoiceContextValue | null>(null);

const STORAGE_INVOICES_KEY = 'offline-software-invoices-v2';
const STORAGE_BUSINESS_KEY = 'offline-software-business-profile-v2';
const STORAGE_CLIENTS_KEY = 'offline-software-clients-v2';
const STORAGE_SETUP_KEY = 'offline-software-setup-completed-v1';

function loadFromStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to parse ${key} from localStorage, using seed data`, e);
    return fallback();
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to ${key}:`, e);
  }
}

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => {
    const raw = localStorage.getItem(STORAGE_INVOICES_KEY);
    if (!raw) return []; // Production commercial mode: clean ledger
    try {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        return records.map((inv) => {
          if (!inv?.data) return inv;
          const cleanData = recalculate(inv.data);
          return {
            ...inv,
            status: cleanData.status,
            total: cleanData.grandTotalRounded,
            data: cleanData,
          };
        });
      }
    } catch (e) {
      console.warn('Failed to parse invoices from storage', e);
    }
    return [];
  });

  const [businessProfile, setBusinessProfile] = useState<BusinessInfo & { bankDetails: BankDetails }>(() =>
    loadFromStorage(STORAGE_BUSINESS_KEY, () => EMPTY_BUSINESS_PROFILE)
  );

  const [clients, setClients] = useState<ClientInfo[]>(() =>
    loadFromStorage(STORAGE_CLIENTS_KEY, () => [])
  );

  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    const isCompleted = loadFromStorage(STORAGE_SETUP_KEY, () => null);
    if (isCompleted !== null) return Boolean(isCompleted);
    const savedProfile = loadFromStorage(STORAGE_BUSINESS_KEY, () => null as any);
    if (savedProfile && savedProfile.name && savedProfile.name.trim().length > 0) {
      return true;
    }
    return false;
  });

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Hydrate from desktop PC system storage (Documents/Invoice Gen Data/database.json) if available
  useEffect(() => {
    let cancelled = false;
    loadSystemMemory().then((sysDb) => {
      if (cancelled || !sysDb) return;
      if (sysDb.businessProfile && sysDb.businessProfile.name && sysDb.businessProfile.name.trim().length > 0) {
        setBusinessProfile((prev) => ({
          ...prev,
          ...sysDb.businessProfile,
          bankDetails: {
            ...prev.bankDetails,
            ...(sysDb.businessProfile?.bankDetails || {}),
          },
        }));
      }
      if (Array.isArray(sysDb.invoices) && sysDb.invoices.length > 0) {
        setInvoices(sysDb.invoices);
      }
      if (Array.isArray(sysDb.clients) && sysDb.clients.length > 0) {
        setClients(sysDb.clients);
      }
      if (sysDb.hasCompletedSetup || (sysDb.businessProfile?.name && sysDb.businessProfile.name.trim().length > 0)) {
        setHasCompletedSetup(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dual-layer sync: persists to both localStorage and Documents/Invoice Gen Data/database.json
  useEffect(() => {
    saveSystemMemory({
      invoices,
      businessProfile,
      clients,
      hasCompletedSetup,
    });
  }, [invoices, businessProfile, clients, hasCompletedSetup]);

  const getInvoice = useCallback(
    (id: string) => invoices.find((inv) => inv.id === id),
    [invoices]
  );

  const updateInvoice = useCallback(
    (id: string, updatedData: InvoiceRenderData, themeId?: string) => {
      // Recalculate derived fields to guarantee exact mathematical consistency
      const cleanData = recalculate(updatedData);

      setInvoices((prev) => {
        const next = prev.map((inv) => {
          if (inv.id !== id) return inv;
          return {
            ...inv,
            invoiceNumber: cleanData.invoiceNumber,
            clientName: cleanData.client.name,
            clientId: getClientId(cleanData.client.name),
            date: cleanData.invoiceDate,
            total: cleanData.grandTotalRounded,
            status: cleanData.status,
            themeId: themeId !== undefined ? themeId : inv.themeId,
            data: cleanData,
            updatedAt: new Date().toISOString(),
          };
        });
        saveToStorage(STORAGE_INVOICES_KEY, next);
        return next;
      });
    },
    []
  );

  const createInvoice = useCallback(
    (type: 'services' | 'goods' | 'retail' = 'services', themeId?: string) => {
      const timestamp = Date.now();
      const prefix = type === 'retail' ? 'POS-2026-' : 'INV-2026-';
      const today = new Date().toISOString().split('T')[0];

      let initialClient = clients[0] || {
        name: '',
        address: '',
        city: '',
        state: businessProfile.state || 'Maharashtra (27)',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
      };
      const initialTheme = themeId || (type === 'retail' ? 'thermal' : 'classic');

      const initialItems: InvoiceRenderData['items'] = [
        {
          id: `item-${timestamp}-1`,
          sno: 1,
          description: type === 'retail' ? 'Retail Item' : type === 'goods' ? 'Goods Supply' : 'Consulting & Professional Services',
          hsnSac: type === 'retail' ? '850440' : type === 'goods' ? '851762' : '998314',
          quantity: 1,
          unit: type === 'retail' ? 'Pcs' : type === 'goods' ? 'Nos' : 'Hrs',
          rate: 0,
          discount: 0,
          discountAmount: 0,
          taxableAmount: 0,
          gstRate: 0,
          gstAmount: 0,
          total: 0,
        },
      ];

      let counter = invoices.length + 101;
      let invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      while (invoices.some((inv) => inv.invoiceNumber === invoiceNumber)) {
        counter++;
        invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      }

      const rawInvoice: InvoiceRenderData = {
        invoiceNumber,
        invoiceDate: today,
        dueDate: today,
        placeOfSupply: `${initialClient.state} (${initialClient.gstin ? initialClient.gstin.slice(0, 2) : '27'})`,
        status: 'draft',
        business: { ...businessProfile },
        client: { ...initialClient },
        items: initialItems,
        gstType: 'cgst_sgst',
        taxSummary: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTaxableAmount: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalTax: 0,
        grandTotal: 0,
        roundOff: 0,
        grandTotalRounded: 0,
        amountInWords: '',
        payments: [],
        amountPaid: 0,
        balanceDue: 0,
        bankDetails: { ...businessProfile.bankDetails },
        logoUrl: businessProfile.logoUrl,
        stampUrl: businessProfile.stampUrl,
        signatureUrl: businessProfile.signatureUrl,
        notes: 'Payment is due within 30 days of invoice date. Thank you for your business.',
        terms: `1. Subject to ${businessProfile.city || 'local'} jurisdiction.\n2. Payment is due within the agreed credit terms.`,
        copyLabel: 'Original for Recipient',
        currencySymbol: '₹',
        currencyCode: 'INR',
      };

      const cleanData = recalculate(rawInvoice);

      const createdRecord: InvoiceRecord = {
        id: `inv-${timestamp}`,
        invoiceNumber,
        clientName: cleanData.client.name,
        clientId: getClientId(cleanData.client.name),
        date: today,
        total: cleanData.grandTotalRounded,
        status: 'draft',
        themeId: initialTheme,
        data: cleanData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setInvoices((prev) => {
        const next = [createdRecord, ...prev];
        saveToStorage(STORAGE_INVOICES_KEY, next);
        return next;
      });

      setActiveInvoiceId(createdRecord.id);
      return createdRecord;
    },
    [invoices, clients, businessProfile]
  );

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== id);
      saveToStorage(STORAGE_INVOICES_KEY, next);
      return next;
    });
    setActiveInvoiceId((active) => (active === id ? null : active));
  }, []);

  const duplicateInvoice = useCallback(
    (id: string) => {
      const source = invoices.find((inv) => inv.id === id);
      if (!source) throw new Error('Source invoice not found');

      const timestamp = Date.now();
      const isRetail = source.data.invoiceNumber.startsWith('POS');
      const prefix = isRetail ? 'POS-2026-' : 'INV-2026-';
      const today = new Date().toISOString().split('T')[0];

      let counter = invoices.length + 101;
      let invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      while (invoices.some((inv) => inv.invoiceNumber === invoiceNumber)) {
        counter++;
        invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      }

      const clonedData: InvoiceRenderData = {
        ...source.data,
        invoiceNumber,
        invoiceDate: today,
        status: 'draft',
        payments: [],
        amountPaid: 0,
        balanceDue: source.data.grandTotalRounded,
      };

      const cleanData = recalculate(clonedData);

      const duplicatedRecord: InvoiceRecord = {
        id: `inv-${timestamp}`,
        invoiceNumber,
        clientName: cleanData.client.name,
        clientId: source.clientId || getClientId(cleanData.client.name),
        date: today,
        total: cleanData.grandTotalRounded,
        status: 'draft',
        themeId: source.themeId,
        data: cleanData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setInvoices((prev) => {
        const next = [duplicatedRecord, ...prev];
        saveToStorage(STORAGE_INVOICES_KEY, next);
        return next;
      });

      return duplicatedRecord;
    },
    [invoices]
  );

  const updateBusinessProfile = useCallback(
    (profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>) => {
      setBusinessProfile((prev) => {
        const next = {
          ...prev,
          ...profile,
          bankDetails: {
            ...prev.bankDetails,
            ...(profile.bankDetails || {}),
          },
        };
        saveToStorage(STORAGE_BUSINESS_KEY, next);
        return next;
      });
    },
    []
  );

  const saveClient = useCallback((client: ClientInfo) => {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.name.toLowerCase() === client.name.toLowerCase());
      let next: ClientInfo[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = client;
      } else {
        next = [client, ...prev];
      }
      saveToStorage(STORAGE_CLIENTS_KEY, next);
      return next;
    });
  }, []);

  const updateClient = useCallback((originalName: string, updated: ClientInfo) => {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.name.toLowerCase() === originalName.toLowerCase());
      let next: ClientInfo[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updated;
      } else {
        next = [updated, ...prev];
      }
      saveToStorage(STORAGE_CLIENTS_KEY, next);
      return next;
    });
  }, []);

  const deleteClient = useCallback((clientName: string) => {
    setClients((prev) => {
      const next = prev.filter((c) => c.name.toLowerCase() !== clientName.toLowerCase());
      saveToStorage(STORAGE_CLIENTS_KEY, next);
      return next;
    });
  }, []);

  const exportOfflineBackup = useCallback(() => {
    const backup = {
      version: '2.0-offline',
      exportedAt: new Date().toISOString(),
      businessProfile,
      clients,
      invoices,
    };
    return JSON.stringify(backup, null, 2);
  }, [businessProfile, clients, invoices]);

  const importOfflineBackup = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.invoices)) return false;

      const cleanInvoices: InvoiceRecord[] = [];
      for (const inv of parsed.invoices) {
        if (!inv || typeof inv !== 'object' || !inv.data) continue;
        const cleanData = recalculate(inv.data);
        cleanInvoices.push({
          id: String(inv.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
          invoiceNumber: cleanData.invoiceNumber || String(inv.invoiceNumber || 'INV-UNKNOWN'),
          clientName: cleanData.client?.name || String(inv.clientName || 'Unknown Client'),
          clientId: inv.clientId || getClientId(cleanData.client?.name || ''),
          date: cleanData.invoiceDate || String(inv.date || new Date().toISOString().split('T')[0]),
          total: cleanData.grandTotalRounded,
          status: cleanData.status || inv.status || 'draft',
          themeId: inv.themeId || 'classic',
          data: cleanData,
          createdAt: inv.createdAt || new Date().toISOString(),
          updatedAt: inv.updatedAt || new Date().toISOString(),
        });
      }

      if (cleanInvoices.length === 0) return false;

      let updatedProfile = businessProfile;
      if (parsed.businessProfile && typeof parsed.businessProfile === 'object') {
        updatedProfile = { ...businessProfile, ...parsed.businessProfile };
        setBusinessProfile(updatedProfile);
        saveToStorage(STORAGE_BUSINESS_KEY, updatedProfile);
      }
      let updatedClients = clients;
      if (Array.isArray(parsed.clients)) {
        updatedClients = parsed.clients;
        setClients(updatedClients);
        saveToStorage(STORAGE_CLIENTS_KEY, updatedClients);
      }
      setInvoices(cleanInvoices);
      saveToStorage(STORAGE_INVOICES_KEY, cleanInvoices);
      saveToStorage(STORAGE_SETUP_KEY, true);
      setHasCompletedSetup(true);

      saveSystemMemory(
        {
          invoices: cleanInvoices,
          businessProfile: updatedProfile,
          clients: updatedClients,
          hasCompletedSetup: true,
        },
        true
      );
      return true;
    } catch {
      return false;
    }
  }, [businessProfile, clients]);

  const resetToDefaultRealData = useCallback(() => {
    const initial = getInitialInvoices();
    setInvoices(initial);
    setBusinessProfile(DEFAULT_BUSINESS_PROFILE);
    setClients(DEFAULT_CLIENTS);
    saveToStorage(STORAGE_INVOICES_KEY, initial);
    saveToStorage(STORAGE_BUSINESS_KEY, DEFAULT_BUSINESS_PROFILE);
    saveToStorage(STORAGE_CLIENTS_KEY, DEFAULT_CLIENTS);
  }, []);

  const completeSetup = useCallback(
    (profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>) => {
      updateBusinessProfile(profile);

      let updatedInvoices = invoices;
      // Propagate user business profile to all active invoices
      setInvoices((prev) => {
        const updated = prev.map((inv) => {
          if (!inv?.data) return inv;
          const prevBank = inv.data.bankDetails || businessProfile.bankDetails;
          const nextBank: BankDetails = {
            bankName: profile.bankDetails?.bankName ?? prevBank.bankName,
            accountName: profile.bankDetails?.accountName ?? prevBank.accountName,
            accountNumber: profile.bankDetails?.accountNumber ?? prevBank.accountNumber,
            ifsc: profile.bankDetails?.ifsc ?? prevBank.ifsc,
            branch: profile.bankDetails?.branch ?? prevBank.branch,
            upiId: profile.bankDetails?.upiId ?? prevBank.upiId,
          };
          const updatedData = recalculate({
            ...inv.data,
            business: {
              ...inv.data.business,
              ...profile,
            },
            bankDetails: nextBank,
          });
          return {
            ...inv,
            data: updatedData,
          };
        });
        updatedInvoices = updated;
        saveToStorage(STORAGE_INVOICES_KEY, updated);
        return updated;
      });

      saveToStorage(STORAGE_SETUP_KEY, true);
      setHasCompletedSetup(true);

      const nextProfile = {
        ...businessProfile,
        ...profile,
        bankDetails: {
          ...businessProfile.bankDetails,
          ...(profile.bankDetails || {}),
        },
      };

      saveSystemMemory(
        {
          invoices: updatedInvoices,
          businessProfile: nextProfile,
          clients,
          hasCompletedSetup: true,
        },
        true
      );
    },
    [businessProfile, clients, updateBusinessProfile]
  );

  const restorePreviousSession = useCallback(async (): Promise<boolean> => {
    try {
      const sysDb = await loadSystemMemory();
      if (!sysDb) return false;

      if (sysDb.businessProfile && sysDb.businessProfile.name) {
        setBusinessProfile((prev) => ({
          ...prev,
          ...sysDb.businessProfile,
          bankDetails: {
            ...prev.bankDetails,
            ...(sysDb.businessProfile?.bankDetails || {}),
          },
        }));
      }

      if (Array.isArray(sysDb.invoices) && sysDb.invoices.length > 0) {
        const clean = sysDb.invoices.map((inv) => {
          if (!inv?.data) return inv;
          const cleanData = recalculate(inv.data);
          return {
            ...inv,
            status: cleanData.status,
            total: cleanData.grandTotalRounded,
            data: cleanData,
          };
        });
        setInvoices(clean);
      }

      if (Array.isArray(sysDb.clients) && sysDb.clients.length > 0) {
        setClients(sysDb.clients);
      }

      setHasCompletedSetup(true);

      saveSystemMemory(
        {
          invoices: sysDb.invoices || invoices,
          businessProfile: sysDb.businessProfile || businessProfile,
          clients: sysDb.clients || clients,
          hasCompletedSetup: true,
        },
        true
      );

      return true;
    } catch (e) {
      console.error('Failed to restore session:', e);
      return false;
    }
  }, [businessProfile, clients, invoices]);

  const reopenSetup = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_SETUP_KEY);
    } catch {
      // ignore
    }
    setHasCompletedSetup(false);
  }, []);

  const value: InvoiceContextValue = {
    invoices,
    businessProfile,
    clients,
    activeInvoiceId,
    setActiveInvoiceId,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    updateBusinessProfile,
    saveClient,
    updateClient,
    deleteClient,
    exportOfflineBackup,
    importOfflineBackup,
    resetToDefaultRealData,
    hasCompletedSetup,
    completeSetup,
    reopenSetup,
    restorePreviousSession,
  };

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
};

export function useInvoices() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoices must be used within InvoiceProvider');
  return ctx;
}
