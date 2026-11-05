// ─── Desktop Invoices Workspace ──────────────────────────────────────
// Offline commercial invoice management for PC desktop software.

import React, { useState, useEffect } from 'react';
import { useInvoices } from '../context/InvoiceContext';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../themes';
import { InvoiceEditor } from '../components/InvoiceEditor/InvoiceEditor';
import { ShareInvoiceModal } from '../components/ShareInvoiceModal/ShareInvoiceModal';
import type { InvoiceRenderData } from '../types';
import { formatCurrency, getClientId } from '../utils';

// BoardUI Components
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { SearchField } from '@/components/base/search-field/search-field';
import { toast } from '@/components/base/toast/toast';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';

// Remix Icons
import {
  RiFileTextLine,
  RiPrinterLine,
  RiShareForwardLine,
  RiAddLine,
  RiEditLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiUpload2Line,
  RiAlertLine,
  RiCalendarLine,
} from '@remixicon/react';

export const InvoicesView: React.FC = () => {
  const {
    invoices,
    activeInvoiceId,
    setActiveInvoiceId,
    createInvoice,
    deleteInvoice,
    duplicateInvoice,
    exportOfflineBackup,
    importOfflineBackup,
  } = useInvoices();

  const { currentThemeId, clientDefaults } = useTheme();

  // Search filter query & status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'sent' | 'draft' | 'overdue'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'daily' | 'monthly'>('all');

  // Active editing invoice ID (if non-null, shows InvoiceEditor)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(activeInvoiceId);

  useEffect(() => {
    if (activeInvoiceId) {
      setEditingInvoiceId(activeInvoiceId);
    }
  }, [activeInvoiceId]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Share Invoice Modal
  const [sharingInvoice, setSharingInvoice] = useState<InvoiceRenderData | null>(null);
  const [sharingThemeId, setSharingThemeId] = useState<string>('classic');

  // Delete Invoice Confirmation Modal
  const [deletingInvoice, setDeletingInvoice] = useState<{ id: string; invoiceNumber: string } | null>(null);

  // Compact metrics calculations (No percentages, exact real accounting data)
  const grossInvoiced = invoices.reduce((s, inv) => s + (inv?.total || 0), 0);
  const totalCollected = invoices.reduce((s, inv) => s + (inv?.status === 'paid' ? (inv?.total || 0) : (inv?.data?.amountPaid || 0)), 0);
  const totalDue = invoices.reduce((s, inv) => s + (inv?.status === 'paid' ? 0 : (inv?.data?.balanceDue || 0)), 0);
  const totalGstLiabilities = invoices.reduce((s, inv) => s + (inv?.data?.totalTax || 0), 0);
  const paidInvoicesCount = invoices.filter((inv) => inv?.status === 'paid').length;

  const dailyCount = invoices.filter((inv) => inv?.data?.invoiceType !== 'monthly').length;
  const monthlyCount = invoices.filter((inv) => inv?.data?.invoiceType === 'monthly').length;

  // Filtered invoices list
  const filteredInvoices = invoices.filter((inv) => {
    if (!inv || !inv.data) return false;
    const q = searchQuery.toLowerCase();
    const invoiceNum = (inv.invoiceNumber || '').toLowerCase();
    const clientName = (inv.clientName || inv.data.client?.name || '').toLowerCase();
    const businessName = (inv.data.business?.name || '').toLowerCase();

    const matchesSearch =
      invoiceNum.includes(q) ||
      clientName.includes(q) ||
      businessName.includes(q);

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'monthly'
        ? inv.data.invoiceType === 'monthly'
        : inv.data.invoiceType !== 'monthly');

    return matchesSearch && matchesStatus && matchesType;
  });

  const getEffectiveTheme = (invThemeId?: string, clientId?: string, clientName?: string): string => {
    if (invThemeId) return invThemeId;
    if (clientId && clientDefaults[clientId]) return clientDefaults[clientId];
    if (clientName && clientDefaults[getClientId(clientName)]) return clientDefaults[getClientId(clientName)];
    return currentThemeId;
  };

  const handleCreateDaily = () => {
    const created = createInvoice({ type: 'goods', invoiceType: 'daily', themeId: currentThemeId });
    setEditingInvoiceId(created.id);
    setActiveInvoiceId(created.id);
    toast.success(`Created Daily Bill ${created.invoiceNumber}. Live editor open.`);
  };

  const handleCreateMonthly = () => {
    const created = createInvoice({ type: 'goods', invoiceType: 'monthly', themeId: 'contractor' });
    setEditingInvoiceId(created.id);
    setActiveInvoiceId(created.id);
    toast.success(`Created Monthly Invoice ${created.invoiceNumber}. Live editor open.`);
  };

  const handlePrint = (invoiceId: string, themeId: string) => {
    toast.info('Opening print dialog...');
    const printUrl = `/print/${invoiceId}?theme=${themeId}&action=print`;
    const win = window.open(printUrl, '_blank');
    if (!win) {
      window.location.href = printUrl;
    }
  };

  const handleSavePdf = (invoiceId: string, themeId: string) => {
    toast.info('Opening Save as PDF...');
    const pdfUrl = `/print/${invoiceId}?theme=${themeId}&action=save-pdf`;
    const win = window.open(pdfUrl, '_blank');
    if (!win) {
      window.location.href = pdfUrl;
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateInvoice(id);
    toast.success(`Duplicated as ${dup.invoiceNumber}`);
  };

  const handleDelete = (id: string, num: string) => {
    if (invoices.length <= 1) {
      toast.error('Cannot delete the last invoice record');
      return;
    }
    setDeletingInvoice({ id, invoiceNumber: num });
  };

  const handleConfirmDelete = () => {
    if (!deletingInvoice) return;
    if (invoices.length <= 1) {
      toast.error('Cannot delete the last invoice record');
      setDeletingInvoice(null);
      return;
    }
    deleteInvoice(deletingInvoice.id);
    toast.info(`Invoice ${deletingInvoice.invoiceNumber} removed`);
    setDeletingInvoice(null);
  };

  const handleExportBackup = () => {
    const json = exportOfflineBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-invoices-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Offline database backup exported');
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) return;
    const ok = importOfflineBackup(importJsonText);
    if (ok) {
      setShowImportModal(false);
      setImportJsonText('');
      toast.success('Backup restored successfully');
    } else {
      toast.error('Invalid backup file format');
    }
  };

  const renderStatusChip = (status: string) => {
    switch (status) {
      case 'paid':
        return <Chip color="lime" variant="caption">Paid</Chip>;
      case 'sent':
        return <Chip color="blue" variant="caption">Sent</Chip>;
      case 'draft':
        return <Chip color="neutral" variant="caption">Draft</Chip>;
      case 'overdue':
        return <Chip color="rose" variant="caption">Overdue</Chip>;
      default:
        return <Chip color="neutral" variant="caption">{status}</Chip>;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // IF EDITING AN INVOICE: RENDER THE LIVE INVOICE WORKSTATION
  // ─────────────────────────────────────────────────────────────────────────────
  if (editingInvoiceId) {
    return (
      <InvoiceEditor
        invoiceId={editingInvoiceId}
        onBack={() => {
          setEditingInvoiceId(null);
          setActiveInvoiceId(null);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN INVOICES DASHBOARD & HIGH-DENSITY DIRECTORY
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto w-full space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/app-icon.png" alt="Invoice Gen" className="size-7 object-contain shrink-0" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Invoices
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {invoices.length} active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Local billing ledger. Create daily delivery bills or consolidated monthly statements.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiDownload2Line}
              onClick={handleExportBackup}
              title="Download offline JSON backup"
              className="text-xs font-medium"
            >
              Backup
            </Button>

            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiUpload2Line}
              onClick={() => setShowImportModal(true)}
              title="Restore from JSON backup"
              className="text-xs font-medium"
            >
              Restore
            </Button>

            {/* Create Monthly Invoice Button */}
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiCalendarLine}
              onClick={handleCreateMonthly}
              title="Create a consolidated monthly bill"
              className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100/60"
            >
              + Monthly Bill
            </Button>

            {/* Create Daily Invoice Button */}
            <Button
              size="small"
              variant="primary"
              leadingIcon={RiAddLine}
              onClick={handleCreateDaily}
              className="text-xs shadow-xs font-semibold"
            >
              + Daily Bill
            </Button>
          </div>
        </div>

        {/* ─── COMPACT SUMMARY METRICS ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Total invoiced</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-bold text-base text-slate-900 font-mono tracking-tight">
                {formatCurrency(grossInvoiced, '₹')}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{invoices.length} bills</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Collected payments</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-bold text-base text-emerald-700 font-mono tracking-tight">
                {formatCurrency(totalCollected, '₹')}
              </span>
              <span className="text-[11px] text-emerald-600 font-mono">{paidInvoicesCount} settled</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">Outstanding balance</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-bold text-base text-slate-900 font-mono tracking-tight">
                {formatCurrency(totalDue, '₹')}
              </span>
              <span className={`text-[11px] font-mono ${totalDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {invoices.length - paidInvoicesCount} pending
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500">GST liabilities</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-bold text-base text-slate-900 font-mono tracking-tight">
                {formatCurrency(totalGstLiabilities, '₹')}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Tax pool</span>
            </div>
          </div>
        </div>

        {/* ─── INVOICE DIRECTORY TABLE ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-56">
                <SearchField
                  aria-label="Filter customer invoices"
                  placeholder="Search invoice # or client..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  size="small"
                />
              </div>

              {/* Invoice Type Pills Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    typeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('daily')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    typeFilter === 'daily'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Daily ({dailyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('monthly')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    typeFilter === 'monthly'
                      ? 'bg-purple-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly ({monthlyCount})
                </button>
              </div>

              {/* Status Pills Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                {(['all', 'paid', 'sent', 'draft', 'overdue'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${
                      statusFilter === s
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              {filteredInvoices.length} of {invoices.length} records
            </div>
          </div>

          {/* Directory Rows */}
          <div className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <RiFileTextLine className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No invoices found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No invoices match your current search query or filter. Try clearing filters or searching for a different client.'
                    : 'Your invoice ledger is empty. Click "+ Daily Bill" or "+ Monthly Bill" above to generate your first invoice.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Clear Search &amp; Filters
                  </button>
                )}
              </div>
            ) : (
              filteredInvoices.map((inv) => {
              const effectiveThemeId = getEffectiveTheme(inv.themeId, inv.clientId, inv.clientName);
              const theme = getTheme(effectiveThemeId);
              const isMonthly = inv.data.invoiceType === 'monthly';

              return (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Left: Invoice Info */}
                  <div
                    onClick={() => {
                      setEditingInvoiceId(inv.id);
                      setActiveInvoiceId(inv.id);
                    }}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0 mr-4"
                  >
                    <div className="size-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:border-blue-300 group-hover:bg-blue-50/50 transition-colors shrink-0">
                      <RiFileTextLine className="size-4.5 text-slate-700 group-hover:text-blue-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors font-mono">
                          {inv.invoiceNumber}
                        </span>
                        {renderStatusChip(inv.status)}

                        {isMonthly ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 font-sans">
                            Monthly {inv.data.billingPeriod ? `• ${inv.data.billingPeriod}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                            Daily
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                        <strong className="text-slate-800 font-medium truncate">{inv.clientName}</strong>
                        <span>•</span>
                        <span>{inv.date}</span>
                        <span>•</span>
                        <span>{inv.data.items.length} items</span>
                        {inv.data.items.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-[280px]" title={inv.data.items.map((it) => it.description).join(', ')}>
                              Bought: {inv.data.items.map((it) => it.description).filter(Boolean).slice(0, 2).join(', ')}
                              {inv.data.items.length > 2 ? ` (+${inv.data.items.length - 2} more)` : ''}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[11px] text-blue-700 font-semibold">{theme.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Financials & Action Buttons */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <div className="font-bold font-mono text-sm text-slate-900">
                        {formatCurrency(inv.total, '₹')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {inv.status === 'paid' || (inv.data?.balanceDue ?? 0) <= 0 ? (
                          <span className="text-emerald-600 font-medium">Settled</span>
                        ) : (
                          <span className="text-rose-600 font-medium">Due: {formatCurrency(inv.data.balanceDue, '₹')}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiEditLine}
                        onClick={() => setEditingInvoiceId(inv.id)}
                        className="text-xs font-semibold"
                      >
                        Edit
                      </Button>

                      <IconButton
                        icon={RiPrinterLine}
                        size="small"
                        aria-label="Print Invoice"
                        title="Print Invoice"
                        onClick={() => handlePrint(inv.id, effectiveThemeId)}
                      />

                      <IconButton
                        icon={RiDownload2Line}
                        size="small"
                        aria-label="Save as PDF"
                        title="Save as PDF"
                        onClick={() => handleSavePdf(inv.id, effectiveThemeId)}
                      />

                      <IconButton
                        icon={RiShareForwardLine}
                        size="small"
                        aria-label="Share Invoice (WhatsApp, Email, Link, System)"
                        title="Share Invoice (WhatsApp, Email, Link, System)"
                        onClick={() => {
                          setSharingInvoice(inv.data);
                          setSharingThemeId(effectiveThemeId);
                        }}
                      />

                      <IconButton
                        icon={RiFileCopyLine}
                        size="small"
                        aria-label="Duplicate Invoice"
                        title="Duplicate Invoice"
                        onClick={() => handleDuplicate(inv.id)}
                      />

                      <IconButton
                        icon={RiDeleteBinLine}
                        size="small"
                        aria-label="Delete Invoice"
                        title="Delete Invoice"
                        onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                        className="text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      />
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      {/* ─── RESTORE BACKUP MODAL ─── */}
      <Modal isOpen={showImportModal} onOpenChange={setShowImportModal}>
        <ModalHeader
          title="Restore Offline Invoice Backup"
          description="Paste your exported offline JSON data below to restore invoices and client master records."
        />
        <ModalBody>
          <textarea
            rows={8}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            placeholder='Paste JSON backup containing {"invoices": [...]} ...'
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-600"
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
            onClick={handleImportBackup}
          >
            Restore Data
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── DELETE INVOICE CONFIRMATION MODAL ─── */}
      <Modal
        isOpen={!!deletingInvoice}
        onOpenChange={(open) => {
          if (!open) setDeletingInvoice(null);
        }}
      >
        <ModalHeader
          title="Delete Invoice"
          description="Are you sure you want to delete this invoice record from your offline database?"
        />
        {deletingInvoice && (
          <div>
            <ModalBody>
              <div className="py-2 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <RiAlertLine className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-rose-950">
                      Permanently delete invoice #{deletingInvoice.invoiceNumber}?
                    </p>
                    <p className="text-rose-700">
                      This will remove the transaction record from your local machine storage. This action cannot be undone unless you have an exported offline backup.
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setDeletingInvoice(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                leadingIcon={RiDeleteBinLine}
                onClick={handleConfirmDelete}
              >
                Delete Invoice
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ─── SHARE INVOICE MODAL ─── */}
      <ShareInvoiceModal
        isOpen={!!sharingInvoice}
        onClose={() => setSharingInvoice(null)}
        invoice={sharingInvoice}
        themeId={sharingThemeId}
      />
    </div>
  );
};

export default InvoicesView;
