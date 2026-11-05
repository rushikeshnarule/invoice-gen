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
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { useInvoices } from "@/context/InvoiceContext";
import { toast } from "@/components/base/toast/toast";
import { Button } from "@/components/base/buttons/button";
import { ImageUploadCard } from "@/components/base/image-upload/image-upload";
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

export type BusinessSettingsTab = "identity" | "branding" | "address" | "banking" | "terms" | "backup" | "cloud_templates";

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

const SAMPLE_CSS = `/* Custom Netlify Template Styling */
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
  { id: "cloud_templates", label: "Netlify Templates", icon: RiCloudLine },
  { id: "backup", label: "Data & Storage", icon: RiDatabase2Line },
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
    gstin: businessProfile.gstin || "",
    pan: businessProfile.pan || "",
    address: businessProfile.address || "",
    city: businessProfile.city || "",
    state: businessProfile.state || "",
    pincode: businessProfile.pincode || "",
    bankName: businessProfile.bankDetails?.bankName || "",
    accountName: businessProfile.bankDetails?.accountName || "",
    accountNumber: businessProfile.bankDetails?.accountNumber || "",
    ifsc: businessProfile.bankDetails?.ifsc || "",
    branch: businessProfile.bankDetails?.branch || "",
    upiId: businessProfile.bankDetails?.upiId || "",
    notes: businessProfile.notes || "",
    terms: businessProfile.terms || "",
    logoUrl: businessProfile.logoUrl || "",
    stampUrl: businessProfile.stampUrl || "",
    signatureUrl: businessProfile.signatureUrl || "",
  });

  const [importJsonText, setImportJsonText] = useState("");

  // Remote Netlify template sync state
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
      toast.error("Please enter your Netlify template server URL first.");
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
        gstin: businessProfile.gstin || "",
        pan: businessProfile.pan || "",
        address: businessProfile.address || "",
        city: businessProfile.city || "",
        state: businessProfile.state || "",
        pincode: businessProfile.pincode || "",
        bankName: businessProfile.bankDetails?.bankName || "",
        accountName: businessProfile.bankDetails?.accountName || "",
        accountNumber: businessProfile.bankDetails?.accountNumber || "",
        ifsc: businessProfile.bankDetails?.ifsc || "",
        branch: businessProfile.bankDetails?.branch || "",
        upiId: businessProfile.bankDetails?.upiId || "",
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
      gstin: formData.gstin.trim(),
      pan: formData.pan.trim(),
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
        branch: formData.branch.trim(),
        upiId: formData.upiId.trim(),
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
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Offline App Info Badge */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-800 block">Offline PC Edition</span>
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
                  {activeTab === "address" && "Registered Address & GSTIN"}
                  {activeTab === "banking" && "Bank Account & UPI Remittance"}
                  {activeTab === "terms" && "Default Invoice Terms & Notes"}
                  {activeTab === "cloud_templates" && "Netlify Cloud Templates"}
                  {activeTab === "backup" && "Offline PC Database & Backup"}
                </h2>
                <span className="text-xs text-slate-400">
                  {activeTab === "identity" && "Official legal company name and public contact channels"}
                  {activeTab === "branding" && "Visual branding assets rendered on invoices and PDF downloads"}
                  {activeTab === "address" && "State tax jurisdiction, GST registration and physical office"}
                  {activeTab === "banking" && "Payment details printed on invoices & automated UPI QR code"}
                  {activeTab === "terms" && "Default boilerplate notes, jurisdiction and terms"}
                  {activeTab === "cloud_templates" && "Fetch templates from Netlify & store offline permanently"}
                  {activeTab === "backup" && "JSON export/import and offline local database management"}
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
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Legal Business / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Knot8 Technologies"
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
                        placeholder="+91 98201 54321"
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

              {/* ══════════ TAB 2: ADDRESS & GST ══════════ */}
              {activeTab === "address" && (
                <div className="space-y-4 max-w-lg">
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
                </div>
              )}

              {/* ══════════ TAB 3: BANKING & UPI ══════════ */}
              {activeTab === "banking" && (
                <div className="space-y-4 max-w-lg">
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

              {/* ══════════ TAB 5: NETLIFY CLOUD TEMPLATES ══════════ */}
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
                      Netlify Template Server URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={remoteServerUrlState}
                        onChange={(e) => setRemoteServerUrlState(e.target.value)}
                        placeholder="https://my-invoice-templates.netlify.app"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="gradient"
                        leadingIcon={RiRefreshLine}
                        disabled={isSyncing || !isOnline}
                        onClick={handleTriggerSync}
                      >
                        {isSyncing ? "Syncing..." : "Sync from Netlify"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enter the root Netlify URL or direct link to templates.json. Assets will be downloaded once and cached permanently offline.
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
                        <p className="font-semibold text-slate-700">No Netlify templates cached yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Enter your Netlify URL above and click &quot;Sync from Netlify&quot; to download template assets for 100% offline use.
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

                  {/* Netlify Deployment Quick-Start Guide */}
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200/70 space-y-2">
                    <span className="font-bold text-xs text-blue-900 block">
                      How to Host Custom Templates on Netlify (Free &amp; 2 Minutes)
                    </span>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      1. Create a folder with <strong>templates.json</strong>, <strong>_headers</strong>, and your CSS files.
                      <br />
                      2. Go to <strong>app.netlify.com/drop</strong> and drag-drop your folder.
                      <br />
                      3. Copy the URL given by Netlify and paste it in the box above!
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

              {/* ══════════ TAB 6: BACKUP & DATABASE ══════════ */}
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

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      size="small"
                      variant="gradient"
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

              {/* Save Footer Button */}
              {activeTab !== "backup" && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Changes apply immediately to newly generated invoices and QR codes.
                  </span>
                  <Button
                    type="submit"
                    size="small"
                    variant="gradient"
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
