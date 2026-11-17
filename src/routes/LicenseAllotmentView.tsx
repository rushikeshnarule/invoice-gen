// ─── Executive BoardUI License Allotment & Device Management Panel ──────────
// High-density directory to inspect allotted commercial license keys, registered hardware devices,
// seat capacities, and real-time Cloud server activations.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllotments,
  registerDeviceOnCloud,
  revokeDeviceOnCloud,
  allotKeyOnCloud,
  type LicenseAllotmentEntry,
  type DeviceAllotment,
} from '@/services/licenseAllotmentService';
import { getRealMachineInfo, type MachineInfo } from '@/services/machineDetector';
import { useNativeBackButton } from '@/hooks/useNativeBackButton';
import { haptics } from '@/services/nativeMobileService';

// Official BoardUI Components
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Badge } from '@/components/base/badges/badge';
import { SearchField } from '@/components/base/search-field/search-field';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { toast } from '@/components/base/toast/toast';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';

// Remix Icons
import {
  RiShieldCheckLine,
  RiComputerLine,
  RiWindowsFill,
  RiAppleFill,
  RiServerLine,
  RiUser3Line,
  RiTimeLine,
  RiMapPinLine,
  RiRefreshLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiCheckLine,
  RiArrowLeftLine,
  RiCloudLine,
} from '@remixicon/react';

