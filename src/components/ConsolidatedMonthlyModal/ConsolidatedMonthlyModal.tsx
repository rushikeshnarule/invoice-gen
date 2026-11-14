// ─── Consolidated Monthly Invoice Builder Modal ─────────────────────────
// Enables selecting a client, date period range, and choosing specific client invoices
// to consolidate into a single monthly tax statement.

import React, { useState, useEffect, useMemo } from 'react';
import type { ClientInfo, LineItem } from '../../types';
import type { InvoiceRecord } from '../../utils/initialOfflineData';
import { useInvoices } from '../../context/InvoiceContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatDate, getClientId } from '../../utils';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { toast } from '@/components/base/toast/toast';
import {
  RiCalendarLine,
  RiCheckDoubleLine,
  RiInformationLine,
} from '@remixicon/react';

export interface ConsolidatedMonthlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: ClientInfo | string | null;
  onSuccess?: (createdInvoice: InvoiceRecord) => void;
}

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

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helpers for Date Range Calculation
function getThisMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startStr = toLocalDateString(firstDay);
  const endStr = toLocalDateString(lastDay);
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return { ym, startStr, endStr, label: monthName };
}

function getLastMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - 1;
  const targetDate = new Date(year, month, 1);
  const ym = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startStr = toLocalDateString(firstDay);
  const endStr = toLocalDateString(lastDay);
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return { ym, startStr, endStr, label: monthName };
}

function getLast30DaysRange() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const endStr = toLocalDateString(now);
  const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const startStr = toLocalDateString(past);

  return {
    ym,
    startStr,
    endStr,
    label: `${formatDate(startStr)} to ${formatDate(endStr)}`,
  };
}

