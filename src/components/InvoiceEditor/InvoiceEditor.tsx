// ─── Real-Time Offline Invoice Editor ─────────────────────────────────
// Desktop workstation for editing line items, taxes, clients, payments, and previewing live.

import React, { useState, useMemo, useEffect } from 'react';
import type {
  InvoiceRenderData,
  LineItem,
  PaymentInfo,
  GSTType,
  ThemeFontFamily,
  ThemeFontSize,
  PaperSize,
  WatermarkType,
  AppRegion,
} from '../../types';
import { useInvoices, getTodayLocalDateString } from '../../context/InvoiceContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllThemes, resolveOptions } from '../../themes';
import { ThemePreview } from '../ThemePreview/ThemePreview';
import { ShareInvoiceModal } from '../ShareInvoiceModal/ShareInvoiceModal';
import { generateInvoicePdf } from '../../services/pdfGeneratorService';
import { exportAndSaveFile } from '../../services/fileExportService';
import { ColorPickerField } from '../ThemeOptions/ColorPickerField';
import { recalculate } from '../../utils/buildRenderData';
import {
  formatCurrency,
  formatNumber,
  exportInvoiceToExcel,
  US_UNITS,
  IN_UNITS,
  ALL_KNOWN_UNITS,
  IN_GST_RATES,
  isDefaultPlaceholderItem,
  productToLineItem,
} from '../../utils';
import { extractStateCode } from '../../utils/gst';
import { useNativeBackButton } from '../../hooks/useNativeBackButton';
import { haptics } from '../../services/nativeMobileService';
import {
  US_TAX_PRESETS,
  US_STATES_LIST,
  formatEIN,
  formatUSZip,
  getUSStateTaxRate,
} from '../../utils/usTax';

// BoardUI Components
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { toast } from '@/components/base/toast/toast';
import { SwitchCard } from '@/components/base/switch/switch-card';
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
  RiUserLine,
  RiImageLine,
  RiShieldCheckLine,
  RiEditLine,
  RiCheckboxCircleLine,
  RiPaletteLine,
  RiDownload2Line,
  RiFileExcel2Line,
  RiRefreshLine,
  RiTableLine,
  RiBankCardLine,
  RiCalendarLine,
  RiQrCodeLine,
  RiMoreFill,
  RiPriceTag3Line,
} from '@remixicon/react';

function getMonthNameAndYear(ym: string): string {
  if (!ym) return '';
  try {
    const [year, month] = ym.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return ym;
  }
}

interface InvoiceEditorProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ invoiceId, onBack }) => {
  const { getInvoice, updateInvoice, clients, products, businessProfile, updateBusinessProfile, saveClient, saveProduct } = useInvoices();
  const {
    currentThemeId,
    getOptionsForTheme,
    setThemeOptions,
    resetOptions,
    presets,
    loadPreset,
    savePreset,
  } = useTheme();
  const themes = getAllThemes();

