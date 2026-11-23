import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useInvoices } from '../context/InvoiceContext';
import { getAllThemes, getTheme } from '../themes';
import { getClientId, formatCurrency, formatDate, exportInvoiceToExcel, exportInvoicesLedgerToExcel } from '../utils';
import { ConsolidatedMonthlyModal } from '../components/ConsolidatedMonthlyModal/ConsolidatedMonthlyModal';
import { useNativeBackButton } from '../hooks/useNativeBackButton';
import { haptics } from '../services/nativeMobileService';
import type { ClientInfo } from '../types';

// BoardUI Components
import { Badge } from '@/components/base/badges/badge';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Avatar } from '@/components/base/avatar/avatar';
import { SearchField } from '@/components/base/search-field/search-field';
import { StatCards } from '@/components/application/dashboard/stat-cards';
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
  RiFileExcel2Line,
  RiShoppingBagLine,
  RiGroupLine,
  RiCoinsFill,
} from '@remixicon/react';

export const ClientsView: React.FC = () => {
  const navigate = useNavigate();

  const { currentThemeId, clientDefaults, setClientDefault } = useTheme();
  const {
    clients,
    invoices,
    businessProfile,
    saveClient,
    updateClient,
    deleteClient,
    createInvoice,
    getClientInvoices,
    getClientMetrics,
    setActiveInvoiceId,
  } = useInvoices();
  const themes = getAllThemes();
  const activeDefaultTheme = getTheme(currentThemeId);
  const [searchQuery, setSearchQuery] = useState('');

  const isUS = businessProfile?.region === 'US' || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
  const currencySymbol = isUS ? '$' : '₹';

  // ── Expandable Client Invoices Ledger ─────────────────────────────────────
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // ── Monthly Invoice Generator Modal State ─────────────────────────────────
  const [monthlyModalClient, setMonthlyModalClient] = useState<ClientInfo | null>(null);

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

  // ── Android Hardware Back Button Handling ──────────────────────────────────
  const hasActiveModal = Boolean(
    deletingClient || editingClient || showAddModal || monthlyModalClient || expandedClientId
  );
  useNativeBackButton(
    'clients-view-modals',
    () => {
      if (deletingClient) {
        setDeletingClient(null);
        return true;
      }
      if (editingClient) {
        setEditingClient(null);
        return true;
      }
      if (showAddModal) {
        setShowAddModal(false);
        return true;
      }
      if (monthlyModalClient) {
        setMonthlyModalClient(null);
        return true;
      }
      if (expandedClientId) {
        setExpandedClientId(null);
        return true;
      }
      return false;
    },
    hasActiveModal,
    200
  );

  // ── Top Portfolio Metrics Across All Clients (Excludes cancelled & consolidated invoices) ─
  const totalClients = clients.length;
  const activeInvoicesAcrossAll = invoices.filter(
    (inv) => inv?.status !== 'cancelled' && !inv?.isConsolidated && !inv?.data?.isConsolidated
  );
  const totalInvoicesAcrossAll = activeInvoicesAcrossAll.length;
  const totalBilledAcrossAll = activeInvoicesAcrossAll.reduce((s, inv) => s + (inv?.total || 0), 0);
  const totalDueAcrossAll = activeInvoicesAcrossAll.reduce(
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
    setMonthlyModalClient(client);
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
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSavePdfInvoice = (invoiceId: string, clientName: string) => {
    const clientId = getClientId(clientName);
    const preferredTheme = clientDefaults[clientId] || currentThemeId;
    toast.info('Opening Save as PDF...');
    const pdfUrl = `/print/${invoiceId}?theme=${preferredTheme}&action=save-pdf`;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleExportExcelInvoice = async (invoiceData: any) => {
    try {
      await exportInvoiceToExcel(invoiceData);
    } catch (err: any) {
      toast.error(`Failed to export Excel: ${err?.message || err}`);
    }
  };

  const handleExportClientLedgerExcel = async (clientName: string, clientInvs: any[]) => {
    try {
      await exportInvoicesLedgerToExcel(clientInvs, `${clientName} Invoices Ledger`);
    } catch (err: any) {
      toast.error(`Failed to export ledger: ${err?.message || err}`);
    }
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
      (client.name || '').toLowerCase().includes(q) ||
      (client.city || '').toLowerCase().includes(q) ||
      (client.state || '').toLowerCase().includes(q) ||
      (client.pincode && client.pincode.toLowerCase().includes(q)) ||
      (client.phone && client.phone.toLowerCase().includes(q)) ||
      (client.email && client.email.toLowerCase().includes(q)) ||
      (client.gstin && client.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-28 sm:pb-6 lg:pb-8">
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
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <img src="/app-icon.png" alt="Invoice Gen" className="size-6 sm:size-7 object-contain shrink-0 hidden sm:block" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Clients &amp; Commercial Accounts
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                {clients.length} accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl text-pretty hidden sm:block">
              Client portfolio metrics, transaction history, daily delivery logs, and monthly consolidated invoice generation.
            </p>
          </div>

          <Button
            size="small"
            variant="primary"
            leadingIcon={RiAddLine}
            onClick={() => {
              haptics.light();
              setShowAddModal(true);
            }}
            className="text-xs shadow-xs hidden sm:inline-flex shrink-0"
          >
            Add Client
          </Button>
        </div>

        {/* ─── CLIENT PORTFOLIO OVERVIEW STAT CARDS (BOARDUI) ─── */}
        <StatCards
          variant="plain"
          columns={4}
          stats={[
            {
              icon: RiGroupLine,
              label: 'Total Clients',
              value: String(totalClients),
              delta: 'Registered',
              deltaColor: 'neutral',
            },
            {
              icon: RiFileTextLine,
              label: 'Invoices Generated',
              value: String(totalInvoicesAcrossAll),
              delta: 'Ledger bills',
              deltaColor: 'neutral',
            },
            {
              icon: RiCoinsFill,
              label: 'Total Billed / Revenue',
              value: formatCurrency(totalBilledAcrossAll, currencySymbol),
              delta: 'Gross billed',
              deltaColor: 'lime',
            },
            {
              icon: RiAlertLine,
              label: 'Outstanding Due',
              value: formatCurrency(totalDueAcrossAll, currencySymbol),
              delta: totalDueAcrossAll > 0 ? 'Receivable' : 'Fully settled',
              deltaColor: totalDueAcrossAll > 0 ? 'rose' : 'lime',
            },
          ]}
        />

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
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="w-full sm:w-72">
              <SearchField
                aria-label="Filter client accounts"
                placeholder="Search clients, location, GSTIN or phone..."
                value={searchQuery}
                onChange={setSearchQuery}
                size="small"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500 shrink-0">
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
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              filteredClients.map((client, idx) => {
                const clientId = getClientId(client.name);
                const assignedThemeId = clientDefaults[clientId] || '';
                const metrics = getClientMetrics(client.name);
                const clientInvs = getClientInvoices(client.name);
                const isExpanded = expandedClientId === clientId;

                const locationStr = [
                  client.address,
                  [client.city, client.state].filter(Boolean).join(', '),
                  client.pincode,
                ].filter(Boolean).join(', ');

                return (
                  <div key={idx} className="p-5 transition-colors hover:bg-slate-50/40 border-b border-slate-100 last:border-b-0 space-y-3">
                    {/* Top Row: Client Name + Badges on Left, Actions on Right */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          size="md"
                          color="blue"
                          initials={client.name.slice(0, 2).toUpperCase()}
                          className="shrink-0 font-bold shadow-2xs"
                        />
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 tracking-tight">{client.name}</h3>
                          <Badge color="neutral">{isUS ? (client.ein || client.resaleCertificate ? 'Commercial B2B' : 'Consumer / POS') : (client.gstin ? 'B2B GST' : 'Consumer / POS')}</Badge>
                          {metrics.balanceDue > 0 ? (
                            <Chip color="rose" variant="caption" className="inline-flex items-center gap-1 font-mono font-medium">
                              <StatusDot color="yellow" />
                              {formatCurrency(metrics.balanceDue, currencySymbol)} Due
                            </Chip>
                          ) : metrics.invoiceCount > 0 ? (
                            <Chip color="lime" variant="caption" className="inline-flex items-center gap-1 font-mono font-medium">
                              <StatusDot color="green" />
                              Settled
                            </Chip>
                          ) : null}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-center shrink-0 flex-wrap">
                        {/* View Invoices Ledger Toggle */}
                        <Button
                          size="small"
                          variant="secondary"
                          trailingIcon={isExpanded ? RiArrowUpSLine : RiArrowDownSLine}
                          onClick={() => {
                            haptics.selection();
                            setExpandedClientId(isExpanded ? null : clientId);
                          }}
                          className="text-xs font-semibold min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          Invoices ({metrics.invoiceCount})
                        </Button>

                        {/* Generate Monthly Bill Button */}
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiCalendarLine}
                          onClick={() => {
                            haptics.light();
                            handleOpenMonthlyModal(client);
                          }}
                          title="Generate a consolidated monthly bill for this client"
                          className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          Monthly Bill
                        </Button>

                        {/* Quick Daily Bill Button */}
                        <Button
                          size="small"
                          variant="primary"
                          leadingIcon={RiAddLine}
                          onClick={() => {
                            haptics.light();
                            handleCreateDailyBill(client);
                          }}
                          title="Create a regular daily invoice for this client"
                          className="text-xs font-semibold shadow-xs min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          New Bill
                        </Button>

                        {/* Edit Client Button */}
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiEditLine}
                          onClick={() => {
                            haptics.light();
                            handleStartEdit(client);
                          }}
                          title="Edit Client"
                          className="text-xs font-semibold min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          Edit
                        </Button>

                        {/* Delete Client Button */}
                        <IconButton
                          icon={RiDeleteBinLine}
                          size="small"
                          aria-label={`Delete ${client.name}`}
                          title={`Delete ${client.name}`}
                          onClick={() => {
                            haptics.light();
                            setDeletingClient(client);
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 touch-target-48"
                        />
                      </div>
                    </div>

                    {/* Middle Row: Contact & Business Metadata Strip */}
                    <div className="bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/70 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-sans text-slate-400 font-medium">{isUS ? 'Tax ID / EIN:' : 'GSTIN:'}</span>
                        <strong className="text-slate-800">{isUS ? (client.ein || client.gstin || 'None') : (client.gstin || 'None (Unregistered)')}</strong>
                      </div>

                      {locationStr && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div className="flex items-center gap-1 text-slate-600">
                            <RiMapPinLine className="size-3.5 text-slate-400 shrink-0" />
                            <span>{locationStr}</span>
                          </div>
                        </>
                      )}

                      {client.phone && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div className="flex items-center gap-1 text-slate-600">
                            <RiPhoneLine className="size-3.5 text-slate-400 shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        </>
                      )}

                      {client.email && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div className="flex items-center gap-1 text-slate-600">
                            <RiMailLine className="size-3.5 text-slate-400 shrink-0" />
                            <span>{client.email}</span>
                          </div>
                        </>
                      )}

                      {/* Preferred Template Selector with Controlled Width */}
                      <div className="flex items-center gap-1.5 sm:ml-auto">
                        <label htmlFor={`client-theme-select-${clientId}`} className="text-[11px] font-sans text-slate-400 font-medium whitespace-nowrap">
                          Template:
                        </label>
                        <select
                          id={`client-theme-select-${clientId}`}
                          value={assignedThemeId}
                          onChange={(e) => handleThemeChange(clientId, client.name, e.target.value)}
                          className={`text-xs max-w-[190px] truncate px-2 py-0.5 rounded-lg border font-sans font-medium outline-none transition-colors cursor-pointer ${
                            assignedThemeId
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-semibold'
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
                    </div>

                    {/* Bottom Row: Financial Summary & Bought Items */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                          <span className="text-[11px] font-sans text-slate-400">Total Billed:</span>
                          <strong className="text-slate-900 font-semibold">{formatCurrency(metrics.totalBilled, currencySymbol)}</strong>
                        </div>

                        <span className="text-slate-300">•</span>

                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-[11px] font-sans text-slate-400">Balance:</span>
                          <strong className={metrics.balanceDue > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                            {metrics.balanceDue > 0 ? formatCurrency(metrics.balanceDue, currencySymbol) : 'Nil'}
                          </strong>
                        </div>

                        {metrics.latestInvoiceDate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <RiCalendarLine className="size-3.5 text-blue-500 shrink-0" />
                              <span>Last Billed: {formatDate(metrics.latestInvoiceDate)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Items Bought Chips */}
                      {metrics.itemsSummary.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <RiShoppingBagLine className="size-3 shrink-0" />
                            Items Bought:
                          </span>
                          {metrics.itemsSummary.slice(0, 4).map((it, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-mono truncate max-w-[140px]"
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
                            {clientInvs.length > 0 && (
                              <Button
                                size="small"
                                variant="secondary"
                                leadingIcon={RiFileExcel2Line}
                                onClick={() => handleExportClientLedgerExcel(client.name, clientInvs)}
                                className="text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70"
                              >
                                Export Excel
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="secondary"
                              leadingIcon={RiCalendarLine}
                              onClick={() => handleOpenMonthlyModal(client)}
                              className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
                            >
                              Monthly Bill
                            </Button>
                            <Button
                              size="small"
                              variant="primary"
                              leadingIcon={RiAddLine}
                              onClick={() => handleCreateDailyBill(client)}
                              className="text-xs font-semibold shadow-xs"
                            >
                              Daily Bill
                            </Button>
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
                          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs [scrollbar-width:thin]">
                            <table className="w-full min-w-[680px] text-left text-xs">
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
                                          <Chip color="blue" variant="caption" className="inline-flex items-center gap-1 font-medium">
                                            <RiCalendarLine className="size-3" />
                                            Monthly {inv.data.billingPeriod ? `• ${inv.data.billingPeriod}` : ''}
                                          </Chip>
                                        ) : (
                                          <Chip color="neutral" variant="caption">
                                            Daily
                                          </Chip>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-sans text-xs">
                                        <div className="line-clamp-2" title={itemsText}>
                                          {inv.data.items.map((it, idx2) => (
                                            <span key={idx2} className="inline-block mr-2">
                                              <strong className="text-slate-800">{it.description}</strong>
                                              <span className="text-slate-500 ml-1">
                                                ({it.quantity} {it.unit} @ {inv.data?.currencySymbol || currencySymbol}{it.rate})
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
                                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                                        {formatCurrency(inv.total, inv.data?.currencySymbol || currencySymbol)}
                                      </td>
                                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans">
                                        {inv.status === 'paid' ? (
                                          <Chip color="lime" variant="caption" className="inline-flex items-center gap-1 font-medium">
                                            <StatusDot color="green" /> Paid
                                          </Chip>
                                        ) : inv.status === 'sent' ? (
                                          <Chip color="blue" variant="caption" className="inline-flex items-center gap-1 font-medium">
                                            <StatusDot color="indigo" /> Sent
                                          </Chip>
                                        ) : inv.status === 'overdue' ? (
                                          <Chip color="rose" variant="caption" className="inline-flex items-center gap-1 font-medium">
                                            <StatusDot color="yellow" /> Overdue
                                          </Chip>
                                        ) : (
                                          <Chip color="neutral" variant="caption">
                                            Draft
                                          </Chip>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-sans">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            size="small"
                                            variant="secondary"
                                            leadingIcon={RiEditLine}
                                            onClick={() => handleOpenInvoiceInEditor(inv.id)}
                                            className="text-xs font-semibold"
                                          >
                                            Edit
                                          </Button>
                                          <IconButton
                                            icon={RiPrinterLine}
                                            size="small"
                                            aria-label="Print Invoice"
                                            title="Print Invoice"
                                            onClick={() => handlePrintInvoice(inv.id, client.name)}
                                          />
                                          <IconButton
                                            icon={RiDownload2Line}
                                            size="small"
                                            aria-label="Save as PDF"
                                            title="Save as PDF"
                                            onClick={() => handleSavePdfInvoice(inv.id, client.name)}
                                          />
                                          <IconButton
                                            icon={RiFileExcel2Line}
                                            size="small"
                                            aria-label="Export to Excel"
                                            title="Export to Excel (.xlsx)"
                                            onClick={() => handleExportExcelInvoice(inv.data)}
                                            className="text-emerald-700 hover:text-emerald-800"
                                          />
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

      {/* ─── MOBILE FLOATING ACTION BUTTON (FAB) ─── */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all touch-target-48 border border-blue-500"
        >
          <RiAddLine className="size-5" />
          <span>New Client</span>
        </button>
      </div>

      {/* ─── Add Client Modal ─── */}
      <Modal isOpen={showAddModal} onOpenChange={setShowAddModal} size="lg" className="max-h-[92vh] flex flex-col">
        <ModalHeader
          title="Add Client to Offline Directory"
          description="Register a new commercial client or retail buyer in your offline local database."
        />
        <form onSubmit={handleAddClientSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ModalBody className="min-h-0 flex-1 overflow-y-auto">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {isUS ? 'Federal EIN / Tax ID (Optional)' : 'GSTIN (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder={isUS ? 'e.g. 12-3456789' : 'e.g. 27AABCR1234F1ZX'}
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
        size="lg"
        className="max-h-[92vh] flex flex-col"
      >
        <ModalHeader
          title={`Edit Client: ${editingClient?.originalName || ''}`}
          description="Update company name, GSTIN, billing address, or contact details in your offline directory."
        />
        {editingClient && (
          <form onSubmit={handleEditClientSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ModalBody className="min-h-0 flex-1 overflow-y-auto">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {isUS ? 'Federal EIN / Tax ID (Optional)' : 'GSTIN (Optional)'}
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
                      placeholder={isUS ? 'e.g. 12-3456789' : 'e.g. 27AABCR1234F1ZX'}
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
        className="max-h-[92vh] flex flex-col"
      >
        <ModalHeader
          title="Delete Client Account"
          description="Are you sure you want to remove this client from your offline database?"
        />
        {deletingClient && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ModalBody className="min-h-0 flex-1 overflow-y-auto">
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
                  {deletingClient.gstin && <div><strong>{isUS ? 'Tax ID / EIN:' : 'GSTIN:'}</strong> {deletingClient.gstin}</div>}
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
      <ConsolidatedMonthlyModal
        isOpen={Boolean(monthlyModalClient)}
        onClose={() => setMonthlyModalClient(null)}
        initialClient={monthlyModalClient}
        onSuccess={() => {
          setMonthlyModalClient(null);
          navigate('/invoices');
        }}
      />
    </div>
  );
};

export default ClientsView;
