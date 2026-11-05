// ─── Real-Time Offline Invoice Editor ─────────────────────────────────
// Desktop workstation for editing line items, taxes, clients, payments, and previewing live.

import React, { useState, useMemo, useEffect } from 'react';
import type { InvoiceRenderData, LineItem, PaymentInfo, GSTType } from '../../types';
import { useInvoices } from '../../context/InvoiceContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllThemes, resolveOptions } from '../../themes';
import { ThemePreview } from '../ThemePreview/ThemePreview';
import { ShareInvoiceModal } from '../ShareInvoiceModal/ShareInvoiceModal';
import { recalculate } from '../../utils/buildRenderData';
import { formatCurrency, formatNumber } from '../../utils';

// BoardUI Components
import { Button } from '@/components/base/buttons/button';
import { toast } from '@/components/base/toast/toast';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/base/segmented-control/segmented-control';
import { ImageUploadCard } from '@/components/base/image-upload/image-upload';

// Remix Icons
import {
  RiArrowLeftLine,
  RiSave3Line,
  RiPrinterLine,
  RiShareForwardLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiUserLine,
  RiImageLine,
  RiShieldCheckLine,
  RiEditLine,
  RiCheckboxCircleLine,
} from '@remixicon/react';

interface InvoiceEditorProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ invoiceId, onBack }) => {
  const { getInvoice, updateInvoice, clients, businessProfile, updateBusinessProfile, saveClient } = useInvoices();
  const { currentThemeId, options: contextOptions } = useTheme();
  const themes = getAllThemes();

  const record = getInvoice(invoiceId);
  const [activeTab, setActiveTab] = useState<'items' | 'parties' | 'branding' | 'payment'>('items');
  const [themeId, setThemeId] = useState<string>(() => record?.themeId || currentThemeId);
  const [zoomLevel, setZoomLevel] = useState<number>(() =>
    themeId === 'thermal' ? 1.0 : 0.82
  );

  // Share Invoice Modal
  const [showShareModal, setShowShareModal] = useState(false);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'UPI' | 'NEFT' | 'Cash' | 'Cheque' | 'Card'>('UPI');
  const [newPaymentDate, setNewPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPaymentRef, setNewPaymentRef] = useState('');

  const handleSaveImagesToProfile = () => {
    updateBusinessProfile({
      logoUrl: invoiceData.business?.logoUrl || invoiceData.logoUrl,
      stampUrl: invoiceData.stampUrl || invoiceData.business?.stampUrl,
      signatureUrl: invoiceData.signatureUrl || invoiceData.business?.signatureUrl,
    });
    toast.success('Saved logo, stamp, and signature to your business profile!');
  };

  const handleLoadImagesFromProfile = () => {
    setInvoiceData((prev) => ({
      ...prev,
      logoUrl: businessProfile.logoUrl,
      stampUrl: businessProfile.stampUrl,
      signatureUrl: businessProfile.signatureUrl,
      business: {
        ...prev.business,
        logoUrl: businessProfile.logoUrl,
        stampUrl: businessProfile.stampUrl,
        signatureUrl: businessProfile.signatureUrl,
      },
    }));
    toast.info('Loaded branding assets from your business profile.');
  };

  // Local draft state for real-time live typing
  const [invoiceData, setInvoiceData] = useState<InvoiceRenderData>(() => {
    if (record) return record.data;
    // Fallback if not found: clean real-time invoice based on active business profile
    return recalculate({
      invoiceNumber: 'INV-2026-001',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      placeOfSupply: businessProfile.state || 'Maharashtra (27)',
      status: 'draft',
      business: {
        name: businessProfile.name || '',
        address: businessProfile.address || '',
        city: businessProfile.city || '',
        state: businessProfile.state || '',
        pincode: businessProfile.pincode || '',
        phone: businessProfile.phone || '',
        email: businessProfile.email || '',
        website: businessProfile.website || '',
        gstin: businessProfile.gstin || '',
        pan: businessProfile.pan || '',
      },
      client: clients[0] ? { ...clients[0] } : {
        name: '',
        address: '',
        city: '',
        state: businessProfile.state || 'Maharashtra (27)',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
      },
      items: [],
      gstType: 'cgst_sgst',
      taxSummary: [],
      subtotal: 0,
      totalDiscount: 0,
      totalTaxableAmount: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalTax: 0,
      grandTotal: 0,
      roundOff: 0,
      grandTotalRounded: 0,
      amountInWords: '',
      payments: [],
      amountPaid: 0,
      balanceDue: 0,
      currencySymbol: '₹',
      currencyCode: 'INR',
    });
  });

