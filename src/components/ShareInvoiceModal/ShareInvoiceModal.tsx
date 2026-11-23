// ─── Commercial Invoice Share Modal ────────────────────────────────────
// Enables one-click sharing via Native OS Share, PDF Document, WhatsApp, Email, Link, or Summary.

import React, { useState } from 'react';
import type { InvoiceRenderData } from '../../types';
import { formatCurrency, formatNumber, exportInvoiceToExcel } from '../../utils';
import { generateInvoicePdf } from '../../services/pdfGeneratorService';
import { exportAndSaveFile } from '../../services/fileExportService';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { toast } from '@/components/base/toast/toast';
import { Capacitor } from '@capacitor/core';
import { useNativeBackButton } from '../../hooks/useNativeBackButton';
import { haptics } from '../../services/nativeMobileService';
import {
  RiWhatsappLine,
  RiMailLine,
  RiLink,
  RiFileCopyLine,
  RiShareForwardLine,
  RiDownload2Line,
  RiFileExcel2Line,
  RiFilePdf2Line,
  RiLoader4Line,
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Close share modal on Android hardware back button
  useNativeBackButton(
    'share-invoice-modal',
    () => {
      onClose();
      return true;
    },
    isOpen,
    250
  );

  if (!invoice) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/print/${encodeURIComponent(invoice.invoiceNumber)}?theme=${encodeURIComponent(themeId)}&auto=true`;

  const isLocalEnvironment =
    Capacitor.isNativePlatform() ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('file:') ||
    origin.startsWith('capacitor:');

  const canNativeShare =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  const isUS = invoice.region === 'US' || invoice.currencySymbol === '$';

  // ── Handlers ──

  // Direct High-Resolution Vector PDF Generation & Native Share
  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    haptics.selection();
    try {
      const cleanNum = (invoice.invoiceNumber || 'INV-001').trim().replace(/[\\/:*?"<>|]/g, '-');
      const fileName = `Invoice-${cleanNum}.pdf`;

      // Pure vector PDF generation - 100% deterministic, instant, zero DOM
      const { buffer } = generateInvoicePdf(invoice);

      await exportAndSaveFile({
        fileName,
        data: buffer,
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoice.invoiceNumber} PDF`,
        successMessage: `Saved PDF to Documents: ${fileName}`,
      });
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error(`Could not generate PDF: ${err?.message || err}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleNativeShare = async () => {
    haptics.light();
    try {
      // On native mobile devices, share the actual PDF document file
      if (Capacitor.isNativePlatform()) {
        await handleSharePdf();
        return;
      }

      // On desktop / web browsers with Web Share API
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        if (!isLocalEnvironment) {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Commercial Invoice ${invoice.invoiceNumber} for ${formatCurrency(
              invoice.grandTotalRounded,
              invoice.currencySymbol
            )} from ${invoice.business.name}`,
            url: shareUrl,
          });
          toast.success('Invoice shared successfully');
        } else {
          await handleSharePdf();
        }
        return;
      }

      toast.info('Native share not supported on this browser. Use WhatsApp or Download PDF.');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing was cancelled or failed');
      }
    }
  };

  const handleWhatsAppShare = async () => {
    haptics.selection();

    // On native mobile devices (Android / iOS), share the actual PDF document file directly.
    // This allows the user to select WhatsApp (or any contact) and send the authentic PDF document.
    if (Capacitor.isNativePlatform()) {
      await handleSharePdf();
      return;
    }

    const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
    const clientPhone = (invoice.client.phone || '').replace(/[^0-9]/g, '');

    const lines: string[] = [
      `*INVOICE: ${invoice.invoiceNumber}*`,
      `*From:* ${invoice.business.name}`,
      `*To:* ${invoice.client.name}`,
      `*Date:* ${invoice.invoiceDate}`,
      `*Grand Total:* ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
      `*Status:* ${isPaid ? 'Paid / Settled' : 'Payment Due: ' + invoice.currencySymbol + formatNumber(invoice.balanceDue)}`,
    ];

    if (!isPaid) {
      if (isUS) {
        if (invoice.bankDetails?.upiId) {
          lines.push(`*Pay via Zelle / Electronic:* ${invoice.bankDetails.upiId}`);
        } else if (invoice.bankDetails?.accountNumber) {
          lines.push(`*Remittance Account:* ${invoice.bankDetails.accountNumber} (Routing: ${invoice.bankDetails.routingNumber || ''})`);
        }
      } else if (invoice.bankDetails?.upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(invoice.bankDetails.upiId)}&pn=${encodeURIComponent(
          invoice.business.name
        )}&am=${invoice.balanceDue.toFixed(2)}&cu=INR`;
        lines.push(`*Pay via UPI:* ${upiUrl}`);
      }
    }

    lines.push('');
    lines.push('*Items Summary:*');
    invoice.items.slice(0, 5).forEach((item) => {
      lines.push(`• ${item.description}: ${invoice.currencySymbol}${formatNumber(item.total)}`);
    });
    if (invoice.items.length > 5) {
      lines.push(`• ... and ${invoice.items.length - 5} more items`);
    }

    if (!isLocalEnvironment) {
      lines.push('');
      lines.push('*View & Print Invoice:*');
      lines.push(shareUrl);
    } else {
      lines.push('');
      lines.push('Thank you for your business!');
    }

    const message = lines.join('\n');
    const waBase = clientPhone
      ? `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waBase, '_blank', 'noopener,noreferrer');
    toast.info('Opening WhatsApp...');
  };

  const handleEmailShare = () => {
    haptics.selection();
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
      `${isUS ? 'Sales Tax' : 'Tax (GST)'}: ${invoice.currencySymbol}${formatNumber(invoice.totalTax)}`,
      `Grand Total: ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
    ];

    if (!isPaid && (invoice.bankDetails?.bankName || invoice.bankDetails?.accountNumber || invoice.bankDetails?.routingNumber || invoice.bankDetails?.upiId)) {
      bodyLines.push('');
      bodyLines.push(isUS ? 'Remittance / Payment Details:' : 'Bank Remittance Details:');
      if (invoice.bankDetails.bankName) bodyLines.push(`Bank Name: ${invoice.bankDetails.bankName}`);
      if (invoice.bankDetails.accountName) bodyLines.push(`Account Name: ${invoice.bankDetails.accountName}`);
      if (invoice.bankDetails.accountNumber) bodyLines.push(`Account Number: ${invoice.bankDetails.accountNumber}`);
      if (isUS) {
        if (invoice.bankDetails.routingNumber || invoice.bankDetails.ifsc) {
          bodyLines.push(`Routing (ABA): ${invoice.bankDetails.routingNumber || invoice.bankDetails.ifsc}`);
        }
        if (invoice.bankDetails.swiftCode) {
          bodyLines.push(`SWIFT / BIC: ${invoice.bankDetails.swiftCode}`);
        }
        if (invoice.bankDetails.upiId) {
          bodyLines.push(`Zelle / Wire ID: ${invoice.bankDetails.upiId}`);
        }
      } else {
        if (invoice.bankDetails.ifsc) {
          bodyLines.push(`IFSC Code: ${invoice.bankDetails.ifsc}`);
        }
        if (invoice.bankDetails.upiId) {
          bodyLines.push(`UPI ID: ${invoice.bankDetails.upiId}`);
        }
      }
    }

    if (!isLocalEnvironment) {
      bodyLines.push('');
      bodyLines.push(`View or print your full invoice here:\n${shareUrl}`);
    }

    bodyLines.push('');
    bodyLines.push(`Thank you for your business,\n${invoice.business.name}`);

    const mailto = `mailto:${encodeURIComponent(invoice.client.email || '')}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    window.location.href = mailto;
    toast.info('Opening mail composer...');
  };

  const handleCopyLink = async () => {
    haptics.selection();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Printable invoice link copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleCopySummary = async () => {
    haptics.selection();
    const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
    const textLines = [
      `INVOICE: ${invoice.invoiceNumber}`,
      `From: ${invoice.business.name}`,
      `To: ${invoice.client.name}`,
      `Date: ${invoice.invoiceDate}`,
      `Total: ${invoice.currencySymbol}${formatNumber(invoice.grandTotalRounded)}`,
      `Status: ${isPaid ? 'PAID' : 'DUE (' + invoice.currencySymbol + formatNumber(invoice.balanceDue) + ')'}`,
    ];
    if (!isLocalEnvironment) {
      textLines.push(`Link: ${shareUrl}`);
    }
    const text = textLines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Invoice text summary copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleDownloadJson = async () => {
    haptics.selection();
    const dataStr = JSON.stringify(invoice, null, 2);
    const cleanNum = invoice.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
    const fileName = `invoice-${cleanNum}.json`;
    await exportAndSaveFile({
      fileName,
      data: dataStr,
      mimeType: 'application/json',
      dialogTitle: `Share ${fileName}`,
      successMessage: `Exported JSON: ${fileName}`,
    });
  };

  const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="lg" className="max-h-[92vh] flex flex-col">
        <ModalHeader
          title="Share Invoice"
          description={
            invoice.client?.name?.trim()
              ? `Send or copy invoice ${invoice.invoiceNumber} for ${invoice.client.name.trim()}`
              : `Send or copy invoice ${invoice.invoiceNumber}`
          }
        />
        <ModalBody className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 pt-1">
            {/* Invoice Snapshot Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                    {invoice.invoiceNumber}
                  </span>
                  {isPaid ? (
                    <Chip color="lime" variant="caption" className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                      <StatusDot color="green" /> Paid
                    </Chip>
                  ) : (
                    <Chip color="rose" variant="caption" className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                      <StatusDot color="yellow" /> Due: {formatCurrency(invoice.balanceDue, invoice.currencySymbol)}
                    </Chip>
                  )}
                </div>
                <p className="text-xs text-slate-600 truncate mt-1">
                  <strong>{invoice.client?.name?.trim() || 'Walk-in Client'}</strong> • {invoice.invoiceDate}
                </p>
              </div>
              <div className="flex items-baseline sm:block sm:text-right shrink-0 justify-between border-t sm:border-t-0 border-slate-200/60 pt-2 sm:pt-0">
                <span className="text-[10px] text-slate-500 font-mono sm:hidden">Grand Total:</span>
                <div>
                  <div className="text-sm sm:text-base font-bold font-mono text-slate-900 tabular-nums whitespace-nowrap">
                    {formatCurrency(invoice.grandTotalRounded, invoice.currencySymbol)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:block">Grand Total</span>
                </div>
              </div>
            </div>

            {/* Primary Action: Direct Share PDF Document */}
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={isGeneratingPdf}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-600 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-70 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  {isGeneratingPdf ? (
                    <RiLoader4Line className="size-5 animate-spin text-white" />
                  ) : (
                    <RiFilePdf2Line className="size-5 text-white" />
                  )}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 leading-snug">
                    {isGeneratingPdf ? 'Generating PDF Document...' : 'Share PDF Document (WhatsApp, Drive, Email)'}
                  </div>
                  <div className="text-[11px] text-blue-100 mt-0.5 leading-tight">
                    {Capacitor.isNativePlatform()
                      ? 'Attaches real .pdf document directly to Android apps'
                      : 'Download or share high-resolution print PDF'}
                  </div>
                </div>
              </div>
              <RiShareForwardLine className="size-5 text-white/80 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Quick Share Actions: WhatsApp & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200/90 bg-emerald-50/50 hover:bg-emerald-100/60 active:bg-emerald-200/60 text-emerald-900 transition-colors text-left group cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <RiWhatsappLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950 group-hover:text-emerald-800">
                    Share on WhatsApp
                  </div>
                  <div className="text-[11px] text-emerald-700/80 truncate">
                    {isUS ? 'Send formatted message & totals' : 'Send formatted message & UPI'}
                  </div>
                </div>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={handleEmailShare}
                className="flex items-center gap-3 p-3 rounded-xl border border-blue-200/90 bg-blue-50/50 hover:bg-blue-100/60 active:bg-blue-200/60 text-blue-900 transition-colors text-left group cursor-pointer"
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

              {/* Native OS Share Sheet */}
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 transition-colors text-left group cursor-pointer sm:col-span-2"
                >
                  <div className="size-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <RiShareForwardLine className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">
                      System Share Sheet
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      Share PDF file directly through Android, iOS, or system apps
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Printable Invoice Link Field - Hidden on native mobile platforms (Android APK) to avoid localhost URLs */}
            {!Capacitor.isNativePlatform() && (
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
            )}

            {/* Additional Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-100 pt-3">
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiFileCopyLine}
                onClick={handleCopySummary}
                className="text-xs font-semibold w-full justify-center"
              >
                Copy Summary
              </Button>

              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiFileExcel2Line}
                onClick={() => exportInvoiceToExcel(invoice)}
                className="text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 w-full justify-center"
              >
                Download Excel (.xlsx)
              </Button>

              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiDownload2Line}
                onClick={handleDownloadJson}
                className="text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 w-full justify-center"
              >
                Download JSON
              </Button>
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
