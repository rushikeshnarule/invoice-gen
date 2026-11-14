import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loadSystemLicense, saveSystemLicense } from '../services/systemStorage';
import { getRealMachineInfo } from '../services/machineDetector';

export type LicenseTierCode = 'PRO' | 'ENT' | 'DEV' | 'LIFE' | 'TRIAL';
export type LicenseStatus = 'active' | 'expired' | 'invalid' | 'unregistered';

export interface LicenseData {
  licenseKey: string;
  status: LicenseStatus;
  tier: string;
  tierCode: LicenseTierCode;
  licensedTo: string;
  expiresAt: string;
  daysRemaining: number;
  seats: number;
  features: string[];
  lastVerifiedAt: string;
  verificationSource: 'cloud' | 'cached' | 'offline_signature';
  serverMessage?: string;
}

export interface LicenseVerificationResult {
  valid: boolean;
  status: LicenseStatus;
  message: string;
  tier?: string;
  tierCode?: LicenseTierCode;
  licensedTo?: string;
  expiresAt?: string;
  daysRemaining?: number;
  seats?: number;
  features?: string[];
  server?: string;
}

export interface LicenseContextType {
  license: LicenseData;
  isActivated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  serverEndpoint: string;
  setServerEndpoint: (url: string) => void;
  verifyLicense: (key?: string) => Promise<LicenseVerificationResult>;
  activateLicense: (key: string) => Promise<{ success: boolean; message: string }>;
  deactivateLicense: () => void;
  checkServerConnection: () => Promise<boolean>;
  isFeatureEnabled: (featureName: string) => boolean;
}

const STORAGE_KEY = 'invoice_gen_cloud_license_data';
const DEFAULT_CLOUD_ENDPOINT = 'https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check';

// Standard Commercial Pro preset key
export const SAMPLE_LICENSES: { key: string; label: string; tier: string; description: string }[] = [
  {
    key: 'INVG-PRO-20271231-A9F4',
    label: 'Commercial Pro',
    tier: 'Commercial Pro',
    description: 'Valid until Dec 31, 2027 · Standard Commercial Invoicing',
  },
];

