import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { buildRenderData, type RenderDataWithTheme } from '../utils/buildRenderData';
import { getTheme, resolveOptions } from '../themes';
import { useTheme } from '../context/ThemeContext';
import { exportInvoiceToExcel } from '../utils';
import { Button } from '@/components/base/buttons/button';
import { toast } from '@/components/base/toast/toast';
import { RiPrinterLine, RiArrowLeftLine, RiShareForwardLine, RiDownload2Line, RiFileExcel2Line } from '@remixicon/react';
import { ShareInvoiceModal } from '../components/ShareInvoiceModal/ShareInvoiceModal';
import { useNativeBackButton } from '../hooks/useNativeBackButton';
import { haptics } from '../services/nativeMobileService';
import { Capacitor } from '@capacitor/core';
import { generateInvoicePdf } from '../services/pdfGeneratorService';
import { exportAndSaveFile } from '../services/fileExportService';

declare global {
  interface Window {
    invoiceDesktop?: {
      isDesktop?: boolean;
      platform?: string;
      savePdf?: (options: { defaultFilename: string; paper?: string }) => Promise<{
        success: boolean;
        canceled?: boolean;
        filePath?: string;
        error?: string;
      }>;
      saveExcel?: (options: { defaultFilename: string; base64: string }) => Promise<{
        success: boolean;
        canceled?: boolean;
        filePath?: string;
        error?: string;
      }>;
      print?: () => Promise<{ success: boolean }>;
    };
  }
}

