import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useInvoices } from '../context/InvoiceContext';
import { getAllThemes, getTheme } from '../themes';
import { getClientId, formatCurrency, formatDate } from '../utils';
import type { ClientInfo } from '../types';

// BoardUI Components
import { Badge } from '@/components/base/badges/badge';
import { SearchField } from '@/components/base/search-field/search-field';
import { toast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';

// Remix Icons
import {
  RiBuildingLine,
  RiInformationLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiPhoneLine,
  RiMailLine,
  RiMapPinLine,
  RiAlertLine,
  RiCalendarLine,
  RiFileTextLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiPrinterLine,
  RiDownload2Line,
  RiShoppingBagLine,
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

export const ClientsView: React.FC = () => {
  let navigate = (path: string) => {
    window.location.href = path;
  };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    // Fallback when rendered outside Router in tests
  }

  const { currentThemeId, clientDefaults, setClientDefault } = useTheme();
  const {
    clients,
    invoices,
    saveClient,
    updateClient,
    deleteClient,
    createInvoice,
    createMonthlyInvoice,
    getClientInvoices,
    getClientMetrics,
    setActiveInvoiceId,
  } = useInvoices();
  const themes = getAllThemes();
  const activeDefaultTheme = getTheme(currentThemeId);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Expandable Client Invoices Ledger ─────────────────────────────────────
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // ── Monthly Invoice Generator Modal State ─────────────────────────────────
  const [monthlyModalClient, setMonthlyModalClient] = useState<ClientInfo | null>(null);
  const [monthlyMonth, setMonthlyMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyPeriodText, setMonthlyPeriodText] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });
  const [monthlyConsolidateDaily, setMonthlyConsolidateDaily] = useState<boolean>(true);

  // ── Add Client Modal State ────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // ── Edit Client Modal State ───────────────────────────────────────────────
  const [editingClient, setEditingClient] = useState<{
    originalName: string;
    form: ClientInfo;
  } | null>(null);

  // ── Delete Client Modal State ─────────────────────────────────────────────
  const [deletingClient, setDeletingClient] = useState<ClientInfo | null>(null);

  // ── Top Portfolio Metrics Across All Clients ──────────────────────────────
  const totalClients = clients.length;
  const totalInvoicesAcrossAll = invoices.length;
  const totalBilledAcrossAll = invoices.reduce((s, inv) => s + (inv?.total || 0), 0);
  const totalDueAcrossAll = invoices.reduce(
    (s, inv) => s + (inv?.status === 'paid' ? 0 : (inv?.data?.balanceDue || 0)),
    0
  );

  // ── Theme Routing Handler ─────────────────────────────────────────────────
  const handleThemeChange = (clientId: string, clientName: string, themeId: string) => {
    setClientDefault(clientId, themeId || null);
    const chosenTheme = themeId ? getTheme(themeId) : null;
    if (chosenTheme) {
      toast.success(`Theme "${chosenTheme.name}" assigned to ${clientName}`);
    } else {
      toast.info(`${clientName} reset to system default`);
    }
  };

  // ── Quick Daily Invoice Creation For Client ───────────────────────────────
  const handleCreateDailyBill = (client: ClientInfo) => {
    const clientId = getClientId(client.name);
    const preferredTheme = clientDefaults[clientId] || currentThemeId;
    const created = createInvoice({
      type: 'goods',
      invoiceType: 'daily',
      clientName: client.name,
      themeId: preferredTheme,
    });
    setActiveInvoiceId(created.id);
    navigate('/invoices');
    toast.success(`Created Daily Invoice ${created.invoiceNumber} for ${client.name}`);
  };

  // ── Open Monthly Bill Builder Modal ───────────────────────────────────────
  const handleOpenMonthlyModal = (client: ClientInfo) => {
    const today = new Date();
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setMonthlyModalClient(client);
    setMonthlyMonth(ym);
    setMonthlyPeriodText(getMonthNameAndYear(ym));
    setMonthlyConsolidateDaily(true);
  };

  // ── Month Change in Modal ─────────────────────────────────────────────────
  const handleMonthChange = (ym: string) => {
    setMonthlyMonth(ym);
    setMonthlyPeriodText(getMonthNameAndYear(ym));
  };

  // ── Confirm Generate Monthly Invoice ──────────────────────────────────────
  const handleGenerateMonthlyBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyModalClient) return;

    const clientId = getClientId(monthlyModalClient.name);
    const preferredTheme = clientDefaults[clientId] || 'contractor';

    let initialItems;
    if (monthlyConsolidateDaily) {
      // Find daily invoices for this client in the selected month
      const clientInvs = getClientInvoices(monthlyModalClient.name);
      const dailyInvs = clientInvs.filter(
        (inv) => inv?.date?.startsWith(monthlyMonth) && inv?.data?.invoiceType !== 'monthly'
      );
      if (dailyInvs.length > 0) {
        const flattened: any[] = [];
        let sno = 1;
        for (const d of dailyInvs) {
          for (const it of d.data.items) {
            flattened.push({
              ...it,
              id: `item-${Date.now()}-${sno}`,
              sno,
              date: it.date || d.date,
            });
            sno++;
          }
        }
        initialItems = flattened;
      }
    }

    const created = createMonthlyInvoice(
      monthlyModalClient.name,
      monthlyMonth,
      monthlyPeriodText || getMonthNameAndYear(monthlyMonth),
      initialItems,
      preferredTheme
    );

    setMonthlyModalClient(null);
    setActiveInvoiceId(created.id);
    navigate('/invoices');
    toast.success(
      `Generated Monthly Bill ${created.invoiceNumber} (${monthlyPeriodText || monthlyMonth}) for ${monthlyModalClient.name}`
    );
  };

  // ── Open & Print Invoices From Client Ledger ──────────────────────────────
  const handleOpenInvoiceInEditor = (invoiceId: string) => {
    setActiveInvoiceId(invoiceId);
    navigate('/invoices');
  };

  const handlePrintInvoice = (invoiceId: string, clientName: string) => {
    const clientId = getClientId(clientName);
    const preferredTheme = clientDefaults[clientId] || currentThemeId;
    toast.info('Opening print dialog...');
    const printUrl = `/print/${invoiceId}?theme=${preferredTheme}&action=print`;
    window.open(printUrl, '_blank');
  };

  const handleSavePdfInvoice = (invoiceId: string, clientName: string) => {
    const clientId = getClientId(clientName);
    const preferredTheme = clientDefaults[clientId] || currentThemeId;
    toast.info('Opening Save as PDF...');
    const pdfUrl = `/print/${invoiceId}?theme=${preferredTheme}&action=save-pdf`;
    window.open(pdfUrl, '_blank');
  };

  // ── Add Client Handler ────────────────────────────────────────────────────
  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }

    saveClient({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim() || 'Maharashtra',
      pincode: pincode.trim(),
      gstin: gstin.trim().toUpperCase() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });

    setShowAddModal(false);
    setName('');
    setAddress('');
    setCity('');
    setState('Maharashtra');
    setPincode('');
    setGstin('');
    setPhone('');
    setEmail('');
    toast.success(`Client "${name.trim()}" added to offline directory`);
  };

  // ── Start Edit Handler ────────────────────────────────────────────────────
  const handleStartEdit = (client: ClientInfo) => {
    setEditingClient({
      originalName: client.name,
      form: {
        name: client.name,
        address: client.address || '',
        city: client.city || '',
        state: client.state || 'Maharashtra',
        pincode: client.pincode || '',
        gstin: client.gstin || '',
        phone: client.phone || '',
        email: client.email || '',
      },
    });
  };

  // ── Save Edit Handler ─────────────────────────────────────────────────────
  const handleEditClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.form.name.trim()) {
      toast.error('Company or client name cannot be empty');
      return;
    }

    const originalName = editingClient.originalName;
    const newName = editingClient.form.name.trim();

    const updatedClient: ClientInfo = {
      name: newName,
      address: editingClient.form.address.trim(),
      city: editingClient.form.city.trim(),
      state: editingClient.form.state.trim() || 'Maharashtra',
      pincode: editingClient.form.pincode.trim(),
      gstin: editingClient.form.gstin?.trim().toUpperCase() || undefined,
      phone: editingClient.form.phone?.trim() || undefined,
      email: editingClient.form.email?.trim() || undefined,
    };

    updateClient(originalName, updatedClient);

    // If client's name changed, preserve template preference under new name
    if (originalName.toLowerCase() !== newName.toLowerCase()) {
      const oldId = getClientId(originalName);
      const newId = getClientId(newName);
      const assigned = clientDefaults[oldId];
      if (assigned) {
        setClientDefault(newId, assigned);
        setClientDefault(oldId, null);
      }
    }

    setEditingClient(null);
    toast.success(`Updated details for client "${newName}"`);
  };

  // ── Confirm Delete Handler ────────────────────────────────────────────────
  const handleConfirmDelete = () => {
    if (!deletingClient) return;
    const clientName = deletingClient.name;
    deleteClient(clientName);
    setClientDefault(getClientId(clientName), null);
    setDeletingClient(null);
    toast.info(`Client "${clientName}" deleted from directory`);
  };

  // ── Search & Filter ───────────────────────────────────────────────────────
  const filteredClients = clients.filter((client) => {
    const q = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(q) ||
      client.city.toLowerCase().includes(q) ||
      client.state.toLowerCase().includes(q) ||
      (client.pincode && client.pincode.toLowerCase().includes(q)) ||
      (client.phone && client.phone.toLowerCase().includes(q)) ||
      (client.email && client.email.toLowerCase().includes(q)) ||
      (client.gstin && client.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-8">
      {/* Indian States Datalist for fast auto-complete */}
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

      {/* Header */}
      <div className="max-w-5xl mx-auto w-full space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Clients &amp; Commercial Accounts
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {clients.length} accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Client portfolio metrics, transaction history, daily delivery logs, and monthly consolidated invoice generation.
            </p>
          </div>

          <Button
            size="small"
            variant="primary"
            leadingIcon={RiAddLine}
            onClick={() => setShowAddModal(true)}
            className="text-xs shadow-xs"
          >
            Add Client
          </Button>
        </div>

        {/* ─── CLIENT PORTFOLIO OVERVIEW METRICS ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">Total Clients</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900 font-mono">{totalClients}</span>
              <span className="text-[11px] text-slate-400 font-mono">Registered</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">Invoices Generated</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-blue-700 font-mono">{totalInvoicesAcrossAll}</span>
              <span className="text-[11px] text-slate-400 font-mono">Ledger bills</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">Total Billed / Revenue</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(totalBilledAcrossAll, '₹')}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold font-mono">Gross</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">Outstanding Due</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-base font-bold font-mono ${totalDueAcrossAll > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatCurrency(totalDueAcrossAll, '₹')}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Receivable</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
          <RiInformationLine className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">
              Daily vs Monthly Invoicing &amp; Customer Ledger:
            </span>
            <p>
              Under each client, you can inspect how many invoices have been generated, the total value, and the dates of supply.
              Click <strong>&quot;View Invoices&quot;</strong> to expand the client&apos;s history and see which goods or materials were purchased.
              Use <strong>&quot;Generate Monthly Bill&quot;</strong> to compile daily delivery slips or issue a consolidated monthly tax invoice.
            </p>
          </div>
        </div>

        {/* Client Accounts Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="w-72">
              <SearchField
                aria-label="Filter client accounts"
                placeholder="Search clients, location, GSTIN or phone..."
                value={searchQuery}
                onChange={setSearchQuery}
                size="small"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Showing {filteredClients.length} of {clients.length} clients
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <RiBuildingLine className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No clients found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No client accounts match your current search query. Try clearing the search or adding a new client.'
                    : 'No clients registered yet. Click "Add Client" above to create your first client account.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredClients.map((client, idx) => {
                const clientId = getClientId(client.name);
                const assignedThemeId = clientDefaults[clientId] || '';
                const metrics = getClientMetrics(client.name);
                const clientInvs = getClientInvoices(client.name);
                const isExpanded = expandedClientId === clientId;

                return (
                  <div key={idx} className="transition-colors hover:bg-slate-50/50">
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Client Information */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="size-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <RiBuildingLine className="size-5 text-slate-700" />
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900">{client.name}</span>
                            <Badge color="neutral">{client.gstin ? 'B2B GST' : 'Consumer / POS'}</Badge>

                            {/* Client Summary Badges */}
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {metrics.invoiceCount} {metrics.invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                            </span>

                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              Billed: {formatCurrency(metrics.totalBilled, '₹')}
                            </span>

                            {metrics.balanceDue > 0 ? (
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Due: {formatCurrency(metrics.balanceDue, '₹')}
                              </span>
                            ) : metrics.invoiceCount > 0 ? (
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Settled
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                            <span>
                              GSTIN: <strong className="text-slate-700">{client.gstin || 'None (Unregistered)'}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <RiMapPinLine className="size-3 text-slate-400" />
                              {client.city}, {client.state} {client.pincode}
                            </span>
                            {client.phone && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <RiPhoneLine className="size-3 text-slate-400" />
                                  {client.phone}
                                </span>
                              </>
                            )}
                            {client.email && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <RiMailLine className="size-3 text-slate-400" />
                                  {client.email}
                                </span>
                              </>
                            )}
                            {metrics.latestInvoiceDate && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                                  <RiCalendarLine className="size-3 text-blue-500" />
                                  Last Billed: {formatDate(metrics.latestInvoiceDate)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Preview of Purchased Items / Goods */}
                          {metrics.itemsSummary.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <RiShoppingBagLine className="size-3" />
                                Items Bought:
                              </span>
                              {metrics.itemsSummary.slice(0, 4).map((it, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80 font-mono truncate max-w-[140px]"
                                  title={it}
                                >
                                  {it}
                                </span>
                              ))}
                              {metrics.itemsSummary.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{metrics.itemsSummary.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap justify-end">
                        {/* Preferred Template Selector */}
                        <div className="text-right mr-1">
                          <label htmlFor={`client-theme-select-${clientId}`} className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Template:
                          </label>
                          <select
                            id={`client-theme-select-${clientId}`}
                            value={assignedThemeId}
                            onChange={(e) => handleThemeChange(clientId, client.name, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border font-semibold outline-none transition-colors cursor-pointer ${
                              assignedThemeId
                                ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <option value="">Default ({activeDefaultTheme.name})</option>
                            {themes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* View Invoices Ledger Toggle */}
                        <Button
                          size="small"
                          variant="secondary"
                          trailingIcon={isExpanded ? RiArrowUpSLine : RiArrowDownSLine}
                          onClick={() => setExpandedClientId(isExpanded ? null : clientId)}
                          className="text-xs font-semibold"
                        >
                          Invoices ({metrics.invoiceCount})
                        </Button>

                        {/* Generate Monthly Bill Button */}
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiCalendarLine}
                          onClick={() => handleOpenMonthlyModal(client)}
                          title="Generate a consolidated monthly bill for this client"
                          className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100/60"
                        >
                          Monthly Bill
                        </Button>

                        {/* Quick Daily Bill Button */}
                        <Button
                          size="small"
                          variant="primary"
                          leadingIcon={RiAddLine}
                          onClick={() => handleCreateDailyBill(client)}
                          title="Create a regular daily invoice for this client"
                          className="text-xs font-semibold"
                        >
                          + Bill
                        </Button>

                        {/* Edit Client Button */}
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiEditLine}
                          onClick={() => handleStartEdit(client)}
                          className="text-xs font-semibold"
                        >
                          Edit
                        </Button>

                        {/* Delete Client Button */}
                        <IconButton
                          icon={RiDeleteBinLine}
                          size="small"
                          aria-label={`Delete ${client.name}`}
                          title={`Delete ${client.name}`}
                          onClick={() => setDeletingClient(client)}
                          className="text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                        />
                      </div>
                    </div>

                    {/* ─── EXPANDABLE CLIENT INVOICES LEDGER ─── */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RiFileTextLine className="size-4 text-blue-600" />
                            <span className="font-bold text-xs text-slate-800">
                              Billing History &amp; Delivery Slips for {client.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              ({clientInvs.length} invoices on record)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenMonthlyModal(client)}
                              className="text-xs font-semibold text-purple-700 hover:text-purple-800 underline cursor-pointer"
                            >
                              + Create Monthly Invoice
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleCreateDailyBill(client)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                            >
                              + Create Daily Invoice
                            </button>
                          </div>
                        </div>

                        {clientInvs.length === 0 ? (
                          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center">
                            <p className="text-xs text-slate-500">
                              No invoices have been generated for {client.name} yet.
                            </p>
                            <div className="mt-2.5 flex justify-center gap-2">
                              <Button
                                size="small"
                                variant="secondary"
                                leadingIcon={RiAddLine}
                                onClick={() => handleCreateDailyBill(client)}
                              >
                                Create Daily Bill
                              </Button>
                              <Button
                                size="small"
                                variant="primary"
                                leadingIcon={RiCalendarLine}
                                onClick={() => handleOpenMonthlyModal(client)}
                              >
                                Generate Monthly Bill
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                                <tr>
                                  <th className="py-2 px-3 w-28">Date</th>
                                  <th className="py-2 px-3 w-32">Invoice #</th>
                                  <th className="py-2 px-3 w-28">Type</th>
                                  <th className="py-2 px-3">What was bought (Items &amp; Details)</th>
                                  <th className="py-2 px-3 text-right w-28">Amount</th>
                                  <th className="py-2 px-3 text-center w-24">Status</th>
                                  <th className="py-2 px-3 text-right w-28">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {clientInvs.map((inv) => {
                                  const isMonthly = inv.data.invoiceType === 'monthly';
                                  const itemsText = inv.data.items
                                    .map((it) => `${it.description} (${it.quantity} ${it.unit})`)
                                    .join(', ');

                                  return (
                                    <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                        {formatDate(inv.date)}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInvoiceInEditor(inv.id)}
                                          className="hover:underline cursor-pointer"
                                        >
                                          {inv.invoiceNumber}
                                        </button>
                                      </td>
                                      <td className="py-2.5 px-3 whitespace-nowrap">
                                        {isMonthly ? (
                                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-semibold font-sans">
                                            Monthly {inv.data.billingPeriod ? `(${inv.data.billingPeriod})` : ''}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold font-sans">
                                            Daily
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-sans text-xs">
                                        <div className="line-clamp-2" title={itemsText}>
                                          {inv.data.items.map((it, idx2) => (
                                            <span key={idx2} className="inline-block mr-2">
                                              <strong className="text-slate-800">{it.description}</strong>
                                              <span className="text-slate-500 ml-1">
                                                ({it.quantity} {it.unit} @ ₹{it.rate})
                                              </span>
                                              {it.date && (
                                                <span className="text-[10px] text-blue-600 ml-1 font-mono">
                                                  [{formatDate(it.date)}]
                                                </span>
                                              )}
                                              {idx2 < inv.data.items.length - 1 ? ',' : ''}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                        {formatCurrency(inv.total, '₹')}
                                      </td>
                                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            inv.status === 'paid'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : inv.status === 'sent'
                                              ? 'bg-blue-100 text-blue-800'
                                              : inv.status === 'overdue'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          {inv.status}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-sans">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenInvoiceInEditor(inv.id)}
                                            className="px-2 py-1 rounded text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                                            title="Open in Invoice Editor"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handlePrintInvoice(inv.id, client.name)}
                                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                            title="Print Invoice"
                                          >
                                            <RiPrinterLine className="size-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSavePdfInvoice(inv.id, client.name)}
                                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                            title="Save as PDF"
                                          >
                                            <RiDownload2Line className="size-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Add Client Modal ─── */}
      <Modal isOpen={showAddModal} onOpenChange={setShowAddModal}>
        <ModalHeader
          title="Add Client to Offline Directory"
          description="Register a new commercial client or retail buyer in your offline local database."
        />
        <form onSubmit={handleAddClientSubmit}>
          <ModalBody>
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Reliance Retail Ltd."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 101, Maker Chambers IV, Nariman Point"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    list="indian-states-list"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 400021"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 27AABCR1234F1ZX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-mono outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Billing Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accounts@relianceretail.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="primary"
              type="submit"
            >
              Save Client
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Edit Client Modal ─── */}
      <Modal
        isOpen={!!editingClient}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
      >
        <ModalHeader
          title={`Edit Client: ${editingClient?.originalName || ''}`}
          description="Update company name, GSTIN, billing address, or contact details in your offline directory."
        />
        {editingClient && (
          <form onSubmit={handleEditClientSubmit}>
            <ModalBody>
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Company / Client Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClient.form.name}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        form: { ...editingClient.form, name: e.target.value },
                      })
                    }
                    placeholder="e.g. Reliance Retail Ltd."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={editingClient.form.address}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        form: { ...editingClient.form, address: e.target.value },
                      })
                    }
                    placeholder="e.g. 101, Maker Chambers IV, Nariman Point"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editingClient.form.city}
                      onChange={(e) =>
                        setEditingClient({
                          ...editingClient,
                          form: { ...editingClient.form, city: e.target.value },
                        })
                      }
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      list="indian-states-list"
                      value={editingClient.form.state}
                      onChange={(e) =>
                        setEditingClient({
                          ...editingClient,
                          form: { ...editingClient.form, state: e.target.value },
                        })
                      }
                      placeholder="e.g. Maharashtra"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={editingClient.form.pincode}
                      onChange={(e) =>
                        setEditingClient({
                          ...editingClient,
                          form: { ...editingClient.form, pincode: e.target.value },
                        })
                      }
                      placeholder="e.g. 400021"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingClient.form.gstin || ''}
                      onChange={(e) =>
                        setEditingClient({
                          ...editingClient,
                          form: { ...editingClient.form, gstin: e.target.value },
                        })
                      }
                      placeholder="e.g. 27AABCR1234F1ZX"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-mono outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingClient.form.phone || ''}
                      onChange={(e) =>
                        setEditingClient({
                          ...editingClient,
                          form: { ...editingClient.form, phone: e.target.value },
                        })
                      }
                      placeholder="+91 98200 12345"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Billing Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={editingClient.form.email || ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        form: { ...editingClient.form, email: e.target.value },
                      })
                    }
                    placeholder="accounts@relianceretail.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setEditingClient(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="primary"
                type="submit"
              >
                Save Changes
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* ─── Delete Client Confirmation Modal ─── */}
      <Modal
        isOpen={!!deletingClient}
        onOpenChange={(open) => {
          if (!open) setDeletingClient(null);
        }}
      >
        <ModalHeader
          title="Delete Client Account"
          description="Are you sure you want to remove this client from your offline database?"
        />
        {deletingClient && (
          <div>
            <ModalBody>
              <div className="py-2 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <RiAlertLine className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-rose-950">
                      Permanently remove &ldquo;{deletingClient.name}&rdquo;?
                    </p>
                    <p className="text-rose-700">
                      This will remove the client profile from your offline directory and reset any custom theme preferences.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-mono text-slate-600">
                  <div><strong>Name:</strong> {deletingClient.name}</div>
                  <div><strong>Location:</strong> {deletingClient.city}, {deletingClient.state}</div>
                  {deletingClient.gstin && <div><strong>GSTIN:</strong> {deletingClient.gstin}</div>}
                  {deletingClient.phone && <div><strong>Phone:</strong> {deletingClient.phone}</div>}
                </div>

                <p className="text-[11px] text-slate-500">
                  * Note: Invoices previously generated for this client will keep their recorded transaction data intact.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setDeletingClient(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                leadingIcon={RiDeleteBinLine}
                onClick={handleConfirmDelete}
              >
                Delete Client
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ─── Generate Monthly Invoice Modal ─── */}
      <Modal
        isOpen={Boolean(monthlyModalClient)}
        onOpenChange={(open) => !open && setMonthlyModalClient(null)}
      >
        <ModalHeader
          title="Generate Monthly Consolidated Invoice"
          description={`Compile daily supplies or generate a consolidated monthly bill for ${monthlyModalClient?.name || 'client'}.`}
        />
        {monthlyModalClient && (
          <form onSubmit={handleGenerateMonthlyBillSubmit}>
            <ModalBody>
              <div className="space-y-4 pt-2 text-xs">
                {/* Client Profile Box */}
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      {monthlyModalClient.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      GSTIN: {monthlyModalClient.gstin || 'Unregistered'} • {monthlyModalClient.city}, {monthlyModalClient.state}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                    Monthly Bill
                  </span>
                </div>

                {/* Billing Month & Period Label */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Billing Month *
                    </label>
                    <input
                      type="month"
                      required
                      value={monthlyMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-mono outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Billing Period Header
                    </label>
                    <input
                      type="text"
                      value={monthlyPeriodText}
                      onChange={(e) => setMonthlyPeriodText(e.target.value)}
                      placeholder="e.g. April 2026 or 01/04/2026 - 30/04/2026"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Daily Slips Consolidation Discovery */}
                {(() => {
                  const dailyInvs = getClientInvoices(monthlyModalClient.name).filter(
                    (inv) => inv?.date?.startsWith(monthlyMonth) && inv?.data?.invoiceType !== 'monthly'
                  );
                  const countItems = dailyInvs.reduce((s, inv) => s + (inv?.data?.items?.length || 0), 0);

                  if (countItems > 0) {
                    return (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={monthlyConsolidateDaily}
                            onChange={(e) => setMonthlyConsolidateDaily(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">
                              Consolidate {countItems} daily delivery {countItems === 1 ? 'item' : 'items'} from {dailyInvs.length} daily bills
                            </span>
                            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                              Each item will preserve its exact supply date and description in the monthly line-item table.
                            </span>
                          </div>
                        </label>

                        {monthlyConsolidateDaily && (
                          <div className="mt-2 pt-2 border-t border-slate-200/80 max-h-32 overflow-y-auto space-y-1">
                            {dailyInvs.map((d) => (
                              <div key={d.id} className="text-[10px] text-slate-600 font-mono flex items-center justify-between">
                                <span>
                                  <strong>{formatDate(d.date)}</strong> ({d.invoiceNumber}): {d.data.items.map((i) => i.description).join(', ')}
                                </span>
                                <span className="font-semibold text-slate-800">{formatCurrency(d.total, '₹')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 text-blue-900 space-y-1">
                      <span className="font-semibold text-xs block">
                        Clean Monthly Invoice Mode
                      </span>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        No prior daily bills found for {monthlyModalClient.name} in {monthlyPeriodText || monthlyMonth}. A monthly invoice with date columns will be created ready for manual line-item entry.
                      </p>
                    </div>
                  );
                })()}

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <RiInformationLine className="size-4 text-amber-600 shrink-0" />
                  <span>
                    Monthly invoices show day-wise supply dates for each row item and output a consolidated tax schedule.
                  </span>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setMonthlyModalClient(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="primary"
                type="submit"
                leadingIcon={RiCalendarLine}
              >
                Generate &amp; Open Monthly Bill
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ClientsView;
