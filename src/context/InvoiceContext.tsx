// ─── Offline Invoice Data Layer ──────────────────────────────────────
// Persistent offline storage for desktop PC software.
// Stores real commercial invoices, client profiles, and business settings locally.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BusinessInfo, BankDetails, ClientInfo, InvoiceRenderData, LineItem } from '../types';
import type {
  InvoiceRecord,
} from '../utils/initialOfflineData';
import {
  EMPTY_BUSINESS_PROFILE,
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_CLIENTS,
  getInitialInvoices,
  getClientId,
  isDemoInvoice,
  isDemoClient,
} from '../utils/initialOfflineData';
import { recalculate } from '../utils/buildRenderData';
import { getUSStateTaxRate } from '../utils/usTax';
import { loadSystemMemory, saveSystemMemory } from '../services/systemStorage';

export interface CreateInvoiceOptions {
  type?: 'services' | 'goods' | 'retail';
  themeId?: string;
  invoiceType?: 'daily' | 'monthly';
  billingPeriod?: string;
  billingMonth?: string;
  clientName?: string;
  initialItems?: LineItem[];
}

export interface CreateMonthlyInvoiceOptions {
  clientName: string;
  startDate?: string;
  endDate?: string;
  billingMonth?: string;
  billingPeriod?: string;
  items?: LineItem[];
  themeId?: string;
  sourceInvoiceIds?: string[];
}

export interface ClientMetrics {
  invoiceCount: number;
  totalBilled: number;
  amountPaid: number;
  balanceDue: number;
  latestInvoiceDate: string | null;
  earliestInvoiceDate: string | null;
  itemsSummary: string[];
}

interface InvoiceContextValue {
  invoices: InvoiceRecord[];
  businessProfile: BusinessInfo & { bankDetails: BankDetails };
  clients: ClientInfo[];
  activeInvoiceId: string | null;
  setActiveInvoiceId: (id: string | null) => void;

  // Invoice CRUD
  getInvoice: (id: string) => InvoiceRecord | undefined;
  createInvoice: (
    typeOrOptions?: 'services' | 'goods' | 'retail' | CreateInvoiceOptions,
    themeId?: string
  ) => InvoiceRecord;
  createMonthlyInvoice: (
    clientNameOrOptions: string | CreateMonthlyInvoiceOptions,
    billingMonth?: string,
    billingPeriod?: string,
    items?: LineItem[],
    themeId?: string
  ) => InvoiceRecord;
  getClientInvoices: (clientName: string) => InvoiceRecord[];
  getClientMetrics: (clientName: string) => ClientMetrics;
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
  completeSetup: (
    profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>,
    options?: { cleanLedger?: boolean; isSkip?: boolean }
  ) => void;
  reopenSetup: () => void;
  restorePreviousSession: () => Promise<boolean>;
}

import { getAppVersion } from '@/services/updateService';

export const InvoiceContext = createContext<InvoiceContextValue | null>(null);

