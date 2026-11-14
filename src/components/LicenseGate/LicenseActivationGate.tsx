// ─── Commercial License Activation Gate ──────────────────────────────────────
// Strict access control: Workstation remains locked until a valid Commercial Pro key is activated.
// Crisp, clean light interface designed according to unslop principles (quiet chrome, zero AI slop).

import React, { useState, useEffect } from 'react';
import {
  RiKey2Line,
  RiComputerLine,
  RiArrowRightLine,
  RiErrorWarningLine,
} from '@remixicon/react';
import { useLicense } from '@/context/LicenseContext';
import { getRealMachineInfo, type MachineInfo } from '@/services/machineDetector';
import { toast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/buttons/button';

export const LicenseActivationGate: React.FC = () => {
  const { activateLicense, isLoading, isOnline } = useLicense();
  const [inputKey, setInputKey] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    void getRealMachineInfo().then((info) => {
      setMachineInfo(info);
    });
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputKey(text.trim().toUpperCase());
        setErrorMessage(null);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim().toUpperCase();

    if (!trimmed) {
      setErrorMessage('Please enter a valid commercial license key.');
      return;
    }

    setErrorMessage(null);
    setIsActivating(true);

    try {
      const result = await activateLicense(trimmed);

      if (result.success) {
        toast.success(result.message || 'Workstation unlocked successfully.');
      } else {
        setErrorMessage(result.message || 'The license key provided is invalid or rejected.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Activation failed. Please check your key or internet connection.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden my-auto">
        {/* Header / Brand Top Banner */}
        <div className="px-6 py-6 border-b border-slate-100 bg-white">
          <div className="flex items-start gap-4">
            <img
              src="/app-icon.png"
              alt="Invoice Gen"
              className="size-10 object-contain shrink-0 rounded-xl shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-600">
                  Invoice Gen Workstation
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Locked
                </span>
              </div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                Commercial License Required
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your Commercial Pro license key to unlock this workstation and access client billing,
                tax invoicing, and consolidated accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Machine Hardware Telemetry Card */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <RiComputerLine className="size-3.5 text-slate-500" />
              Target Workstation Hardware
            </span>
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isOnline ? 'Cloud Server Connected' : 'Offline Validation Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-500">Computer:</span>
              <span className="font-mono font-medium text-slate-900 truncate ml-2">
                {machineInfo?.deviceName || 'Detecting...'}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-slate-500">System:</span>
              <span className="font-medium text-slate-900 truncate ml-2">
                {machineInfo?.platform === 'windows' ? 'Windows 11 / 10' : machineInfo?.platform === 'mac' ? 'macOS' : 'Linux'}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between sm:col-span-2">
              <span className="text-slate-500">Machine ID:</span>
              <span className="font-mono text-[11px] text-slate-700 truncate ml-2">
                {machineInfo?.machineId || 'Detecting hardware GUID...'}
              </span>
            </div>
          </div>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="license-key-input" className="text-xs font-medium text-slate-700">
                Commercial License Key
              </label>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={handlePaste}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Paste from clipboard
              </Button>
            </div>

            <div className="relative">
              <input
                id="license-key-input"
                type="text"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value.toUpperCase());
                  setErrorMessage(null);
                }}
                placeholder="INVG-PRO-YYYYMMDD-XXXX"
                className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-wider text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />
              <RiKey2Line className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <RiErrorWarningLine className="size-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="medium"
              variant="primary"
              disabled={isActivating || isLoading}
              trailingIcon={RiArrowRightLine}
              className="w-full justify-center text-sm font-semibold"
            >
              {isActivating || isLoading ? 'Verifying & Activating...' : 'Activate & Unlock Workstation'}
            </Button>
          </div>

          {/* Footer Notice */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            <span>Need a commercial license? Contact your software vendor or organization administrator.</span>
          </div>
        </form>
      </div>
    </div>
  );
};
