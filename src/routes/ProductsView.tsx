import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices, getTodayLocalDateString } from '../context/InvoiceContext';
import { useTheme } from '../context/ThemeContext';
import {
  formatCurrency,
  US_TAX_PRESETS,
  US_UNITS,
  IN_UNITS,
  IN_GST_RATES,
  productToLineItem,
} from '../utils';
import { useNativeBackButton } from '../hooks/useNativeBackButton';
import { haptics } from '../services/nativeMobileService';
import type { ProductItem } from '../types';

// BoardUI Components
import { Badge } from '@/components/base/badges/badge';
import { Chip } from '@/components/base/badges/chip';
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
  RiBox3Line,
  RiInformationLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiAlertLine,
  RiPriceTag3Line,
  RiStackLine,
  RiCoinsFill,
  RiPercentLine,
} from '@remixicon/react';

interface ProductFormState {
  name: string;
  description: string;
  category: string;
  code: string;
  unit: string;
  defaultQuantity: string;
  rate: string;
  discount: string;
  gstRate: string;
}

function createEmptyForm(isUS: boolean): ProductFormState {
  return {
    name: '',
    description: '',
    category: '',
    code: '',
    unit: isUS ? 'ea' : 'Nos',
    defaultQuantity: '1',
    rate: '',
    discount: '',
    gstRate: isUS ? '7.25' : '18',
  };
}

function productToFormState(product: ProductItem, isUS: boolean): ProductFormState {
  return {
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    code: isUS ? (product.sku || product.hsnSac || '') : (product.hsnSac || product.sku || ''),
    unit: product.unit || (isUS ? 'ea' : 'Nos'),
    defaultQuantity: String(product.defaultQuantity && product.defaultQuantity > 0 ? product.defaultQuantity : 1),
    rate: String(product.rate ?? 0),
    discount: product.discount ? String(product.discount) : '',
    gstRate: String(product.gstRate ?? (isUS ? 7.25 : 18)),
  };
}

