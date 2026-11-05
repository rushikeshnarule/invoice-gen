import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useInvoices } from '../context/InvoiceContext';
import { getAllThemes, getTheme } from '../themes';
import { getClientId } from '../utils';
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
} from '@remixicon/react';

export const ClientsView: React.FC = () => {
  const { currentThemeId, clientDefaults, setClientDefault } = useTheme();
  const { clients, saveClient, updateClient, deleteClient } = useInvoices();
  const themes = getAllThemes();
  const activeDefaultTheme = getTheme(currentThemeId);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Clients
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {clients.length} accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Directory and invoice template routing. Manage client details, update contact info, or delete accounts.
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

        {/* Info Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
          <RiInformationLine className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">
              Client Management &amp; Template Routing:
            </span>
            <p>
              Invoices auto-fill party details from this directory. You can edit any client profile or remove accounts anytime.
              Preferred invoice designs (e.g. POS Thermal 80mm for retail buyers or Elegant for corporate clients) will automatically activate whenever you create an invoice for them.
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
                const assignedTheme = assignedThemeId ? getTheme(assignedThemeId) : null;

                return (
                  <div key={idx} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="size-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                        <RiBuildingLine className="size-5 text-slate-700" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{client.name}</span>
                          <Badge color="neutral">{client.gstin ? 'B2B GST' : 'Consumer / POS'}</Badge>
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
                        </div>

                        {client.address && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {client.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <label htmlFor={`client-theme-select-${clientId}`} className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Preferred Template:
                        </label>
                        <select
                          id={`client-theme-select-${clientId}`}
                          value={assignedThemeId}
                          onChange={(e) => handleThemeChange(clientId, client.name, e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold outline-none transition-colors cursor-pointer ${
                            assignedThemeId
                              ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <option value="">Default ({activeDefaultTheme.name})</option>
                          {themes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.paper.join('/')})
                            </option>
                          ))}
                        </select>
                      </div>

                      {assignedTheme && (
                        <Badge color="primary" className="self-end mb-0.5">
                          {assignedTheme.paper.join('/')}
                        </Badge>
                      )}

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
    </div>
  );
};

export default ClientsView;