export const ConsolidatedMonthlyModal: React.FC<ConsolidatedMonthlyModalProps> = ({
  isOpen,
  onClose,
  initialClient,
  onSuccess,
}) => {
  const { clients, invoices, businessProfile, createMonthlyInvoice, setActiveInvoiceId } = useInvoices();
  const { clientDefaults } = useTheme();

  const isUS = businessProfile?.region === 'US' || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
  const currencySymbol = isUS ? '$' : '₹';

  // Selected Client
  const [selectedClientName, setSelectedClientName] = useState<string>('');

  // Date Range & Month state
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getThisMonthRange().ym);
  const [startDate, setStartDate] = useState<string>(() => getThisMonthRange().startStr);
  const [endDate, setEndDate] = useState<string>(() => getThisMonthRange().endStr);
  const [billingPeriodText, setBillingPeriodText] = useState<string>(() => getThisMonthRange().label);
  const [activePreset, setActivePreset] = useState<'this-month' | 'last-month' | 'last-30' | 'custom'>('this-month');

  // Selected Invoices Map/Set for consolidation
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // Initialize selected client when modal opens or initialClient changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialClient) {
      const name = typeof initialClient === 'string' ? initialClient : initialClient.name;
      setSelectedClientName(name);
    } else if (clients.length > 0) {
      setSelectedClientName(clients[0].name);
    } else {
      setSelectedClientName('');
    }

    // Default to This Month
    const tm = getThisMonthRange();
    setSelectedMonth(tm.ym);
    setStartDate(tm.startStr);
    setEndDate(tm.endStr);
    setBillingPeriodText(tm.label);
    setActivePreset('this-month');
  }, [isOpen, initialClient, clients]);

  // Find candidate invoices for the selected client within the chosen date range
  const candidateInvoices = useMemo(() => {
    if (!selectedClientName.trim()) return [];

    const norm = selectedClientName.trim().toLowerCase();
    const cId = getClientId(selectedClientName);

    return invoices.filter((inv) => {
      const matchesClient =
        (inv.clientName && inv.clientName.trim().toLowerCase() === norm) ||
        inv.clientId === cId ||
        (inv.data?.client?.name && inv.data.client.name.trim().toLowerCase() === norm);

      if (!matchesClient) return false;

      // Exclude existing consolidated monthly invoices to avoid double-nesting
      if (inv.data?.invoiceType === 'monthly') return false;

      const rawDate = inv.date || inv.data?.invoiceDate || '';
      if (!rawDate) return false;
      const invDate = rawDate.slice(0, 10);

      return invDate >= startDate && invDate <= endDate;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [invoices, selectedClientName, startDate, endDate]);

  // When candidateInvoices change, default to selecting all of them
  useEffect(() => {
    if (candidateInvoices.length > 0) {
      setSelectedInvoiceIds(new Set(candidateInvoices.map((i) => i.id)));
    } else {
      setSelectedInvoiceIds(new Set());
    }
  }, [candidateInvoices]);

  // Handle preset clicks
  const applyPreset = (preset: 'this-month' | 'last-month' | 'last-30') => {
    setActivePreset(preset);
    if (preset === 'this-month') {
      const tm = getThisMonthRange();
      setSelectedMonth(tm.ym);
      setStartDate(tm.startStr);
      setEndDate(tm.endStr);
      setBillingPeriodText(tm.label);
    } else if (preset === 'last-month') {
      const lm = getLastMonthRange();
      setSelectedMonth(lm.ym);
      setStartDate(lm.startStr);
      setEndDate(lm.endStr);
      setBillingPeriodText(lm.label);
    } else if (preset === 'last-30') {
      const l30 = getLast30DaysRange();
      setSelectedMonth(l30.ym);
      setStartDate(l30.startStr);
      setEndDate(l30.endStr);
      setBillingPeriodText(l30.label);
    }
  };

  const handleMonthChange = (ym: string) => {
    setSelectedMonth(ym);
    if (ym) {
      try {
        const [year, month] = ym.split('-').map(Number);
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const startStr = toLocalDateString(firstDay);
        const endStr = toLocalDateString(lastDay);
        setStartDate(startStr);
        setEndDate(endStr);
        setBillingPeriodText(getMonthNameAndYear(ym));
        setActivePreset('custom');
      } catch {
        // ignore
      }
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
    if (val && endDate) {
      setBillingPeriodText(`${formatDate(val)} to ${formatDate(endDate)}`);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
    if (startDate && val) {
      setBillingPeriodText(`${formatDate(startDate)} to ${formatDate(val)}`);
    }
  };

  // Toggle invoice selection
  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedInvoiceIds(new Set(candidateInvoices.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedInvoiceIds(new Set());
  };

  // Computed summary of selected invoices
  const selectedInvoicesList = useMemo(() => {
    return candidateInvoices.filter((inv) => selectedInvoiceIds.has(inv.id));
  }, [candidateInvoices, selectedInvoiceIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedInvoicesList.reduce((s, inv) => s + (inv.total || 0), 0);
  }, [selectedInvoicesList]);

  const selectedItemsCount = useMemo(() => {
    return selectedInvoicesList.reduce((s, inv) => s + (inv.data?.items?.length || 0), 0);
  }, [selectedInvoicesList]);

  // Find full client info object
  const clientInfo = useMemo(() => {
    return (
      clients.find(
        (c) => c.name.trim().toLowerCase() === selectedClientName.trim().toLowerCase()
      ) || null
    );
  }, [clients, selectedClientName]);

  // Generate Consolidated Monthly Invoice
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientName.trim()) {
      toast.error('Please select or specify a client');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select a valid start and end date range');
      return;
    }

    const clientId = getClientId(selectedClientName);
    const preferredTheme = clientDefaults[clientId] || 'contractor';

    // Consolidate line items from selected invoices
    let consolidatedItems: LineItem[] | undefined = undefined;

    if (selectedInvoicesList.length > 0) {
      const extracted: LineItem[] = [];
      let sno = 1;
      for (const inv of selectedInvoicesList) {
        for (const it of inv.data.items) {
          extracted.push({
            ...it,
            id: `item-${Date.now()}-${sno}`,
            sno,
            date: it.date || inv.date, // Preserves exact supply date
          });
          sno++;
        }
      }
      consolidatedItems = extracted;
    }

    const created = createMonthlyInvoice({
      clientName: selectedClientName.trim(),
      startDate,
      endDate,
      billingMonth: startDate.slice(0, 7),
      billingPeriod: billingPeriodText || `${formatDate(startDate)} to ${formatDate(endDate)}`,
      items: consolidatedItems,
      themeId: preferredTheme,
      sourceInvoiceIds: Array.from(selectedInvoiceIds),
    });

    setActiveInvoiceId(created.id);
    onClose();

    if (onSuccess) {
      onSuccess(created);
    }

    if (consolidatedItems && consolidatedItems.length > 0) {
      toast.success(
        `Generated Monthly Bill ${created.invoiceNumber} with ${consolidatedItems.length} items from ${selectedInvoicesList.length} invoices`
      );
    } else {
      toast.success(
        `Generated Monthly Bill ${created.invoiceNumber} (${billingPeriodText}) for ${selectedClientName}`
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="lg" className="max-h-[92vh] flex flex-col">
      <ModalHeader
        title="Generate Monthly Consolidated Invoice"
        description="Select a date period range and select which client invoices to consolidate into a single statement."
      />
      <form onSubmit={handleGenerate} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ModalBody className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 pt-1 text-xs">
            {/* 1. Client Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Client Account *
              </label>
              {clients.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClientName}
                    onChange={(e) => setSelectedClientName(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="" disabled>
                      Select a client...
                    </option>
                    {clients.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} {c.city ? `(${c.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Enter client or company name..."
                  value={selectedClientName}
                  onChange={(e) => setSelectedClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              )}

              {/* Client Info Pill */}
              {clientInfo && (
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 truncate block">
                      {clientInfo.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      GSTIN: {clientInfo.gstin || 'Unregistered'} • {clientInfo.city || 'Local'}, {clientInfo.state || 'Maharashtra'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                    Active Client
                  </span>
                </div>
              )}
            </div>

            {/* 2. Date Period Range Selection */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              {/* Quick Presets */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <RiCalendarLine className="size-4 text-blue-600" />
                  Date Period Range
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant={activePreset === 'this-month' ? 'primary' : 'secondary'}
                    onClick={() => applyPreset('this-month')}
                    className="text-[10px] font-semibold"
                  >
                    This Month
                  </Button>
                  <Button
                    size="xs"
                    variant={activePreset === 'last-month' ? 'primary' : 'secondary'}
                    onClick={() => applyPreset('last-month')}
                    className="text-[10px] font-semibold"
                  >
                    Last Month
                  </Button>
                  <Button
                    size="xs"
                    variant={activePreset === 'last-30' ? 'primary' : 'secondary'}
                    onClick={() => applyPreset('last-30')}
                    className="text-[10px] font-semibold"
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>

              {/* Billing Month & Period Header */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Billing Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Billing Period Label
                  </label>
                  <input
                    type="text"
                    value={billingPeriodText}
                    onChange={(e) => setBillingPeriodText(e.target.value)}
                    placeholder="e.g. April 2026 or 01/04/2026 - 30/04/2026"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Start Date & End Date Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Start Date (From) *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    End Date (To) *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. Invoices in Range Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Invoices in Date Range
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    {candidateInvoices.length} found
                  </span>
                </div>

                {candidateInvoices.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={selectAll}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Select All
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={deselectAll}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>

              {candidateInvoices.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="divide-y divide-slate-100 max-h-64 sm:max-h-72 overflow-y-auto overscroll-contain focus:outline-none">
                    {candidateInvoices.map((inv) => {
                      const isChecked = selectedInvoiceIds.has(inv.id);
                      const itemsDesc = inv.data.items.map((i) => i.description).filter(Boolean);

                      return (
                        <label
                          key={inv.id}
                          className={`flex items-start gap-3 p-3 transition-colors cursor-pointer select-none ${
                            isChecked ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleInvoice(inv.id)}
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-bold text-slate-900 text-xs tabular-nums">
                                  {inv.invoiceNumber}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                  • {formatDate(inv.date)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {inv.data.items.length} {inv.data.items.length === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-900 text-xs shrink-0 tabular-nums">
                                {formatCurrency(inv.total, inv.data?.currencySymbol || currencySymbol)}
                              </span>
                            </div>

                            {itemsDesc.length > 0 && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {itemsDesc.slice(0, 3).join(', ')}
                                {itemsDesc.length > 3 ? ` (+${itemsDesc.length - 3} more)` : ''}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-slate-700 font-semibold text-xs">
                    <RiInformationLine className="size-4 text-blue-500 shrink-0" />
                    <span>No prior daily invoices found in this date range</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A clean consolidated monthly invoice will be created with this period range header, ready for line-item entry in the live editor.
                  </p>
                </div>
              )}

              {/* Selection Summary Pill */}
              {candidateInvoices.length > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RiCheckDoubleLine className="size-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>{selectedInvoiceIds.size}</strong> of {candidateInvoices.length} invoices selected
                      {selectedItemsCount > 0 && ` (${selectedItemsCount} items)`}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-emerald-300 tabular-nums">
                    {formatCurrency(selectedTotalAmount, currencySymbol)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="primary"
            type="submit"
            leadingIcon={RiCalendarLine}
            disabled={!selectedClientName.trim()}
          >
            Generate Consolidated Monthly Bill
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