  const record = getInvoice(invoiceId);
  const [activeTab, setActiveTab] = useState<'items' | 'parties' | 'branding' | 'payment' | 'styling'>('items');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [themeId, setThemeId] = useState<string>(() => record?.themeId || currentThemeId);
  const [zoomLevel, setZoomLevel] = useState<number | 'auto'>('auto');
  const [newPresetName, setNewPresetName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Share Invoice Modal
  const [showShareModal, setShowShareModal] = useState(false);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'UPI' | 'NEFT' | 'Cash' | 'Cheque' | 'Card'>('UPI');
  const [newPaymentDate, setNewPaymentDate] = useState(() => getTodayLocalDateString());
  const [newPaymentRef, setNewPaymentRef] = useState('');

  // Android hardware back button handler
  useNativeBackButton(
    'invoice-editor-screen',
    () => {
      if (showActionMenu) {
        setShowActionMenu(false);
        return true;
      }
      if (showShareModal) {
        setShowShareModal(false);
        return true;
      }
      if (showPaymentForm) {
        setShowPaymentForm(false);
        return true;
      }
      onBack();
      return true;
    },
    true,
    100
  );

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
    const isAppUS = businessProfile.region === 'US' || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
    // Fallback if not found: clean real-time invoice based on active business profile
    return recalculate({
      region: isAppUS ? 'US' : 'IN',
      taxType: isAppUS ? 'sales_tax' : 'gst',
      invoiceNumber: 'INV-001',
      invoiceDate: getTodayLocalDateString(),
      dueDate: getTodayLocalDateString(),
      placeOfSupply: isAppUS
        ? (businessProfile.state || 'California (CA)')
        : `${businessProfile.state || 'Maharashtra'} (${extractStateCode(businessProfile.state || '', businessProfile.gstin) || '27'})`,
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
        region: isAppUS ? 'US' : 'IN',
        taxType: isAppUS ? 'sales_tax' : 'gst',
        gstin: businessProfile.gstin || '',
        pan: businessProfile.pan || '',
        ein: businessProfile.ein || '',
        stateTaxId: businessProfile.stateTaxId || '',
      },
      client: clients[0] ? { ...clients[0] } : {
        name: '',
        address: '',
        city: '',
        state: isAppUS ? 'California (CA)' : (businessProfile.state || 'Maharashtra (27)'),
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
        ein: '',
      },
      items: [],
      gstType: isAppUS ? 'none' : 'cgst_sgst',
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
      currencySymbol: isAppUS ? '$' : '₹',
      currencyCode: isAppUS ? 'USD' : 'INR',
    });
  });

  // Regional settings detection
  const isUS = useMemo(() => {
    if (invoiceData.region === 'US') return true;
    if (invoiceData.region === 'IN') return false;
    if (businessProfile.region === 'US') return true;
    if (businessProfile.region === 'IN') return false;
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
  }, [invoiceData.region, businessProfile.region]);

  const currencySymbol = invoiceData.currencySymbol || (isUS ? '$' : '₹');

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
    return getOptionsForTheme ? getOptionsForTheme(themeId) : resolveOptions(themeId);
  }, [themeId, getOptionsForTheme]);

  // Handle saving to offline storage
  const handleSave = () => {
    haptics.success();
    updateInvoice(invoiceId, calculatedData, themeId);
    toast.success(`Invoice ${calculatedData.invoiceNumber} saved offline`);
  };

  // Instant Region Switcher: 🇮🇳 India (GST) vs 🇺🇸 United States (Sales Tax)
  const handleToggleRegion = (newRegion: AppRegion) => {
    if (newRegion === 'US') {
      const defaultState = businessProfile.region === 'US' ? (businessProfile.state || 'California (CA)') : 'California (CA)';
      const defaultTaxRate = getUSStateTaxRate(defaultState) || 7.25;
      setInvoiceData((prev) => {
        const nextItems = prev.items.map((it) => ({
          ...it,
          sku: it.sku || (it.hsnSac ? `SKU-${it.hsnSac}` : 'SRV-101'),
          hsnSac: undefined,
          taxable: it.taxable !== false,
          gstRate: it.gstRate === 18 ? defaultTaxRate : it.gstRate,
        }));
        return recalculate({
          ...prev,
          region: 'US',
          taxType: 'sales_tax',
          currencySymbol: '$',
          currencyCode: 'USD',
          gstType: 'none',
          placeOfSupply: prev.placeOfSupply?.includes('(') && !prev.placeOfSupply.includes('27') ? prev.placeOfSupply : defaultState,
          items: nextItems,
          business: {
            ...prev.business,
            region: 'US',
            taxType: 'sales_tax',
          },
          client: {
            ...prev.client,
            state: prev.client.state && US_STATES_LIST.includes(prev.client.state) ? prev.client.state : defaultState,
          },
        });
      });
      toast.success('Switched invoice to 🇺🇸 United States (Sales Tax & USD)');
    } else {
      const defaultState = businessProfile.region === 'IN' ? (businessProfile.state || 'Maharashtra (27)') : 'Maharashtra (27)';
      setInvoiceData((prev) => {
        const nextItems = prev.items.map((it) => ({
          ...it,
          hsnSac: it.hsnSac || (it.sku ? it.sku.replace(/\D/g, '') || '998314' : '998314'),
          gstRate: it.gstRate === 0 && it.taxable ? 18 : it.gstRate,
        }));
        return recalculate({
          ...prev,
          region: 'IN',
          taxType: 'gst',
          currencySymbol: '₹',
          currencyCode: 'INR',
          gstType: prev.gstType === 'none' ? 'cgst_sgst' : prev.gstType,
          placeOfSupply: defaultState,
          items: nextItems,
          business: {
            ...prev.business,
            region: 'IN',
            taxType: 'gst',
          },
          client: {
            ...prev.client,
            state: defaultState,
          },
        });
      });
      toast.success('Switched invoice to 🇮🇳 India (GST & INR)');
    }
  };

  // Direct print
  const handlePrint = () => {
    updateInvoice(invoiceId, calculatedData, themeId);
    toast.info('Opening print layout...');
    const url = `/print/${invoiceId}?theme=${themeId}&action=print`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = url;
    }
  };

  // Direct Save as PDF (Vector Engine)
  const handleSavePdf = async () => {
    updateInvoice(invoiceId, calculatedData, themeId);
    try {
      const cleanNum = (calculatedData.invoiceNumber || 'INV-001').trim().replace(/[\\/:*?"<>|]/g, '-');
      const fileName = `Invoice-${cleanNum}.pdf`;
      const { buffer } = generateInvoicePdf(calculatedData);
      await exportAndSaveFile({
        fileName,
        data: buffer,
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${calculatedData.invoiceNumber} PDF`,
        successMessage: `Saved PDF: ${fileName}`,
      });
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error(`Could not generate PDF: ${err?.message || err}`);
    }
  };

  // Direct Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    updateInvoice(invoiceId, calculatedData, themeId);
    try {
      await exportInvoiceToExcel(calculatedData);
    } catch (err: any) {
      toast.error(`Failed to export Excel: ${err?.message || err}`);
    }
  };

  // ── Line Items Handlers ───────────────────────────────────────────────────

  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

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

      const baseAmount = round2(qty * rate);
      const discountAmount = discount > 0 ? round2((baseAmount * discount) / 100) : 0;
      const taxableAmount = round2(baseAmount - discountAmount);
      const gstAmount = round2((taxableAmount * gstRate) / 100);
      const total = round2(taxableAmount + gstAmount);

      items[index] = {
        ...updated,
        discount: discount > 0 ? discount : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        taxableAmount,
        gstAmount,
        total,
      };

      let nextGstType = prev.gstType;
      if (!isUS && nextGstType === 'none' && gstRate > 0) {
        nextGstType = 'cgst_sgst';
      }

      return { ...prev, items, gstType: isUS ? 'none' : nextGstType };
    });
  };

  const handleAddItem = (preset?: Partial<LineItem>) => {
    setInvoiceData((prev) => {
      const defaultTaxRate = isUS ? 7.25 : 18;
      const defaultUnit = isUS ? 'ea' : 'Nos';
      const defaultCode = isUS ? 'SRV-101' : '998314';

      const qty = preset?.quantity || 1;
      const rate = preset?.rate !== undefined ? preset.rate : (isUS ? 100 : 1000);
      const discount = preset?.discount || 0;
      const gstRate = preset?.gstRate !== undefined ? preset.gstRate : defaultTaxRate;
      const defaultDate =
        preset?.date ||
        (prev.invoiceType === 'monthly'
          ? (prev.billingMonth ? `${prev.billingMonth}-01` : prev.invoiceDate)
          : prev.invoiceDate);

      const baseAmount = round2(qty * rate);
      const discountAmount = discount > 0 ? round2((baseAmount * discount) / 100) : 0;
      const taxableAmount = round2(baseAmount - discountAmount);
      const gstAmount = round2((taxableAmount * gstRate) / 100);
      const total = round2(taxableAmount + gstAmount);

      const newItem: LineItem = {
        id: `item-${Date.now()}-${prev.items.length + 1}`,
        sno: prev.items.length + 1,
        date: defaultDate,
        description: preset?.description || (isUS ? 'Consulting & Professional Services' : 'New Service / Product Description'),
        hsnSac: isUS ? undefined : (preset?.hsnSac || defaultCode),
        sku: isUS ? (preset?.sku || defaultCode) : undefined,
        taxable: gstRate > 0,
        quantity: qty,
        unit: preset?.unit || defaultUnit,
        rate,
        discount: discount > 0 ? discount : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        taxableAmount,
        gstRate,
        gstAmount,
        total,
      };

      let nextGstType = prev.gstType;
      if (!isUS && nextGstType === 'none' && gstRate > 0) {
        nextGstType = 'cgst_sgst';
      }

      return { ...prev, items: [...prev.items, newItem], gstType: isUS ? 'none' : nextGstType };
    });
  };

  const handleSelectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    haptics.selection();

    setInvoiceData((prev) => {
      const isBlankFirstItem = prev.items.length === 1 && isDefaultPlaceholderItem(prev.items[0]);
      const targetSno = isBlankFirstItem ? 1 : prev.items.length + 1;
      const targetId = isBlankFirstItem
        ? prev.items[0].id
        : `item-${Date.now()}-${prev.items.length + 1}`;
      const fallbackDate =
        prev.invoiceType === 'monthly'
          ? (prev.billingMonth ? `${prev.billingMonth}-01` : prev.invoiceDate)
          : prev.invoiceDate;
      const targetDate = isBlankFirstItem
        ? (prev.items[0].date || fallbackDate)
        : fallbackDate;

      const loadedItem = productToLineItem(product, {
        isUS,
        isClientTaxExempt: Boolean(prev.client?.taxExempt),
        sno: targetSno,
        id: targetId,
        date: targetDate,
      });

      let nextGstType = prev.gstType;
      if (!isUS && nextGstType === 'none' && loadedItem.gstRate > 0) {
        nextGstType = 'cgst_sgst';
      }

      const nextItems = isBlankFirstItem ? [loadedItem] : [...prev.items, loadedItem];
      return { ...prev, items: nextItems, gstType: isUS ? 'none' : nextGstType };
    });

    toast.success(`Loaded "${product.name}" into invoice`);
  };

  const handleSaveItemToCatalog = (item: LineItem) => {
    const desc = (item.description || '').trim();
    if (!desc) {
      toast.error('Enter an item description before saving to Product Catalog');
      return;
    }
    const saved = saveProduct({
      name: desc,
      hsnSac: isUS ? undefined : (item.hsnSac || undefined),
      sku: isUS ? (item.sku || item.hsnSac || undefined) : undefined,
      unit: item.unit || (isUS ? 'ea' : 'Nos'),
      rate: Number(item.rate) || 0,
      defaultQuantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      discount: Number(item.discount) > 0 ? Number(item.discount) : undefined,
      gstRate: Number(item.gstRate) || 0,
      taxable: item.taxable !== undefined ? item.taxable : (Number(item.gstRate) || 0) > 0,
    });
    haptics.success();
    toast.success(`Saved "${saved.name}" to Product Catalog`);
  };

  const handleDuplicateItem = (index: number) => {
    setInvoiceData((prev) => {
      const target = prev.items[index];
      const copy: LineItem = {
        ...target,
        id: `item-${Date.now()}`,
        sno: prev.items.length + 1,
        date: target.date,
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
    setNewPaymentDate(getTodayLocalDateString());
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
      date: newPaymentDate || getTodayLocalDateString(),
      amount: roundedAmount,
      method: newPaymentMethod,
      reference: newPaymentRef.trim() || undefined,
    };

    setInvoiceData((prev) => {
      const nextPayments = [...(prev.payments || []), newPayment];
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
      toast.info(`Payment of ${formatCurrency(roundedAmount, currencySymbol)} recorded (Excess: ${formatCurrency(excess, currencySymbol)})`);
    } else if (calculatedData.balanceDue <= 0) {
      toast.info(`Advance payment of ${formatCurrency(roundedAmount, currencySymbol)} recorded`);
    } else {
      toast.success(`Recorded payment of ${formatCurrency(roundedAmount, currencySymbol)}`);
    }
  };

  const handleRemovePayment = (idx: number) => {
    setInvoiceData((prev) => {
      const remainingPayments = (prev.payments || []).filter((_, i) => i !== idx);
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
      const freshCalculated = recalculate(prev);
      if (newStatus === 'paid') {
        const currentPaid = (prev.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const remaining = Math.max(0, Math.round((freshCalculated.grandTotalRounded - currentPaid + Number.EPSILON) * 100) / 100);
        const nextPayments = [...(prev.payments || [])];
        if (remaining > 0) {
          nextPayments.push({
            date: getTodayLocalDateString(),
            amount: remaining,
            method: isUS ? 'ACH' : 'UPI',
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
      placeOfSupply: `${matched.state} (${extractStateCode(matched.state, matched.gstin) || (matched.gstin ? matched.gstin.slice(0, 2) : '27')})`,
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
      {/* ─── WORKSTATION TOP BAR (STREAMLINED, ZERO HORIZONTAL SCROLL ON DESKTOP) ─── */}
      <div className="h-14 px-3 sm:px-4 lg:px-5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 z-20 min-w-0 overflow-x-auto md:overflow-visible no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiArrowLeftLine}
            onClick={() => {
              updateInvoice(invoiceId, calculatedData, themeId);
              onBack();
            }}
            className="text-xs shrink-0"
            aria-label="Back to Invoices"
          >
            <span className="hidden sm:inline">Invoices</span>
          </Button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Invoice Number Input */}
          <input
            type="text"
            aria-label="Invoice number"
            value={invoiceData.invoiceNumber}
            onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
            className="font-bold text-xs sm:text-sm text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-600 rounded-lg px-2 py-1 bg-slate-50 outline-none w-24 sm:w-28"
          />

          {/* Status Dropdown */}
          <select
            aria-label="Invoice status"
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

        {/* Right: Essential Top Bar Actions Only */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Compact Theme Selector + Customize */}
          <div className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-1 rounded-xl text-xs shrink-0">
            <select
              aria-label="Invoice template"
              value={themeId}
              onChange={(e) => {
                const nextTheme = e.target.value;
                setThemeId(nextTheme);
                if (nextTheme === 'thermal') setZoomLevel(1.0);
              }}
              className="bg-white text-blue-900 font-bold px-2 py-0.5 rounded-lg border border-blue-200 outline-none cursor-pointer text-xs max-w-[135px] lg:max-w-[155px] truncate"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.paper.join('/')})
                </option>
              ))}
            </select>
            <Button
              size="xs"
              variant="ghost"
              leadingIcon={RiPaletteLine}
              onClick={() => setActiveTab('styling')}
              title="Customize Theme Colors, Fonts & Layout"
              className="text-[11px] font-semibold text-blue-600"
            >
              Customize
            </Button>
          </div>

          {/* Primary Action CTA: Save Draft (Always visible on desktop/laptop without scrolling) */}
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiSave3Line}
            onClick={handleSave}
            className="hidden sm:inline-flex text-xs font-medium shrink-0"
          >
            Save Draft
          </Button>

          {/* Secondary Actions Dropdown (Export Excel, Share, Print, Region) */}
          <div className="relative shrink-0">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiMoreFill}
              onClick={() => setShowActionMenu((open) => !open)}
              className="text-xs font-semibold shrink-0"
              aria-label="More actions"
            >
              <span className="hidden sm:inline">More</span>
            </Button>

            {showActionMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActionMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handleSave();
                    }}
                    className="w-full flex sm:hidden items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <RiSave3Line className="size-4 text-slate-600" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 text-left cursor-pointer"
                  >
                    <RiFileExcel2Line className="size-4 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      updateInvoice(invoiceId, calculatedData, themeId);
                      setShowShareModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 text-left cursor-pointer"
                  >
                    <RiShareForwardLine className="size-4 text-blue-600" />
                    <span>Share Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handlePrint();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                  >
                    <RiPrinterLine className="size-4 text-slate-600" />
                    <span>Print Invoice</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Quick Tax Region Switcher */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-[11px]">Region:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleRegion('IN');
                          setShowActionMenu(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          !isUS ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🇮🇳 IN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleRegion('US');
                          setShowActionMenu(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          isUS ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🇺🇸 US
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Primary Action CTA: Save PDF (Always visible) */}
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiDownload2Line}
            onClick={handleSavePdf}
            className="text-xs shadow-xs font-semibold shrink-0"
          >
            Save PDF
          </Button>
        </div>
      </div>

      {/* ─── 2-PANE DESKTOP / 1-PANE MOBILE ADAPTIVE WORKSPACE ─── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* MOBILE VIEW TOGGLE: EDIT FORM vs LIVE PREVIEW */}
        <div className="lg:hidden px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-center shrink-0">
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 w-full max-w-sm shadow-inner">
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'editor' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✍️ Edit Invoice
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mobileTab === 'preview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👁️ Live Preview
            </button>
          </div>
        </div>

        {/* LEFT PANE: HIGH-DENSITY EDITING FORM */}
        <div className={`w-full lg:w-[480px] xl:w-[560px] 2xl:w-[640px] 3xl:w-[700px] bg-white border-r border-slate-200 flex-col shrink-0 overflow-hidden transition-all duration-200 ${mobileTab === 'editor' ? 'flex flex-1 lg:flex-initial' : 'hidden lg:flex'}`}>
          {/* Form Tabs - Horizontally scrollable on mobile screens to prevent overlapping */}
          <div className="px-3 xl:px-6 pt-2.5 xl:pt-4 pb-2 xl:pb-3 border-b border-slate-200 bg-slate-50/70 shrink-0 overflow-x-auto [scrollbar-width:none]">
            <SegmentedControl
              aria-label="Editor Form Tabs"
              selectedKeys={new Set([activeTab])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) {
                  haptics.selection();
                  setActiveTab(val as any);
                }
              }}
              className="flex min-w-max w-full bg-slate-200/70 p-0.5"
            >
              <SegmentedControlItem id="items" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                Items ({invoiceData.items.length})
              </SegmentedControlItem>
              <SegmentedControlItem id="parties" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                Buyer &amp; Dates
              </SegmentedControlItem>
              <SegmentedControlItem id="branding" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                Logo &amp; Stamp
              </SegmentedControlItem>
              <SegmentedControlItem id="payment" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                Pay &amp; Terms
              </SegmentedControlItem>
              <SegmentedControlItem id="styling" className="text-xs xl:text-sm font-medium py-1 xl:py-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                Style &amp; Theme
              </SegmentedControlItem>
            </SegmentedControl>
          </div>

          {/* Tab Content Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 xl:p-6 space-y-4 xl:space-y-6 text-xs xl:text-sm">
            {/* ══════════ TAB 1: LINE ITEMS & AMOUNTS ══════════ */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                {/* Invoice Classification & Billing Period Bar */}
                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-800">Invoice Classification:</span>
                    <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setInvoiceData((prev) => ({ ...prev, invoiceType: 'daily' }))}
                        className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
                          invoiceData.invoiceType !== 'monthly'
                            ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Daily Invoice (Regular)
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          const ym = invoiceData.billingMonth || invoiceData.invoiceDate.slice(0, 7);
                          setInvoiceData((prev) => ({
                            ...prev,
                            invoiceType: 'monthly',
                            billingMonth: ym,
                            billingPeriod: prev.billingPeriod || getMonthNameAndYear(ym),
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-md transition-colors duration-150 ${
                          invoiceData.invoiceType === 'monthly'
                            ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Monthly Invoice (Consolidated)
                      </Button>
                    </div>
                  </div>

                  {invoiceData.invoiceType === 'monthly' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Billing Month</label>
                        <input
                          type="month"
                          value={invoiceData.billingMonth || invoiceData.invoiceDate.slice(0, 7)}
                          onChange={(e) => {
                            const ym = e.target.value;
                            setInvoiceData((prev) => ({
                              ...prev,
                              billingMonth: ym,
                              billingPeriod: getMonthNameAndYear(ym),
                            }));
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Billing Period Header</label>
                        <input
                          type="text"
                          value={invoiceData.billingPeriod || ''}
                          onChange={(e) => setInvoiceData((prev) => ({ ...prev, billingPeriod: e.target.value }))}
                          placeholder="e.g. April 2026 or 01/04/2026 to 30/04/2026"
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                    Line items ({invoiceData.items.length})
                  </span>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <select
                      aria-label="Select the Product"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectProduct(e.target.value);
                        }
                      }}
                      className="text-xs bg-white border border-blue-200 hover:border-blue-400 rounded-lg px-2.5 py-1.5 text-blue-700 font-semibold cursor-pointer outline-none focus:border-blue-600 max-w-full sm:max-w-[240px] truncate"
                    >
                      <option value="">Select the Product</option>
                      {products.length === 0 ? (
                        <option value="" disabled>
                          No products saved yet (add in Products menu)
                        </option>
                      ) : (
                        products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.rate, currencySymbol)} / {p.unit})
                          </option>
                        ))
                      )}
                    </select>

                    <Button
                      size="small"
                      variant="secondary"
                      leadingIcon={RiAddLine}
                      onClick={() => handleAddItem()}
                      className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 shrink-0"
                    >
                      Add Item
                    </Button>
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
                          <IconButton
                            size="small"
                            icon={RiPriceTag3Line}
                            aria-label="Save item to Product Catalog"
                            title="Save item to Product Catalog"
                            onClick={() => handleSaveItemToCatalog(item)}
                            className="text-slate-500 hover:text-blue-600 hover:border-blue-200"
                          />
                          <IconButton
                            size="small"
                            icon={RiFileCopyLine}
                            aria-label="Duplicate Line Item"
                            title="Duplicate Line Item"
                            onClick={() => handleDuplicateItem(index)}
                          />
                          <IconButton
                            size="small"
                            icon={RiDeleteBinLine}
                            aria-label="Delete Line Item"
                            title="Delete Line Item"
                            onClick={() => handleDeleteItem(index)}
                            className="text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          />
                        </div>
                      </div>

                      {/* Line Item Date (Crucial for Monthly Invoices & Multi-Day Deliveries) */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                            <RiCalendarLine className="size-3 text-slate-400" />
                            Supply Date:
                          </label>
                          <input
                            type="date"
                            value={item.date || ''}
                            onChange={(e) => handleUpdateItem(index, { date: e.target.value })}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono outline-none focus:border-blue-500 text-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {!item.date ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleUpdateItem(index, { date: invoiceData.invoiceDate })}
                              className="text-[10px] text-blue-600 hover:underline"
                            >
                              Set to bill date ({invoiceData.invoiceDate})
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                const targetDate = item.date;
                                if (!targetDate) return;
                                setInvoiceData((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it) => ({ ...it, date: targetDate })),
                                }));
                                toast.success(`Applied date ${targetDate} to all items`);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-800"
                              title="Apply this date to all items"
                            >
                              Copy date to all items
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Line Item Numeric Attributes - 2 Spacious 3-Column Rows */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {/* HSN/SAC or SKU */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            {isUS ? 'SKU / Code' : 'HSN/SAC'}
                          </label>
                          <input
                            type="text"
                            value={isUS ? (item.sku || item.hsnSac || '') : (item.hsnSac || '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateItem(index, isUS ? { sku: val, hsnSac: val } : { hsnSac: val });
                            }}
                            placeholder={isUS ? 'SRV-101' : '998314'}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleUpdateItem(index, { quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                          >
                            {(isUS ? US_UNITS : IN_UNITS).map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                            {item.unit && !ALL_KNOWN_UNITS.includes(item.unit) && (
                              <option value={item.unit}>{item.unit}</option>
                            )}
                          </select>
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Rate ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate === 0 ? '' : item.rate}
                            onChange={(e) => handleUpdateItem(index, { rate: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>

                        {/* Discount % */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount ? item.discount : ''}
                            onChange={(e) => handleUpdateItem(index, { discount: e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))) })}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-rose-600 outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>

                        {/* Tax / GST Rate */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            {isUS ? 'Sales Tax' : 'GST Rate'}
                          </label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(index, { gstRate: Number(e.target.value), taxable: Number(e.target.value) > 0 })}
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                          >
                            {isUS ? (
                              US_TAX_PRESETS.map((p) => (
                                <option key={p.rate} value={p.rate}>
                                  {p.label}
                                </option>
                              ))
                            ) : (
                              IN_GST_RATES.map((rate) => (
                                <option key={rate} value={rate}>
                                  {rate === 0 ? '0% (Nil)' : `${rate}%`}
                                </option>
                              ))
                            )}
                            {!(isUS
                              ? US_TAX_PRESETS.some((p) => p.rate === Number(item.gstRate))
                              : IN_GST_RATES.includes(Number(item.gstRate) as (typeof IN_GST_RATES)[number])) && (
                              <option value={item.gstRate}>{item.gstRate}%</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Line Subtotal Banner */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/70 text-slate-500 flex-wrap gap-2">
                        <span>
                          Taxable: <strong className="text-slate-800">{formatCurrency(item.taxableAmount, currencySymbol)}</strong>
                        </span>
                        <span>
                          {isUS ? 'Sales Tax' : 'GST'} ({item.gstRate}%): <strong className="text-slate-800">{formatCurrency(item.gstAmount, currencySymbol)}</strong>
                        </span>
                        <span>
                          Row Total: <strong className="text-blue-700 font-bold">{formatCurrency(item.total, currencySymbol)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Strip */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-medium text-slate-600">
                  {/* Tax Region Switcher */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-700">Tax Region:</span>
                    <SegmentedControl
                      aria-label="Select invoice region"
                      selectedKeys={new Set([isUS ? 'US' : 'IN'])}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0];
                        if (val === 'IN' || val === 'US') handleToggleRegion(val);
                      }}
                      className="bg-slate-200/70 p-0.5 shrink-0"
                    >
                      <SegmentedControlItem id="IN" className="text-[11px] px-2 py-0.5 font-bold">
                        <span>🇮🇳 India (GST)</span>
                      </SegmentedControlItem>
                      <SegmentedControlItem id="US" className="text-[11px] px-2 py-0.5 font-bold">
                        <span>🇺🇸 US (Sales Tax)</span>
                      </SegmentedControlItem>
                    </SegmentedControl>
                  </div>

                  {/* Tax Treatment Selector */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-700">Tax Type:</span>
                    {isUS ? (
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        US Sales Tax (Destination / Local)
                      </span>
                    ) : (
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
                    )}
                  </div>

                  {calculatedData.totalDiscount > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Gross Subtotal:</span>
                        <span className="font-semibold text-slate-800 font-mono tabular-nums">
                          {formatCurrency(calculatedData.subtotal, currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Total Discount:</span>
                        <span className="font-semibold font-mono tabular-nums">
                          -{formatCurrency(calculatedData.totalDiscount, currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxable Subtotal:</span>
                        <span className="font-semibold text-slate-800 font-mono tabular-nums">
                          {formatCurrency(calculatedData.totalTaxableAmount, currencySymbol)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>Taxable Subtotal:</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">
                        {formatCurrency(calculatedData.totalTaxableAmount, currencySymbol)}
                      </span>
                    </div>
                  )}

                  {/* Statutory Tax Breakdown */}
                  {isUS ? (
                    <div className="flex justify-between">
                      <span>Combined Sales Tax:</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">
                        {formatCurrency(calculatedData.totalSalesTax || calculatedData.totalTax, currencySymbol)}
                      </span>
                    </div>
                  ) : (
                    <>
                      {calculatedData.gstType === 'cgst_sgst' && (
                        <>
                          <div className="flex justify-between">
                            <span>Central GST (CGST):</span>
                            <span className="font-semibold text-slate-800 font-mono tabular-nums">
                              {formatCurrency(calculatedData.totalCgst, currencySymbol)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>State GST (SGST):</span>
                            <span className="font-semibold text-slate-800 font-mono tabular-nums">
                              {formatCurrency(calculatedData.totalSgst, currencySymbol)}
                            </span>
                          </div>
                        </>
                      )}

                      {calculatedData.gstType === 'igst' && (
                        <div className="flex justify-between">
                          <span>Integrated GST (IGST):</span>
                          <span className="font-semibold text-slate-800 font-mono tabular-nums">
                            {formatCurrency(calculatedData.totalIgst, currencySymbol)}
                          </span>
                        </div>
                      )}

                      {calculatedData.gstType === 'none' && (
                        <div className="flex justify-between text-slate-500 text-xs">
                          <span>GST (Non-GST / Exempt):</span>
                          <span className="font-mono tabular-nums">{currencySymbol}0.00</span>
                        </div>
                      )}
                    </>
                  )}

                  {calculatedData.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono tabular-nums">
                        {calculatedData.roundOff > 0 ? '+' : ''}
                        {formatNumber(calculatedData.roundOff, isUS ? 'en-US' : 'en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-700 font-mono text-base tabular-nums">
                      {formatCurrency(calculatedData.grandTotalRounded, currencySymbol)}
                    </span>
                  </div>

                  {calculatedData.amountPaid > 0 && (
                    <div className="pt-1.5 border-t border-slate-200/80 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Amount Paid:</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCurrency(calculatedData.amountPaid, currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-bold">
                        <span>Balance Due:</span>
                        <span className={`font-mono tabular-nums ${calculatedData.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(Math.max(0, calculatedData.balanceDue), currencySymbol)}
                        </span>
                      </div>
                      {calculatedData.amountPaid > calculatedData.grandTotalRounded && (
                        <div className="flex justify-between text-amber-700 font-medium text-[11px]">
                          <span>Excess / Advance:</span>
                          <span className="font-mono font-semibold">
                            +{formatCurrency(calculatedData.amountPaid - calculatedData.grandTotalRounded, currencySymbol)}
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
                {/* Regional Tax Structure Switcher Card */}
                <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Invoice Taxation &amp; Currency System
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isUS
                        ? '🇺🇸 United States Mode: Destination Sales Tax, Federal EIN, State ID, SKU, USD ($)'
                        : '🇮🇳 India Mode: Statutory GST (CGST/SGST/IGST), GSTIN, PAN, HSN/SAC, INR (₹)'}
                    </p>
                  </div>
                  <SegmentedControl
                    aria-label="Select region"
                    selectedKeys={new Set([isUS ? 'US' : 'IN'])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val === 'IN' || val === 'US') handleToggleRegion(val);
                    }}
                    className="bg-white p-0.5 border border-slate-200 shrink-0"
                  >
                    <SegmentedControlItem id="IN" className="text-xs px-2.5 py-1 font-bold">
                      <span>🇮🇳 India (GST)</span>
                    </SegmentedControlItem>
                    <SegmentedControlItem id="US" className="text-xs px-2.5 py-1 font-bold">
                      <span>🇺🇸 US (Sales Tax)</span>
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>

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

                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiSave3Line}
                        onClick={handleSaveClientToDirectory}
                        title="Save or update this client profile in your offline directory"
                        className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
                      >
                        {clients.some((c) => c.name.toLowerCase() === invoiceData.client.name.trim().toLowerCase())
                          ? 'Update Directory'
                          : 'Save to Directory'}
                      </Button>
                    </div>
                  </div>

                  {/* Client Legal Name */}
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

                  {isUS ? (
                    <>
                      {/* US Identifiers: EIN & Phone */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Federal EIN / Tax ID</label>
                          <input
                            type="text"
                            value={invoiceData.client.ein || ''}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, ein: formatEIN(e.target.value) },
                              })
                            }
                            placeholder="12-3456789"
                            maxLength={10}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-mono text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Phone Number</label>
                          <input
                            type="text"
                            value={invoiceData.client.phone || ''}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, phone: e.target.value },
                              })
                            }
                            placeholder="+1 (555) 012-3456"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Tax-Exempt Customer Toggle */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id="client-tax-exempt-toggle"
                          checked={Boolean(invoiceData.client.taxExempt)}
                          onChange={(e) => {
                            const isExempt = e.target.checked;
                            setInvoiceData((prev) => ({
                              ...prev,
                              client: { ...prev.client, taxExempt: isExempt },
                              items: isExempt
                                ? prev.items.map((it) => ({ ...it, gstRate: 0, taxable: false }))
                                : prev.items,
                            }));
                          }}
                          className="size-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <label htmlFor="client-tax-exempt-toggle" className="text-xs text-slate-700 font-medium cursor-pointer">
                          Tax-Exempt Entity / Resale Certificate Holder
                        </label>
                      </div>

                      {invoiceData.client.taxExempt && (
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Resale Certificate # / Exemption ID</label>
                          <input
                            type="text"
                            value={invoiceData.client.resaleCertificate || ''}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, resaleCertificate: e.target.value.toUpperCase() },
                              })
                            }
                            placeholder="e.g. EX-9876543-CA"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono outline-none focus:border-blue-600"
                          />
                        </div>
                      )}

                      {/* Billing Email */}
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
                          placeholder="accounts.payable@client.com"
                          className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                        />
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
                          placeholder="Street Address, Suite or Building"
                          className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-2.5">
                        <div className="col-span-2">
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
                            placeholder="San Francisco"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">State</label>
                          <input
                            type="text"
                            list="us-states-editor-list"
                            value={invoiceData.client.state}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, state: e.target.value },
                                placeOfSupply: e.target.value,
                              })
                            }
                            placeholder="California (CA)"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">ZIP</label>
                          <input
                            type="text"
                            value={invoiceData.client.pincode}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, pincode: formatUSZip(e.target.value) },
                              })
                            }
                            placeholder="94105"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <datalist id="us-states-editor-list">
                        {US_STATES_LIST.map((s, idx) => (
                          <option key={idx} value={s} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <>
                      {/* GSTIN and Phone in 2 clean, spacious columns */}
                      <div className="grid grid-cols-2 gap-2.5">
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
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-mono text-xs outline-none uppercase focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Phone Number</label>
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
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Billing Email - Full width for zero clipping of lengthy corporate emails */}
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
                          className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                        />
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
                          placeholder="Street, Building, Area"
                          className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                        />
                      </div>

                      {/* 5-Column Grid: City (2), State (2), Pincode (1) prevents state name truncation */}
                      <div className="grid grid-cols-5 gap-2.5">
                        <div className="col-span-2">
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
                            placeholder="Pune"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">State</label>
                          <input
                            type="text"
                            list="indian-states-list"
                            value={invoiceData.client.state}
                            onChange={(e) =>
                              setInvoiceData({
                                ...invoiceData,
                                client: { ...invoiceData.client, state: e.target.value },
                                placeOfSupply: `${e.target.value} (${extractStateCode(e.target.value, invoiceData.client.gstin) || (invoiceData.client.gstin ? invoiceData.client.gstin.slice(0, 2) : '27')})`,
                              })
                            }
                            placeholder="Maharashtra"
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-1">
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
                            placeholder="411001"
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
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
                    </>
                  )}
                </div>

                {/* Dates & Supply Section */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 block">Invoice Dates &amp; Tax Jurisdiction</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {invoiceData.invoiceType === 'monthly' ? 'Monthly Bill' : 'Daily Bill'}
                    </span>
                  </div>

                  {invoiceData.invoiceType === 'monthly' && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-900 mb-0.5">Billing Month</label>
                        <input
                          type="month"
                          value={invoiceData.billingMonth || invoiceData.invoiceDate.slice(0, 7)}
                          onChange={(e) => {
                            const ym = e.target.value;
                            setInvoiceData((prev) => ({
                              ...prev,
                              billingMonth: ym,
                              billingPeriod: getMonthNameAndYear(ym),
                            }));
                          }}
                          className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-900 mb-0.5">Billing Period Header</label>
                        <input
                          type="text"
                          value={invoiceData.billingPeriod || ''}
                          onChange={(e) => setInvoiceData((prev) => ({ ...prev, billingPeriod: e.target.value }))}
                          placeholder="e.g. April 2026 or 01/04/2026 to 30/04/2026"
                          className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2-Column Grid: Invoice Date & Due Date on Row 1, Place of Supply & Tax Treatment on Row 2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceData.invoiceDate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={invoiceData.dueDate || ''}
                        onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                        {isUS ? 'State / Tax Jurisdiction' : 'Place of Supply'}
                      </label>
                      <input
                        type="text"
                        value={invoiceData.placeOfSupply || ''}
                        onChange={(e) => setInvoiceData({ ...invoiceData, placeOfSupply: e.target.value })}
                        placeholder={isUS ? 'California (CA)' : 'Maharashtra (27)'}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Tax Treatment</label>
                      {isUS ? (
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                          US State &amp; Local Sales Tax
                        </div>
                      ) : (
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
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                        >
                          <option value="cgst_sgst">CGST + SGST (Intra-State)</option>
                          <option value="igst">IGST (Inter-State)</option>
                          <option value="none">Non-GST / Exempt</option>
                        </select>
                      )}
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
                          Paid: <strong className="text-slate-800">{formatCurrency(calculatedData.amountPaid, currencySymbol)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Due:{' '}
                          <strong className={calculatedData.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatCurrency(Math.max(0, calculatedData.balanceDue), currencySymbol)}
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
                            Overpaid by {formatCurrency(calculatedData.amountPaid - calculatedData.grandTotalRounded, currencySymbol)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!showPaymentForm && (
                      calculatedData.balanceDue > 0 ? (
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiAddLine}
                          onClick={() => handleOpenPaymentForm(false)}
                          className="text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 shrink-0"
                        >
                          Add Payment
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiAddLine}
                          onClick={() => handleOpenPaymentForm(true)}
                          className="text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shrink-0"
                          title="Record an extra payment or advance adjustment"
                        >
                          Add Extra / Advance
                        </Button>
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
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setNewPaymentAmount(String(calculatedData.balanceDue))}
                            className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            Pay Full Due ({formatCurrency(calculatedData.balanceDue, currencySymbol)})
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-slate-500 font-medium">Amount ({currencySymbol}) *</label>
                            {calculatedData.balanceDue > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Due: {formatCurrency(calculatedData.balanceDue, currencySymbol)}
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
                              Exceeds balance due by {formatCurrency(Number(newPaymentAmount) - calculatedData.balanceDue, currencySymbol)} (recorded as excess/advance).
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
                            {isUS ? (
                              <>
                                <option value="ACH">ACH Transfer / Direct Deposit</option>
                                <option value="Zelle">Zelle</option>
                                <option value="Wire">Wire Transfer</option>
                                <option value="Card">Debit / Credit Card</option>
                                <option value="Check">Check</option>
                                <option value="Cash">Cash</option>
                              </>
                            ) : (
                              <>
                                <option value="UPI">UPI / QR</option>
                                <option value="NEFT">Bank Transfer (NEFT/RTGS)</option>
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Card">Debit / Credit Card</option>
                              </>
                            )}
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
                            placeholder={isUS ? "e.g. Check #1042 / ACH Trx ID" : "e.g. UTR-982341 / Txn ID"}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => setShowPaymentForm(false)}
                          className="text-xs font-medium"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="primary"
                          type="submit"
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                        >
                          Record Payment
                        </Button>
                      </div>
                    </form>
                  )}

                  {(invoiceData.payments || []).length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">No payments recorded yet. Click "Add Payment" when client pays.</p>
                  ) : (
                    <div className="space-y-2">
                      {(invoiceData.payments || []).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          <div>
                            <span className="font-bold text-slate-900 font-mono">{formatCurrency(p.amount, currencySymbol)}</span>
                            <span className="text-[10px] text-slate-600 ml-2 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.method}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">{p.date}</span>
                            {p.reference && <span className="text-[10px] font-mono text-slate-400 ml-2">({p.reference})</span>}
                          </div>
                          <IconButton
                            size="small"
                            icon={RiDeleteBinLine}
                            aria-label="Delete payment entry"
                            title="Delete this payment entry"
                            onClick={() => handleRemovePayment(idx)}
                            className="text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          />
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

            {/* ══════════ TAB 5: THEME & STYLING CUSTOMIZER ══════════ */}
            {activeTab === 'styling' && (
              <div className="space-y-4">
                {/* Header with Active Template Selector & Reset */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block">
                        Template customizer
                      </span>
                      <span className="font-bold text-xs text-slate-900 block">
                        Select &amp; Personalize Template
                      </span>
                    </div>
                    <Button
                      size="xs"
                      variant="secondary"
                      leadingIcon={RiRefreshLine}
                      onClick={() => {
                        resetOptions(themeId);
                        toast.info(`Theme "${themeId}" reset to defaults`);
                      }}
                      className="text-[11px]"
                    >
                      Reset Defaults
                    </Button>
                  </div>

                  {/* Template Picker Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Active Template
                    </label>
                    <select
                      value={themeId}
                      onChange={(e) => {
                        const nextTheme = e.target.value;
                        setThemeId(nextTheme);
                        if (nextTheme === 'thermal') setZoomLevel(1.0);
                        updateInvoice(invoiceId, calculatedData, nextTheme);
                      }}
                      className="w-full bg-white text-slate-900 font-bold px-3 py-2 rounded-lg border border-slate-300 outline-none text-xs cursor-pointer hover:border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                    >
                      {themes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.paper.join('/')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Saved Presets / Quick Styler */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Theme Presets</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {presets.length} saved
                    </span>
                  </div>

                  {presets.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            loadPreset(e.target.value);
                            toast.success('Preset styling applied');
                          }
                        }}
                        defaultValue=""
                        className="flex-1 bg-slate-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Load saved preset...
                        </option>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.themeId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quick Save Preset */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Preset name (e.g. Blue Modern)"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        if (!newPresetName.trim()) {
                          toast.error('Enter a preset name');
                          return;
                        }
                        savePreset(newPresetName.trim());
                        toast.success(`Preset "${newPresetName.trim()}" saved!`);
                        setNewPresetName('');
                      }}
                      className="text-[11px] shrink-0"
                    >
                      Save Preset
                    </Button>
                  </div>
                </div>

                {/* Accent Color Palette with 60fps Debounced Picker */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <ColorPickerField
                    value={activeOptions.accentColor}
                    onChange={(hex) => setThemeOptions(themeId, { accentColor: hex })}
                  />
                </div>

                {/* Typography & Font Size */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Font Family
                    </label>
                    <SegmentedControl
                      aria-label="Font Family"
                      selectedKeys={new Set([activeOptions.fontFamily])}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0];
                        if (val) setThemeOptions(themeId, { fontFamily: String(val) as ThemeFontFamily });
                      }}
                      className="w-full bg-slate-100 p-0.5"
                    >
                      <SegmentedControlItem id="system" className="text-xs">System</SegmentedControlItem>
                      <SegmentedControlItem id="inter" className="text-xs">Inter</SegmentedControlItem>
                      <SegmentedControlItem id="serif" className="text-xs">Serif</SegmentedControlItem>
                      <SegmentedControlItem id="mono" className="text-xs">Mono</SegmentedControlItem>
                    </SegmentedControl>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Base Font Size
                    </label>
                    <SegmentedControl
                      aria-label="Font Size"
                      selectedKeys={new Set([activeOptions.fontSize])}
                      onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0];
                        if (val) setThemeOptions(themeId, { fontSize: String(val) as ThemeFontSize });
                      }}
                      className="w-full bg-slate-100 p-0.5"
                    >
                      <SegmentedControlItem id="small" className="text-xs">Small (9pt)</SegmentedControlItem>
                      <SegmentedControlItem id="normal" className="text-xs">Normal (11pt)</SegmentedControlItem>
                      <SegmentedControlItem id="large" className="text-xs">Large (13pt)</SegmentedControlItem>
                    </SegmentedControl>
                  </div>

                  {themeId !== 'thermal' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Paper Format
                      </label>
                      <SegmentedControl
                        aria-label="Paper Format"
                        selectedKeys={new Set([activeOptions.paper])}
                        onSelectionChange={(keys) => {
                          const val = Array.from(keys)[0];
                          if (val) setThemeOptions(themeId, { paper: String(val) as PaperSize });
                        }}
                        className="w-full bg-slate-100 p-0.5"
                      >
                        <SegmentedControlItem id="A4" className="text-xs">A4 (Standard)</SegmentedControlItem>
                        <SegmentedControlItem id="A5" className="text-xs">A5 (Compact)</SegmentedControlItem>
                      </SegmentedControl>
                    </div>
                  )}
                </div>

                {/* Table & Structure Toggles */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">
                    Table columns &amp; tax structure
                  </span>

                  <SwitchCard
                    title="HSN / SAC Code Column"
                    description="Show tax classification code column"
                    icon={RiTableLine}
                    isSelected={activeOptions.showHsnSacColumn}
                    onChange={(val) => setThemeOptions(themeId, { showHsnSacColumn: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />

                  <SwitchCard
                    title="Discount Column"
                    description="Show item-level discount percentage"
                    isSelected={activeOptions.showDiscountColumn}
                    onChange={(val) => setThemeOptions(themeId, { showDiscountColumn: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />

                  <SwitchCard
                    title="Tax Summary Table"
                    description="Detailed CGST, SGST &amp; IGST rate breakdown"
                    isSelected={activeOptions.showTaxSummaryTable}
                    onChange={(val) => setThemeOptions(themeId, { showTaxSummaryTable: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />

                  <SwitchCard
                    title="Amount in Words"
                    description="Formal Indian numbering nomenclature"
                    isSelected={activeOptions.showAmountInWords}
                    onChange={(val) => setThemeOptions(themeId, { showAmountInWords: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />
                </div>

                {/* Payment & Footer Visibility */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">
                    Payment &amp; sign-off visibility
                  </span>

                  <SwitchCard
                    title="Bank Account Remittance"
                    description="Account number, IFSC, branch in footer"
                    icon={RiBankCardLine}
                    isSelected={activeOptions.showBankDetails}
                    onChange={(val) => setThemeOptions(themeId, { showBankDetails: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />

                  <SwitchCard
                    title="Dynamic UPI QR Code"
                    description="Instant mobile payment QR on printed invoice"
                    icon={RiQrCodeLine}
                    isSelected={activeOptions.showUpiQr}
                    onChange={(val) => setThemeOptions(themeId, { showUpiQr: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />

                  <SwitchCard
                    title="Authorized Signatory &amp; Stamp"
                    description="Show signatory seal and signature line"
                    icon={RiShieldCheckLine}
                    isSelected={activeOptions.showSignature}
                    onChange={(val) => setThemeOptions(themeId, { showSignature: val })}
                    className="border-slate-200 bg-slate-50/50"
                  />
                </div>

                {/* Watermark Selector */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                  <label className="block text-xs font-semibold text-slate-700">
                    Document Watermark
                  </label>
                  <SegmentedControl
                    aria-label="Watermark"
                    selectedKeys={new Set([activeOptions.watermark])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) setThemeOptions(themeId, { watermark: String(val) as WatermarkType });
                    }}
                    className="w-full bg-slate-100 p-0.5"
                  >
                    <SegmentedControlItem id="none" className="text-xs">None</SegmentedControlItem>
                    <SegmentedControlItem id="PAID" className="text-xs">PAID</SegmentedControlItem>
                    <SegmentedControlItem id="DRAFT" className="text-xs">DRAFT</SegmentedControlItem>
                    <SegmentedControlItem id="custom" className="text-xs">Custom</SegmentedControlItem>
                  </SegmentedControl>

                  {activeOptions.watermark === 'custom' && (
                    <input
                      type="text"
                      value={activeOptions.watermarkCustomText}
                      onChange={(e) => setThemeOptions(themeId, { watermarkCustomText: e.target.value })}
                      placeholder="e.g. CONFIDENTIAL / SPECIMEN"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-blue-600 focus:bg-white"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── MOBILE STICKY BOTTOM ACTION BAR (TOUCH-FIRST) ─── */}
          <div className="lg:hidden p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg safe-area-bottom">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Total</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(calculatedData.grandTotalRounded, currencySymbol)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiSave3Line}
                onClick={handleSave}
                className="text-xs font-semibold py-2 px-3 touch-target-48"
              >
                Save
              </Button>

              <Button
                size="small"
                variant="primary"
                leadingIcon={RiShareForwardLine}
                onClick={() => {
                  updateInvoice(invoiceId, calculatedData, themeId);
                  setShowShareModal(true);
                }}
                className="text-xs font-semibold py-2 px-3 touch-target-48"
              >
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: REAL-TIME LIVE PREVIEW CANVAS */}
        <div className={`flex-1 bg-slate-100 overflow-auto p-2 sm:p-4 lg:p-6 relative ${mobileTab === 'preview' ? 'flex flex-col items-center' : 'hidden lg:flex'}`}>
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
