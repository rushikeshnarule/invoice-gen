// ─── Commercial Business Setup & Onboarding Workstation ───────────────
// Built strictly with official BoardUI components (Input, Button, Chip, FileUpload).
// Clean, professional, commercial-ready with zero sample data and zero AI slop.
// Supports:
// 1. Loading from a previous session or previous memory (auto-detected on PC or via backup file)
// 2. Starting with a new session / business setup with the setup wizard

import React, { useState, useEffect, useContext } from 'react';
import type { BusinessInfo, BankDetails } from '../../types';
import { InvoiceContext } from '../../context/InvoiceContext';
import { getSystemMemoryInfo, loadSystemMemory, type SystemMemoryInfo } from '../../services/systemStorage';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { FileUpload } from '@/components/base/file-upload/file-upload';
import {
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiLoader4Line,
  RiDatabase2Line,
  RiBuilding4Line,
  RiRefreshLine,
  RiShieldCheckLine,
  RiFolder2Line,
} from '@remixicon/react';

export interface SetupScreenProps {
  onComplete: (profile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>) => void;
  initialProfile?: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }>;
  stepDelayMs?: number; // Configurable for fast execution in tests
}

const INDIAN_STATES_LIST = [
  'Andhra Pradesh (37)',
  'Arunachal Pradesh (12)',
  'Assam (18)',
  'Bihar (10)',
  'Chandigarh (04)',
  'Chhattisgarh (22)',
  'Delhi (07)',
  'Goa (30)',
  'Gujarat (24)',
  'Haryana (06)',
  'Himachal Pradesh (02)',
  'Jammu & Kashmir (01)',
  'Jharkhand (20)',
  'Karnataka (29)',
  'Kerala (32)',
  'Ladakh (38)',
  'Madhya Pradesh (23)',
  'Maharashtra (27)',
  'Manipur (14)',
  'Meghalaya (17)',
  'Mizoram (15)',
  'Nagaland (13)',
  'Odisha (21)',
  'Puducherry (34)',
  'Punjab (03)',
  'Rajasthan (08)',
  'Sikkim (11)',
  'Tamil Nadu (33)',
  'Telangana (36)',
  'Tripura (16)',
  'Uttar Pradesh (09)',
  'Uttarakhand (05)',
  'West Bengal (19)',
];