export const ProductsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentThemeId } = useTheme();
  const {
    products,
    businessProfile,
    saveProduct,
    updateProduct,
    deleteProduct,
    createInvoice,
    setActiveInvoiceId,
  } = useInvoices();

  const isUS =
    businessProfile?.region === 'US' ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_REGION === 'US');
  const currencySymbol = isUS ? '$' : '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add / Edit Product Modal State (unified modal to keep form logic single-source)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(() => createEmptyForm(isUS));

  // Delete Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);

  // Android Hardware Back Button Handling
  const hasActiveModal = Boolean(isFormModalOpen || deletingProduct);
  useNativeBackButton(
    'products-view-modals',
    () => {
      if (deletingProduct) {
        setDeletingProduct(null);
        return true;
      }
      if (isFormModalOpen) {
        setIsFormModalOpen(false);
        return true;
      }
      return false;
    },
    hasActiveModal,
    200
  );

  // Derived catalog metrics
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const averageRate = useMemo(() => {
    if (products.length === 0) return 0;
    const sum = products.reduce((s, p) => s + (Number(p.rate) || 0), 0);
    return sum / products.length;
  }, [products]);

  const taxableCount = useMemo(() => {
    return products.filter((p) => (Number(p.gstRate) || 0) > 0).length;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        categoryFilter === 'all' || (p.category || '').trim().toLowerCase() === categoryFilter.toLowerCase();
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.hsnSac || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.unit || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, categoryFilter]);

  const openAddModal = () => {
    haptics.light();
    setEditingProductId(null);
    setFormState(createEmptyForm(isUS));
    setIsFormModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    haptics.light();
    setEditingProductId(product.id);
    setFormState(productToFormState(product, isUS));
    setIsFormModalOpen(true);
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      toast.error('Product name is required');
      return;
    }

    const rateVal = formState.rate.trim() === '' ? 0 : Math.max(0, Number(formState.rate));
    if (Number.isNaN(rateVal)) {
      toast.error('Please enter a valid unit rate');
      return;
    }

    const qtyVal = formState.defaultQuantity.trim() === '' ? 1 : Math.max(0.01, Number(formState.defaultQuantity) || 1);
    const discountVal = formState.discount.trim() === '' ? 0 : Math.min(100, Math.max(0, Number(formState.discount) || 0));
    const gstVal = formState.gstRate.trim() === '' ? 0 : Math.max(0, Number(formState.gstRate) || 0);
    const trimmedCode = formState.code.trim();

    const payload = {
      name: trimmedName,
      description: formState.description.trim() || undefined,
      category: formState.category.trim() || undefined,
      hsnSac: isUS ? undefined : (trimmedCode || undefined),
      sku: isUS ? (trimmedCode || undefined) : undefined,
      unit: formState.unit.trim() || (isUS ? 'ea' : 'Nos'),
      defaultQuantity: qtyVal,
      rate: rateVal,
      discount: discountVal > 0 ? discountVal : undefined,
      gstRate: gstVal,
      taxable: gstVal > 0,
    };

    if (editingProductId) {
      updateProduct(editingProductId, payload);
      toast.success(`Updated "${trimmedName}" in product catalog`);
    } else {
      saveProduct(payload);
      toast.success(`Added "${trimmedName}" to product catalog`);
    }

    setIsFormModalOpen(false);
    setEditingProductId(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    const productName = deletingProduct.name;
    deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
    toast.info(`Product "${productName}" removed from catalog`);
  };

  const handleQuickCreateInvoiceWithProduct = (product: ProductItem) => {
    haptics.light();
    const today = getTodayLocalDateString();
    const initialLineItem = productToLineItem(product, {
      isUS,
      sno: 1,
      id: `item-${Date.now()}-1`,
      date: today,
    });
    const created = createInvoice({
      type: 'goods',
      invoiceType: 'daily',
      themeId: currentThemeId,
      initialItems: [initialLineItem],
    });
    setActiveInvoiceId(created.id);
    navigate('/invoices');
    toast.success(`Created ${created.invoiceNumber} with "${product.name}"`);
  };

  const unitOptions = isUS ? US_UNITS : IN_UNITS;
  const hasCustomUnit =
    formState.unit.trim().length > 0 &&
    !unitOptions.some((u) => u.value === formState.unit.trim());

  const parsedGstRate = Number(formState.gstRate);
  const hasCustomTaxRate = isUS
    ? !US_TAX_PRESETS.some((p) => p.rate === parsedGstRate)
    : !IN_GST_RATES.includes(parsedGstRate as (typeof IN_GST_RATES)[number]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-28 sm:pb-6 lg:pb-8">
      <datalist id="product-categories-list">
        <option value="Hardware" />
        <option value="Software" />
        <option value="Services" />
        <option value="Materials" />
        <option value="Retail" />
        <option value="Consulting" />
        <option value="Maintenance" />
      </datalist>

      <div className="max-w-5xl mx-auto w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <img src="/app-icon.png" alt="Invoice Gen" className="size-6 sm:size-7 object-contain shrink-0 hidden sm:block" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Products &amp; Service Catalog
              </h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl text-pretty hidden sm:block">
              Save product names, HSN/SAC or SKU codes, units, rates, and tax slabs for instant one-click loading in Invoices.
            </p>
          </div>

          <Button
            size="small"
            variant="primary"
            leadingIcon={RiAddLine}
            onClick={openAddModal}
            className="text-xs shadow-xs hidden sm:inline-flex shrink-0"
          >
            Add Product
          </Button>
        </div>

        {/* Stat Cards */}
        <StatCards
          variant="plain"
          columns={4}
          stats={[
            {
              icon: RiBox3Line,
              label: 'Total Products',
              value: String(products.length),
              delta: 'Saved catalog',
              deltaColor: 'neutral',
            },
            {
              icon: RiStackLine,
              label: 'Categories',
              value: String(categories.length),
              delta: categories.length > 0 ? 'Organized' : 'Optional tags',
              deltaColor: 'neutral',
            },
            {
              icon: RiCoinsFill,
              label: 'Average Unit Rate',
              value: formatCurrency(averageRate, currencySymbol),
              delta: 'Catalog avg',
              deltaColor: 'lime',
            },
            {
              icon: RiPercentLine,
              label: 'Taxable Items',
              value: String(taxableCount),
              delta: isUS ? 'Sales tax > 0%' : 'GST > 0%',
              deltaColor: 'neutral',
            },
          ]}
        />

        {/* Info Banner */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
          <RiInformationLine className="size-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">
              One-Click Product Loading in Invoices:
            </span>
            <p>
              Add your products or services below with their unit rates, {isUS ? 'SKU codes, and Sales Tax' : 'HSN/SAC codes, and GST rates'}.
              Inside any invoice, click the <strong>&quot;Select the Product&quot;</strong> dropdown to automatically fill and add the product details.
            </p>
          </div>
        </div>

        {/* Catalog Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
              <div className="w-full sm:w-72">
                <SearchField
                  aria-label="Filter product catalog"
                  placeholder={isUS ? 'Search products, SKU, category or unit...' : 'Search products, HSN/SAC, category or unit...'}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  size="small"
                />
              </div>

              {categories.length > 0 && (
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              Showing {filteredProducts.length} of {products.length} products
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <RiBox3Line className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No products found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No products match your current search or category filter.'
                    : 'Your product catalog is empty. Click "Add Product" to save your first item or service.'}
                </p>
                {searchQuery || categoryFilter !== 'all' ? (
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="primary"
                    leadingIcon={RiAddLine}
                    onClick={openAddModal}
                    className="mt-4 text-xs font-semibold"
                  >
                    Add First Product
                  </Button>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const codeLabel = isUS
                  ? (product.sku || product.hsnSac)
                  : (product.hsnSac || product.sku);

                return (
                  <div
                    key={product.id}
                    className="p-4 sm:p-5 transition-colors hover:bg-slate-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <Avatar
                          size="md"
                          color="blue"
                          initials={product.name.slice(0, 2).toUpperCase()}
                          className="shrink-0 font-bold shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 tracking-tight">
                              {product.name}
                            </h3>
                            {product.category && (
                              <Badge color="neutral">{product.category}</Badge>
                            )}
                            <Chip
                              color={product.gstRate > 0 ? 'blue' : 'neutral'}
                              variant="caption"
                              className="font-mono font-medium"
                            >
                              {product.gstRate}% {isUS ? 'Tax' : 'GST'}
                            </Chip>
                            {product.discount && product.discount > 0 ? (
                              <Chip color="rose" variant="caption" className="font-mono font-medium">
                                {product.discount}% Off
                              </Chip>
                            ) : null}
                          </div>
                          {product.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-center shrink-0 flex-wrap">
                        <Button
                          size="small"
                          variant="primary"
                          leadingIcon={RiAddLine}
                          onClick={() => handleQuickCreateInvoiceWithProduct(product)}
                          title="Create a new daily invoice with this product"
                          className="text-xs font-semibold shadow-xs min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          New Bill
                        </Button>

                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiEditLine}
                          onClick={() => openEditModal(product)}
                          title="Edit Product"
                          className="text-xs font-semibold min-h-[36px] sm:min-h-0 touch-target-48"
                        >
                          Edit
                        </Button>

                        <IconButton
                          icon={RiDeleteBinLine}
                          size="small"
                          aria-label={`Delete ${product.name}`}
                          title={`Delete ${product.name}`}
                          onClick={() => {
                            haptics.light();
                            setDeletingProduct(product);
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 touch-target-48"
                        />
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/70 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 font-mono">
                      <div className="flex items-center gap-1.5">
                        <RiPriceTag3Line className="size-3.5 text-blue-600 shrink-0" />
                        <span className="text-[11px] font-sans text-slate-400 font-medium">Rate:</span>
                        <strong className="text-slate-900 font-bold">
                          {formatCurrency(product.rate, currencySymbol)}
                        </strong>
                        <span className="text-slate-400">/ {product.unit}</span>
                      </div>

                      <span className="text-slate-300 hidden sm:inline">•</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-sans text-slate-400 font-medium">
                          {isUS ? 'SKU:' : 'HSN/SAC:'}
                        </span>
                        <strong className="text-slate-800">{codeLabel || '—'}</strong>
                      </div>

                      <span className="text-slate-300 hidden sm:inline">•</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-sans text-slate-400 font-medium">Default Qty:</span>
                        <strong className="text-slate-800">
                          {product.defaultQuantity || 1} {product.unit}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-30 sm:hidden">
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-full shadow-lg shadow-blue-500/25 active:scale-95 transition-all touch-target-48 border border-blue-500"
        >
          <RiAddLine className="size-5" />
          <span>New Product</span>
        </button>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open);
          if (!open) setEditingProductId(null);
        }}
        size="lg"
        className="max-h-[92vh] flex flex-col"
      >
        <ModalHeader
          title={editingProductId ? `Edit Product: ${formState.name || ''}` : 'Add Product to Catalog'}
          description="Save reusable product or service details to load automatically inside invoices."
        />
        <form onSubmit={handleSubmitProduct} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ModalBody className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label htmlFor="product-name-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Product / Service Name *
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isUS ? 'e.g. Cloud Backup Retainer' : 'e.g. Cisco 24-Port Gigabit Switch'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-semibold outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="product-desc-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Details / Specifications (Optional)
                </label>
                <textarea
                  id="product-desc-input"
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Managed PoE+ Layer-2 Switch with 3-Year OEM Warranty"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="product-category-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Category (Optional)
                </label>
                <input
                  id="product-category-input"
                  type="text"
                  list="product-categories-list"
                  value={formState.category}
                  onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Hardware, Services, Materials"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="product-code-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {isUS ? 'SKU / Item Code' : 'HSN / SAC Code'}
                  </label>
                  <input
                    id="product-code-input"
                    type="text"
                    value={formState.code}
                    onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder={isUS ? 'e.g. SKU-1042' : 'e.g. 851762'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-mono outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="product-unit-select" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    id="product-unit-select"
                    value={formState.unit}
                    onChange={(e) => setFormState((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {unitOptions.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                    {hasCustomUnit && (
                      <option value={formState.unit}>{formState.unit}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="product-qty-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Default Quantity
                  </label>
                  <input
                    id="product-qty-input"
                    type="number"
                    min="0.01"
                    step="any"
                    value={formState.defaultQuantity}
                    onChange={(e) => setFormState((prev) => ({ ...prev, defaultQuantity: e.target.value }))}
                    placeholder="1"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-semibold outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="product-rate-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unit Rate ({currencySymbol}) *
                  </label>
                  <input
                    id="product-rate-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.rate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, rate: e.target.value }))}
                    placeholder={isUS ? '150.00' : '2500'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="product-discount-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Default Discount %
                  </label>
                  <input
                    id="product-discount-input"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={formState.discount}
                    onChange={(e) => setFormState((prev) => ({ ...prev, discount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-rose-600 font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="product-tax-select" className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {isUS ? 'Sales Tax Rate' : 'GST Rate'}
                  </label>
                  <select
                    id="product-tax-select"
                    value={formState.gstRate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, gstRate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-blue-700 font-semibold outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {isUS ? (
                      US_TAX_PRESETS.map((p) => (
                        <option key={p.rate} value={String(p.rate)}>
                          {p.label}
                        </option>
                      ))
                    ) : (
                      IN_GST_RATES.map((rate) => (
                        <option key={rate} value={String(rate)}>
                          {rate === 0 ? '0% (Nil)' : `${rate}%`}
                        </option>
                      ))
                    )}
                    {hasCustomTaxRate && !Number.isNaN(parsedGstRate) && (
                      <option value={String(parsedGstRate)}>{parsedGstRate}%</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingProductId(null);
              }}
            >
              Cancel
            </Button>
            <Button size="small" variant="primary" type="submit">
              {editingProductId ? 'Save Changes' : 'Save Product'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingProduct)}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null);
        }}
        className="max-h-[92vh] flex flex-col"
      >
        <ModalHeader
          title="Delete Product"
          description="Are you sure you want to remove this product from your catalog?"
        />
        {deletingProduct && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ModalBody className="min-h-0 flex-1 overflow-y-auto">
              <div className="py-2 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <RiAlertLine className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-rose-950">
                      Permanently remove &ldquo;{deletingProduct.name}&rdquo;?
                    </p>
                    <p className="text-rose-700">
                      This will remove the item from your reusable Product Catalog and dropdown menu.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-mono text-slate-600">
                  <div><strong>Name:</strong> {deletingProduct.name}</div>
                  <div>
                    <strong>Rate:</strong> {formatCurrency(deletingProduct.rate, currencySymbol)} / {deletingProduct.unit}
                  </div>
                  {(deletingProduct.hsnSac || deletingProduct.sku) && (
                    <div>
                      <strong>{isUS ? 'SKU:' : 'HSN/SAC:'}</strong> {deletingProduct.sku || deletingProduct.hsnSac}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  * Note: Invoices previously generated with this product will keep their recorded line items intact.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setDeletingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                leadingIcon={RiDeleteBinLine}
                onClick={handleConfirmDelete}
              >
                Delete Product
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductsView;