const STORAGE_INVOICES_KEY = 'offline-software-invoices-v2';
const STORAGE_BUSINESS_KEY = 'offline-software-business-profile-v2';
const STORAGE_CLIENTS_KEY = 'offline-software-clients-v2';
const STORAGE_SETUP_KEY = 'offline-software-setup-completed-v1';
export const CURRENT_APP_VERSION = getAppVersion();
export const STORAGE_APP_VERSION_KEY = 'offline-software-app-version';

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
  const hasJustCompletedSetupRef = React.useRef(false);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => {
    const raw = localStorage.getItem(STORAGE_INVOICES_KEY);
    if (!raw) return []; // Production commercial mode: clean ledger
    try {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        const filtered = isTestEnv ? records : records.filter((inv) => !isDemoInvoice(inv));
        return filtered.map((inv) => {
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

  const [businessProfile, setBusinessProfile] = useState<BusinessInfo & { bankDetails: BankDetails }>(() => {
    const prof = loadFromStorage(STORAGE_BUSINESS_KEY, () => EMPTY_BUSINESS_PROFILE);
    if (prof?.name && prof.name.includes('Apex Infotech')) {
      return EMPTY_BUSINESS_PROFILE;
    }
    return prof;
  });

  const [clients, setClients] = useState<ClientInfo[]>(() => {
    const raw = localStorage.getItem(STORAGE_CLIENTS_KEY);
    if (!raw) return [];
    try {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        return records;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      const isCompleted = loadFromStorage(STORAGE_SETUP_KEY, () => null);
      return Boolean(isCompleted);
    }
    const savedVersion = localStorage.getItem(STORAGE_APP_VERSION_KEY);
    const isCompleted = loadFromStorage(STORAGE_SETUP_KEY, () => null);
    if (!isCompleted) {
      return false;
    }
    if (savedVersion !== CURRENT_APP_VERSION) {
      try {
        localStorage.setItem(STORAGE_APP_VERSION_KEY, CURRENT_APP_VERSION);
      } catch {}
    }
    return true;
  });

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Hydrate from desktop PC system storage (Documents/Invoice Gen Data/database.json) if available
  useEffect(() => {
    if (!hasCompletedSetup) return;
    if (hasJustCompletedSetupRef.current) {
      // Do not overwrite fresh setup session with stale disk data
      return;
    }

    let cancelled = false;
    loadSystemMemory().then((sysDb) => {
      if (cancelled || !sysDb) return;
      if (sysDb.businessProfile && sysDb.businessProfile.name && sysDb.businessProfile.name.trim().length > 0) {
        if (!sysDb.businessProfile.name.includes('Apex Infotech')) {
          setBusinessProfile((prev) => ({
            ...prev,
            ...sysDb.businessProfile,
            bankDetails: {
              ...prev.bankDetails,
              ...(sysDb.businessProfile?.bankDetails || {}),
            },
          }));
        }
      }
      if (Array.isArray(sysDb.invoices)) {
        const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
        const cleanInvoices = (isTestEnv ? sysDb.invoices : sysDb.invoices.filter((inv) => !isDemoInvoice(inv)))
          .map((inv) => {
            if (!inv?.data) return inv;
            const cleanData = recalculate(inv.data);
            return {
              ...inv,
              status: cleanData.status,
              total: cleanData.grandTotalRounded,
              data: cleanData,
            };
          });
        setInvoices(cleanInvoices);
      }
      if (Array.isArray(sysDb.clients)) {
        setClients(sysDb.clients);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasCompletedSetup]);

  // Dual-layer sync: persists to both localStorage and Documents/Invoice Gen Data/database.json
  useEffect(() => {
    if (!hasCompletedSetup) return;

    let themeSettings: any = undefined;
    try {
      const curTheme = localStorage.getItem('invoice-theme-settings');
      const optMap = localStorage.getItem('invoice-theme-options-map');
      const presets = localStorage.getItem('invoice-theme-presets');
      themeSettings = {
        currentThemeId: curTheme ? JSON.parse(curTheme).themeId : undefined,
        optionsByTheme: optMap ? JSON.parse(optMap) : undefined,
        presets: presets ? JSON.parse(presets) : undefined,
      };
    } catch {
      // ignore
    }

    saveSystemMemory({
      invoices,
      businessProfile,
      clients,
      hasCompletedSetup,
      themeSettings,
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
            invoiceType: cleanData.invoiceType || 'daily',
            billingPeriod: cleanData.billingPeriod,
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
    (
      typeOrOptions: 'services' | 'goods' | 'retail' | CreateInvoiceOptions = 'services',
      themeIdArg?: string
    ) => {
      const isOptions = typeof typeOrOptions === 'object' && typeOrOptions !== null;
      const type = isOptions ? typeOrOptions.type || 'services' : typeOrOptions;
      const invoiceType = isOptions ? typeOrOptions.invoiceType || 'daily' : 'daily';
      const billingPeriod = isOptions ? typeOrOptions.billingPeriod : undefined;
      const billingMonth = isOptions ? typeOrOptions.billingMonth : undefined;
      const targetClientName = isOptions ? typeOrOptions.clientName : undefined;
      const passedItems = isOptions ? typeOrOptions.initialItems : undefined;
      const passedTheme = isOptions ? typeOrOptions.themeId : themeIdArg;

      const timestamp = Date.now();
      const prefix = type === 'retail' ? 'POS-' : 'INV-';
      const today = new Date().toISOString().split('T')[0];

      const isUS =
        businessProfile.region === 'US'
          ? true
          : businessProfile.region === 'IN'
          ? false
          : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
      const defaultState = isUS ? (businessProfile.state || 'California (CA)') : (businessProfile.state || 'Maharashtra (27)');
      const defaultCurrencySymbol = isUS ? '$' : '₹';
      const defaultCurrencyCode = isUS ? 'USD' : 'INR';
      const defaultTaxRate = isUS ? (getUSStateTaxRate(businessProfile.state) || 0) : 0;

      let initialClient = targetClientName
        ? clients.find((c) => c.name.toLowerCase() === targetClientName.toLowerCase()) || {
            name: targetClientName,
            address: '',
            city: '',
            state: defaultState,
            pincode: '',
            phone: '',
            email: '',
            gstin: '',
          }
        : clients[0] || {
            name: '',
            address: '',
            city: '',
            state: defaultState,
            pincode: '',
            phone: '',
            email: '',
            gstin: '',
          };

      const initialTheme = passedTheme || (type === 'retail' ? 'thermal' : invoiceType === 'monthly' ? 'contractor' : 'classic');

      const initialItems: InvoiceRenderData['items'] = passedItems && passedItems.length > 0
        ? passedItems
        : [
            {
              id: `item-${timestamp}-1`,
              sno: 1,
              date: invoiceType === 'monthly' ? (billingMonth ? `${billingMonth}-01` : today) : today,
              description:
                type === 'retail'
                  ? 'Retail Item'
                  : type === 'goods'
                  ? 'Goods Supply'
                  : 'Consulting & Professional Services',
              hsnSac: isUS ? undefined : (type === 'retail' ? '850440' : type === 'goods' ? '851762' : '998314'),
              sku: isUS ? (type === 'retail' ? 'SKU-850440' : type === 'goods' ? 'PRD-851762' : 'SRV-998314') : undefined,
              taxable: true,
              quantity: 1,
              unit: type === 'retail' ? (isUS ? 'ea' : 'Pcs') : type === 'goods' ? (isUS ? 'ea' : 'Nos') : (isUS ? 'hrs' : 'Hrs'),
              rate: 0,
              discount: 0,
              discountAmount: 0,
              taxableAmount: 0,
              gstRate: defaultTaxRate,
              gstAmount: 0,
              total: 0,
            },
          ];

      let maxNum = 0;
      for (const inv of invoices) {
        const numStr = inv.invoiceNumber || inv.data?.invoiceNumber || '';
        const match = numStr.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      }
      let counter = Math.max(1, maxNum + 1);
      let invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      while (invoices.some((inv) => inv.invoiceNumber === invoiceNumber || inv.data?.invoiceNumber === invoiceNumber)) {
        counter++;
        invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      }

      const rawInvoice: InvoiceRenderData = {
        region: isUS ? 'US' : 'IN',
        taxType: isUS ? 'sales_tax' : 'gst',
        invoiceType,
        billingPeriod,
        billingMonth,
        invoiceNumber,
        invoiceDate: today,
        dueDate: today,
        placeOfSupply: isUS ? (initialClient.state || 'California (CA)') : `${initialClient.state} (${initialClient.gstin ? initialClient.gstin.slice(0, 2) : '27'})`,
        status: 'draft',
        business: { ...businessProfile, region: isUS ? 'US' : 'IN' },
        client: { ...initialClient },
        items: initialItems,
        gstType: isUS ? 'none' : 'cgst_sgst',
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
        terms: isUS
          ? '1. Standard terms: Net 30 days.\n2. Overdue balances are subject to a 1.5% monthly finance charge.'
          : `1. Subject to ${businessProfile.city || 'local'} jurisdiction.\n2. Payment is due within the agreed credit terms.`,
        copyLabel: 'Original for Recipient',
        currencySymbol: defaultCurrencySymbol,
        currencyCode: defaultCurrencyCode,
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
        invoiceType: cleanData.invoiceType || 'daily',
        billingPeriod: cleanData.billingPeriod,
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

  const getClientInvoices = useCallback(
    (clientName: string): InvoiceRecord[] => {
      const norm = clientName.trim().toLowerCase();
      const cId = getClientId(clientName);
      return invoices.filter(
        (inv) => (inv.clientName && inv.clientName.trim().toLowerCase() === norm) || inv.clientId === cId
      );
    },
    [invoices]
  );

  const getClientMetrics = useCallback(
    (clientName: string): ClientMetrics => {
      const clientInvoices = getClientInvoices(clientName);
      const activeClientInvoices = clientInvoices.filter((inv) => inv?.status !== 'cancelled');
      const invoiceCount = activeClientInvoices.length;
      const totalBilled = activeClientInvoices.reduce((s, inv) => s + (inv?.total || 0), 0);
      const amountPaid = activeClientInvoices.reduce(
        (s, inv) => s + (inv?.status === 'paid' ? (inv?.total || 0) : (inv?.data?.amountPaid || 0)),
        0
      );
      const balanceDue = activeClientInvoices.reduce(
        (s, inv) => s + (inv?.status === 'paid' ? 0 : (inv?.data?.balanceDue || 0)),
        0
      );

      const dates = clientInvoices
        .map((inv) => inv?.date)
        .filter(Boolean)
        .sort();

      const earliestInvoiceDate = dates.length > 0 ? dates[0] : null;
      const latestInvoiceDate = dates.length > 0 ? dates[dates.length - 1] : null;

      const itemsSet = new Set<string>();
      clientInvoices.forEach((inv) => {
        inv?.data?.items?.forEach((it) => {
          if (it?.description?.trim()) {
            itemsSet.add(it.description.trim());
          }
        });
      });

      return {
        invoiceCount,
        totalBilled,
        amountPaid,
        balanceDue,
        earliestInvoiceDate,
        latestInvoiceDate,
        itemsSummary: Array.from(itemsSet),
      };
    },
    [getClientInvoices]
  );

  const createMonthlyInvoice = useCallback(
    (
      clientNameOrOptions: string | CreateMonthlyInvoiceOptions,
      billingMonthArg?: string,
      billingPeriodArg?: string,
      itemsArg?: LineItem[],
      themeIdArg?: string
    ): InvoiceRecord => {
      const isOptions = typeof clientNameOrOptions === 'object' && clientNameOrOptions !== null;
      const clientName = isOptions ? clientNameOrOptions.clientName : clientNameOrOptions;
      const startDate = isOptions ? clientNameOrOptions.startDate : undefined;
      const endDate = isOptions ? clientNameOrOptions.endDate : undefined;
      const billingMonth = isOptions
        ? clientNameOrOptions.billingMonth || (startDate ? startDate.slice(0, 7) : undefined)
        : billingMonthArg;
      const billingPeriod = isOptions ? clientNameOrOptions.billingPeriod : billingPeriodArg;
      const sourceInvoiceIds = isOptions ? clientNameOrOptions.sourceInvoiceIds : undefined;
      const items = isOptions ? clientNameOrOptions.items : itemsArg;
      const themeId = isOptions ? clientNameOrOptions.themeId : themeIdArg;

      let periodLabel = billingPeriod;
      if (!periodLabel && startDate && endDate) {
        periodLabel = `${startDate} to ${endDate}`;
      } else if (!periodLabel && billingMonth) {
        try {
          const [year, month] = billingMonth.split('-').map(Number);
          const dateObj = new Date(year, month - 1, 1);
          periodLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch {
          periodLabel = billingMonth;
        }
      }

      let lineItems = items;
      if (!lineItems || lineItems.length === 0) {
        // Collect daily deliveries made to this client matching the criteria
        const clientInvoices = getClientInvoices(clientName);
        const candidateInvoices = clientInvoices.filter((inv) => {
          if (sourceInvoiceIds !== undefined) {
            return sourceInvoiceIds.includes(inv.id);
          }
          const invDate = (inv?.date || inv?.data?.invoiceDate || '').slice(0, 10);
          if (startDate && endDate) {
            return invDate >= startDate.slice(0, 10) && invDate <= endDate.slice(0, 10) && inv?.data?.invoiceType !== 'monthly';
          }
          if (billingMonth) {
            return invDate.startsWith(billingMonth) && inv?.data?.invoiceType !== 'monthly';
          }
          return false;
        });

        if (candidateInvoices.length > 0) {
          const extracted: LineItem[] = [];
          let sno = 1;
          for (const dInv of candidateInvoices) {
            for (const it of dInv.data.items) {
              extracted.push({
                ...it,
                id: `item-${Date.now()}-${sno}`,
                sno,
                date: it.date || dInv.date,
              });
              sno++;
            }
          }
          lineItems = extracted;
        }
      }

      if (!lineItems || lineItems.length === 0) {
        const isUS =
          businessProfile.region === 'US'
            ? true
            : businessProfile.region === 'IN'
            ? false
            : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
        const defaultTaxRate = isUS ? (getUSStateTaxRate(businessProfile.state) || 0) : 18;
        const defaultItemDate = startDate || (billingMonth ? `${billingMonth}-01` : new Date().toISOString().split('T')[0]);
        lineItems = [
          {
            id: `item-${Date.now()}-1`,
            sno: 1,
            date: defaultItemDate,
            description: isUS ? 'Contract Work & Services Executed' : 'Material Supply / Work Executed',
            hsnSac: isUS ? undefined : '998314',
            sku: isUS ? 'SRV-998314' : undefined,
            taxable: true,
            quantity: 1,
            unit: isUS ? 'hrs' : 'Nos',
            rate: 0,
            discount: 0,
            discountAmount: 0,
            taxableAmount: 0,
            gstRate: defaultTaxRate,
            gstAmount: 0,
            total: 0,
          },
        ];
      }

      return createInvoice({
        type: 'goods',
        invoiceType: 'monthly',
        billingMonth,
        billingPeriod: periodLabel || billingMonth,
        clientName,
        initialItems: lineItems,
        themeId: themeId || 'contractor',
      });
    },
    [getClientInvoices, createInvoice]
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
      const prefix = isRetail ? 'POS-' : 'INV-';
      const today = new Date().toISOString().split('T')[0];

      let maxNum = 0;
      for (const inv of invoices) {
        const numStr = inv.invoiceNumber || inv.data?.invoiceNumber || '';
        const match = numStr.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      }
      let counter = Math.max(1, maxNum + 1);
      let invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      while (invoices.some((inv) => inv.invoiceNumber === invoiceNumber || inv.data?.invoiceNumber === invoiceNumber)) {
        counter++;
        invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
      }

      const clonedItems = (source.data.items || []).map((it, idx) => ({
        ...it,
        id: `item-${timestamp}-${idx + 1}`,
        sno: idx + 1,
      }));

      const clonedData: InvoiceRenderData = {
        ...source.data,
        invoiceNumber,
        invoiceDate: today,
        status: 'draft',
        items: clonedItems,
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
      try {
        localStorage.setItem(STORAGE_APP_VERSION_KEY, CURRENT_APP_VERSION);
      } catch {}
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
    (
      profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>,
      options?: { cleanLedger?: boolean; isSkip?: boolean }
    ) => {
      hasJustCompletedSetupRef.current = true;
      const shouldCleanLedger = options?.cleanLedger ?? true;

      const nextBank: BankDetails = {
        bankName: profile.bankDetails?.bankName ?? businessProfile.bankDetails?.bankName ?? '',
        accountName: profile.bankDetails?.accountName ?? businessProfile.bankDetails?.accountName ?? '',
        accountNumber: profile.bankDetails?.accountNumber ?? businessProfile.bankDetails?.accountNumber ?? '',
        ifsc: profile.bankDetails?.ifsc ?? businessProfile.bankDetails?.ifsc ?? '',
        branch: profile.bankDetails?.branch ?? businessProfile.bankDetails?.branch ?? '',
        upiId: profile.bankDetails?.upiId ?? businessProfile.bankDetails?.upiId ?? '',
      };

      const nextProfile: BusinessInfo & { bankDetails: BankDetails } = {
        ...businessProfile,
        ...profile,
        bankDetails: nextBank,
      };

      updateBusinessProfile(profile);

      // In production commercial mode: Skip to Dashboard or fresh setup begins with a 100% clean ledger.
      // Any pre-seeded demo invoices or demo clients are completely purged.
      const realInvoices = shouldCleanLedger ? [] : invoices.filter((inv) => !isDemoInvoice(inv));
      const realClients = shouldCleanLedger ? [] : clients.filter((c) => !isDemoClient(c));

      // Propagate user business profile to remaining non-demo invoices synchronously
      const updatedInvoices = realInvoices.map((inv) => {
        if (!inv?.data) return inv;
        const prevBank = inv.data.bankDetails || businessProfile.bankDetails;
        const invoiceBank: BankDetails = {
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
          bankDetails: invoiceBank,
        });
        return {
          ...inv,
          data: updatedData,
        };
      });

      setInvoices(updatedInvoices);
      saveToStorage(STORAGE_INVOICES_KEY, updatedInvoices);
      setClients(realClients);
      saveToStorage(STORAGE_CLIENTS_KEY, realClients);
      saveToStorage(STORAGE_SETUP_KEY, true);
      try {
        localStorage.setItem(STORAGE_APP_VERSION_KEY, CURRENT_APP_VERSION);
      } catch {}
      setHasCompletedSetup(true);

      saveSystemMemory(
        {
          invoices: updatedInvoices,
          businessProfile: nextProfile,
          clients: realClients,
          hasCompletedSetup: true,
        },
        true
      );
    },
    [businessProfile, clients, invoices, updateBusinessProfile]
  );

  const restorePreviousSession = useCallback(async (): Promise<boolean> => {
    try {
      const sysDb = await loadSystemMemory();
      if (!sysDb) return false;

      let cleanInvoices: InvoiceRecord[] = [];
      if (Array.isArray(sysDb.invoices) && sysDb.invoices.length > 0) {
        cleanInvoices = sysDb.invoices
          .filter((inv) => !isDemoInvoice(inv))
          .map((inv) => {
            if (!inv?.data) return inv;
            const cleanData = recalculate(inv.data);
            return {
              ...inv,
              status: cleanData.status,
              total: cleanData.grandTotalRounded,
              data: cleanData,
            };
          });
        setInvoices(cleanInvoices);
        saveToStorage(STORAGE_INVOICES_KEY, cleanInvoices);
      } else {
        setInvoices([]);
        saveToStorage(STORAGE_INVOICES_KEY, []);
      }

      let nextProfile = businessProfile;
      if (sysDb.businessProfile && sysDb.businessProfile.name && !sysDb.businessProfile.name.includes('Apex Infotech')) {
        nextProfile = {
          ...businessProfile,
          ...sysDb.businessProfile,
          bankDetails: {
            ...businessProfile.bankDetails,
            ...(sysDb.businessProfile?.bankDetails || {}),
          },
        };
        setBusinessProfile(nextProfile);
        saveToStorage(STORAGE_BUSINESS_KEY, nextProfile);
      }

      let cleanClients: ClientInfo[] = [];
      if (Array.isArray(sysDb.clients) && sysDb.clients.length > 0) {
        cleanClients = sysDb.clients.filter((c) => !isDemoClient(c));
        setClients(cleanClients);
        saveToStorage(STORAGE_CLIENTS_KEY, cleanClients);
      } else {
        setClients([]);
        saveToStorage(STORAGE_CLIENTS_KEY, []);
      }

      if (sysDb.themeSettings) {
        try {
          if (sysDb.themeSettings.currentThemeId) {
            localStorage.setItem('invoice-theme-settings', JSON.stringify({ themeId: sysDb.themeSettings.currentThemeId }));
          }
          if (sysDb.themeSettings.optionsByTheme) {
            localStorage.setItem('invoice-theme-options-map', JSON.stringify(sysDb.themeSettings.optionsByTheme));
          }
          if (sysDb.themeSettings.presets) {
            localStorage.setItem('invoice-theme-presets', JSON.stringify(sysDb.themeSettings.presets));
          }
        } catch {
          // ignore
        }
      }

      saveToStorage(STORAGE_SETUP_KEY, true);
      try {
        localStorage.setItem(STORAGE_APP_VERSION_KEY, CURRENT_APP_VERSION);
      } catch {}
      setHasCompletedSetup(true);

      saveSystemMemory(
        {
          invoices: cleanInvoices,
          businessProfile: nextProfile,
          clients: cleanClients,
          hasCompletedSetup: true,
          themeSettings: sysDb.themeSettings,
        },
        true
      );
      return true;
    } catch (e) {
      console.error('Failed to restore session:', e);
      return false;
    }
  }, [businessProfile]);

  const reopenSetup = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_SETUP_KEY);
      localStorage.removeItem(STORAGE_APP_VERSION_KEY);
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
    createMonthlyInvoice,
    getClientInvoices,
    getClientMetrics,
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