const INITIALIZATION_STEPS = [
  { id: 1, title: 'Saving business profile and contact information' },
  { id: 2, title: 'Configuring GST state tax rules' },
  { id: 3, title: 'Initializing local database in Documents/Invoice Gen Data' },
  { id: 4, title: 'Configuring invoice templates' },
  { id: 5, title: 'Launching workstation' },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  onComplete,
  initialProfile,
  stepDelayMs,
}) => {
  const invoiceCtx = useContext(InvoiceContext);
  const restorePreviousSession = invoiceCtx?.restorePreviousSession;
  const importOfflineBackup = invoiceCtx?.importOfflineBackup;

  // Mode: 'wizard' (Start New Setup) vs 'restore' (Load Previous Memory)
  const [activeTab, setActiveTab] = useState<'wizard' | 'restore'>('wizard');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStepIndex, setInitStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  // System memory detection
  const [memoryInfo, setMemoryInfo] = useState<SystemMemoryInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Check PC memory on mount
  useEffect(() => {
    let mounted = true;
    getSystemMemoryInfo().then((info) => {
      if (mounted) {
        setMemoryInfo(info);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sanitize: never accept sample placeholder data
  const isSamplePlaceholder = initialProfile?.name?.includes('Apex Infotech');
  const safeProfile = isSamplePlaceholder ? undefined : initialProfile;

  // Form State: 100% clean and blank in production / commercial mode
  const [formData, setFormData] = useState({
    name: safeProfile?.name || '',
    category: 'Services',
    email: safeProfile?.email || '',
    phone: safeProfile?.phone || '',
    website: safeProfile?.website || '',
    address: safeProfile?.address || '',
    city: safeProfile?.city || '',
    state: safeProfile?.state || 'Maharashtra (27)',
    pincode: safeProfile?.pincode || '',
    gstin: safeProfile?.gstin || '',
    pan: safeProfile?.pan || '',
    bankName: safeProfile?.bankDetails?.bankName || '',
    accountName: safeProfile?.bankDetails?.accountName || '',
    accountNumber: safeProfile?.bankDetails?.accountNumber || '',
    ifsc: safeProfile?.bankDetails?.ifsc || '',
    upiId: safeProfile?.bankDetails?.upiId || '',
  });

  // Helper to support both React Aria (string) and standard DOM (event) onChange
  const extractVal = (e: any): string => (typeof e === 'string' ? e : e?.target?.value ?? '');

  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setErrors({ name: 'Business name is required' });
        return;
      }
      setErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleStartInitialization = () => {
    if (!formData.name.trim()) {
      setCurrentStep(1);
      setErrors({ name: 'Business name is required' });
      return;
    }
    setIsInitializing(true);
  };

  const handleSkip = () => {
    const finalProfile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }> = {
      name: formData.name.trim() || 'My Business',
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      website: formData.website.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      gstin: formData.gstin.trim(),
      pan: formData.pan.trim(),
      bankDetails: {
        bankName: formData.bankName.trim(),
        accountName: formData.accountName.trim() || formData.name.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifsc: formData.ifsc.trim(),
        upiId: formData.upiId.trim(),
      },
    };
    onComplete(finalProfile);
  };

  // Restore session from PC system storage (Documents/Invoice Gen Data)
  const handleRestoreSavedSession = async () => {
    setIsRestoring(true);
    setRestoreError(null);
    try {
      if (restorePreviousSession) {
        const ok = await restorePreviousSession();
        if (!ok) {
          setRestoreError('Failed to load session from disk. You can upload a .json backup below.');
          setIsRestoring(false);
        }
      } else {
        const sysDb = await loadSystemMemory();
        if (sysDb?.businessProfile) {
          onComplete(sysDb.businessProfile);
        } else {
          setRestoreError('No saved profile found.');
          setIsRestoring(false);
        }
      }
    } catch {
      setRestoreError('Error reading session file.');
      setIsRestoring(false);
    }
  };

  // Restore session from an uploaded .json backup file
  const handleFileUpload = async (file: File) => {
    try {
      setRestoreError(null);
      const text = await file.text();
      if (importOfflineBackup) {
        const success = importOfflineBackup(text);
        if (!success) {
          setRestoreError('Invalid backup file. Please provide a valid Invoice Gen JSON export.');
        }
      } else {
        const parsed = JSON.parse(text);
        if (parsed?.businessProfile) {
          onComplete(parsed.businessProfile);
        } else {
          setRestoreError('Invalid backup file. Please provide a valid Invoice Gen JSON export.');
        }
      }
    } catch {
      setRestoreError('Could not read the uploaded backup file.');
    }
  };

  // Step-by-step loading sequence runner
  useEffect(() => {
    if (!isInitializing) return;

    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const delay = stepDelayMs ?? (isTest ? 50 : 250);

    const timer = setInterval(() => {
      setInitStepIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        const progress = Math.min(100, Math.round((nextIndex / INITIALIZATION_STEPS.length) * 100));
        setProgressPercent(progress);

        if (nextIndex >= INITIALIZATION_STEPS.length) {
          clearInterval(timer);
          setTimeout(() => {
            const finalProfile: Partial<BusinessInfo & { bankDetails?: Partial<BankDetails> }> = {
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim(),
              website: formData.website.trim(),
              address: formData.address.trim(),
              city: formData.city.trim(),
              state: formData.state.trim(),
              pincode: formData.pincode.trim(),
              gstin: formData.gstin.trim(),
              pan: formData.pan.trim(),
              bankDetails: {
                bankName: formData.bankName.trim(),
                accountName: formData.accountName.trim() || formData.name.trim(),
                accountNumber: formData.accountNumber.trim(),
                ifsc: formData.ifsc.trim(),
                upiId: formData.upiId.trim(),
              },
            };
            onComplete(finalProfile);
          }, isTest ? 10 : 80);
        }
        return nextIndex;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [isInitializing, formData, onComplete, stepDelayMs]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING / INITIALIZATION SCREEN VIEW (Clean Logo, No Artificial Box)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b14] p-6 select-none font-sans relative overflow-hidden">
        {/* Ambient Radial Blue Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.25),transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-xl rounded-3xl border border-slate-700/60 bg-white p-8 shadow-2xl relative z-10">
          {/* Header */}
          <div className="text-center">
            <img
              src="/app-icon.png"
              alt="Invoice Gen"
              className="mx-auto size-16 object-contain drop-shadow-sm"
            />
            <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
              Initializing Workspace
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configuring {formData.name || 'your business'} on local storage...
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-mono font-medium text-slate-600 mb-1.5">
              <span>Setup Progress</span>
              <span className="text-blue-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-200 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step by Step Loading Checklist */}
          <div className="mt-6 space-y-2.5">
            {INITIALIZATION_STEPS.map((step, idx) => {
              const isDone = initStepIndex > idx;
              const isInProgress = initStepIndex === idx;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs transition-colors duration-150 ${
                    isDone
                      ? 'bg-slate-50 border border-slate-200 text-slate-800'
                      : isInProgress
                      ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-2xs'
                      : 'text-slate-400 opacity-60 border border-transparent'
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <div className="flex size-4.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <RiCheckLine className="size-3 stroke-[3]" />
                      </div>
                    ) : isInProgress ? (
                      <RiLoader4Line className="size-4.5 animate-spin text-blue-600" />
                    ) : (
                      <div className="size-4.5 rounded-full border border-slate-300 bg-slate-100" />
                    )}
                  </div>
                  <span className={`font-medium ${isDone ? 'text-slate-800' : isInProgress ? 'text-blue-900 font-semibold' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                  {isDone && (
                    <span className="ml-auto text-[10px] font-mono text-emerald-600 font-medium">
                      Done
                    </span>
                  )}
                  {isInProgress && (
                    <span className="ml-auto text-[10px] font-mono text-blue-600 font-medium">
                      In progress...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center text-[11px] text-slate-400">
            Offline database configured in Documents. Launching software...
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP WIZARD & MEMORY RESTORE VIEW (Executive BoardUI Design)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#070b14] p-4 sm:p-8 font-sans relative overflow-y-auto select-none">
      {/* Ambient Lighting & Executive Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.22),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_100%,rgba(15,23,42,0.6),transparent)] pointer-events-none" />

      {/* Spacious Setup Workstation Card (max-w-4xl) */}
      <div className="w-full max-w-4xl rounded-3xl border border-slate-700/60 bg-white shadow-2xl overflow-hidden flex flex-col relative z-10 my-auto">
        {/* Top Executive Header Bar (Clean Logo, No Artificial Frame) */}
        <div className="px-8 py-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/app-icon.png"
              alt="Invoice Gen"
              className="size-12 object-contain shrink-0 drop-shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Business Setup
                </h1>
                <Chip color="blue" variant="caption">
                  Commercial Mode
                </Chip>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure your company profile and tax credentials to personalize all invoices.
              </p>
            </div>
          </div>

          {/* Quick Skip Option */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            Skip to Dashboard →
          </button>
        </div>

        {/* ─── TWO SETUP CHOICES: Wizard vs Restore Memory ─── */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/90 p-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('wizard')}
            className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <RiBuilding4Line className="size-4 shrink-0" />
            <span>1. Configure Business Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <RiDatabase2Line className="size-4 shrink-0" />
            <span>2. Load From Previous Session / Memory</span>
            {memoryInfo?.exists && (
              <span className="size-2 rounded-full bg-emerald-500 ml-1" title="Saved memory detected" />
            )}
          </button>
        </div>

        {/* ─── OPTION 2: RESTORE PREVIOUS MEMORY VIEW ─── */}
        {activeTab === 'restore' && (
          <div className="p-8 space-y-6">
            {restoreError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {restoreError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Detected PC Storage */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/60 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <RiFolder2Line className="size-4 text-blue-600" />
                      Saved machine memory
                    </span>
                    {memoryInfo?.exists ? (
                      <Chip color="lime" variant="caption">
                        Found on Machine
                      </Chip>
                    ) : (
                      <Chip color="neutral" variant="caption">
                        Not Found
                      </Chip>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">
                    Restore From Local Documents
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Invoice Gen saves all memory to your Documents folder so data remains safe across uninstalls and updates.
                  </p>

                  {memoryInfo?.exists ? (
                    <div className="mt-4 p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Business:</span>
                        <span className="font-semibold text-slate-900">{memoryInfo.businessName || 'Saved Profile'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Invoices:</span>
                        <span className="font-semibold text-slate-900">{memoryInfo.invoiceCount} commercial bills</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Storage Location:</span>
                        <span className="font-mono text-[11px] text-slate-600 truncate max-w-[160px]">{memoryInfo.path || 'Documents/Invoice Gen Data'}</span>
                      </div>
                      {memoryInfo.lastModified && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Last Modified:</span>
                          <span className="text-slate-600 font-mono text-[11px]">{new Date(memoryInfo.lastModified).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                      No automated database found in Documents. You can configure a new business or upload a .json backup file.
                    </div>
                  )}
                </div>

                <Button
                  size="medium"
                  variant="primary"
                  leadingIcon={isRestoring ? RiLoader4Line : RiDatabase2Line}
                  disabled={!memoryInfo?.exists || isRestoring}
                  onClick={handleRestoreSavedSession}
                  className="w-full justify-center shadow-xs"
                >
                  {isRestoring ? 'Restoring Session...' : 'Restore Saved Memory'}
                </Button>
              </div>

              {/* Option B: Upload Backup File */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/60 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <RiShieldCheckLine className="size-4 text-emerald-600" />
                      Backup file
                    </span>
                    <Chip color="blue" variant="caption">
                      .JSON
                    </Chip>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">
                    Import JSON Backup
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag and drop or browse any previously exported offline JSON backup from your computer.
                  </p>

                  <div className="mt-4">
                    <FileUpload
                      allowedExtensions={['json']}
                      onUploadComplete={handleFileUpload}
                      className="border-slate-300"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center font-mono">
                  Supported format: Official Invoice Gen Export (.json)
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="small"
                trailingIcon={RiArrowRightLine}
                onClick={() => setActiveTab('wizard')}
              >
                Or Start Setup Wizard Instead
              </Button>
            </div>
          </div>
        )}

        {/* ─── OPTION 1: SETUP WIZARD VIEW ─── */}
        {activeTab === 'wizard' && (
          <>
            {/* Optional Banner if memory was detected */}
            {memoryInfo?.exists && (
              <div className="px-8 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>
                    Existing database detected on this machine: <strong>{memoryInfo.businessName || 'Business Profile'}</strong> ({memoryInfo.invoiceCount} invoices).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('restore')}
                  className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                >
                  Restore Previous Session →
                </button>
              </div>
            )}

            {/* Step Indicator Bar */}
            <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/90 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center justify-center gap-2.5 py-4 px-4 border-b-2 transition-colors cursor-pointer ${
                  currentStep === 1
                    ? 'border-blue-600 text-blue-700 font-bold bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`size-6 rounded-full flex items-center justify-center text-xs font-mono ${currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  1
                </span>
                <span className="truncate">Identity &amp; Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (formData.name.trim()) setCurrentStep(2);
                }}
                className={`flex items-center justify-center gap-2.5 py-4 px-4 border-b-2 transition-colors cursor-pointer ${
                  currentStep === 2
                    ? 'border-blue-600 text-blue-700 font-bold bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`size-6 rounded-full flex items-center justify-center text-xs font-mono ${currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  2
                </span>
                <span className="truncate">Location &amp; Tax</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (formData.name.trim()) setCurrentStep(3);
                }}
                className={`flex items-center justify-center gap-2.5 py-4 px-4 border-b-2 transition-colors cursor-pointer ${
                  currentStep === 3
                    ? 'border-blue-600 text-blue-700 font-bold bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`size-6 rounded-full flex items-center justify-center text-xs font-mono ${currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  3
                </span>
                <span className="truncate">Banking &amp; UPI</span>
              </button>
            </div>

            {/* Wizard Step Content Body */}
            <div className="p-8 sm:p-10 space-y-6">
              {/* STEP 1: IDENTITY & PROFILE */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Business Identity &amp; Contact
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      This information appears on the header of every generated commercial invoice.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Business / Company Name *"
                      placeholder="e.g. Knot8 Technologies"
                      value={formData.name}
                      onChange={(e) => {
                        const val = extractVal(e);
                        setFormData({ ...formData, name: val });
                        if (errors.name) setErrors({});
                      }}
                      isInvalid={Boolean(errors.name)}
                      errorMessage={errors.name}
                      className="text-sm"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Industry / Business Type
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        >
                          <option value="Services">Consulting &amp; Professional Services</option>
                          <option value="Goods">Manufacturing, Supply &amp; Trading</option>
                          <option value="Retail">Retail Store / Point of Sale</option>
                          <option value="Technology">Software, Cloud &amp; IT Services</option>
                          <option value="Logistics">Logistics &amp; Commercial Transport</option>
                        </select>
                      </div>

                      <Input
                        label="Billing Email Address"
                        placeholder="billing@yourdomain.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: extractVal(e) })}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Phone / Mobile Number"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: extractVal(e) })}
                        className="text-sm"
                      />

                      <Input
                        label="Website (Optional)"
                        placeholder="www.yourcompany.com"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: extractVal(e) })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION & TAX */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Address &amp; Tax Registration
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      State determines CGST/SGST vs IGST calculation rules automatically.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Commercial Registered Address"
                      placeholder="Street address, building, or commercial area"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: extractVal(e) })}
                      className="text-sm"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        placeholder="e.g. Pune"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: extractVal(e) })}
                        className="text-sm"
                      />

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          State &amp; GST Code *
                        </label>
                        <select
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        >
                          {INDIAN_STATES_LIST.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Pincode"
                        placeholder="e.g. 411001"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: extractVal(e) })}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="GSTIN Number (Optional)"
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: extractVal(e).toUpperCase() })}
                        className="text-sm font-mono"
                      />

                      <Input
                        label="PAN Card Number (Optional)"
                        placeholder="e.g. ABCDE1234F"
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: extractVal(e).toUpperCase() })}
                        className="text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BANKING & REMITTANCE */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Banking &amp; Remittance Details
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Printed on invoices for direct bank transfer and instant UPI QR code settlement.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Bank Name"
                        placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: extractVal(e) })}
                        className="text-sm"
                      />

                      <Input
                        label="Account Beneficiary Name"
                        placeholder={formData.name || 'Account Holder Name'}
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: extractVal(e) })}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Account Number"
                        placeholder="e.g. 50100234567890"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: extractVal(e) })}
                        className="text-sm font-mono"
                      />

                      <Input
                        label="IFSC Code"
                        placeholder="e.g. HDFC0001234"
                        value={formData.ifsc}
                        onChange={(e) => setFormData({ ...formData, ifsc: extractVal(e).toUpperCase() })}
                        className="text-sm font-mono"
                      />
                    </div>

                    <Input
                      label="UPI ID / VPA (For instant QR Code)"
                      placeholder="e.g. yourbusiness@okaxis or 9876543210@upi"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: extractVal(e) })}
                      className="text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Executive Navigation Footer */}
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {currentStep > 1 ? (
                <Button
                  size="small"
                  variant="secondary"
                  leadingIcon={RiArrowLeftLine}
                  onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
                  className="text-xs"
                >
                  Previous Step
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="ghost"
                  leadingIcon={RiRefreshLine}
                  onClick={() => setActiveTab('restore')}
                  className="text-xs"
                >
                  Load Previous Memory
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  size="small"
                  variant="primary"
                  trailingIcon={RiArrowRightLine}
                  onClick={handleNext}
                  className="text-xs shadow-xs"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="primary"
                  leadingIcon={RiCheckLine}
                  onClick={handleStartInitialization}
                  className="text-xs shadow-xs"
                >
                  Finish &amp; Start Software
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