export const LicenseAllotmentView: React.FC = () => {
  const navigate = useNavigate();

  const [allotments, setAllotments] = useState<LicenseAllotmentEntry[]>([]);
  const [summary, setSummary] = useState({
    totalKeys: 0,
    totalDevices: 0,
    totalSeats: 0,
    activeDevicesOnline: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [serverSource, setServerSource] = useState('Cloud Serverless');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'has_seats'>('all');

  // Modals
  const [allotKeyModalOpen, setAllotKeyModalOpen] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    tierCode: 'PRO' as 'PRO' | 'ENT' | 'DEV' | 'LIFE',
    licensedTo: '',
    daysValid: 365,
  });

  const [currentMachine, setCurrentMachine] = useState<MachineInfo | null>(null);

  const [allotDeviceModalKey, setAllotDeviceModalKey] = useState<LicenseAllotmentEntry | null>(null);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceName: '',
    platform: 'windows' as 'windows' | 'mac' | 'linux',
    osVersion: 'Windows 11 Pro 64-bit',
    machineId: '',
    location: 'Pune, Maharashtra',
  });

  const [revokingDevice, setRevokingDevice] = useState<{
    licenseKey: string;
    device: DeviceAllotment;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect real local machine telemetry on mount
  useEffect(() => {
    void getRealMachineInfo().then((m) => {
      setCurrentMachine(m);
      setNewDeviceForm({
        deviceName: m.deviceName,
        platform: m.platform,
        osVersion: m.osVersion,
        machineId: m.machineId,
        location: m.location || 'Pune, Maharashtra',
      });
    });
  }, []);

  // Load Allotments from Netlify Cloud
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    const res = await fetchAllotments();
    setAllotments(res.allotments);
    setSummary(res.summary);
    setServerSource(res.server || 'Cloud Serverless');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy Key Helper
  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('License key copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered allotments
  const filteredAllotments = useMemo(() => {
    return allotments.filter((entry) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        entry.licenseKey.toLowerCase().includes(q) ||
        entry.licensedTo.toLowerCase().includes(q) ||
        entry.tier.toLowerCase().includes(q) ||
        entry.devices.some(
          (d) =>
            d.deviceName.toLowerCase().includes(q) ||
            d.machineId.toLowerCase().includes(q) ||
            d.ipAddress.toLowerCase().includes(q) ||
            d.location.toLowerCase().includes(q)
        );

      const matchesTier =
        tierFilter === 'all' ||
        entry.tierCode.toLowerCase() === tierFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && entry.devices.some((d) => d.status === 'active')) ||
        (statusFilter === 'has_seats' && entry.availableSeats > 0);

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [allotments, searchQuery, tierFilter, statusFilter]);

  // Handle Allot New Key Submit
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyForm.licensedTo.trim()) {
      toast.error('Please enter the client or company name');
      return;
    }

    setIsSubmitting(true);
    const res = await allotKeyOnCloud({
      tierCode: newKeyForm.tierCode,
      licensedTo: newKeyForm.licensedTo.trim(),
      daysValid: Number(newKeyForm.daysValid) || 365,
    });
    setIsSubmitting(false);

    if (res.success && res.allotment) {
      toast.success(res.message);
      setAllotments((prev) => [res.allotment!, ...prev]);
      setAllotKeyModalOpen(false);
      setNewKeyForm({ tierCode: 'PRO', licensedTo: '', daysValid: 365 });
      loadData(true);
    } else {
      toast.error(res.message || 'Failed to allot license key');
    }
  };

  // Handle Allot Device Submit
  const handleAllotDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotDeviceModalKey) return;
    if (!newDeviceForm.deviceName.trim()) {
      toast.error('Please provide a device or computer name');
      return;
    }

    const machineId =
      newDeviceForm.machineId.trim() ||
      `MACH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    setIsSubmitting(true);
    const res = await registerDeviceOnCloud({
      licenseKey: allotDeviceModalKey.licenseKey,
      deviceName: newDeviceForm.deviceName.trim(),
      platform: newDeviceForm.platform,
      osVersion: newDeviceForm.osVersion.trim(),
      machineId,
      location: newDeviceForm.location.trim(),
      appVersion: 'v1.3.2',
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setAllotDeviceModalKey(null);
      setNewDeviceForm({
        deviceName: '',
        platform: 'windows',
        osVersion: 'Windows 11 Pro 64-bit',
        machineId: '',
        location: 'Pune, Maharashtra',
      });
      loadData(true);
    } else {
      toast.error(res.message || 'Could not register device');
    }
  };

  // Handle Revoke Device Submit
  const handleConfirmRevoke = async () => {
    if (!revokingDevice) return;
    setIsSubmitting(true);
    const res = await revokeDeviceOnCloud(
      revokingDevice.licenseKey,
      revokingDevice.device.id
    );
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setRevokingDevice(null);
      loadData(true);
    } else {
      toast.error(res.message || 'Could not revoke device allotment');
    }
  };

  useNativeBackButton(
    'license-allotment-modal',
    () => {
      if (revokingDevice) {
        setRevokingDevice(null);
        return true;
      }
      if (allotDeviceModalKey) {
        setAllotDeviceModalKey(null);
        return true;
      }
      if (allotKeyModalOpen) {
        setAllotKeyModalOpen(false);
        return true;
      }
      navigate('/invoices');
      return true;
    },
    true,
    110
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-5">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <Button
                size="small"
                variant="ghost"
                leadingIcon={RiArrowLeftLine}
                onClick={() => {
                  haptics.light();
                  navigate('/invoices');
                }}
                className="mr-1 text-slate-500 hover:text-slate-900"
              >
                Back
              </Button>
              <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <RiShieldCheckLine className="size-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight text-balance">
                License Allotments &amp; Device Directory
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                {allotments.length} keys
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl text-pretty">
              Serverless commercial license manager. Monitor active computer allotments, hardware machine IDs, IP addresses, and seat quotas in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiRefreshLine}
              onClick={() => {
                haptics.light();
                loadData();
              }}
              disabled={isLoading}
              className="text-xs font-medium"
            >
              {isLoading ? 'Syncing...' : 'Sync Cloud'}
            </Button>

            <Button
              size="small"
              variant="primary"
              leadingIcon={RiAddLine}
              onClick={() => {
                haptics.light();
                setAllotKeyModalOpen(true);
              }}
              className="text-xs shadow-xs font-semibold"
            >
              Allot License Key
            </Button>
          </div>
        </div>

        {/* ─── SUMMARY KPI METRICS ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Allotted License Keys</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900 font-mono tracking-tight tabular-nums">
                {summary.totalKeys}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Issued</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Registered Devices</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-blue-700 font-mono tracking-tight tabular-nums">
                {summary.totalDevices}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Machines</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Active Devices Online</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-emerald-700 font-mono tracking-tight tabular-nums flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500"></span>
                {summary.activeDevicesOnline}
              </span>
              <span className="text-[11px] text-emerald-600 font-mono">Connected</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Seats In-Use</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-900 font-mono tracking-tight tabular-nums">
                {summary.totalDevices} / {summary.totalSeats}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Capacity</span>
            </div>
          </div>
        </div>

        {/* ─── SEARCH & FILTER TOOLBAR ─── */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="w-72">
            <SearchField
              aria-label="Search allotted license keys or devices"
              placeholder="Search by key, client, device or IP..."
              value={searchQuery}
              onChange={setSearchQuery}
              size="small"
            />
          </div>

          {/* Tier Segmented Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <SegmentedControl
              aria-label="Filter by Tier"
              selectedKeys={new Set([tierFilter])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) setTierFilter(val as string);
              }}
              className="bg-slate-100 p-0.5"
            >
              <SegmentedControlItem id="all" className="text-xs">
                All Tiers
              </SegmentedControlItem>
              <SegmentedControlItem id="pro" className="text-xs">
                Pro
              </SegmentedControlItem>
              <SegmentedControlItem id="ent" className="text-xs">
                Enterprise
              </SegmentedControlItem>
              <SegmentedControlItem id="life" className="text-xs">
                Lifetime
              </SegmentedControlItem>
              <SegmentedControlItem id="dev" className="text-xs">
                Dev
              </SegmentedControlItem>
            </SegmentedControl>

            {/* Quick Status Filters */}
            <SegmentedControl
              aria-label="Filter status"
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) setStatusFilter(String(val) as any);
              }}
              className="bg-slate-100 p-0.5"
            >
              <SegmentedControlItem id="all" className="text-xs px-2.5 py-1">
                All Status
              </SegmentedControlItem>
              <SegmentedControlItem id="active" className="text-xs px-2.5 py-1">
                Online Devices
              </SegmentedControlItem>
              <SegmentedControlItem id="has_seats" className="text-xs px-2.5 py-1">
                Seats Available
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>

        {/* ─── ALLOTTED LICENSES & REGISTERED DEVICES DIRECTORY ─── */}
        <div className="space-y-4">
          {filteredAllotments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <RiComputerLine className="size-8 mx-auto text-slate-400 mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No matching license allotments found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search query or tier filters.
              </p>
            </div>
          ) : (
            filteredAllotments.map((entry) => {
              const seatPercent = Math.round((entry.usedSeats / entry.totalSeats) * 100);

              return (
                <div
                  key={entry.licenseKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100"
                >
                  {/* License Key Header Row */}
                  <div className="p-4 sm:p-5 bg-slate-50/60 flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <code className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs font-bold text-slate-900 select-all shadow-2xs">
                          {entry.licenseKey}
                        </code>
                        <IconButton
                          icon={copiedKey === entry.licenseKey ? RiCheckLine : RiFileCopyLine}
                          size="small"
                          aria-label="Copy License Key"
                          title="Copy License Key"
                          onClick={() => handleCopy(entry.licenseKey)}
                          className={copiedKey === entry.licenseKey ? 'text-emerald-600' : 'text-slate-400'}
                        />
                        <Badge
                          color={
                            entry.tierCode === 'LIFE'
                              ? 'primary'
                              : entry.tierCode === 'ENT'
                              ? 'neutral'
                              : 'primary'
                          }
                        >
                          {entry.tier}
                        </Badge>
                        <Chip
                          color={entry.status === 'active' ? 'lime' : 'rose'}
                          variant="caption"
                        >
                          {entry.status.toUpperCase()}
                        </Chip>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2 pt-0.5">
                        <RiUser3Line className="size-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{entry.licensedTo}</span>
                        <span>•</span>
                        <RiTimeLine className="size-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500 tabular-nums">
                          Expires: {entry.expiresAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Seats & Allot Device Action */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                          {entry.usedSeats} of {entry.totalSeats} Seats Used
                        </div>
                        <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              seatPercent >= 100
                                ? 'bg-rose-500'
                                : seatPercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, seatPercent)}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiAddLine}
                        disabled={entry.availableSeats <= 0}
                        onClick={() => {
                          setAllotDeviceModalKey(entry);
                          setNewDeviceForm({
                            deviceName: '',
                            platform: 'windows',
                            osVersion: 'Windows 11 Pro 64-bit',
                            machineId: `WIN-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                            location: 'Maharashtra, India',
                          });
                        }}
                        className="text-xs font-semibold"
                      >
                        Allot Device
                      </Button>
                    </div>
                  </div>

                  {/* Registered Devices List */}
                  <div>
                    {entry.devices.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-400 bg-slate-50/50">
                        <RiComputerLine className="size-6 mx-auto mb-1 text-slate-300" />
                        <span className="font-medium text-slate-600 block">No physical hardware devices registered yet</span>
                        <span className="text-[11px] text-slate-400">Launch the desktop app with this key to register your computer automatically in real time.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {entry.devices.map((device) => {
                          const isOnline = device.status === 'active';
                          const isThisMachine = currentMachine && currentMachine.machineId === device.machineId;

                          return (
                            <div
                              key={device.id}
                              className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                            >
                              {/* Left: Device Hardware & OS Info */}
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="size-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                  {device.platform === 'mac' ? (
                                    <RiAppleFill className="size-5 text-slate-800" />
                                  ) : device.platform === 'windows' ? (
                                    <RiWindowsFill className="size-5 text-blue-600" />
                                  ) : (
                                    <RiServerLine className="size-5 text-slate-600" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs text-slate-900 font-mono truncate">
                                      {device.deviceName}
                                    </span>
                                    {isThisMachine && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                        This PC
                                      </span>
                                    )}
                                    {isOnline ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <span className="size-1 rounded-full bg-emerald-500"></span>
                                        Online
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                        Offline
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      {device.appVersion}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate flex-wrap">
                                    <span>{device.osVersion}</span>
                                    <span>•</span>
                                    <span className="font-mono text-slate-600">ID: {device.machineId}</span>
                                    {device.cpuModel && (
                                      <>
                                        <span>•</span>
                                        <span>{device.cpuModel} {device.ramGB ? `• ${device.ramGB}` : ''}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <RiMapPinLine className="size-3 text-slate-400 shrink-0" />
                                    <span>{device.ipAddress} ({device.location})</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Heartbeat & Revoke Action */}
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right text-[11px] text-slate-500 tabular-nums">
                                  <span className="block text-slate-400 text-[10px]">Last Heartbeat</span>
                                  <span className="font-mono text-slate-700">
                                    {device.lastActiveAt.slice(0, 10)} {device.lastActiveAt.slice(11, 16)}
                                  </span>
                                </div>

                                <IconButton
                                  icon={RiDeleteBinLine}
                                  size="small"
                                  aria-label={`Revoke device ${device.deviceName}`}
                                  title="Revoke Device Allotment"
                                  onClick={() =>
                                    setRevokingDevice({
                                      licenseKey: entry.licenseKey,
                                      device,
                                    })
                                  }
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Server Endpoint Status Bar */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-[11px]">
            <RiCloudLine className="size-4 text-blue-600" />
            <span>Connected to Cloud Engine ({serverSource})</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Netlify Serverless Function active
          </span>
        </div>
      </div>

      {/* ─── MODAL 1: ALLOT NEW LICENSE KEY ─── */}
      <Modal
        isOpen={allotKeyModalOpen}
        onOpenChange={(open) => !open && setAllotKeyModalOpen(false)}
        size="md"
      >
        <ModalHeader
          title="Allot New Commercial License Key"
          description="Generate a cryptographically-signed license key with dedicated seat allocations."
        />
        <form onSubmit={handleCreateKey}>
          <ModalBody className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Licensed Company / Client Name *
              </label>
              <input
                type="text"
                required
                value={newKeyForm.licensedTo}
                onChange={(e) => setNewKeyForm((p) => ({ ...p, licensedTo: e.target.value }))}
                placeholder="e.g. S.S. Mali Construction or BootXTech Pvt Ltd"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  License Tier
                </label>
                <select
                  value={newKeyForm.tierCode}
                  onChange={(e) => setNewKeyForm((p) => ({ ...p, tierCode: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="PRO">Commercial Pro (5 Seats)</option>
                  <option value="ENT">Enterprise Unlimited (50 Seats)</option>
                  <option value="LIFE">Lifetime Perpetual (100 Seats)</option>
                  <option value="DEV">Developer Edition (2 Seats)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Validity Duration
                </label>
                <select
                  value={newKeyForm.daysValid}
                  onChange={(e) => setNewKeyForm((p) => ({ ...p, daysValid: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value={365}>1 Year (365 Days)</option>
                  <option value={730}>2 Years (730 Days)</option>
                  <option value={1095}>3 Years (1095 Days)</option>
                  <option value={36500}>Perpetual (100 Years)</option>
                </select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAllotKeyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Allotting...' : 'Generate Key'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── MODAL 2: ALLOT DEVICE TO LICENSE KEY ─── */}
      <Modal
        isOpen={Boolean(allotDeviceModalKey)}
        onOpenChange={(open) => !open && setAllotDeviceModalKey(null)}
        size="md"
      >
        <ModalHeader
          title="Allot Hardware Device to License"
          description={`Register a computer workstation under ${allotDeviceModalKey?.tier} (${allotDeviceModalKey?.availableSeats} seats remaining).`}
        />
        <form onSubmit={handleAllotDevice}>
          <ModalBody className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Computer / Device Name *
              </label>
              <input
                type="text"
                required
                value={newDeviceForm.deviceName}
                onChange={(e) => setNewDeviceForm((p) => ({ ...p, deviceName: e.target.value }))}
                placeholder="e.g. BILLING-DESKTOP-01 or ACCOUNTS-LAPTOP"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-600 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Operating Platform
                </label>
                <select
                  value={newDeviceForm.platform}
                  onChange={(e) => setNewDeviceForm((p) => ({ ...p, platform: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value="windows">Windows (11 / 10 / Server)</option>
                  <option value="mac">macOS (Apple Silicon / Intel)</option>
                  <option value="linux">Linux Workstation</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  OS &amp; Build
                </label>
                <input
                  type="text"
                  value={newDeviceForm.osVersion}
                  onChange={(e) => setNewDeviceForm((p) => ({ ...p, osVersion: e.target.value }))}
                  placeholder="Windows 11 Pro 64-bit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Hardware Machine ID
                </label>
                <input
                  type="text"
                  value={newDeviceForm.machineId}
                  onChange={(e) => setNewDeviceForm((p) => ({ ...p, machineId: e.target.value }))}
                  placeholder="WIN-MALI-8890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Device Location
                </label>
                <input
                  type="text"
                  value={newDeviceForm.location}
                  onChange={(e) => setNewDeviceForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Pune, Maharashtra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAllotDeviceModalKey(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Allot Device'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── MODAL 3: REVOKE DEVICE CONFIRMATION ─── */}
      <Modal
        isOpen={Boolean(revokingDevice)}
        onOpenChange={(open) => !open && setRevokingDevice(null)}
        size="sm"
      >
        <ModalHeader
          title="Revoke Device Allotment"
          description={`Are you sure you want to revoke allotment for "${revokingDevice?.device.deviceName}"?`}
        />
        <ModalBody className="text-xs text-slate-600 space-y-2">
          <p>
            Revoking this device will free up 1 seat on license <code className="font-mono font-bold text-slate-800">{revokingDevice?.licenseKey}</code>.
          </p>
          <p className="text-[11px] text-slate-500">
            Machine ID: <span className="font-mono">{revokingDevice?.device.machineId}</span> ({revokingDevice?.device.location})
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevokingDevice(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isSubmitting}
            onClick={handleConfirmRevoke}
          >
            {isSubmitting ? 'Revoking...' : 'Revoke Allotment'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
