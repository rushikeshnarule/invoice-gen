import React, { useState } from 'react';
import type {
  ThemeOptions,
  ThemeFontFamily,
  ThemeFontSize,
  LogoPosition,
  WatermarkType,
  PaperSize,
} from '../../types';
import { ACCENT_PALETTE } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../themes';

// BoardUI components
import { SwitchCard } from '@/components/base/switch/switch-card';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { Button } from '@/components/base/buttons/button';
import { toast } from '@/components/base/toast/toast';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';
import {
  RiTableLine,
  RiBankCardLine,
  RiSave3Line,
  RiDownload2Line,
  RiUpload2Line,
  RiQrCodeLine,
  RiFileList3Line,
  RiShieldCheckLine,
  RiImageLine,
  RiRefreshLine,
} from '@remixicon/react';

interface ThemeOptionsPanelProps {
  themeId: string;
  options: ThemeOptions;
  onChange: (options: Partial<ThemeOptions>) => void;
  onReset: () => void;
}

export const ThemeOptionsPanel: React.FC<ThemeOptionsPanelProps> = ({
  themeId,
  options,
  onChange,
  onReset,
}) => {
  const { presets, savePreset, loadPreset, deletePreset, exportPresets, importPresets } = useTheme();
  const theme = getTheme(themeId);
  const [activeTab, setActiveTab] = useState<'styling' | 'columns' | 'footer' | 'presets'>('styling');
  const [newPresetName, setNewPresetName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    savePreset(newPresetName.trim());
    toast.success(`Preset "${newPresetName.trim()}" saved`);
    setNewPresetName('');
  };

  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-theme-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Presets exported to JSON');
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) return;
    const ok = importPresets(importJsonText);
    if (ok) {
      setImportJsonText('');
      setShowImportModal(false);
      toast.success('Presets imported successfully');
    } else {
      toast.error('Failed to import: Invalid JSON preset structure');
    }
  };

  const isThermal = themeId === 'thermal' || (Array.isArray(theme.paper) && theme.paper.includes('80mm') && !theme.paper.includes('A4'));

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 border-l border-slate-200 w-[380px] shrink-0">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Theme Customization
          </span>
          <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>{theme.name}</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {theme.paper.join(' / ')}
            </span>
          </h3>
        </div>

        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiRefreshLine}
          onClick={onReset}
          className="text-xs font-medium"
        >
          Reset
        </Button>
      </div>

      {/* BoardUI Tab Bar */}
      <div className="px-5 pt-3 pb-2.5 border-b border-slate-100 bg-slate-50/50">
        <SegmentedControl
          aria-label="Theme Customization Tabs"
          selectedKeys={new Set([activeTab])}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setActiveTab(String(val) as any);
          }}
          className="w-full bg-slate-200/70 p-0.5"
        >
          <SegmentedControlItem id="styling" className="text-xs font-medium">
            Styling
          </SegmentedControlItem>
          <SegmentedControlItem id="columns" className="text-xs font-medium">
            Columns
          </SegmentedControlItem>
          <SegmentedControlItem id="footer" className="text-xs font-medium">
            Payment
          </SegmentedControlItem>
          <SegmentedControlItem id="presets" className="text-xs font-medium">
            Presets
          </SegmentedControlItem>
        </SegmentedControl>
      </div>

      {/* Inspector Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
        {/* ─── TAB 1: STYLING ─── */}
        {activeTab === 'styling' && (
          <div className="space-y-4">
            {/* Accent Color Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Accent Colour
                </span>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {options.accentColor.toUpperCase()}
                </span>
              </div>

              {/* 10-Color Palette Swatches */}
              <div className="grid grid-cols-5 gap-2 mb-2.5">
                {ACCENT_PALETTE.map((hex) => {
                  const isSelected = hex.toLowerCase() === options.accentColor.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChange({ accentColor: hex })}
                      className={`h-8 rounded-lg transition-all relative flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-slate-900 scale-105 shadow-sm'
                          : 'hover:scale-102 border border-black/10'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    >
                      {isSelected && <span className="size-2 rounded-full bg-white shadow" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Input */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <input
                  type="color"
                  value={options.accentColor}
                  onChange={(e) => onChange({ accentColor: e.target.value })}
                  className="size-7 rounded border border-slate-300 bg-transparent cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={options.accentColor}
                  onChange={(e) => onChange({ accentColor: e.target.value })}
                  placeholder="#2563EB"
                  maxLength={7}
                  className="flex-1 bg-transparent text-slate-900 font-mono text-xs outline-none"
                />
              </div>
            </div>

            {/* Typography Family */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Font Family
              </label>
              <SegmentedControl
                aria-label="Font Family"
                selectedKeys={new Set([options.fontFamily])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) onChange({ fontFamily: String(val) as ThemeFontFamily });
                }}
                className="w-full bg-slate-100 p-0.5"
              >
                <SegmentedControlItem id="system" className="text-xs">
                  System
                </SegmentedControlItem>
                <SegmentedControlItem id="inter" className="text-xs">
                  Inter
                </SegmentedControlItem>
                <SegmentedControlItem id="serif" className="text-xs">
                  Serif
                </SegmentedControlItem>
                <SegmentedControlItem id="mono" className="text-xs">
                  Mono
                </SegmentedControlItem>
              </SegmentedControl>
            </div>

            {/* Font Size Tier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Base Font Size
              </label>
              <SegmentedControl
                aria-label="Font Size"
                selectedKeys={new Set([options.fontSize])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) onChange({ fontSize: String(val) as ThemeFontSize });
                }}
                className="w-full bg-slate-100 p-0.5"
              >
                <SegmentedControlItem id="small" className="text-xs">
                  Small (9pt)
                </SegmentedControlItem>
                <SegmentedControlItem id="normal" className="text-xs">
                  Normal (11pt)
                </SegmentedControlItem>
                <SegmentedControlItem id="large" className="text-xs">
                  Large (13pt)
                </SegmentedControlItem>
              </SegmentedControl>
            </div>

            {/* Paper Size (if supported) */}
            {!isThermal && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paper Format
                </label>
                <SegmentedControl
                  aria-label="Paper Format"
                  selectedKeys={new Set([options.paper])}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) onChange({ paper: String(val) as PaperSize });
                  }}
                  className="w-full bg-slate-100 p-0.5"
                >
                  <SegmentedControlItem id="A4" className="text-xs">
                    A4 (210 × 297 mm)
                  </SegmentedControlItem>
                  <SegmentedControlItem id="A5" className="text-xs">
                    A5 (148 × 210 mm)
                  </SegmentedControlItem>
                </SegmentedControl>
              </div>
            )}

            {/* Logo Settings */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <SwitchCard
                title="Business Logo"
                description="Display company logo on document"
                icon={RiImageLine}
                isSelected={options.showLogo}
                onChange={(val) => onChange({ showLogo: val })}
                className="border-slate-200 bg-white hover:bg-slate-50"
              />

              {options.showLogo && (
                <div className="pl-1 pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Logo Placement
                  </label>
                  <SegmentedControl
                    aria-label="Logo Position"
                    selectedKeys={new Set([options.logoPosition])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) onChange({ logoPosition: String(val) as LogoPosition });
                    }}
                    className="w-full bg-slate-100 p-0.5"
                  >
                    <SegmentedControlItem id="left" className="text-xs">
                      Left
                    </SegmentedControlItem>
                    <SegmentedControlItem id="center" className="text-xs">
                      Center
                    </SegmentedControlItem>
                    <SegmentedControlItem id="right" className="text-xs">
                      Right
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>
              )}
            </div>

            {/* Watermark Controls */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Watermark
              </label>
              <SegmentedControl
                aria-label="Watermark"
                selectedKeys={new Set([options.watermark])}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0];
                  if (val) onChange({ watermark: String(val) as WatermarkType });
                }}
                className="w-full bg-slate-100 p-0.5"
              >
                <SegmentedControlItem id="none" className="text-xs">
                  None
                </SegmentedControlItem>
                <SegmentedControlItem id="PAID" className="text-xs">
                  PAID
                </SegmentedControlItem>
                <SegmentedControlItem id="DRAFT" className="text-xs">
                  DRAFT
                </SegmentedControlItem>
                <SegmentedControlItem id="custom" className="text-xs">
                  Custom
                </SegmentedControlItem>
              </SegmentedControl>

              {options.watermark === 'custom' && (
                <input
                  type="text"
                  value={options.watermarkCustomText}
                  onChange={(e) => onChange({ watermarkCustomText: e.target.value })}
                  placeholder="e.g. CONFIDENTIAL / SPECIMEN"
                  className="w-full px-3 py-2 rounded-lg bg-white text-slate-900 border border-slate-300 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: COLUMNS & GST ─── */}
        {activeTab === 'columns' && (
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Table Structure
            </span>

            <SwitchCard
              title="HSN / SAC Code Column"
              description="Show GST tax code for each line item"
              icon={RiTableLine}
              isSelected={options.showHsnSacColumn}
              onChange={(val) => onChange({ showHsnSacColumn: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <SwitchCard
              title="Discount Column"
              description="Item-level percentage discount deductions"
              isSelected={options.showDiscountColumn}
              onChange={(val) => onChange({ showDiscountColumn: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Tax &amp; Amount Breakdown
              </span>

              <div className="space-y-2">
                <SwitchCard
                  title="Tax Summary Table"
                  description="CGST, SGST &amp; IGST rate summary table"
                  icon={RiFileList3Line}
                  isSelected={options.showTaxSummaryTable}
                  onChange={(val) => onChange({ showTaxSummaryTable: val })}
                  className="border-slate-200 bg-white hover:bg-slate-50"
                />

                <SwitchCard
                  title="Amount in Words"
                  description="Indian numbering nomenclature (Lakhs &amp; Crores)"
                  icon={RiShieldCheckLine}
                  isSelected={options.showAmountInWords}
                  onChange={(val) => onChange({ showAmountInWords: val })}
                  className="border-slate-200 bg-white hover:bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Currency &amp; Number Format
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Currency Symbol</span>
                  <input
                    type="text"
                    value={options.currencySymbol}
                    onChange={(e) => onChange({ currencySymbol: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Locale</span>
                  <select
                    value={options.numberFormat}
                    onChange={(e) => onChange({ numberFormat: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600"
                  >
                    <option value="en-IN">en-IN (Lakhs)</option>
                    <option value="en-US">en-US (Millions)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PAYMENT & LEGAL ─── */}
        {activeTab === 'footer' && (
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Remittance Information
            </span>

            <SwitchCard
              title="Bank Account Details"
              description="Bank name, account number, IFSC code"
              icon={RiBankCardLine}
              isSelected={options.showBankDetails}
              onChange={(val) => onChange({ showBankDetails: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <SwitchCard
              title="UPI QR Code"
              description="Scan-to-pay QR code with instant VPA link"
              icon={RiQrCodeLine}
              isSelected={options.showUpiQr}
              onChange={(val) => onChange({ showUpiQr: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <SwitchCard
              title="Authorized Signature Block"
              description="Signature line and authorized signatory name"
              isSelected={options.showSignature}
              onChange={(val) => onChange({ showSignature: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <SwitchCard
              title="Company Stamp / Seal"
              description="Display official company seal / rubber stamp"
              isSelected={options.showStamp}
              onChange={(val) => onChange({ showStamp: val })}
              className="border-slate-200 bg-white hover:bg-slate-50"
            />

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Notes &amp; Policies
              </span>

              <SwitchCard
                title="Customer Notes"
                description="Custom message or delivery notes"
                isSelected={options.showNotes}
                onChange={(val) => onChange({ showNotes: val })}
                className="border-slate-200 bg-white hover:bg-slate-50"
              />

              <SwitchCard
                title="Terms &amp; Conditions"
                description="Payment terms, interest rates, jurisdiction"
                isSelected={options.showTerms}
                onChange={(val) => onChange({ showTerms: val })}
                className="border-slate-200 bg-white hover:bg-slate-50"
              />

              <SwitchCard
                title='Show "Thank You" Line'
                isSelected={options.showThankYouFooter}
                onChange={(val) => onChange({ showThankYouFooter: val })}
                className="border-slate-200 bg-white hover:bg-slate-50"
              />

              <div>
                <span className="text-[11px] text-slate-600 block mb-1">Custom Legal Footer</span>
                <input
                  type="text"
                  value={options.footerText}
                  onChange={(e) => onChange({ footerText: e.target.value })}
                  placeholder="e.g. Registered with MSME / Subject to Mumbai Jurisdiction"
                  className="w-full px-3 py-1.5 rounded-lg bg-white text-slate-900 border border-slate-300 text-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: PRESETS ─── */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1 text-xs">
                Save Current Styling
              </span>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Save your customized options as a named preset template.
              </p>

              <form onSubmit={handleSavePreset} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Wholesale Compact"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600"
                />
                <Button
                  size="small"
                  variant="primary"
                  type="submit"
                  leadingIcon={RiSave3Line}
                  className="text-xs"
                >
                  Save
                </Button>
              </form>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Saved Presets ({presets.length})
              </span>

              {presets.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  No custom presets saved yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">{preset.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Theme: {preset.themeId}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => loadPreset(preset.id)}
                          className="text-[11px]"
                        >
                          Apply
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => deletePreset(preset.id)}
                          className="text-[11px]"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export & Import JSON */}
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiDownload2Line}
                onClick={handleExport}
                className="flex-1 text-xs"
              >
                Export JSON
              </Button>
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiUpload2Line}
                onClick={() => setShowImportModal(true)}
                className="flex-1 text-xs"
              >
                Import JSON
              </Button>
            </div>

            <Modal
              isOpen={showImportModal}
              onOpenChange={setShowImportModal}
            >
              <ModalHeader
                title="Import Theme Presets"
                description="Paste a valid JSON array exported from Invoice Gen to restore your presets."
              />
              <ModalBody className="space-y-3">
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Paste preset JSON here..."
                  className="w-full h-36 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-blue-600 transition-colors"
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="primary"
                  onClick={handleImportSubmit}
                >
                  Import Presets
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
};
