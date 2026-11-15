"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  RiBuildingLine,
  RiFileTextLine,
  RiBankCardLine,
  RiShieldCheckLine,
  RiDatabase2Line,
  RiCloseLine,
  RiCheckboxCircleFill,
  RiDownload2Line,
  RiUpload2Line,
  RiRefreshLine,
  RiQrCodeLine,
  RiImageLine,
  RiCloudLine,
  RiWifiLine,
  RiWifiOffLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiShieldKeyholeLine,
  RiSparklingFill,
} from "@remixicon/react";
import { SettingsUpdatesTab } from "./settings-updates-tab";
import { cx } from "@/utils/cx";
import { useInvoices } from "@/context/InvoiceContext";
import { useLicense } from "@/context/LicenseContext";
import { toast } from "@/components/base/toast/toast";
import { Button } from "@/components/base/buttons/button";
import { ImageUploadCard } from "@/components/base/image-upload/image-upload";
import {
  US_STATES_LIST,
  formatEIN,
  formatRoutingNumber,
  formatUSZip,
} from "@/utils/usTax";
import type { AppRegion } from "@/types";
import {
  getRemoteServerUrl,
  setRemoteServerUrl,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getLastSyncTime,
  getCachedRemoteTemplates,
  deleteRemoteTemplate,
  syncRemoteTemplates,
  REMOTE_TEMPLATES_UPDATED_EVENT,
} from "@/services/templateSyncService";

export type BusinessSettingsTab = "identity" | "branding" | "address" | "banking" | "terms" | "cloud_templates" | "license" | "backup" | "updates";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: BusinessSettingsTab;
}

const SAMPLE_TEMPLATES_JSON = JSON.stringify(
  {
    version: "1.0.0",
    updatedAt: "2026-11-04",
    templates: [
      {
        id: "minimal-gold",
        name: "Minimalist Gold Edition",
        version: "1.0.0",
        description: "Clean gold accents with serif headers and compact GST summary",
        paper: ["A4", "A5"],
        cssUrl: "/assets/minimal-gold.css",
        defaultOptions: {
          accentColor: "#b45309",
          fontFamily: "serif",
          fontSize: "normal",
        },
      },
      {
        id: "express-thermal-pos",
        name: "Express POS Thermal (80mm)",
        version: "1.0.0",
        description: "Ultra compact 80mm thermal receipt with UPI QR code",
        paper: ["Thermal"],
        cssUrl: "/assets/express-thermal.css",
        defaultOptions: {
          accentColor: "#000000",
          fontFamily: "mono",
          fontSize: "small",
        },
      },
    ],
  },
  null,
  2
);

const SAMPLE_HEADERS = `/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Cache-Control: public, max-age=0, must-revalidate`;

const SAMPLE_CSS = `/* Custom Cloud Template Styling */
.remote-invoice-root.theme-remote-minimal-gold {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fdfdfc;
}
.remote-invoice-root.theme-remote-minimal-gold .remote-title {
  color: #b45309;
  letter-spacing: 1px;
}
.remote-invoice-root.theme-remote-minimal-gold .remote-table th {
  background: #fef3c7;
  color: #92400e;
}
.remote-invoice-root.theme-remote-minimal-gold .remote-grand-total {
  color: #b45309;
  border-color: #b45309;
}`;

const TABS: { id: BusinessSettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "identity", label: "Business Identity", icon: RiBuildingLine },
  { id: "branding", label: "Logo, Stamp & Sign", icon: RiImageLine },
  { id: "address", label: "GST & Address", icon: RiFileTextLine },
  { id: "banking", label: "Bank & UPI QR", icon: RiBankCardLine },
  { id: "terms", label: "Invoice Terms", icon: RiShieldCheckLine },
  { id: "cloud_templates", label: "Cloud Templates", icon: RiCloudLine },
  { id: "license", label: "License & Cloud", icon: RiShieldKeyholeLine },
  { id: "backup", label: "Data & Storage", icon: RiDatabase2Line },
  { id: "updates", label: "Software Updates", icon: RiSparklingFill },
];