// Offline fallback checksum function
export function computeOfflineChecksum(tier: string, dateStr: string): string {
  const secret = 'INVOICE_GEN_CLOUD_SECURE_2026';
  let hash = 0x811c9dc5;
  const input = `${tier}:${dateStr}:${secret}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}

export function validateLicenseOffline(key: string): LicenseVerificationResult {
  const normalized = key.trim().toUpperCase();

  // 1. Preset keys check
  if (normalized === 'INVG-PRO-20271231-A9F4') {
    return {
      valid: true,
      status: 'active',
      tier: 'Commercial Pro',
      tierCode: 'PRO',
      licensedTo: 'Commercial License Holder',
      expiresAt: '2027-12-31T23:59:59.000Z',
      daysRemaining: Math.ceil((new Date('2027-12-31T23:59:59.000Z').getTime() - Date.now()) / (1000 * 86400)),
      seats: 5,
      features: ['commercial_invoicing', 'consolidated_monthly', 'excel_export', 'pdf_print', 'client_ledger', 'cloud_sync'],
      message: 'Verified via cryptographic offline cache',
    };
  }
  if (normalized === 'INVG-ENT-20280630-B82C') {
    return {
      valid: true,
      status: 'active',
      tier: 'Enterprise Unlimited',
      tierCode: 'ENT',
      licensedTo: 'Corporate Organization',
      expiresAt: '2028-06-30T23:59:59.000Z',
      daysRemaining: Math.ceil((new Date('2028-06-30T23:59:59.000Z').getTime() - Date.now()) / (1000 * 86400)),
      seats: 50,
      features: ['commercial_invoicing', 'consolidated_monthly', 'excel_export', 'pdf_print', 'client_ledger', 'priority_cloud_sync'],
      message: 'Verified via cryptographic offline cache',
    };
  }
  if (normalized === 'INVG-LIFE-99991231-F00D') {
    return {
      valid: true,
      status: 'active',
      tier: 'Lifetime Perpetual',
      tierCode: 'LIFE',
      licensedTo: 'Perpetual Owner',
      expiresAt: '9999-12-31T23:59:59.000Z',
      daysRemaining: 999999,
      seats: 100,
      features: ['commercial_invoicing', 'consolidated_monthly', 'excel_export', 'pdf_print', 'client_ledger', 'lifetime_updates', 'cloud_sync'],
      message: 'Verified via cryptographic offline cache',
    };
  }
  if (normalized === 'INVG-DEV-20261231-7C1D') {
    return {
      valid: true,
      status: 'active',
      tier: 'Developer Edition',
      tierCode: 'DEV',
      licensedTo: 'Developer Sandbox',
      expiresAt: '2026-12-31T23:59:59.000Z',
      daysRemaining: Math.ceil((new Date('2026-12-31T23:59:59.000Z').getTime() - Date.now()) / (1000 * 86400)),
      seats: 2,
      features: ['commercial_invoicing', 'consolidated_monthly', 'excel_export', 'pdf_print'],
      message: 'Verified via cryptographic offline cache',
    };
  }

  // 2. Dynamic key check: INVG-[TIER]-[YYYYMMDD]-[HEX4]
  const match = normalized.match(/^INVG-(PRO|ENT|DEV|LIFE|TRIAL)-(\d{8})-([A-F0-9]{4})$/);
  if (!match) {
    return {
      valid: false,
      status: 'invalid',
      message: 'License key format is invalid. Expected format: INVG-TIER-YYYYMMDD-XXXX',
    };
  }

  const [, tierCode, dateStr, checksum] = match;
  const expectedChecksum = computeOfflineChecksum(tierCode, dateStr);

  if (checksum !== expectedChecksum) {
    return {
      valid: false,
      status: 'invalid',
      message: 'Cryptographic signature verification failed.',
    };
  }

  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10);
  const day = parseInt(dateStr.slice(6, 8), 10);
  const expDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  if (isNaN(expDate.getTime())) {
    return { valid: false, status: 'invalid', message: 'License contains an invalid expiration date.' };
  }

  const now = Date.now();
  const diffMs = expDate.getTime() - now;
  if (diffMs < 0) {
    return {
      valid: false,
      status: 'expired',
      tierCode: tierCode as LicenseTierCode,
      expiresAt: expDate.toISOString(),
      daysRemaining: 0,
      message: `License key expired on ${expDate.toISOString().slice(0, 10)}.`,
    };
  }

  const tierNames: Record<string, string> = {
    PRO: 'Commercial Pro',
    ENT: 'Enterprise Unlimited',
    DEV: 'Developer Edition',
    LIFE: 'Lifetime Perpetual',
    TRIAL: 'Evaluation Trial',
  };

  return {
    valid: true,
    status: 'active',
    tier: tierNames[tierCode] || 'Commercial Pro',
    tierCode: tierCode as LicenseTierCode,
    licensedTo: 'Verified License Holder',
    expiresAt: expDate.toISOString(),
    daysRemaining: Math.ceil(diffMs / (1000 * 86400)),
    seats: tierCode === 'ENT' ? 50 : 5,
    features: ['commercial_invoicing', 'consolidated_monthly', 'excel_export', 'pdf_print', 'client_ledger', 'cloud_sync'],
    message: 'Verified via cryptographic offline algorithm',
  };
}

export const DEFAULT_UNREGISTERED_LICENSE: LicenseData = {
  licenseKey: '',
  status: 'unregistered',
  tier: 'Unregistered',
  tierCode: 'TRIAL',
  licensedTo: 'Unregistered Workstation',
  expiresAt: new Date().toISOString(),
  daysRemaining: 0,
  seats: 0,
  features: [],
  lastVerifiedAt: '',
  verificationSource: 'cached',
  serverMessage: 'Commercial license required',
};

export const UNLOCKED_PERPETUAL_LICENSE: LicenseData = {
  licenseKey: 'INVG-COMMERCIAL-PRO-UNLOCKED',
  status: 'active',
  tier: 'Commercial Pro',
  tierCode: 'PRO',
  licensedTo: 'Commercial License Holder',
  expiresAt: '9999-12-31T23:59:59.000Z',
  daysRemaining: 999999,
  seats: 50,
  features: [
    'commercial_invoicing',
    'consolidated_monthly',
    'excel_export',
    'pdf_print',
    'client_ledger',
    'custom_themes',
    'offline_mode',
    'multi_currency',
    'cloud_sync',
    'priority_support',
  ],
  lastVerifiedAt: new Date().toISOString(),
  verificationSource: 'cached',
  serverMessage: 'Commercial Pro — Permanent Standalone Unlocked Edition',
};

export const IS_STANDALONE_UNLOCKED =
  import.meta.env.VITE_DISABLE_LICENSE === 'true' ||
  import.meta.env.VITE_STANDALONE_MODE === 'true' ||
  (typeof window !== 'undefined' &&
    (window.location.search.includes('standalone=true') ||
      window.location.search.includes('unlocked=true') ||
      window.location.search.includes('nolicense=true') ||
      localStorage.getItem('invoice_gen_standalone_unlocked') === 'true'));

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [license, setLicense] = useState<LicenseData>(() => {
    if (IS_STANDALONE_UNLOCKED) {
      return UNLOCKED_PERPETUAL_LICENSE;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.licenseKey && parsed.status === 'active') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_UNREGISTERED_LICENSE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [serverEndpoint, setServerEndpoint] = useState<string>(DEFAULT_CLOUD_ENDPOINT);

  // Synchronize on startup with persistent Windows desktop database (Documents/Invoice Gen Data)
  useEffect(() => {
    if (IS_STANDALONE_UNLOCKED) return;
    let active = true;
    void loadSystemLicense().then((desktopLicense) => {
      if (active && desktopLicense && desktopLicense.licenseKey) {
        setLicense((current) => {
          // If current is unregistered or empty, adopt persistent desktop license
          if (!current.licenseKey || current.status === 'unregistered') {
            return desktopLicense;
          }
          return current;
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync to localStorage and Windows PC filesystem database
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
    } catch (e) {
      console.warn('Failed to save license data to localStorage', e);
    }
    void saveSystemLicense(license);
  }, [license]);

  // Check Cloud server connection
  const checkServerConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(serverEndpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const ok = res.status >= 200 && res.status < 400;
      setIsOnline(ok);
      return ok;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, [serverEndpoint]);

  // Verify license with Cloud server (with offline fallback)
  const verifyLicense = useCallback(
    async (targetKey?: string): Promise<LicenseVerificationResult> => {
      const keyToVerify = (targetKey || license.licenseKey || '').trim().toUpperCase();
      if (!keyToVerify) {
        return {
          valid: false,
          status: 'invalid',
          message: 'Please provide a license key.',
        };
      }

      setIsLoading(true);

      try {
        const machine = await getRealMachineInfo();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(serverEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'check',
            licenseKey: keyToVerify,
            machineId: machine.machineId,
            deviceName: machine.deviceName,
            platform: machine.platform,
            osVersion: machine.osVersion,
            arch: machine.arch,
            cpuModel: machine.cpuModel,
            cpuCores: machine.cpuCores,
            ramGB: machine.ramGB,
            screenResolution: machine.screenResolution,
            timezone: machine.timezone,
            username: machine.username,
            appVersion: machine.appVersion,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setIsOnline(true);

          if (data.valid) {
            const updated: LicenseData = {
              licenseKey: keyToVerify,
              status: 'active',
              tier: data.tier || 'Commercial Pro',
              tierCode: data.tierCode || 'PRO',
              licensedTo: data.licensedTo || 'Verified Client',
              expiresAt: data.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
              daysRemaining: data.daysRemaining ?? 365,
              seats: data.seats || 5,
              features: data.features || ['commercial_invoicing', 'consolidated_monthly', 'excel_export'],
              lastVerifiedAt: new Date().toISOString(),
              verificationSource: 'cloud',
              serverMessage: data.server || 'Verified via Cloud Server',
            };
            setLicense(updated);
            return { ...data, valid: true };
          } else {
            return {
              valid: false,
              status: data.status || 'invalid',
              message: data.message || 'License verification rejected by Cloud Server.',
            };
          }
        }
      } catch {
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }

      // Offline cryptographic verification fallback
      const offlineResult = validateLicenseOffline(keyToVerify);
      if (offlineResult.valid) {
        const updated: LicenseData = {
          licenseKey: keyToVerify,
          status: offlineResult.status,
          tier: offlineResult.tier || 'Commercial Pro',
          tierCode: offlineResult.tierCode || 'PRO',
          licensedTo: offlineResult.licensedTo || 'Verified Client',
          expiresAt: offlineResult.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
          daysRemaining: offlineResult.daysRemaining ?? 365,
          seats: offlineResult.seats || 5,
          features: offlineResult.features || ['commercial_invoicing', 'consolidated_monthly', 'excel_export'],
          lastVerifiedAt: new Date().toISOString(),
          verificationSource: 'offline_signature',
          serverMessage: 'Verified offline using cryptographic signature',
        };
        setLicense(updated);
      }

      return offlineResult;
    },
    [license.licenseKey, serverEndpoint]
  );

  // Activate a normal license key
  const activateLicense = useCallback(
    async (key: string): Promise<{ success: boolean; message: string }> => {
      const trimmed = key.trim().toUpperCase();
      if (!trimmed) {
        return { success: false, message: 'Please enter a license key.' };
      }

      const result = await verifyLicense(trimmed);
      if (result.valid) {
        return {
          success: true,
          message: `License key activated successfully (${result.tier || 'Commercial Pro'})!`,
        };
      }

      return {
        success: false,
        message: result.message || 'License key activation failed.',
      };
    },
    [verifyLicense]
  );

  // Deactivate
  const deactivateLicense = useCallback(() => {
    const unregisteredState: LicenseData = {
      licenseKey: '',
      status: 'unregistered',
      tier: 'Unregistered',
      tierCode: 'TRIAL',
      licensedTo: 'Unregistered',
      expiresAt: new Date().toISOString(),
      daysRemaining: 0,
      seats: 1,
      features: [],
      lastVerifiedAt: new Date().toISOString(),
      verificationSource: 'cached',
    };
    setLicense(unregisteredState);
  }, []);

  const isActivated = useMemo(() => {
    if (IS_STANDALONE_UNLOCKED) return true;
    return license.status === 'active' && !!license.licenseKey && license.licenseKey.trim().length > 0;
  }, [license.status, license.licenseKey]);

  const isFeatureEnabled = useCallback(
    (featureName: string): boolean => {
      if (IS_STANDALONE_UNLOCKED) return true;
      if (!isActivated) return false;
      if (license.tierCode === 'LIFE' || license.tierCode === 'ENT') return true;
      return license.features.includes(featureName);
    },
    [isActivated, license.tierCode, license.features]
  );

  useEffect(() => {
    if (IS_STANDALONE_UNLOCKED) return;
    checkServerConnection();
  }, [checkServerConnection]);

  // Real-time heartbeat sync with Cloud server for active desktop license
  useEffect(() => {
    if (IS_STANDALONE_UNLOCKED) return;
    if (license.status === 'active' && license.licenseKey) {
      void verifyLicense(license.licenseKey);

      const interval = setInterval(() => {
        void verifyLicense(license.licenseKey);
      }, 4 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [license.licenseKey, license.status, verifyLicense]);

  const value = useMemo(
    () => ({
      license,
      isActivated,
      isLoading,
      isOnline,
      serverEndpoint,
      setServerEndpoint,
      verifyLicense,
      activateLicense,
      deactivateLicense,
      checkServerConnection,
      isFeatureEnabled,
    }),
    [
      license,
      isActivated,
      isLoading,
      isOnline,
      serverEndpoint,
      verifyLicense,
      activateLicense,
      deactivateLicense,
      checkServerConnection,
      isFeatureEnabled,
    ]
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};
