import React, { useState } from 'react';
import { getAllThemes, resolveOptions, getTheme } from '../../themes';
import { useTheme } from '../../context/ThemeContext';
import { useInvoices } from '../../context/InvoiceContext';
import { ThemePreview } from '../ThemePreview/ThemePreview';
import { ThemeOptionsPanel } from '../ThemeOptions/ThemeOptionsPanel';
import {
  createSampleData,
  createSampleDataDevanagari,
  createSampleDataIGST,
  createSampleDataNoGST,
} from '../../utils';
import type { InvoiceRenderData } from '../../types';

// BoardUI components & Remix Icons
import { Button } from '@/components/base/buttons/button';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { SearchField } from '@/components/base/search-field/search-field';
import { toast } from '@/components/base/toast/toast';
import {
  RiPrinterLine,
  RiDownload2Line,
  RiCheckLine,
  RiPaletteLine,
  RiArrowLeftLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiRefreshLine,
  RiCloudLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import {
  syncRemoteTemplates,
  getRemoteServerUrl,
  deleteRemoteTemplate,
  REMOTE_TEMPLATES_UPDATED_EVENT,
} from '@/services/templateSyncService';

interface TemplateCardProps {
  theme: any;
  isDefault: boolean;
  tOptions: any;
  thumbData: InvoiceRenderData;
  onCustomize: () => void;
  onSetDefault: () => void;
  onDeleteRemote?: (id: string, name: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = React.memo(({
  theme: t,
  isDefault,
  tOptions,
  thumbData,
  onCustomize,
  onSetDefault,
  onDeleteRemote,
}) => {
  const isThermal = t.paper.includes('80mm');
  const isA5 = t.paper.includes('A5') && !t.paper.includes('A4');
  const baseScale = isThermal ? 0.52 : isA5 ? 0.32 : 0.23;
  const paperWidth = isThermal ? '80mm' : isA5 ? '148mm' : '210mm';

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden flex flex-col transition-colors duration-150 ${
        isDefault
          ? 'border-blue-600 shadow-xs ring-1 ring-blue-600/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Real-time Theme Thumbnail Container */}
      <div
        onClick={onCustomize}
        className="h-48 w-full bg-slate-100 overflow-hidden relative flex justify-center border-b border-slate-100 cursor-pointer group"
      >
        <div className="w-full h-full flex justify-center items-start pt-3">
          <div
            className="origin-top pointer-events-none select-none"
            style={{
              transform: `scale(${baseScale})`,
              width: paperWidth,
            }}
          >
            <ThemePreview
              themeId={t.id}
              data={thumbData}
              options={tOptions}
              scale={1}
              isThumbnail={true}
            />
          </div>
        </div>

        {/* Remote Cloud Badge */}
        {t.isRemote && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-blue-700 font-medium text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 z-10 border border-blue-200 shadow-2xs">
            <RiCloudLine className="size-3 text-blue-600" />
            <span>Cloud Template</span>
          </div>
        )}

        {/* Active Badge */}
        {isDefault && (
          <div className="absolute top-3 right-3 bg-blue-600 shadow-xs text-white font-medium text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
            <RiCheckLine className="size-3" />
            <span>Default theme</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center z-10">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
            Click to Customize
          </span>
        </div>
      </div>

      {/* Card Meta & Actions */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 truncate">{t.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {t.paper.join('/')}
              </span>
              {t.isRemote && onDeleteRemote && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRemote(t.id, t.name);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete template from local cache"
                >
                  <RiDeleteBinLine className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* Card Button Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          {isDefault ? (
            <Button
              size="small"
              variant="primary"
              leadingIcon={RiPaletteLine}
              onClick={onCustomize}
              className="w-full text-xs font-medium"
            >
              Customize Theme
            </Button>
          ) : (
            <>
              <Button
                size="small"
                variant="secondary"
                onClick={onSetDefault}
                className="flex-1 text-xs font-medium"
              >
                Set Default
              </Button>
              <Button
                size="small"
                variant="ghost"
                onClick={onCustomize}
                className="text-xs font-medium"
              >
                Customize
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
TemplateCard.displayName = 'TemplateCard';

export const ThemePicker: React.FC = () => {
  const {
    currentThemeId,
    setThemeId,
    options,
    setOptions,
    resetOptions,
    getOptionsForTheme,
  } = useTheme();

  const { invoices } = useInvoices();
  const [updateTick, setUpdateTick] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    const handleUpdate = () => setUpdateTick((t) => t + 1);
    window.addEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleUpdate);
  }, []);

  const themes = React.useMemo(() => getAllThemes(), [updateTick]);
  const activeTheme = getTheme(currentThemeId);

  const handleSyncFromPicker = async () => {
    const url = getRemoteServerUrl();
    if (!url) {
      toast.error('Configure your Cloud server URL in Settings > Cloud Templates first.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncRemoteTemplates(url);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // View mode: 'gallery' (Template Grid) or 'customize' (Live Studio 2-Pane)
  const [viewMode, setViewMode] = useState<'gallery' | 'customize'>('gallery');

  // Category filter in gallery mode
  const [filterCategory, setFilterCategory] = useState<'all' | 'a4' | 'thermal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data variant state - defaults to real company invoice if available
  const [dataVariant, setDataVariant] = useState<
    'real' | 'standard' | 'multipage' | 'single' | 'devanagari' | 'igst' | 'nogst'
  >(() => (invoices.length > 0 ? 'real' : 'standard'));

  // Canvas Zoom control - defaults to 'auto' for responsive screen adaptation
  const [zoomLevel, setZoomLevel] = useState<number | 'auto'>('auto');
  const [mobileTab, setMobileTab] = useState<'preview' | 'options'>('preview');

  // Compute preview data based on selection
  const sampleData: InvoiceRenderData = React.useMemo(() => {
    switch (dataVariant) {
      case 'real':
        return invoices[0]?.data || createSampleData(5);
      case 'multipage':
        return createSampleData(40);
      case 'single':
        return createSampleData(1);
      case 'devanagari':
        return createSampleDataDevanagari();
      case 'igst':
        return createSampleDataIGST();
      case 'nogst':
        return createSampleDataNoGST();
      case 'standard':
      default:
        return createSampleData(5);
    }
  }, [dataVariant, invoices]);

  // Fast sample data for thumbnails
  const thumbData = React.useMemo(() => invoices[0]?.data || createSampleData(3), [invoices]);

  const handlePrint = () => {
    const printUrl = `/print/sample?theme=${currentThemeId}&action=print&variant=${dataVariant}`;
    const win = window.open(printUrl, '_blank');
    if (!win) {
      window.location.href = printUrl;
    }
  };

  const handleSavePdf = () => {
    const printUrl = `/print/sample?theme=${currentThemeId}&action=save-pdf&variant=${dataVariant}`;
    const win = window.open(printUrl, '_blank');
    if (!win) {
      window.location.href = printUrl;
    }
  };

  // Filter themes for gallery
  const filteredThemes = themes.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterCategory === 'thermal') return t.paper.includes('80mm');
    if (filterCategory === 'a4') return t.paper.includes('A4');
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW A: LIVE CUSTOMIZER & PREVIEW (Simple 2-Pane Focus Mode)
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewMode === 'customize') {
    return (
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
        {/* Top Studio Bar */}
        <div className="no-print h-14 px-3 sm:px-4 lg:px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiArrowLeftLine}
              onClick={() => setViewMode('gallery')}
              className="text-xs shrink-0"
            >
              Back to Templates
            </Button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[140px] sm:max-w-none">
                Customizing: {activeTheme.name}
              </span>
              <div className="relative group">
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Switch template"
                >
                  <span>Switch</span>
                  <span className="text-[10px]">▾</span>
                </button>
                <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 max-h-72 overflow-y-auto">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setThemeId(t.id);
                        setZoomLevel(t.paper.includes('80mm') && !t.paper.includes('A4') ? 1.0 : 0.85);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        t.id === currentThemeId
                          ? 'bg-blue-50 font-bold text-blue-700'
                          : 'hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                        {t.paper.join('/')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
                {options.paper === '80mm' ? 'Thermal 80mm' : `${options.paper} Format`}
              </span>
            </div>
          </div>

          {/* Canvas Controls & Print */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Test Dataset Switcher */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
              <span className="font-medium text-slate-500 hidden md:inline">Preview Data:</span>
              <select
                value={dataVariant}
                onChange={(e) => setDataVariant(e.target.value as any)}
                className="text-xs bg-slate-50 text-slate-800 border border-slate-200 px-2 py-1 rounded-md outline-none cursor-pointer hover:border-slate-300 font-medium max-w-[125px] sm:max-w-[160px] truncate"
              >
                {invoices.length > 0 && (
                  <option value="real">Real Bill ({invoices[0].invoiceNumber})</option>
                )}
                <option value="standard">Standard (5 items)</option>
                <option value="single">Single Item</option>
                <option value="multipage">Multi-Page (40 items)</option>
                <option value="devanagari">Hindi / Marathi (Devanagari)</option>
                <option value="igst">Inter-State (IGST)</option>
                <option value="nogst">Unregistered (No GST)</option>
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setZoomLevel((z) => {
                    const current = typeof z === 'number' ? z : 0.85;
                    return Math.max(0.4, Number((current - 0.1).toFixed(2)));
                  })
                }
                className="p-0.5 hover:text-slate-900 text-slate-500 rounded cursor-pointer"
                title="Zoom Out"
              >
                <RiZoomOutLine className="size-3.5" />
              </button>
              <span className="text-xs font-mono font-medium min-w-12 text-center text-slate-700">
                {typeof zoomLevel === 'number' ? `${Math.round(zoomLevel * 100)}%` : 'Auto'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setZoomLevel((z) => {
                    const current = typeof z === 'number' ? z : 0.85;
                    return Math.min(1.5, Number((current + 0.1).toFixed(2)));
                  })
                }
                className="p-0.5 hover:text-slate-900 text-slate-500 rounded cursor-pointer"
                title="Zoom In"
              >
                <RiZoomInLine className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel('auto')}
                className={`text-xs px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                  zoomLevel === 'auto'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Auto-adapt to screen size"
              >
                Fit
              </button>
            </div>

            {/* Print and Save PDF buttons */}
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiPrinterLine}
              onClick={handlePrint}
              className="text-xs shadow-xs font-semibold shrink-0"
            >
              Print
            </Button>
            <Button
              size="small"
              variant="primary"
              leadingIcon={RiDownload2Line}
              onClick={handleSavePdf}
              className="text-xs shadow-xs font-semibold shrink-0"
            >
              Save as PDF
            </Button>
          </div>
        </div>

        {/* Mobile & Tablet Toggle Bar: Live Canvas vs Customize Options */}
        <div className="lg:hidden px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-center shrink-0">
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 w-full max-w-sm shadow-inner">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'preview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Canvas
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('options')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'options' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customize Options
            </button>
          </div>
        </div>

        {/* 2-Pane Workstation: Center Canvas + Right Theme Inspector */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Live Preview Canvas */}
          <div
            className={`flex-1 bg-slate-100 overflow-auto p-2 sm:p-4 lg:p-6 xl:p-8 relative ${
              mobileTab === 'preview' ? 'flex flex-col items-center' : 'hidden lg:flex'
            }`}
          >
            <ThemePreview
              themeId={currentThemeId}
              data={sampleData}
              options={options}
              scale={zoomLevel}
              showControls={false}
            />
          </div>

          {/* Right Inspector Panel */}
          <div className={`${mobileTab === 'options' ? 'flex flex-1 lg:flex-initial' : 'hidden lg:flex'}`}>
            <ThemeOptionsPanel
              themeId={currentThemeId}
              options={options}
              onChange={setOptions}
              onReset={resetOptions}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW B: TEMPLATE GALLERY (Spacious, Clean SaaS Grid)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Gallery Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/app-icon.png" alt="Invoice Gen" className="size-7 object-contain shrink-0" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight text-balance">
                Invoice Templates
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl text-pretty">
              Commercial invoice themes with Indian GST tax tables, multi-page page breaks, and offline printing.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiCloudLine}
              onClick={handleSyncFromPicker}
              disabled={isSyncing}
              className="text-xs font-medium"
            >
              {isSyncing ? 'Syncing...' : 'Sync Cloud'}
            </Button>

            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiRefreshLine}
              onClick={() => resetOptions()}
              className="text-xs font-medium"
            >
              Reset Defaults
            </Button>

            <Button
              size="small"
              variant="primary"
              leadingIcon={RiPaletteLine}
              onClick={() => setViewMode('customize')}
              className="text-xs shadow-xs"
            >
              Customize Theme
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <SegmentedControl
            aria-label="Filter category"
            selectedKeys={new Set([filterCategory])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setFilterCategory(String(val) as any);
            }}
            className="bg-slate-100 p-0.5"
          >
            <SegmentedControlItem id="all" className="text-xs px-3">
              All ({themes.length})
            </SegmentedControlItem>
            <SegmentedControlItem id="a4" className="text-xs px-3">
              A4 / A5 ({themes.filter((t) => t.paper.includes('A4') || t.paper.includes('A5')).length})
            </SegmentedControlItem>
            <SegmentedControlItem id="thermal" className="text-xs px-3">
              Thermal 80mm ({themes.filter((t) => t.paper.includes('80mm')).length})
            </SegmentedControlItem>
          </SegmentedControl>

          {/* BoardUI SearchField */}
          <div className="w-64">
            <SearchField
              aria-label="Search invoice templates"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={setSearchQuery}
              size="small"
            />
          </div>

          <div className="hidden lg:flex text-xs text-slate-500 items-center gap-2">
            <span>Default:</span>
            <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {activeTheme.name} ({options.paper})
            </span>
          </div>
        </div>

        {/* Templates Grid (Spacious 4-Column SaaS Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredThemes.map((t) => {
            const isDefault = t.id === currentThemeId;
            const tOptions = getOptionsForTheme ? getOptionsForTheme(t.id) : resolveOptions(t.id);
            const isThermal = t.paper.includes('80mm');

            return (
              <TemplateCard
                key={t.id}
                theme={t}
                isDefault={isDefault}
                tOptions={tOptions}
                thumbData={thumbData}
                onCustomize={() => {
                  setThemeId(t.id);
                  setZoomLevel(isThermal ? 1.0 : 0.85);
                  setViewMode('customize');
                }}
                onSetDefault={() => {
                  setThemeId(t.id);
                  toast.success(`Theme "${t.name}" set as default`);
                }}
                onDeleteRemote={(id, name) => {
                  deleteRemoteTemplate(id);
                  toast.info(`Removed "${name}" from cache`);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemePicker;
