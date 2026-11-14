// ─── License & Device Allotment Cloud Service ──────────────────────────────
// Communicates with Netlify Cloud Serverless functions to manage allotted license keys,
// seat utilization, and real hardware-registered desktop devices.

export interface DeviceAllotment {
  id: string;
  licenseKey: string;
  deviceName: string;
  platform: 'windows' | 'mac' | 'linux';
  osVersion: string;
  arch?: string;
  cpuModel?: string;
  cpuCores?: number;
  ramGB?: string;
  screenResolution?: string;
  timezone?: string;
  username?: string;
  machineId: string;
  ipAddress: string;
  location: string;
  appVersion: string;
  allottedAt: string;
  lastActiveAt: string;
  status: 'active' | 'offline' | 'revoked';
}

export interface LicenseAllotmentEntry {
  licenseKey: string;
  tier: string;
  tierCode: 'PRO' | 'ENT' | 'DEV' | 'LIFE' | 'TRIAL';
  licensedTo: string;
  expiresAt: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  status: 'active' | 'expired' | 'revoked';
  features: string[];
  devices: DeviceAllotment[];
}

export interface AllotmentsResponse {
  success: boolean;
  server?: string;
  summary: {
    totalKeys: number;
    totalDevices: number;
    totalSeats: number;
    activeDevicesOnline: number;
  };
  allotments: LicenseAllotmentEntry[];
  isFallback?: boolean;
}

const DEFAULT_CLOUD_ENDPOINT = 'https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check';

// Genuine commercial license keys (no fake devices; only real machines register dynamically)
export const FALLBACK_ALLOTMENTS: LicenseAllotmentEntry[] = [
  {
    licenseKey: 'INVG-PRO-20271231-A9F4',
    tier: 'Commercial Pro',
    tierCode: 'PRO',
    licensedTo: 'S.S. Mali Construction',
    expiresAt: '2027-12-31T23:59:59.000Z',
    totalSeats: 5,
    usedSeats: 0,
    availableSeats: 5,
    status: 'active',
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
    ],
    devices: [],
  },
];

/**
 * Fetches all allotted licenses and registered devices from the Cloud server.
 * Uses fallback only if network/cloud is completely offline.
 */
export async function fetchAllotments(endpoint = DEFAULT_CLOUD_ENDPOINT): Promise<AllotmentsResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${endpoint}?action=get_allotments&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.allotments)) {
        return {
          success: true,
          server: data.server || 'Netlify Edge Cloud',
          summary: data.summary,
          allotments: data.allotments,
          isFallback: false,
        };
      }
    }
  } catch {
    // Cloud server unreachable or offline
  }

  // Calculate summary from real fallback state
  let totalDevices = 0;
  let totalSeats = 0;
  let activeDevicesOnline = 0;

  for (const entry of FALLBACK_ALLOTMENTS) {
    totalDevices += entry.devices.length;
    totalSeats += entry.totalSeats;
    activeDevicesOnline += entry.devices.filter((d) => d.status === 'active').length;
  }

  return {
    success: true,
    server: 'Local Workstation Memory',
    summary: {
      totalKeys: FALLBACK_ALLOTMENTS.length,
      totalDevices,
      totalSeats,
      activeDevicesOnline,
    },
    allotments: FALLBACK_ALLOTMENTS,
    isFallback: true,
  };
}

/**
 * Registers a real device or sends heartbeat for a license key.
 */
export async function registerDeviceOnCloud(
  params: {
    licenseKey: string;
    deviceName: string;
    platform: 'windows' | 'mac' | 'linux';
    osVersion: string;
    arch?: string;
    cpuModel?: string;
    cpuCores?: number;
    ramGB?: string;
    screenResolution?: string;
    timezone?: string;
    username?: string;
    machineId: string;
    ipAddress?: string;
    location?: string;
    appVersion?: string;
  },
  endpoint = DEFAULT_CLOUD_ENDPOINT
): Promise<{ success: boolean; message: string; device?: DeviceAllotment; allotment?: LicenseAllotmentEntry }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_device',
        ...params,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not reach Cloud function',
    };
  }
}

/**
 * Revokes a device allotment on Cloud.
 */
export async function revokeDeviceOnCloud(
  licenseKey: string,
  deviceId: string,
  endpoint = DEFAULT_CLOUD_ENDPOINT
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'revoke_device',
        licenseKey,
        deviceId,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not revoke on Cloud server',
    };
  }
}

/**
 * Generates and allots a new commercial license key on Cloud.
 */
export async function allotKeyOnCloud(
  params: {
    tierCode: 'PRO' | 'ENT' | 'DEV' | 'LIFE' | 'TRIAL';
    licensedTo: string;
    daysValid: number;
    licenseKey?: string;
    totalSeats?: number;
    expiresAt?: string;
  },
  endpoint = DEFAULT_CLOUD_ENDPOINT
): Promise<{ success: boolean; message: string; key?: string; allotment?: LicenseAllotmentEntry }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'allot_key',
        ...params,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to allot license key on Cloud',
    };
  }
}
