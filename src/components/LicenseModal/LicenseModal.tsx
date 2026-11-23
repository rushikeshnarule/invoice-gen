import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  RiKey2Line,
  RiCloudLine,
  RiWifiLine,
  RiWifiOffLine,
  RiRefreshLine,
  RiCheckLine,
  RiFileCopyLine,
  RiTimeLine,
  RiUser3Line,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { useLicense } from "@/context/LicenseContext";
import { toast } from "@/components/base/toast/toast";
import { Button } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { CloseButton } from "@/components/base/buttons/close-button";

export interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LicenseModal({ isOpen, onClose }: LicenseModalProps) {
  const {
    license,
    isLoading,
    isOnline,
    verifyLicense,
    activateLicense,
    deactivateLicense,
    checkServerConnection,
    isFeatureEnabled,
  } = useLicense();

  const [inputKey, setInputKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    let handle: number;
    if (isOpen) {
      handle = requestAnimationFrame(() => setVisible(true));
      checkServerConnection();
    } else {
      handle = requestAnimationFrame(() => setVisible(false));
    }
    return () => {
      if (handle) cancelAnimationFrame(handle);
    };
  }, [isOpen, checkServerConnection]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleCopyKey = () => {
    if (!license.licenseKey) return;
    navigator.clipboard.writeText(license.licenseKey).then(() => {
      setCopiedKey(true);
      toast.success("License key copied to clipboard");
      setTimeout(() => setCopiedKey(false), 2000);
    }).catch(() => {
      toast.error("Could not copy license key to clipboard");
    });
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKey.trim()) {
      toast.error("Please enter a valid license key");
      return;
    }
    setIsVerifying(true);
    const result = await activateLicense(inputKey);
    setIsVerifying(false);

    if (result.success) {
      toast.success(result.message);
      setInputKey("");
    } else {
      toast.error(result.message);
    }
  };

  const handleRecheckCloud = async () => {
    if (!license?.licenseKey?.trim()) {
      toast.error("No active license key registered to verify");
      return;
    }
    setIsVerifying(true);
    const serverOk = await checkServerConnection();
    const result = await verifyLicense(license.licenseKey);
    setIsVerifying(false);

    if (result.valid) {
      toast.success(serverOk ? "License confirmed active via Cloud!" : "Verified offline via local cryptographic signature");
    } else {
      toast.error(result.message || "License check failed");
    }
  };

  const featuresList = [
    { id: "commercial_invoicing", label: "Commercial GST & Tax Invoicing", desc: "Full compliance, CGST/SGST/IGST & HSN lookup" },
    { id: "consolidated_monthly", label: "Consolidated Monthly Invoicing", desc: "Custom date ranges & multi-invoice aggregation" },
    { id: "excel_export", label: "Excel Spreadsheets Export (.xlsx)", desc: "A4 portrait print-ready formatting & formulas" },
    { id: "pdf_print", label: "High-Resolution PDF & Thermal POS", desc: "Print engine with UPI payment QR integration" },
    { id: "client_ledger", label: "Client Statement & Ledgers", desc: "Balance due tracking & payment reconciliations" },
    { id: "custom_themes", label: "Cloud Theme Synchronization", desc: "Dynamic CSS theme bundles loaded from Cloud" },
  ];

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-200",
        visible ? "bg-slate-900/60 backdrop-blur-sm opacity-100" : "bg-transparent opacity-0 pointer-events-none"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800",
          "flex flex-col max-h-[calc(100vh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden transition-all duration-200",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/app-icon.png"
              alt="Invoice Gen"
              className="size-9 object-contain shrink-0 rounded-xl"
            />
            <div>
              <h2 id="license-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100 text-balance">
                License Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
                Commercial software license &amp; Cloud verification
              </p>
            </div>
          </div>
          <CloseButton
            onClick={onClose}
            aria-label="Close dialog"
            size="sm"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* Active License Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current License Tier
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5 text-balance">
                  {license.tier}
                  {license.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  ) : license.status === "expired" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                      Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Unregistered
                    </span>
                  )}
                </h3>
              </div>

              {/* Cloud Connection Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                {isOnline ? (
                  <>
                    <RiWifiLine className="size-3.5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                      Cloud Online
                    </span>
                  </>
                ) : (
                  <>
                    <RiWifiOffLine className="size-3.5 text-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                      Offline Mode
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* License details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <RiUser3Line className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Licensee:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {license.licensedTo}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <RiTimeLine className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Validity:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {license.daysRemaining > 9000
                    ? "Perpetual (Never expires)"
                    : license.expiresAt
                    ? `Valid until ${license.expiresAt.slice(0, 10)}`
                    : "Active"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                <RiKey2Line className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Active Key:</span>
                <code className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                  {license.licenseKey
                    ? `${license.licenseKey.slice(0, 9)}••••••••${license.licenseKey.slice(-4)}`
                    : "None"}
                </code>
                {license.licenseKey && (
                  <IconButton
                    size="small"
                    icon={copiedKey ? RiCheckLine : RiFileCopyLine}
                    onClick={handleCopyKey}
                    aria-label="Copy full license key"
                    title="Copy Full License Key"
                    className="size-6 p-0 border-0 shadow-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  />
                )}
              </div>
            </div>

            {/* Cloud Verification Footer */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <RiCloudLine className="size-3.5 text-blue-600" />
                <span>{license.serverMessage || "Verified via Cloud licensing server"}</span>
              </span>
              <Button
                type="button"
                size="small"
                variant="secondary"
                leadingIcon={RiRefreshLine}
                disabled={isVerifying || isLoading}
                onClick={handleRecheckCloud}
              >
                {isVerifying ? "Verifying..." : "Verify with Cloud"}
              </Button>
            </div>
          </div>

          {/* Activate License Key Form */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Activate License Key
            </h4>
            <form onSubmit={handleActivate} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="e.g. INVG-PRO-20271231-A9F4"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <Button
                  type="submit"
                  size="small"
                  variant="primary"
                  leadingIcon={RiKey2Line}
                  disabled={isVerifying || !inputKey.trim()}
                >
                  {isVerifying ? "Activating..." : "Activate Key"}
                </Button>
              </div>
            </form>
          </div>

          {/* Included Features */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Included Commercial Entitlements
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {featuresList.map((f) => {
                const enabled = isFeatureEnabled(f.id);
                return (
                  <div
                    key={f.id}
                    className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40"
                  >
                    <div
                      className={cx(
                        "size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-slate-100 text-slate-400"
                      )}
                    >
                      <RiCheckLine className="size-3" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{f.label}</div>
                      <div className="text-[10px] text-slate-500">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="small"
              variant="ghost"
              onClick={deactivateLicense}
            >
              Deactivate Key
            </Button>
          </div>

          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