export function SettingsModal({
  isOpen,
  onClose,
  defaultTab = "identity",
}: SettingsModalProps) {
  const {
    businessProfile,
    updateBusinessProfile,
    invoices,
    clients,
    exportOfflineBackup,
    importOfflineBackup,
    resetToDefaultRealData,
    reopenSetup,
  } = useInvoices();

  const [activeTab, setActiveTab] = useState<BusinessSettingsTab>(defaultTab);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [savedPhase, setSavedPhase] = useState<"idle" | "shown" | "leaving">("idle");
  const panelRef = useRef<HTMLDivElement>(null);

  // Local draft state for business profile
  const [formData, setFormData] = useState({
    name: businessProfile.name || "",
    phone: businessProfile.phone || "",
    email: businessProfile.email || "",
    website: businessProfile.website || "",
    region: (businessProfile.region || ((typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_REGION === "US") ? "US" : "IN")) as AppRegion,
    taxType: businessProfile.taxType || ((businessProfile.region === "US" || (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_REGION === "US")) ? "sales_tax" : "gst"),
    gstin: businessProfile.gstin || "",
    pan: businessProfile.pan || "",
    ein: businessProfile.ein || "",
    stateTaxId: businessProfile.stateTaxId || "",
    address: businessProfile.address || "",
    city: businessProfile.city || "",
    state: businessProfile.state || "",
    pincode: businessProfile.pincode || "",
    bankName: businessProfile.bankDetails?.bankName || "",
    accountName: businessProfile.bankDetails?.accountName || "",
    accountNumber: businessProfile.bankDetails?.accountNumber || "",
    ifsc: businessProfile.bankDetails?.ifsc || "",
    routingNumber: businessProfile.bankDetails?.routingNumber || "",
    branch: businessProfile.bankDetails?.branch || "",
    upiId: businessProfile.bankDetails?.upiId || "",
    zelleId: businessProfile.bankDetails?.zelleId || "",
    paymentLink: businessProfile.bankDetails?.paymentLink || "",
    notes: businessProfile.notes || "",
    terms: businessProfile.terms || "",
    logoUrl: businessProfile.logoUrl || "",
    stampUrl: businessProfile.stampUrl || "",
    signatureUrl: businessProfile.signatureUrl || "",
  });

  const [importJsonText, setImportJsonText] = useState("");

  // License state
  const { license, isOnline: isCloudOnline, verifyLicense, activateLicense } = useLicense();
  const [licenseInput, setLicenseInput] = useState("");
  const [isLicenseVerifying, setIsLicenseVerifying] = useState(false);

  const handleVerifyLicense = async () => {
    setIsLicenseVerifying(true);
    const res = await verifyLicense();
    setIsLicenseVerifying(false);
    if (res.valid) {
      toast.success("License confirmed active via Cloud!");
    } else {
      toast.error(res.message || "License check failed");
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseInput.trim()) return;
    setIsLicenseVerifying(true);
    const res = await activateLicense(licenseInput);
    setIsLicenseVerifying(false);
    if (res.success) {
      toast.success(res.message);
      setLicenseInput("");
    } else {
      toast.error(res.message);
    }
  };

  // Remote Cloud template sync state
  const [remoteServerUrlState, setRemoteServerUrlState] = useState(() => getRemoteServerUrl());
  const [autoSyncState, setAutoSyncState] = useState(() => isAutoSyncEnabled());
  const [cachedTemplates, setCachedTemplates] = useState(() => getCachedRemoteTemplates());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [lastSyncTime, setLastSyncTime] = useState(() => getLastSyncTime());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleTemplatesUpdated = () => {
      setCachedTemplates(getCachedRemoteTemplates());
      setLastSyncTime(getLastSyncTime());
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleTemplatesUpdated);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleTemplatesUpdated);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (!remoteServerUrlState.trim()) {
      toast.error("Please enter your Cloud template server URL first.");
      return;
    }
    setIsSyncing(true);
    try {
      setRemoteServerUrl(remoteServerUrlState);
      setAutoSyncEnabled(autoSyncState);
      const res = await syncRemoteTemplates(remoteServerUrlState);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      setCachedTemplates(getCachedRemoteTemplates());
      setLastSyncTime(getLastSyncTime());
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRemote = (id: string, name: string) => {
    deleteRemoteTemplate(id);
    setCachedTemplates(getCachedRemoteTemplates());
    toast.info(`Removed "${name}" from offline cache`);
  };

  const handleCopySnippet = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${title} to clipboard`);
  };

  // Sync draft whenever modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: businessProfile.name || "",
        phone: businessProfile.phone || "",
        email: businessProfile.email || "",
        website: businessProfile.website || "",
        region: (businessProfile.region || ((typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_REGION === "US") ? "US" : "IN")) as AppRegion,
        taxType: businessProfile.taxType || ((businessProfile.region === "US" || (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_REGION === "US")) ? "sales_tax" : "gst"),
        gstin: businessProfile.gstin || "",
        pan: businessProfile.pan || "",
        ein: businessProfile.ein || "",
        stateTaxId: businessProfile.stateTaxId || "",
        address: businessProfile.address || "",
        city: businessProfile.city || "",
        state: businessProfile.state || "",
        pincode: businessProfile.pincode || "",
        bankName: businessProfile.bankDetails?.bankName || "",
        accountName: businessProfile.bankDetails?.accountName || "",
        accountNumber: businessProfile.bankDetails?.accountNumber || "",
        ifsc: businessProfile.bankDetails?.ifsc || "",
        routingNumber: businessProfile.bankDetails?.routingNumber || "",
        branch: businessProfile.bankDetails?.branch || "",
        upiId: businessProfile.bankDetails?.upiId || "",
        zelleId: businessProfile.bankDetails?.zelleId || "",
        paymentLink: businessProfile.bankDetails?.paymentLink || "",
        notes: businessProfile.notes || "",
        terms: businessProfile.terms || "",
        logoUrl: businessProfile.logoUrl || "",
        stampUrl: businessProfile.stampUrl || "",
        signatureUrl: businessProfile.signatureUrl || "",
      });
    }
  }, [isOpen, businessProfile]);

  // Mount & transition handling
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 15);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showSavedToast = () => {
    setSavedPhase("shown");
    setTimeout(() => setSavedPhase("leaving"), 1500);
    setTimeout(() => setSavedPhase("idle"), 1800);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRemoteServerUrl(remoteServerUrlState);
    setAutoSyncEnabled(autoSyncState);
    updateBusinessProfile({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      website: formData.website.trim(),
      region: formData.region,
      taxType: formData.region === "US" ? "sales_tax" : "gst",
      gstin: formData.gstin.trim(),
      pan: formData.pan.trim(),
      ein: formData.ein.trim(),
      stateTaxId: formData.stateTaxId.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      notes: formData.notes.trim(),
      terms: formData.terms.trim(),
      logoUrl: formData.logoUrl || undefined,
      stampUrl: formData.stampUrl || undefined,
      signatureUrl: formData.signatureUrl || undefined,
      bankDetails: {
        bankName: formData.bankName.trim(),
        accountName: formData.accountName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifsc: formData.ifsc.trim(),
        routingNumber: formData.routingNumber.trim(),
        branch: formData.branch.trim(),
        upiId: formData.upiId.trim(),
        zelleId: formData.zelleId.trim(),
        paymentLink: formData.paymentLink.trim(),
      },
    });

    showSavedToast();
    toast.success("Business profile & settings saved offline");
  };

  const handleExport = () => {
    const json = exportOfflineBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offline-business-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Complete offline database exported");
  };

  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const ok = importOfflineBackup(importJsonText);
    if (ok) {
      setImportJsonText("");
      showSavedToast();
      toast.success("Database restored successfully");
    } else {
      toast.error("Invalid JSON backup structure");
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all invoices and business settings to initial commercial real data?")) {
      resetToDefaultRealData();
      showSavedToast();
      toast.info("Database reset to factory default data");
    }
  };

  const handleReopenSetup = () => {
    if (
      window.confirm(
        "Launch the Business Setup & Restore Wizard? This lets you re-configure your company profile or restore previous sessions detected on this machine."
      )
    ) {
      reopenSetup();
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="presentation"
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/30 backdrop-blur-xs transition-opacity duration-300 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          "relative transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.88] opacity-0 blur-[3px]",
        )}
      >
        {/* Main Panel Shell */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Business Profile & Settings"
          className="flex h-[600px] max-h-[calc(100dvh-32px)] w-[860px] max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-200 outline-none"
        >
          {/* Left Navigation Rail */}
          <nav
            aria-label="Settings categories"
            className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="px-2 pt-1 pb-2 border-b border-slate-200/80">
                <span className="text-xs font-medium text-slate-500 block">
                  Configuration
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5 truncate">
                  {businessProfile.name || "Business Profile"}
                </h3>
                <span className="text-[11px] font-mono text-blue-700 font-semibold block mt-0.5 truncate">
                  {businessProfile.gstin ? `GSTIN: ${businessProfile.gstin}` : "GST Unregistered"}
                </span>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                {TABS.map((tab) => {
                  const isSelected = activeTab === tab.id;
                  const Icon = tab.icon;
                  const label =
                    tab.id === "address" && formData.region === "US"
                      ? "Tax & Address"
                      : tab.id === "banking" && formData.region === "US"
                      ? "Bank & Zelle"
                      : tab.label;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors duration-150",
                        isSelected
                          ? "bg-white text-blue-700 shadow-2xs border border-slate-200/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70",
                      )}
                    >
                      <Icon className={cx("size-4 shrink-0", isSelected ? "text-blue-600" : "text-slate-400")} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Offline App Info Badge */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-800 block">
                {formData.region === "US" ? "🇺🇸 US Edition (USD $)" : "🇮🇳 India Edition (INR ₹)"}
              </span>
              <p className="text-[10px] text-slate-400 leading-snug">
                Data saved in local machine storage. Safe for zero-network environments.
              </p>
            </div>
          </nav>

          {/* Right Content Form Pane */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Header Bar */}
            <div className="h-14 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeTab === "identity" && "Business Identity & Contacts"}
                  {activeTab === "branding" && "Company Logo, Stamp & Signatures"}
                  {activeTab === "address" && (formData.region === "US" ? "Tax Jurisdiction & Address" : "Registered Address & GSTIN")}
                  {activeTab === "banking" && (formData.region === "US" ? "Bank Remittance & Payments (ACH / Zelle)" : "Bank Account & UPI Remittance")}
                  {activeTab === "terms" && "Default Invoice Terms & Notes"}
                  {activeTab === "cloud_templates" && "Cloud Templates"}
                  {activeTab === "license" && "Commercial License & Cloud"}
                  {activeTab === "backup" && "Offline PC Database & Backup"}
                  {activeTab === "updates" && "Software Updates & Releases"}
                </h2>
                <span className="text-xs text-slate-400">
                  {activeTab === "identity" && "Official legal company name and public contact channels"}
                  {activeTab === "branding" && "Visual branding assets rendered on invoices and PDF downloads"}
                  {activeTab === "address" && (formData.region === "US" ? "State sales tax registration, Federal EIN, and business office" : "State tax jurisdiction, GST registration and physical office")}
                  {activeTab === "banking" && (formData.region === "US" ? "Payment details printed on invoices (ABA Routing #, Account #, Zelle)" : "Payment details printed on invoices & automated UPI QR code")}
                  {activeTab === "terms" && "Default boilerplate notes, jurisdiction and terms"}
                  {activeTab === "cloud_templates" && "Fetch templates from Cloud & store offline permanently"}
                  {activeTab === "license" && "Verify commercial subscription status & cloud license key"}
                  {activeTab === "backup" && "JSON export/import and offline local database management"}
                  {activeTab === "updates" && "Check for newer builds and download packages directly from GitHub"}
                </span>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>

            {/* Form Scroll Area */}
            <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* ══════════ TAB 1: IDENTITY ══════════ */}
              {activeTab === "identity" && (
                <div className="space-y-4 max-w-lg">
                  {/* Regional Edition Selector */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Country &amp; Regional Tax Edition
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            region: "US",
                            taxType: "sales_tax",
                            state: prev.state && !prev.state.includes("27") ? prev.state : "California (CA - 7.25%)",
                          }));
                        }}
                        className={cx(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5",
                          formData.region === "US"
                            ? "bg-blue-50/80 border-blue-600 text-blue-900 ring-1 ring-blue-600"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <span className="text-xl">🇺🇸</span>
                        <div>
                          <span className="font-bold text-xs block">United States Edition</span>
                          <span className="text-[10px] text-slate-500 block leading-tight">
                            USD ($), Sales Tax, EIN, ABA Routing &amp; Zelle
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            region: "IN",
                            taxType: "gst",
                            state: prev.state || "Maharashtra",
                          }));
                        }}
                        className={cx(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5",
                          formData.region !== "US"
                            ? "bg-blue-50/80 border-blue-600 text-blue-900 ring-1 ring-blue-600"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <span className="text-xl">🇮🇳</span>
                        <div>
                          <span className="font-bold text-xs block">India Edition</span>
                          <span className="text-[10px] text-slate-500 block leading-tight">
                            INR (₹), GST (CGST/SGST/IGST), PAN &amp; UPI
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Legal Business / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.region === "US" ? "e.g. Acme Cloud Corp." : "e.g. Knot8 Technologies"}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Business Phone Number
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={formData.region === "US" ? "+1 (415) 555-0199" : "+91 98201 54321"}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Billing Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="billing@yourcompany.com"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Company Website
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.yourcompany.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* ══════════ TAB: BRANDING, STAMP & SIGNATURE ══════════ */}
              {activeTab === "branding" && (
                <div className="space-y-4 max-w-lg">
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] text-blue-800 space-y-1">
                    <span className="font-bold block">Workspace Default Branding</span>
                    <p className="text-blue-700 leading-snug">
                      These images will automatically be applied to all new invoices you create. You can also customize them per-invoice in the invoice editor.
                    </p>
                  </div>

                  <ImageUploadCard
                    label="Profile Photo / Company Logo"
                    description="Default logo printed in invoice headers"
                    value={formData.logoUrl}
                    onChange={(val) => setFormData({ ...formData, logoUrl: val || "" })}
                    icon={RiImageLine}
                    aspectHint="Square or horizontal logo (PNG, JPG, SVG)"
                  />

                  <ImageUploadCard
                    label="Official Company Stamp / Seal"
                    description="Default company rubber stamp printed on invoices"
                    value={formData.stampUrl}
                    onChange={(val) => setFormData({ ...formData, stampUrl: val || "" })}
                    icon={RiCheckboxCircleFill}
                    aspectHint="Circular or rectangular rubber seal (transparent PNG)"
                  />

                  <ImageUploadCard
                    label="Authorized Signature"
                    description="Default digital/handwritten signature"
                    value={formData.signatureUrl}
                    onChange={(val) => setFormData({ ...formData, signatureUrl: val || "" })}
                    icon={RiFileTextLine}
                    allowDraw={true}
                    aspectHint="Upload PNG/JPG or draw live on screen"
                  />
                </div>
              )}

              {/* ══════════ TAB 2: ADDRESS & GST / TAX ══════════ */}
              {activeTab === "address" && (
                <div className="space-y-4 max-w-lg">
                  {formData.region === "US" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Federal EIN (Employer ID Number)
                          </label>
                          <input
                            type="text"
                            value={formData.ein}
                            onChange={(e) => setFormData({ ...formData, ein: formatEIN(e.target.value) })}
                            placeholder="12-3456789"
                            maxLength={10}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Format: XX-XXXXXXX</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            State Sales Tax / Permit #
                          </label>
                          <input
                            type="text"
                            value={formData.stateTaxId}
                            onChange={(e) => setFormData({ ...formData, stateTaxId: e.target.value.toUpperCase() })}
                            placeholder="SR-CA-987654"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Optional state license</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Registered Street Address
                        </label>
                        <textarea
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Suite 500, 100 Montgomery St."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="San Francisco"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                          <input
                            type="text"
                            list="us-states-settings-list"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="California (CA)"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                          <datalist id="us-states-settings-list">
                            {US_STATES_LIST.map((s, idx) => (
                              <option key={idx} value={s} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">ZIP Code</label>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: formatUSZip(e.target.value) })}
                            placeholder="94104"
                            maxLength={10}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-mono outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            GSTIN (15-Digit GST Number)
                          </label>
                          <input
                            type="text"
                            value={formData.gstin}
                            onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                            placeholder="27AABCA4567E1ZP"
                            maxLength={15}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Income Tax PAN
                          </label>
                          <input
                            type="text"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                            placeholder="AABCA4567E"
                            maxLength={10}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Registered Street Address
                        </label>
                        <textarea
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Unit 402, Pinnacle Business Park, Andheri East"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Mumbai"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="Maharashtra"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">PIN Code</label>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            placeholder="400069"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════ TAB 3: BANKING & PAYMENTS ══════════ */}
              {activeTab === "banking" && (
                <div className="space-y-4 max-w-lg">
                  {formData.region === "US" ? (
                    <>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-start gap-3">
                        <RiBankCardLine className="size-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-900 block text-xs">US Banking &amp; Remittance Details</span>
                          <p className="text-[11px] text-blue-800 leading-snug">
                            Printed on invoices for ACH direct deposit, Fedwire, Zelle, and online card payments.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            ABA Routing Transit # (9 Digits)
                          </label>
                          <input
                            type="text"
                            value={formData.routingNumber}
                            onChange={(e) => setFormData({ ...formData, routingNumber: formatRoutingNumber(e.target.value) })}
                            placeholder="121000358"
                            maxLength={9}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Fedwire / ACH routing code</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="987654321012"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder="e.g. JPMorgan Chase Bank, N.A."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Account Holder / Beneficiary
                          </label>
                          <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="e.g. Acme Cloud Corp."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Zelle ID (Email or Phone)
                          </label>
                          <input
                            type="text"
                            value={formData.zelleId}
                            onChange={(e) => setFormData({ ...formData, zelleId: e.target.value })}
                            placeholder="billing@yourcompany.com"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Payment Link / Portal URL
                          </label>
                          <input
                            type="text"
                            value={formData.paymentLink}
                            onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                            placeholder="https://buy.stripe.com/..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-start gap-3">
                        <RiQrCodeLine className="size-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-900 block text-xs">Automatic UPI QR Generator</span>
                          <p className="text-[11px] text-blue-800 leading-snug">
                            Configuring your UPI ID automatically embeds a dynamic scan-and-pay QR code on every printed invoice and receipt.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          UPI ID / VPA (Primary Scan-to-Pay) *
                        </label>
                        <input
                          type="text"
                          value={formData.upiId}
                          onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                          placeholder="e.g. yourcompany@upi"
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 font-mono text-blue-900 font-bold text-xs bg-blue-50/20 outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder="HDFC Bank Ltd."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            IFSC Code
                          </label>
                          <input
                            type="text"
                            value={formData.ifsc}
                            onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                            placeholder="HDFC0000123"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="e.g. Knot8 Technologies"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="50200045612389"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          placeholder="Andheri East Branch, Mumbai"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════ TAB 4: TERMS & CONDITIONS ══════════ */}
              {activeTab === "terms" && (
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Default Customer Notes
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Thank you for your business. Payment is expected within 30 days."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Standard Terms &amp; Conditions
                    </label>
                    <textarea
                      rows={4}
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="1. Goods once sold will not be accepted back.&#10;2. Overdue interest @ 18% p.a.&#10;3. Disputes subject to local jurisdiction."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 outline-none font-mono text-[11px] focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* ══════════ TAB 5: CLOUD TEMPLATES ══════════ */}
              {activeTab === "cloud_templates" && (
                <div className="space-y-4 max-w-lg">
                  {/* Status Banner */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <RiWifiLine className="size-3.5 text-emerald-600" />
                          Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <RiWifiOffLine className="size-3.5 text-amber-600" />
                          Offline (Using Cached)
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        • {cachedTemplates.length} {cachedTemplates.length === 1 ? "template" : "templates"} stored offline
                      </span>
                    </div>

                    {lastSyncTime && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Synced: {new Date(lastSyncTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Server URL Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cloud Template Server URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={remoteServerUrlState}
                        onChange={(e) => setRemoteServerUrlState(e.target.value)}
                        placeholder="https://cloud-templates.example.com"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="primary"
                        leadingIcon={RiRefreshLine}
                        disabled={isSyncing || !isOnline}
                        onClick={handleTriggerSync}
                      >
                        {isSyncing ? "Syncing..." : "Sync from Cloud"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enter the root Cloud URL or direct link to templates.json. Assets will be downloaded once and cached permanently offline.
                    </p>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={autoSyncState}
                      onChange={(e) => setAutoSyncState(e.target.checked)}
                      className="size-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Auto-Sync when Internet Connects
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Whenever your device gets an active internet connection, it checks for updated templates in the background.
                      </span>
                    </div>
                  </label>

                  {/* Cached Templates List */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">
                        Offline Stored Templates ({cachedTemplates.length})
                      </span>
                    </div>

                    {cachedTemplates.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50/40">
                        <RiCloudLine className="size-6 text-slate-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-700">No Cloud templates cached yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Enter your Cloud URL above and click &quot;Sync from Cloud&quot; to download template assets for 100% offline use.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
                        {cachedTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-800 truncate">
                                  {tpl.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  v{tpl.version}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  Cached Offline
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {tpl.description || "Custom remote template"} • Paper: {tpl.paper?.join(", ") || "A4"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteRemote(tpl.id, tpl.name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                              title="Delete from offline storage"
                            >
                              <RiDeleteBinLine className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cloud Deployment Quick-Start Guide */}
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200/70 space-y-2">
                    <span className="font-bold text-xs text-blue-900 block">
                      How to Host Custom Templates on Cloud (Free &amp; 2 Minutes)
                    </span>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      1. Create a folder with <strong>templates.json</strong>, <strong>_headers</strong>, and your CSS files.
                      <br />
                      2. Host your folder on your static cloud hosting provider.
                      <br />
                      3. Copy your Cloud URL and paste it in the box above!
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(SAMPLE_TEMPLATES_JSON, "templates.json format")}
                        className="text-[10px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RiFileCopyLine className="size-3" />
                        Copy templates.json
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(SAMPLE_HEADERS, "_headers CORS file")}
                        className="text-[10px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RiFileCopyLine className="size-3" />
                        Copy _headers file
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(SAMPLE_CSS, "sample template.css")}
                        className="text-[10px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RiFileCopyLine className="size-3" />
                        Copy sample template.css
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ TAB 7: LICENSE & CLOUD ══════════ */}
              {activeTab === "license" && (
                <div className="space-y-4 max-w-lg">
                  {/* Current Active License */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Subscription Tier
                        </span>
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {license.tier}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              license.status === "active"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {license.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {isCloudOnline ? (
                          <>
                            <span className="size-2 rounded-full bg-emerald-500"></span>
                            <span className="text-[11px] font-medium text-emerald-700">Cloud Connected</span>
                          </>
                        ) : (
                          <>
                            <span className="size-2 rounded-full bg-amber-500"></span>
                            <span className="text-[11px] font-medium text-amber-700">Offline Fallback</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/80">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Edition:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                          {license.tier}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Validity:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {license.daysRemaining > 9000
                            ? "Perpetual Lifetime"
                            : license.expiresAt
                            ? `Valid until ${license.expiresAt.slice(0, 10)}`
                            : "Active"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Active Key:</span>
                        <code className="font-mono text-[11px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                          {license.licenseKey
                            ? `${license.licenseKey.slice(0, 9)}••••••••${license.licenseKey.slice(-4)}`
                            : "None"}
                        </code>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Cloud License Verification
                      </span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        leadingIcon={RiRefreshLine}
                        disabled={isLicenseVerifying}
                        onClick={handleVerifyLicense}
                      >
                        {isLicenseVerifying ? "Verifying..." : "Verify with Cloud"}
                      </Button>
                    </div>
                  </div>

                  {/* Activate or Change Key */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Activate / Change License Key
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value)}
                        placeholder="INVG-PRO-20271231-A9F4"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="primary"
                        leadingIcon={RiShieldKeyholeLine}
                        disabled={isLicenseVerifying || !licenseInput.trim()}
                        onClick={handleActivateLicense}
                      >
                        Activate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ TAB 8: BACKUP & DATABASE ══════════ */}
              {activeTab === "backup" && (
                <div className="space-y-4 max-w-lg">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block">Offline Database Statistics</span>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Active Invoices: <strong>{invoices.length} records</strong></div>
                      <div>Saved Clients: <strong>{clients.length} profiles</strong></div>
                      <div>Storage: <strong>Browser Local Storage (Offline PC)</strong></div>
                      <div>Network Calls: <strong>0 (100% Offline)</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block text-xs">Setup & Restore Wizard</span>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        leadingIcon={RiRefreshLine}
                        onClick={handleReopenSetup}
                      >
                        Launch Setup Wizard
                      </Button>
                    </div>
                    <p className="text-xs text-slate-600">
                      Re-open the setup workstation to re-configure your business details or restore previous sessions detected in your Documents folder.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      size="small"
                      variant="primary"
                      leadingIcon={RiDownload2Line}
                      onClick={handleExport}
                    >
                      Export Full Backup (JSON)
                    </Button>

                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      leadingIcon={RiRefreshLine}
                      onClick={handleReset}
                    >
                      Factory Reset Data
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Restore from Backup File (Paste JSON)
                    </label>
                    <textarea
                      rows={3}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='Paste JSON backup here...'
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[10px] text-slate-900 outline-none focus:border-blue-600 mb-2"
                    />
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      leadingIcon={RiUpload2Line}
                      onClick={handleImport}
                    >
                      Restore Backup
                    </Button>
                  </div>
                </div>
              )}

              {/* ══════════ TAB 9: SOFTWARE UPDATES ══════════ */}
              {activeTab === "updates" && <SettingsUpdatesTab />}

              {/* Save Footer Button */}
              {activeTab !== "backup" && activeTab !== "license" && activeTab !== "updates" && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Changes apply immediately to newly generated invoices and QR codes.
                  </span>
                  <Button
                    type="submit"
                    size="small"
                    variant="primary"
                    leadingIcon={RiCheckboxCircleFill}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Floating Saved Toast Indicator */}
        <div
          aria-live="polite"
          className={cx(
            "pointer-events-none absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5",
            "rounded-full border border-slate-200 bg-white py-1.5 pe-3 ps-2 shadow-lg",
            "transition-[opacity,transform] duration-200 ease-out",
            savedPhase === "shown" && "translate-y-1/2 opacity-100 scale-100",
            savedPhase === "leaving" && "translate-y-0 opacity-0 scale-95",
            savedPhase === "idle" && "translate-y-2 opacity-0 pointer-events-none",
          )}
        >
          <RiCheckboxCircleFill className="size-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-800">Changes Saved Offline</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
