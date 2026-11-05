// ─── Commercial Invoice Share Modal ────────────────────────────────────
// Enables one-click sharing via Native OS Share, WhatsApp, Email, Link, or Plaintext Summary.

import React from 'react';
import type { InvoiceRenderData } from '../../types';
import { formatCurrency, formatNumber } from '../../utils';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';
import {
  RiWhatsappLine,
  RiMailLine,
  RiLink,
  RiFileCopyLine,
  RiShareForwardLine,
  RiDownload2Line,
} from '@remixicon/react';

export interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRenderData | null;
  themeId?: string;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  themeId = 'classic',
}) => {
  if (!invoice) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/print/${invoice.invoiceNumber}?theme=${themeId}&auto=true`;

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // ── Handlers ──

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      toast.info('Native share not supported on this browser. Use WhatsApp or Link.');
      return;
    }

    try {
      await navigator.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        text: `Commercial Invoice ${invoice.invoiceNumber} for ${formatCurrency(
          invoice.grandTotalRounded,
          invoice.currencySymbol
        )} from ${invoice.business.name}`,
        url: shareUrl,
      });
      toast.success('Invoice shared successfully');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing was cancelled or failed');
      }
    }
  };

  const handleWhatsAppShare = () => {
    const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
    const clientPhone = (invoice.client.phone || '').replace(/[^0-9]/g, '');

    const lines: string[] = [
      `🧾 *INVOICE: ${invoice.invoiceNumber}*`,
      `*From:* ${invoice.business.name}`,
      `*To:* ${invoice.client.name}`,
      `*Date:* ${invoice.invoiceDate}`,
      `*Grand Total:* ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
      `*Status:* ${isPaid ? '✅ Paid / Settled' : '⏳ Payment Due: ' + invoice.currencySymbol + formatNumber(invoice.balanceDue)}`,
    ];

    if (!isPaid && invoice.bankDetails?.upiId) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(invoice.bankDetails.upiId)}&pn=${encodeURIComponent(
        invoice.business.name
      )}&am=${invoice.balanceDue.toFixed(2)}&cu=INR`;
      lines.push(`*Pay via UPI:* ${upiUrl}`);
    }

    lines.push('');
    lines.push('*View & Print Invoice:*');
    lines.push(shareUrl);

    const message = lines.join('\n');
    const waBase = clientPhone
      ? `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waBase, '_blank');
    toast.info('Opening WhatsApp...');
  };

  const handleEmailShare = () => {
    const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
    const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.business.name}`;

    const bodyLines: string[] = [
      `Dear ${invoice.client.name},`,
      '',
      `Please find the invoice details for ${invoice.invoiceNumber} below:`,
      '',
      `Invoice Number: ${invoice.invoiceNumber}`,
      `Invoice Date: ${invoice.invoiceDate}`,
      `Total Amount: ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
      `Status: ${isPaid ? 'Settled / Paid' : 'Payment Due: ' + invoice.currencySymbol + formatNumber(invoice.balanceDue)}`,
      '',
      'Items Summary:',
      ...invoice.items.map(
        (it) => `• ${it.description} — Qty ${it.quantity} ${it.unit} @ ${invoice.currencySymbol}${formatNumber(it.rate)} = ${invoice.currencySymbol}${formatNumber(it.total)}`
      ),
      '',
      `Subtotal: ${invoice.currencySymbol}${formatNumber(invoice.subtotal)}`,
      `Tax (GST): ${invoice.currencySymbol}${formatNumber(invoice.totalTax)}`,
      `Grand Total: ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
    ];

    if (!isPaid && invoice.bankDetails?.bankName) {
      bodyLines.push('');
      bodyLines.push('Bank Remittance Details:');
      bodyLines.push(`Bank Name: ${invoice.bankDetails.bankName}`);
      bodyLines.push(`Account Name: ${invoice.bankDetails.accountName}`);
      bodyLines.push(`Account Number: ${invoice.bankDetails.accountNumber}`);
      bodyLines.push(`IFSC Code: ${invoice.bankDetails.ifsc}`);
      if (invoice.bankDetails.upiId) {
        bodyLines.push(`UPI ID: ${invoice.bankDetails.upiId}`);
      }
    }

    bodyLines.push('');
    bodyLines.push(`View or print your full invoice here:\n${shareUrl}`);
    bodyLines.push('');
    bodyLines.push(`Thank you for your business,\n${invoice.business.name}`);

    const mailto = `mailto:${encodeURIComponent(invoice.client.email || '')}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    window.location.href = mailto;
    toast.info('Opening mail composer...');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Printable invoice link copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleCopySummary = async () => {
    const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
    const text = [
      `INVOICE: ${invoice.invoiceNumber}`,
      `From: ${invoice.business.name}`,
      `To: ${invoice.client.name}`,
      `Date: ${invoice.invoiceDate}`,
      `Total: ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
      `Status: ${isPaid ? 'PAID' : 'DUE (' + invoice.currencySymbol + formatNumber(invoice.balanceDue) + ')'}`,
      `Link: ${shareUrl}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Invoice text summary copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleDownloadJson = () => {
    const dataStr = JSON.stringify(invoice, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded invoice-${invoice.invoiceNumber}.json`);
  };

  const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalHeader
        title="Share Invoice"
        description={`Send or copy invoice ${invoice.invoiceNumber} for ${invoice.client.name}`}
      />
      <ModalBody>
        <div className="space-y-4 pt-1">
          {/* Invoice Snapshot Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">
                  {invoice.invoiceNumber}
                </span>
                {isPaid ? (
                  <Chip color="lime" variant="caption">
                    Paid
                  </Chip>
                ) : (
                  <Chip color="rose" variant="caption">
                    Due: {formatCurrency(invoice.balanceDue, invoice.currencySymbol)}
                  </Chip>
                )}
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                <strong>{invoice.client.name}</strong> • {invoice.invoiceDate}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold font-mono text-slate-900">
                {formatCurrency(invoice.grandTotalRounded, invoice.currencySymbol)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Grand Total</span>
            </div>
          </div>

          {/* Quick Share Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 transition-colors text-left group cursor-pointer"
            >
              <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <RiWhatsappLine className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-950 group-hover:text-emerald-800">
                  Share on WhatsApp
                </div>
                <div className="text-[11px] text-emerald-700/80 truncate">
                  Send formatted message &amp; UPI
                </div>
              </div>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={handleEmailShare}
              className="flex items-center gap-3 p-3 rounded-xl border border-blue-200/90 bg-blue-50/50 hover:bg-blue-100/60 text-blue-900 transition-colors text-left group cursor-pointer"
            >
              <div className="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <RiMailLine className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-blue-950 group-hover:text-blue-800">
                  Send via Email
                </div>
                <div className="text-[11px] text-blue-700/80 truncate">
                  Pre-fills client email &amp; items
                </div>
              </div>
            </button>

            {/* Native OS Share (if supported) */}
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 transition-colors text-left group cursor-pointer sm:col-span-2"
              >
                <div className="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <RiShareForwardLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    System Share Sheet
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Share directly through Windows apps, Nearby Share, or AirDrop
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Copyable Link Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Printable Invoice Link
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 select-all outline-none"
              />
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiLink}
                onClick={handleCopyLink}
                className="text-xs shrink-0 font-semibold"
              >
                Copy Link
              </Button>
            </div>
          </div>

          {/* Additional Export Options */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleCopySummary}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <RiFileCopyLine className="size-3.5" />
              Copy Plaintext Summary
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RiDownload2Line className="size-3.5" />
              Download JSON Data
            </button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="small" onClick={onClose} className="text-xs">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