  // Calculate live preview data on every keystroke
  const calculatedData = useMemo(() => {
    return recalculate(invoiceData);
  }, [invoiceData]);

  // Synchronize document.title to the active invoice number (e.g. INV-001)
  // so browser print / save dialogs and tabs default to the invoice title
  useEffect(() => {
    if (calculatedData?.invoiceNumber) {
      const prevTitle = document.title;
      const safeTitle = calculatedData.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
      document.title = safeTitle;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [calculatedData?.invoiceNumber]);

  // Options for the active theme
  const activeOptions = useMemo(() => {
    return resolveOptions(themeId, contextOptions);
  }, [themeId, contextOptions]);

  // Handle saving to offline storage
  const handleSave = () => {
    updateInvoice(invoiceId, calculatedData, themeId);
    toast.success(`Invoice ${calculatedData.invoiceNumber} saved offline`);
  };

  // Direct print
  const handlePrint = () => {
    updateInvoice(invoiceId, calculatedData, themeId);
    toast.info('Opening print layout...');
    const url = `/print/${invoiceId}?theme=${themeId}&auto=true`;
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  };

  // ── Line Items Handlers ───────────────────────────────────────────────────

  const handleUpdateItem = (index: number, partial: Partial<LineItem>) => {
    setInvoiceData((prev) => {
      const items = [...prev.items];
      const existing = items[index];
      const updated = { ...existing, ...partial };

      // Recalculate row amounts
      const qty = Number(updated.quantity) || 0;
      const rate = Number(updated.rate) || 0;
      const discount = Number(updated.discount) || 0;
      const gstRate = Number(updated.gstRate) || 0;

      const baseAmount = qty * rate;
      const discountAmount = discount > 0 ? Math.round(((baseAmount * discount) / 100) * 100) / 100 : 0;
      const taxableAmount = Math.round((baseAmount - discountAmount) * 100) / 100;
      const gstAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
      const total = Math.round((taxableAmount + gstAmount) * 100) / 100;

      items[index] = {
        ...updated,
        discount: discount > 0 ? discount : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        taxableAmount,
        gstAmount,
        total,
      };

      let nextGstType = prev.gstType;
      if (nextGstType === 'none' && gstRate > 0) {
        nextGstType = 'cgst_sgst';
      }

      return { ...prev, items, gstType: nextGstType };
    });
  };

  const handleAddItem = (preset?: Partial<LineItem>) => {
    setInvoiceData((prev) => {
      const qty = preset?.quantity || 1;
      const rate = preset?.rate !== undefined ? preset.rate : 1000;
      const discount = preset?.discount || 0;
      const gstRate = preset?.gstRate !== undefined ? preset.gstRate : 18;

      const baseAmount = qty * rate;
      const discountAmount = discount > 0 ? Math.round(((baseAmount * discount) / 100) * 100) / 100 : 0;
      const taxableAmount = Math.round((baseAmount - discountAmount) * 100) / 100;
      const gstAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
      const total = Math.round((taxableAmount + gstAmount) * 100) / 100;

      const newItem: LineItem = {
        id: `item-${Date.now()}-${prev.items.length + 1}`,
        sno: prev.items.length + 1,
        description: preset?.description || 'New Service / Product Description',
        hsnSac: preset?.hsnSac || '998314',
        quantity: qty,
        unit: preset?.unit || 'Nos',
        rate,
        discount: discount > 0 ? discount : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        taxableAmount,
        gstRate,
        gstAmount,
        total,
      };

      let nextGstType = prev.gstType;
      if (nextGstType === 'none' && gstRate > 0) {
        nextGstType = 'cgst_sgst';
      }

      return { ...prev, items: [...prev.items, newItem], gstType: nextGstType };
    });
  };

  const handleDuplicateItem = (index: number) => {
    setInvoiceData((prev) => {
      const target = prev.items[index];
      const copy: LineItem = {
        ...target,
        id: `item-${Date.now()}`,
        sno: prev.items.length + 1,
      };
      return { ...prev, items: [...prev.items, copy] };
    });
    toast.success('Line item duplicated');
  };

  const handleDeleteItem = (index: number) => {
    if (invoiceData.items.length <= 1) {
      toast.error('An invoice requires at least one line item');
      return;
    }
    setInvoiceData((prev) => {
      const items = prev.items.filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        sno: idx + 1,
      }));
      return { ...prev, items };
    });
  };

  // ── Payments Handlers ─────────────────────────────────────────────────────

  const handleOpenPaymentForm = (isAdvance = false) => {
    if (!isAdvance && calculatedData.balanceDue <= 0) {
      toast.info('Invoice is already fully settled (₹0.00 balance due). Use "Add Advance / Extra" to record additional funds.');
      return;
    }
    setNewPaymentAmount(calculatedData.balanceDue > 0 ? String(calculatedData.balanceDue) : '');
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
    setNewPaymentRef(`REF-${Date.now().toString().slice(-6)}`);
    setShowPaymentForm(true);
  };

  const handleConfirmAddPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountNum = Number(newPaymentAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    const roundedAmount = Math.round(amountNum * 100) / 100;
    const newPayment: PaymentInfo = {
      date: newPaymentDate || new Date().toISOString().split('T')[0],
      amount: roundedAmount,
      method: newPaymentMethod,
      reference: newPaymentRef.trim() || undefined,
    };

    setInvoiceData((prev) => {
      const nextPayments = [...prev.payments, newPayment];
      const totalPaid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const isPaid = totalPaid >= calculatedData.grandTotalRounded;
      return {
        ...prev,
        payments: nextPayments,
        status: isPaid ? 'paid' : prev.status,
      };
    });

    setShowPaymentForm(false);
    setNewPaymentAmount('');
    setNewPaymentRef('');

    if (calculatedData.balanceDue > 0 && roundedAmount > calculatedData.balanceDue) {
      const excess = Math.round((roundedAmount - calculatedData.balanceDue) * 100) / 100;
      toast.info(`Payment of ${formatCurrency(roundedAmount, '₹')} recorded (Excess: ${formatCurrency(excess, '₹')})`);
    } else if (calculatedData.balanceDue <= 0) {
      toast.info(`Advance payment of ${formatCurrency(roundedAmount, '₹')} recorded`);
    } else {
      toast.success(`Recorded payment of ${formatCurrency(roundedAmount, '₹')}`);
    }
  };

  const handleRemovePayment = (idx: number) => {
    setInvoiceData((prev) => {
      const remainingPayments = prev.payments.filter((_, i) => i !== idx);
      const totalPaid = remainingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const isStillPaid = totalPaid >= calculatedData.grandTotalRounded;
      return {
        ...prev,
        payments: remainingPayments,
        status: isStillPaid ? 'paid' : prev.status === 'paid' ? 'sent' : prev.status,
      };
    });
    toast.info('Payment removed');
  };

  // Synchronized Status Transition Handler
  const handleStatusChange = (newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => {
    setInvoiceData((prev) => {
      if (newStatus === 'paid') {
        const currentPaid = (prev.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const remaining = Math.max(0, calculatedData.grandTotalRounded - currentPaid);
        const nextPayments = [...(prev.payments || [])];
        if (remaining > 0) {
          nextPayments.push({
            date: new Date().toISOString().split('T')[0],
            amount: remaining,
            method: 'UPI',
            reference: 'Settled in Full',
          });
        }
        return {
          ...prev,
          status: 'paid',
          payments: nextPayments,
        };
      } else {
        // If switching from paid to draft, sent, or overdue, remove auto-settlement payments
        const remainingPayments = (prev.payments || []).filter(
          (p) => p.reference !== 'Settled in Full'
        );
        return {
          ...prev,
          status: newStatus,
          payments: remainingPayments,
        };
      }
    });
  };

  // Quick Client Selector
  const handleSelectClient = (clientName: string) => {
    const matched = clients.find((c) => c.name === clientName);
    if (!matched) return;
    setInvoiceData((prev) => ({
      ...prev,
      client: { ...matched },
      placeOfSupply: `${matched.state} (${matched.gstin ? matched.gstin.slice(0, 2) : '27'})`,
    }));
    toast.info(`Applied client: ${matched.name}`);
  };

  // Sync client edits directly from invoice to offline directory
  const handleSaveClientToDirectory = () => {
    if (!invoiceData.client.name.trim()) {
      toast.error('Client name cannot be empty');
      return;
    }
    saveClient({
      name: invoiceData.client.name.trim(),
      address: invoiceData.client.address || '',
      city: invoiceData.client.city || '',
      state: invoiceData.client.state || 'Maharashtra',
      pincode: invoiceData.client.pincode || '',
      gstin: invoiceData.client.gstin?.trim().toUpperCase() || undefined,
      phone: invoiceData.client.phone || undefined,
      email: invoiceData.client.email || undefined,
    });
    toast.success(`Client "${invoiceData.client.name.trim()}" saved to offline directory`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* ─── WORKSTATION TOP BAR ─── */}
      <div className="h-14 px-3 sm:px-4 lg:px-5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 z-20 min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiArrowLeftLine}
            onClick={() => {
              updateInvoice(invoiceId, calculatedData, themeId);
              onBack();
            }}
            className="text-xs shrink-0"
          >
            Invoices
          </Button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Invoice Number Input */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Invoice:</span>
            <input
              type="text"
              value={invoiceData.invoiceNumber}
              onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
              className="font-bold text-xs sm:text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-600 rounded-lg px-2 sm:px-2.5 py-1 bg-slate-50 outline-none w-28 sm:w-36"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={invoiceData.status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer shrink-0"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Center / Right: Template & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Theme Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-xl text-xs shrink-0">
            <span className="text-slate-500 font-medium hidden sm:inline">Theme:</span>
            <select
              value={themeId}
              onChange={(e) => {
                const nextTheme = e.target.value;
                setThemeId(nextTheme);
                if (nextTheme === 'thermal') setZoomLevel(1.0);
              }}
              className="bg-white text-blue-900 font-bold px-2 py-0.5 rounded-lg border border-blue-200 outline-none cursor-pointer text-xs max-w-[125px] sm:max-w-[170px] md:max-w-[200px] truncate"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.paper.join('/')})
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Controls (hidden on narrow screens to protect CTA visibility) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 text-slate-500 rounded"
              title="Zoom Out"
            >
              <RiZoomOutLine className="size-3.5" />
            </button>
            <span className="text-xs font-mono font-medium min-w-9 text-center text-slate-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 text-slate-500 rounded"
              title="Zoom In"
            >
              <RiZoomInLine className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(themeId === 'thermal' ? 1.0 : 0.82)}
              className="text-xs text-slate-500 hover:text-slate-900 px-1 font-semibold"
            >
              Fit
            </button>
          </div>

          {/* Action CTAs: always pinned and visible */}
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiSave3Line}
            onClick={handleSave}
            className="text-xs font-medium shrink-0"
          >
            Save Draft
          </Button>

          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiShareForwardLine}
            onClick={() => {
              updateInvoice(invoiceId, calculatedData, themeId);
              setShowShareModal(true);
            }}
            className="text-xs font-semibold shrink-0"
          >
            Share
          </Button>

          <Button
            size="small"
            variant="primary"
            leadingIcon={RiPrinterLine}
            onClick={handlePrint}
            className="text-xs shadow-xs font-semibold shrink-0"
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* ─── 2-PANE DESKTOP WORKSPACE ─── */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT PANE: HIGH-DENSITY EDITING FORM */}
        <div className="w-[520px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Form Tabs */}
          <div className="px-4 pt-3 pb-2.5 border-b border-slate-200 bg-slate-50/70">
            <SegmentedControl
              aria-label="Editor Form Tabs"
              selectedKeys={new Set([activeTab])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) setActiveTab(val as any);
              }}
              className="w-full bg-slate-200/70 p-0.5"
            >
              <SegmentedControlItem id="items" className="text-xs font-medium">
                Items ({invoiceData.items.length})
              </SegmentedControlItem>
              <SegmentedControlItem id="parties" className="text-xs font-medium">
                Buyer &amp; Dates
              </SegmentedControlItem>
              <SegmentedControlItem id="branding" className="text-xs font-medium">
                Photo, Stamp &amp; Sign
              </SegmentedControlItem>
              <SegmentedControlItem id="payment" className="text-xs font-medium">
                Pay &amp; Terms
              </SegmentedControlItem>
            </SegmentedControl>
          </div>

          {/* Tab Content Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* ══════════ TAB 1: LINE ITEMS & AMOUNTS ══════════ */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Line items
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <RiAddLine className="size-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {invoiceData.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2.5 group hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="size-5 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>

                        <input
                          type="text"
                          placeholder="Item Description / Service Details"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                          className="flex-1 font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-600"
                        />

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(index)}
                            title="Duplicate Line Item"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                          >
                            <RiFileCopyLine className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            title="Delete Line Item"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line Item Numeric Attributes */}
                      <div className="grid grid-cols-6 gap-2">
                        {/* HSN/SAC */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">HSN/SAC</label>
                          <input
                            type="text"
                            value={item.hsnSac || ''}
                            onChange={(e) => handleUpdateItem(index, { hsnSac: e.target.value })}
                            placeholder="998314"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono outline-none"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleUpdateItem(index, { quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold outline-none"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-md px-1 py-1 text-xs outline-none"
                          >
                            <option value="Nos">Nos</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Brass">Brass</option>
                            <option value="Sqft">Sqft</option>
                            <option value="Sqm">Sqm</option>
                            <option value="Mtr">Mtr</option>
                            <option value="Feet">Feet</option>
                            <option value="Ton">Ton</option>
                            <option value="Bags">Bags</option>
                            <option value="Boxes">Boxes</option>
                            <option value="Kg">Kg</option>
                            <option value="Ltr">Ltr</option>
                            <option value="Hrs">Hrs</option>
                            <option value="Days">Days</option>
                            <option value="Job">Job</option>
                            <option value="Lic">Lic</option>
                            <option value="Roll">Roll</option>
                            <option value="Packet">Packet</option>
                            <option value="Set">Set</option>
                            {item.unit && !['Nos','Pcs','Brass','Sqft','Sqm','Mtr','Feet','Ton','Bags','Boxes','Kg','Ltr','Hrs','Days','Job','Lic','Roll','Packet','Set'].includes(item.unit) && (
                              <option value={item.unit}>{item.unit}</option>
                            )}
                          </select>
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => handleUpdateItem(index, { rate: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold outline-none"
                          />
                        </div>

                        {/* Discount % */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount ? item.discount : ''}
                            onChange={(e) => handleUpdateItem(index, { discount: e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))) })}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 outline-none"
                          />
                        </div>

                        {/* GST % */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">GST Rate</label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(index, { gstRate: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-200 rounded-md px-1 py-1 text-xs font-semibold text-blue-700 outline-none"
                          >
                            <option value="0">0% (Nil)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>

                      {/* Line Subtotal Banner */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/70 text-slate-500">
                        <span>
                          Taxable: <strong className="text-slate-800">{formatCurrency(item.taxableAmount, '₹')}</strong>
                        </span>
                        <span>
                          GST ({item.gstRate}%): <strong className="text-slate-800">{formatCurrency(item.gstAmount, '₹')}</strong>
                        </span>
                        <span>
                          Row Total: <strong className="text-blue-700 font-bold">{formatCurrency(item.total, '₹')}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Strip */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium text-slate-600">
                  {/* GST Tax Treatment Selector */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-700">Tax Type:</span>
                    <select
                      value={calculatedData.gstType || 'cgst_sgst'}
                      onChange={(e) => {
                        const val = e.target.value as GSTType;
                        setInvoiceData((prev) => {
                          let nextItems = prev.items;
                          if (val === 'none') {
                            nextItems = prev.items.map((it) => ({
                              ...it,
                              gstRate: 0,
                              gstAmount: 0,
                              total: it.taxableAmount,
                            }));
                          }
                          return {
                            ...prev,
                            gstType: val,
                            items: nextItems,
                          };
                        });
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-blue-700 outline-none cursor-pointer focus:border-blue-600"
                    >
                      <option value="cgst_sgst">CGST + SGST (Intra-State)</option>
                      <option value="igst">IGST (Inter-State)</option>
                      <option value="none">Non-GST / Exempt (0%)</option>
                    </select>
                  </div>

                  {calculatedData.totalDiscount > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Gross Subtotal:</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(calculatedData.subtotal, '₹')}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Total Discount:</span>
                        <span className="font-semibold font-mono">
                          -{formatCurrency(calculatedData.totalDiscount, '₹')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxable Subtotal:</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(calculatedData.totalTaxableAmount, '₹')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>Taxable Subtotal:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {formatCurrency(calculatedData.totalTaxableAmount, '₹')}
                      </span>
                    </div>
                  )}

                  {/* Statutory GST Line Breakdown */}
                  {calculatedData.gstType === 'cgst_sgst' && (
                    <>
                      <div className="flex justify-between">
                        <span>Central GST (CGST):</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(calculatedData.totalCgst, '₹')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>State GST (SGST):</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {formatCurrency(calculatedData.totalSgst, '₹')}
                        </span>
                      </div>
                    </>
                  )}

                  {calculatedData.gstType === 'igst' && (
                    <div className="flex justify-between">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {formatCurrency(calculatedData.totalIgst, '₹')}
                      </span>
                    </div>
                  )}

                  {calculatedData.gstType === 'none' && (
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>GST (Non-GST / Exempt):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                  )}

                  {calculatedData.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">
                        {calculatedData.roundOff > 0 ? '+' : ''}
                        {formatNumber(calculatedData.roundOff)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-700 font-mono text-base">
                      {formatCurrency(calculatedData.grandTotalRounded, '₹')}
                    </span>
                  </div>

                  {calculatedData.amountPaid > 0 && (
                    <div className="pt-1.5 border-t border-slate-200/80 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Amount Paid:</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(calculatedData.amountPaid, '₹')}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Balance Due:</span>
                        <span className={`font-mono ${calculatedData.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(Math.max(0, calculatedData.balanceDue), '₹')}
                        </span>
                      </div>
                      {calculatedData.amountPaid > calculatedData.grandTotalRounded && (
                        <div className="flex justify-between text-amber-700 font-medium text-[11px]">
                          <span>Excess / Advance:</span>
                          <span className="font-mono font-semibold">
                            +{formatCurrency(calculatedData.amountPaid - calculatedData.grandTotalRounded, '₹')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ TAB 2: CLIENT & SUPPLIER ══════════ */}
            {activeTab === 'parties' && (
              <div className="space-y-4">
                {/* Client / Buyer Section */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <RiUserLine className="size-4 text-blue-600" />
                      Buyer / Client Information
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Quick Client Select */}
                      <select
                        onChange={(e) => handleSelectClient(e.target.value)}
                        value=""
                        className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-blue-700 font-semibold cursor-pointer outline-none"
                      >
                        <option value="">Load from Directory...</option>
                        {clients.map((c, i) => (
                          <option key={i} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleSaveClientToDirectory}
                        title="Save or update this client profile in your offline directory"
                        className="text-xs text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RiSave3Line className="size-3" />
                        {clients.some((c) => c.name.toLowerCase() === invoiceData.client.name.trim().toLowerCase())
                          ? 'Update Directory'
                          : 'Save to Directory'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">Client Legal Name</label>
                    <input
                      type="text"
                      value={invoiceData.client.name}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          client: { ...invoiceData.client, name: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">GSTIN</label>
                      <input
                        type="text"
                        value={invoiceData.client.gstin || ''}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, gstin: e.target.value.toUpperCase() },
                          })
                        }
                        placeholder="27AADCS5678G1Z9"
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 font-mono text-xs outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Phone</label>
                      <input
                        type="text"
                        value={invoiceData.client.phone || ''}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, phone: e.target.value },
                          })
                        }
                        placeholder="+91 98200 12345"
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Billing Email</label>
                      <input
                        type="email"
                        value={invoiceData.client.email || ''}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, email: e.target.value },
                          })
                        }
                        placeholder="billing@client.com"
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Billing Address</label>
                    <input
                      type="text"
                      value={invoiceData.client.address}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          client: { ...invoiceData.client, address: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">City</label>
                      <input
                        type="text"
                        value={invoiceData.client.city}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, city: e.target.value },
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">State</label>
                      <input
                        type="text"
                        list="indian-states-list"
                        value={invoiceData.client.state}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, state: e.target.value },
                            placeOfSupply: `${e.target.value} (${invoiceData.client.gstin ? invoiceData.client.gstin.slice(0, 2) : '27'})`,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Pincode</label>
                      <input
                        type="text"
                        value={invoiceData.client.pincode}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            client: { ...invoiceData.client, pincode: e.target.value },
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <datalist id="indian-states-list">
                    <option value="Andhra Pradesh" />
                    <option value="Arunachal Pradesh" />
                    <option value="Assam" />
                    <option value="Bihar" />
                    <option value="Chhattisgarh" />
                    <option value="Goa" />
                    <option value="Gujarat" />
                    <option value="Haryana" />
                    <option value="Himachal Pradesh" />
                    <option value="Jharkhand" />
                    <option value="Karnataka" />
                    <option value="Kerala" />
                    <option value="Madhya Pradesh" />
                    <option value="Maharashtra" />
                    <option value="Manipur" />
                    <option value="Meghalaya" />
                    <option value="Mizoram" />
                    <option value="Nagaland" />
                    <option value="Odisha" />
                    <option value="Punjab" />
                    <option value="Rajasthan" />
                    <option value="Sikkim" />
                    <option value="Tamil Nadu" />
                    <option value="Telangana" />
                    <option value="Tripura" />
                    <option value="Uttar Pradesh" />
                    <option value="Uttarakhand" />
                    <option value="West Bengal" />
                    <option value="Delhi" />
                    <option value="Chandigarh" />
                    <option value="Jammu and Kashmir" />
                    <option value="Ladakh" />
                    <option value="Puducherry" />
                  </datalist>
                </div>

                {/* Dates & Supply Section */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 block">Invoice Dates &amp; Tax Jurisdiction</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceData.invoiceDate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={invoiceData.dueDate || ''}
                        onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Place of Supply</label>
                      <input
                        type="text"
                        value={invoiceData.placeOfSupply || ''}
                        onChange={(e) => setInvoiceData({ ...invoiceData, placeOfSupply: e.target.value })}
                        placeholder="Maharashtra (27)"
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Tax Treatment</label>
                      <select
                        value={calculatedData.gstType || 'cgst_sgst'}
                        onChange={(e) => {
                          const val = e.target.value as GSTType;
                          setInvoiceData((prev) => {
                            let nextItems = prev.items;
                            if (val === 'none') {
                              nextItems = prev.items.map((it) => ({
                                ...it,
                                gstRate: 0,
                                gstAmount: 0,
                                total: it.taxableAmount,
                              }));
                            }
                            return {
                              ...prev,
                              gstType: val,
                              items: nextItems,
                            };
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs font-semibold text-blue-700 outline-none"
                      >
                        <option value="cgst_sgst">CGST + SGST</option>
                        <option value="igst">IGST</option>
                        <option value="none">Non-GST</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ TAB: PHOTO, STAMP & SIGNATURE ══════════ */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      Business Assets &amp; Signatures
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Assets appear directly on invoice headers, footer stamps, and official sign-off blocks.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={handleLoadImagesFromProfile}
                      title="Load default logo, stamp, and signature from your saved business profile"
                      className="text-[11px]"
                    >
                      Load Defaults
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={handleSaveImagesToProfile}
                      title="Save these images to your business profile for future invoices"
                      className="text-[11px]"
                    >
                      Set As Default
                    </Button>
                  </div>
                </div>

                {/* 1. Profile Photo / Business Logo */}
                <ImageUploadCard
                  label="Profile Photo / Company Logo"
                  description="Printed in the top header of the invoice"
                  value={invoiceData.business?.logoUrl || invoiceData.logoUrl}
                  onChange={(val) => {
                    setInvoiceData((prev) => ({
                      ...prev,
                      logoUrl: val,
                      business: { ...prev.business, logoUrl: val },
                    }));
                  }}
                  icon={RiImageLine}
                  aspectHint="Square or horizontal logo (PNG, JPG, SVG)"
                />

                {/* 2. Official Company Stamp / Seal */}
                <ImageUploadCard
                  label="Official Company Stamp / Seal"
                  description="Printed beside or over the authorized signatory"
                  value={invoiceData.stampUrl || invoiceData.business?.stampUrl}
                  onChange={(val) => {
                    setInvoiceData((prev) => ({
                      ...prev,
                      stampUrl: val,
                      business: { ...prev.business, stampUrl: val },
                    }));
                  }}
                  icon={RiShieldCheckLine}
                  aspectHint="Circular or rectangular rubber seal (transparent PNG)"
                />

                {/* 3. Authorized Signature */}
                <ImageUploadCard
                  label="Authorized Signatory Signature"
                  description="Signatory signature printed above the title"
                  value={invoiceData.signatureUrl || invoiceData.business?.signatureUrl}
                  onChange={(val) => {
                    setInvoiceData((prev) => ({
                      ...prev,
                      signatureUrl: val,
                      business: { ...prev.business, signatureUrl: val },
                    }));
                  }}
                  icon={RiEditLine}
                  allowDraw={true}
                  aspectHint="PNG/JPG signature, or draw live on screen"
                />
              </div>
            )}

            {/* ══════════ TAB 3: PAYMENTS & TERMS ══════════ */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                {/* Payments Section */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900 block">Payments Received</span>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-0.5">
                        <span>
                          Paid: <strong className="text-slate-800">{formatCurrency(calculatedData.amountPaid, '₹')}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Due:{' '}
                          <strong className={calculatedData.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatCurrency(Math.max(0, calculatedData.balanceDue), '₹')}
                          </strong>
                        </span>
                        {calculatedData.balanceDue === 0 && calculatedData.amountPaid >= calculatedData.grandTotalRounded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            <RiCheckboxCircleLine className="size-3 text-emerald-600" />
                            Settled in Full
                          </span>
                        )}
                        {calculatedData.amountPaid > calculatedData.grandTotalRounded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            Overpaid by {formatCurrency(calculatedData.amountPaid - calculatedData.grandTotalRounded, '₹')}
                          </span>
                        )}
                      </div>
                    </div>

                    {!showPaymentForm && (
                      calculatedData.balanceDue > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentForm(false)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          <RiAddLine className="size-3.5" />
                          Add Payment
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentForm(true)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 text-[11px]"
                          title="Record an extra payment or advance adjustment"
                        >
                          <RiAddLine className="size-3" />
                          Add Extra / Advance
                        </button>
                      )
                    )}
                  </div>

                  {/* Inline Payment Form */}
                  {showPaymentForm && (
                    <form
                      onSubmit={handleConfirmAddPayment}
                      className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {calculatedData.balanceDue > 0 ? 'Record New Payment' : 'Record Advance / Extra Payment'}
                        </span>
                        {calculatedData.balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setNewPaymentAmount(String(calculatedData.balanceDue))}
                            className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            Pay Full Due ({formatCurrency(calculatedData.balanceDue, '₹')})
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-slate-500 font-medium">Amount (₹) *</label>
                            {calculatedData.balanceDue > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Due: {formatCurrency(calculatedData.balanceDue, '₹')}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value)}
                            placeholder={String(Math.max(0, calculatedData.balanceDue) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            autoFocus
                          />
                          {Number(newPaymentAmount) > calculatedData.balanceDue && calculatedData.balanceDue > 0 && (
                            <p className="text-[10px] text-amber-600 font-medium mt-1 leading-tight">
                              Exceeds balance due by {formatCurrency(Number(newPaymentAmount) - calculatedData.balanceDue, '₹')} (recorded as excess/advance).
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Payment Method</label>
                          <select
                            value={newPaymentMethod}
                            onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                          >
                            <option value="UPI">UPI / QR</option>
                            <option value="NEFT">Bank Transfer (NEFT/RTGS)</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Card">Debit / Credit Card</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Payment Date</label>
                          <input
                            type="date"
                            value={newPaymentDate}
                            onChange={(e) => setNewPaymentDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Reference ID (Optional)</label>
                          <input
                            type="text"
                            value={newPaymentRef}
                            onChange={(e) => setNewPaymentRef(e.target.value)}
                            placeholder="e.g. UTR-982341 / Txn ID"
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowPaymentForm(false)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs cursor-pointer"
                        >
                          Record Payment
                        </button>
                      </div>
                    </form>
                  )}

                  {invoiceData.payments.length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">No payments recorded yet. Click "Add Payment" when client pays.</p>
                  ) : (
                    <div className="space-y-2">
                      {invoiceData.payments.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          <div>
                            <span className="font-bold text-slate-900 font-mono">{formatCurrency(p.amount, '₹')}</span>
                            <span className="text-[10px] text-slate-600 ml-2 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.method}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">{p.date}</span>
                            {p.reference && <span className="text-[10px] font-mono text-slate-400 ml-2">({p.reference})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(idx)}
                            title="Delete this payment entry"
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes & Terms Section */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 block">Customer Notes &amp; Legal Terms</span>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Notes to Client</label>
                    <textarea
                      rows={2}
                      value={invoiceData.notes || ''}
                      onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                      placeholder="Thank you for your business..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Terms &amp; Conditions</label>
                    <textarea
                      rows={3}
                      value={invoiceData.terms || ''}
                      onChange={(e) => setInvoiceData({ ...invoiceData, terms: e.target.value })}
                      placeholder="1. Goods once sold..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Copy Label</label>
                    <input
                      type="text"
                      value={invoiceData.copyLabel || ''}
                      onChange={(e) => setInvoiceData({ ...invoiceData, copyLabel: e.target.value })}
                      placeholder="Original for Recipient"
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: REAL-TIME LIVE PREVIEW CANVAS */}
        <div className="flex-1 bg-slate-100 overflow-auto p-6 relative">
          <ThemePreview
            themeId={themeId}
            data={calculatedData}
            options={activeOptions}
            scale={zoomLevel}
          />
        </div>
      </div>

      {/* Share Modal */}
      <ShareInvoiceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        invoice={calculatedData}
        themeId={themeId}
      />
    </div>
  );
};
