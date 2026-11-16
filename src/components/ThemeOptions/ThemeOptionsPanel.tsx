import React, { useState } from 'react';
import type {
  ThemeOptions,
  ThemeFontFamily,
  ThemeFontSize,
  LogoPosition,
  WatermarkType,
  PaperSize,
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { getTheme } from '../../themes';
import { ColorPickerField } from './ColorPickerField';

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
  RiDeleteBinLine,
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
    <div className="flex flex-col h-full bg-white text-slate-800 border-l border-slate-200 w-full lg:w-[380px] xl:w-[440px] 2xl:w-[500px] 3xl:w-[560px] shrink-0 transition-all duration-200">
      {/* Panel Header */}
      <div className="px-4 sm:px-5 xl:px-6 py-3.5 xl:py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <span className="text-xs xl:text-sm font-medium text-slate-500 block">
            Theme customization
          </span>
          <h3 className="text-base xl:text-lg font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <span>{theme.name}</span>
            <span className="text-xs xl:text-sm font-normal px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {theme.paper.join(' / ')}
            </span>
          </h3>
        </div>

        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiRefreshLine}
          onClick={onReset}
          className="text-xs xl:text-sm font-medium"
        >
          Reset
        </Button>
      </div>

      {/* BoardUI Tab Bar */}
      <div className="px-4 sm:px-5 xl:px-6 pt-3 xl:pt-4 pb-2.5 xl:pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <SegmentedControl
          aria-label="Theme Customization Tabs"
          selectedKeys={new Set([activeTab])}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setActiveTab(String(val) as any);
          }}
          className="w-full bg-slate-200/70 p-0.5"
        >
          <SegmentedControlItem id="styling" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5">
            Styling
          </SegmentedControlItem>
          <SegmentedControlItem id="columns" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5">
            Columns
          </SegmentedControlItem>
          <SegmentedControlItem id="footer" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5">
            Payment
          </SegmentedControlItem>
          <SegmentedControlItem id="presets" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5">
            Presets
          </SegmentedControlItem>
        </SegmentedControl>
      </div>

      {/* Inspector Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 xl:px-6 py-4 xl:py-6 space-y-4 xl:space-y-6 text-xs xl:text-sm">
        {/* ─── TAB 1: STYLING ─── */}
        {activeTab === 'styling' && (
          <div className="space-y-4 xl:space-y-5">
            {/* Accent Color Palette */}
            <ColorPickerField
              value={options.accentColor}
              onChange={(hex) => onChange({ accentColor: hex })}
            />

            {/* Typography Family */}
            <div>
              <label className="block text-xs xl:text-sm font-semibold text-slate-700 mb-1.5">
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
                <SegmentedControlItem id="system" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  System
                </SegmentedControlItem>
                <SegmentedControlItem id="inter" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Inter
                </SegmentedControlItem>
                <SegmentedControlItem id="serif" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Serif
                </SegmentedControlItem>
                <SegmentedControlItem id="mono" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Mono
                </SegmentedControlItem>
              </SegmentedControl>
            </div>

            {/* Font Size Tier */}
            <div>
              <label className="block text-xs xl:text-sm font-semibold text-slate-700 mb-1.5">
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
                <SegmentedControlItem id="small" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Small (9pt)
                </SegmentedControlItem>
                <SegmentedControlItem id="normal" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Normal (11pt)
                </SegmentedControlItem>
                <SegmentedControlItem id="large" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Large (13pt)
                </SegmentedControlItem>
              </SegmentedControl>
            </div>

            {/* Paper Size (if supported) */}
            {!isThermal && (
              <div>
                <label className="block text-xs xl:text-sm font-semibold text-slate-700 mb-1.5">
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
                  <SegmentedControlItem id="A4" className="text-xs xl:text-sm py-1 xl:py-1.5">
                    A4 (210 × 297 mm)
                  </SegmentedControlItem>
                  <SegmentedControlItem id="A5" className="text-xs xl:text-sm py-1 xl:py-1.5">
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
                  <label className="block text-xs xl:text-sm font-semibold text-slate-600 mb-1">
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
                    <SegmentedControlItem id="left" className="text-xs xl:text-sm py-1 xl:py-1.5">
                      Left
                    </SegmentedControlItem>
                    <SegmentedControlItem id="center" className="text-xs xl:text-sm py-1 xl:py-1.5">
                      Center
                    </SegmentedControlItem>
                    <SegmentedControlItem id="right" className="text-xs xl:text-sm py-1 xl:py-1.5">
                      Right
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>
              )}
            </div>

            {/* Watermark Controls */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs xl:text-sm font-semibold text-slate-700 mb-1">
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
                <SegmentedControlItem id="none" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  None
                </SegmentedControlItem>
                <SegmentedControlItem id="PAID" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  PAID
                </SegmentedControlItem>
                <SegmentedControlItem id="DRAFT" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  DRAFT
                </SegmentedControlItem>
                <SegmentedControlItem id="custom" className="text-xs xl:text-sm py-1 xl:py-1.5">
                  Custom
                </SegmentedControlItem>
              </SegmentedControl>

              {options.watermark === 'custom' && (
                <input
                  type="text"
                  value={options.watermarkCustomText}
                  onChange={(e) => onChange({ watermarkCustomText: e.target.value })}
                  placeholder="e.g. CONFIDENTIAL / SPECIMEN"
                  className="w-full px-3 xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl bg-white text-slate-900 border border-slate-300 text-xs xl:text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: COLUMNS & GST ─── */}
        {activeTab === 'columns' && (
          <div className="space-y-3 xl:space-y-4">
            <span className="text-xs xl:text-sm font-medium text-slate-500 block">
              Table structure
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
              <span className="text-xs xl:text-sm font-medium text-slate-500 block mb-2">
                Tax &amp; amount breakdown
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
              <span className="text-xs xl:text-sm font-semibold text-slate-700 block">
                Currency &amp; Number Format
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Currency Symbol</span>
                  <input
                    type="text"
                    value={options.currencySymbol}
                    onChange={(e) => onChange({ currencySymbol: e.target.value })}
                    className="w-full px-3 py-1.5 xl:py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs xl:text-sm font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Locale</span>
                  <select
                    value={options.numberFormat}
                    onChange={(e) => onChange({ numberFormat: e.target.value })}
                    className="w-full px-2 py-1.5 xl:py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs xl:text-sm outline-none focus:border-blue-600"
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
          <div className="space-y-3 xl:space-y-4">
            <span className="text-xs xl:text-sm font-medium text-slate-500 block">
              Remittance information
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
              <span className="text-xs xl:text-sm font-medium text-slate-500 block mb-1">
                Notes &amp; policies
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
                <span className="text-xs text-slate-600 block mb-1">Custom Legal Footer</span>
                <input
                  type="text"
                  value={options.footerText}
                  onChange={(e) => onChange({ footerText: e.target.value })}
                  placeholder="e.g. Registered with MSME / Subject to Mumbai Jurisdiction"
                  className="w-full px-3 py-2 xl:py-2.5 rounded-lg xl:rounded-xl bg-white text-slate-900 border border-slate-300 text-xs xl:text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: PRESETS ─── */}
        {activeTab === 'presets' && (
          <div className="space-y-4 xl:space-y-5">
            <div className="p-3.5 xl:p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1 text-xs xl:text-sm">
                Save Current Styling
              </span>
              <p className="text-[11px] xl:text-xs text-slate-500 mb-2.5">
                Save your customized options as a named preset template.
              </p>

              <form onSubmit={handleSavePreset} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Wholesale Compact"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 xl:py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs xl:text-sm outline-none focus:border-blue-600"
                />
                <Button
                  size="small"
                  variant="primary"
                  type="submit"
                  leadingIcon={RiSave3Line}
                  className="text-xs xl:text-sm shrink-0"
                >
                  Save
                </Button>
              </form>
            </div>

            <div>
              <span className="text-xs xl:text-sm font-medium text-slate-500 block mb-2">
                Saved presets ({presets.length})
              </span>

              {presets.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs xl:text-sm border border-dashed border-slate-200 rounded-xl">
                  No saved presets yet
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 xl:p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          loadPreset(p.id);
                          toast.success(`Loaded preset "${p.name}"`);
                        }}
                        className="text-left font-medium text-slate-800 text-xs xl:text-sm hover:text-blue-600 flex-1 truncate mr-2 cursor-pointer"
                      >
                        {p.name}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            loadPreset(p.id);
                            toast.success(`Loaded preset "${p.name}"`);
                          }}
                          className="px-2 py-1 text-[11px] xl:text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deletePreset(p.id);
                            toast.info(`Deleted preset "${p.name}"`);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          title="Delete preset"
                        >
                          <RiDeleteBinLine className="size-3.5 xl:size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export & Import buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiDownload2Line}
                onClick={handleExport}
                className="flex-1 text-xs xl:text-sm"
              >
                Export JSON
              </Button>
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiUpload2Line}
                onClick={() => setShowImportModal(true)}
                className="flex-1 text-xs xl:text-sm"
              >
                Import JSON
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <Modal isOpen={showImportModal} onOpenChange={setShowImportModal}>
          <ModalHeader
            title="Import Presets JSON"
            description="Paste exported presets JSON code here to restore them."
          />
          <ModalBody>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={8}
              placeholder='[{"id":"...","name":"...","options":{...}}]'
              className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs xl:text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportJsonText('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImportSubmit}>
              Import Presets
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};