export const PrintInvoice: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentThemeId, getOptionsForTheme } = useTheme();

  const [data, setData] = useState<RenderDataWithTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const isMountedRef = useRef(true);

  const handleBack = useCallback(() => {
    haptics.light();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/invoices');
    }
  }, [navigate]);

  useNativeBackButton(
    'print-invoice-screen',
    () => {
      if (showShareModal) {
        setShowShareModal(false);
        return true;
      }
      handleBack();
      return true;
    },
    true,
    120
  );

  // Theme override from query param, loaded record, or context
  const themeParam = searchParams.get('theme');
  const variantParam = searchParams.get('variant');
  const actionParam = searchParams.get('action'); // 'print' | 'save-pdf'
  const autoPrint = searchParams.get('auto') === 'true' || actionParam === 'print';
  const autoSavePdf = actionParam === 'save-pdf';

  const activeThemeId = themeParam || data?._themeId || currentThemeId;
  const theme = getTheme(activeThemeId);
  const Component = theme.component;
  const options = getOptionsForTheme ? getOptionsForTheme(activeThemeId) : resolveOptions(activeThemeId);

  useEffect(() => {
    isMountedRef.current = true;

    buildRenderData(invoiceId || 'sample', variantParam).then((res) => {
      if (isMountedRef.current) {
        setData(res);
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [invoiceId, variantParam]);

  // Synchronize document.title to the exact invoice number (e.g. INV-001)
  // so the browser's "Save as PDF" dialog defaults to the invoice filename.
  useEffect(() => {
    if (data?.invoiceNumber) {
      const prevTitle = document.title;
      const safeTitle = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
      document.title = safeTitle;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [data?.invoiceNumber]);

  // Ensure title is applied before keyboard-triggered print (Ctrl+P / Cmd+P)
  useEffect(() => {
    const handleBeforePrint = () => {
      if (data?.invoiceNumber) {
        document.title = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [data?.invoiceNumber]);

  const handlePrint = () => {
    if (data?.invoiceNumber) {
      document.title = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
    }
    const android = (window as unknown as { invoiceAndroid?: { printDocument?: (name: string) => void } }).invoiceAndroid;
    if (android && typeof android.printDocument === 'function') {
      android.printDocument(data?.invoiceNumber || 'Invoice');
      return;
    }
    window.print();
  };

  const handleSavePdf = async () => {
    if (!data) return;
    const safeTitle = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
    const defaultFilename = `${safeTitle}.pdf`;

    if (window.invoiceDesktop?.savePdf) {
      setIsSavingPdf(true);
      try {
        const res = await window.invoiceDesktop.savePdf({
          defaultFilename,
          paper: options.paper,
        });
        if (res.success && res.filePath) {
          toast.success(`Saved PDF to: ${res.filePath}`);
        } else if (!res.canceled && res.error) {
          toast.error(`Failed to save PDF: ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Error saving PDF: ${err?.message || err}`);
      } finally {
        setIsSavingPdf(false);
      }
    } else if (Capacitor.isNativePlatform()) {
      setIsSavingPdf(true);
      try {
        const { buffer } = generateInvoicePdf(data);
        await exportAndSaveFile({
          fileName: defaultFilename,
          data: buffer,
          mimeType: 'application/pdf',
          dialogTitle: `Share ${defaultFilename}`,
          successMessage: `Saved PDF to Documents: ${defaultFilename}`,
        });
      } catch (err: any) {
        toast.error(`Error saving PDF: ${err?.message || err}`);
      } finally {
        setIsSavingPdf(false);
      }
    } else {
      const android = (window as unknown as { invoiceAndroid?: { printDocument?: (name: string) => void } }).invoiceAndroid;
      if (android && typeof android.printDocument === 'function') {
        toast.info('Opening Android Print Spooler. Choose "Save as PDF".');
        android.printDocument(data.invoiceNumber || 'Invoice');
        return;
      }
      // In web browser fallback: set title to exact filename and open print dialog
      document.title = safeTitle;
      toast.info('Choose "Save as PDF" in the printer destination dropdown.');
      window.print();
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      await exportInvoiceToExcel(data);
    } catch (err: any) {
      toast.error(`Failed to export Excel: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    if (!loading && data) {
      if (data.invoiceNumber) {
        document.title = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
      }

      if (autoSavePdf) {
        const timer = setTimeout(() => {
          handleSavePdf();
        }, 500);
        return () => clearTimeout(timer);
      } else if (autoPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, data, autoPrint, autoSavePdf]);

  if (loading || !data) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#64748b' }}>
        Preparing invoice for document workstation...
      </div>
    );
  }



  return (
    <div className="print-page-container min-h-dvh bg-slate-100/70" style={{ margin: 0, padding: 0 }}>
      {/* Floating no-print desktop control bar */}
      <div className="no-print sticky top-0 z-50 flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pb-2.5 shadow-xs backdrop-blur-sm select-none gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiArrowLeftLine}
            onClick={handleBack}
            aria-label="Back to Invoices"
            className="text-xs shrink-0"
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Invoices</span>
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
          <span className="font-mono text-xs font-bold text-slate-800 shrink-0">
            {data.invoiceNumber}
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200 shrink-0 truncate hidden md:inline-flex">
            Theme: {theme.name} ({theme.paper.join('/')})
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Export Excel Button */}
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiFileExcel2Line}
            onClick={handleExportExcel}
            aria-label="Export to Excel"
            className="text-xs font-semibold shrink-0 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 px-2 sm:px-3"
          >
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Export Excel</span>
          </Button>

          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiShareForwardLine}
            onClick={() => {
              haptics.selection();
              setShowShareModal(true);
            }}
            aria-label="Share Invoice"
            className="text-xs font-semibold shrink-0 px-2 sm:px-3"
          >
            Share
          </Button>

          {/* Dedicated Print Button */}
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiPrinterLine}
            aria-label="Print Invoice"
            onClick={() => {
              haptics.light();
              handlePrint();
            }}
            className="text-xs font-semibold shrink-0 px-2 sm:px-3"
          >
            Print
          </Button>

          {/* Dedicated Save PDF Button */}
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiDownload2Line}
            aria-label="Save as PDF"
            onClick={() => {
              haptics.light();
              handleSavePdf();
            }}
            disabled={isSavingPdf}
            className="text-xs shadow-xs font-semibold shrink-0 px-2.5 sm:px-3"
          >
            <span className="sm:hidden">{isSavingPdf ? 'Saving...' : 'PDF'}</span>
            <span className="hidden sm:inline">{isSavingPdf ? 'Saving PDF...' : 'Save PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareInvoiceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        invoice={data}
        themeId={activeThemeId}
      />

      {/* Printable Invoice Root */}
      <div className="invoice-print-wrapper py-6 sm:py-10 flex justify-center">
        <div className="print-content-sheet bg-white shadow-lg print:shadow-none print:m-0">
          <Component data={data} options={options} />
        </div>
      </div>
    </div>
  );
};
