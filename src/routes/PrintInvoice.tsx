import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { buildRenderData, type RenderDataWithTheme } from '../utils/buildRenderData';
import { getTheme, resolveOptions } from '../themes';
import { useTheme } from '../context/ThemeContext';
import { Button } from '@/components/base/buttons/button';
import { RiPrinterLine, RiArrowLeftLine, RiShareForwardLine } from '@remixicon/react';
import { ShareInvoiceModal } from '../components/ShareInvoiceModal/ShareInvoiceModal';

export const PrintInvoice: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentThemeId, getOptionsForTheme } = useTheme();

  const [data, setData] = useState<RenderDataWithTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const isMountedRef = useRef(true);

  // Theme override from query param, loaded record, or context
  const themeParam = searchParams.get('theme');
  const variantParam = searchParams.get('variant');
  const autoPrint = searchParams.get('auto') === 'true';

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

  useEffect(() => {
    if (!loading && data && autoPrint) {
      if (data.invoiceNumber) {
        document.title = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
      }
      // Delay slightly for font rendering and styles to paint
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, autoPrint]);

  if (loading || !data) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#64748b' }}>
        Preparing invoice for print...
      </div>
    );
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/invoices');
    }
  };

  return (
    <div className="print-page-container min-h-screen bg-slate-100/70" style={{ margin: 0, padding: 0 }}>
      {/* Floating no-print desktop control bar */}
      <div className="no-print sticky top-0 z-50 flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 py-2.5 shadow-xs backdrop-blur-sm select-none gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiArrowLeftLine}
            onClick={handleBack}
            aria-label="Back to Invoices"
            className="text-xs shrink-0"
          >
            Back to Invoices
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
          <span className="font-mono text-xs font-bold text-slate-800 shrink-0">
            {data.invoiceNumber}
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200 shrink-0 truncate hidden md:inline-flex">
            Theme: {theme.name} ({theme.paper.join('/')})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiShareForwardLine}
            onClick={() => setShowShareModal(true)}
            aria-label="Share Invoice"
            className="text-xs font-semibold shrink-0"
          >
            Share
          </Button>

          <Button
            size="small"
            variant="primary"
            leadingIcon={RiPrinterLine}
            aria-label="Print or Save as PDF"
            onClick={() => {
              if (data?.invoiceNumber) {
                document.title = data.invoiceNumber.trim().replace(/[\\/:*?"<>|]/g, '-');
              }
              window.print();
            }}
            className="text-xs shadow-xs font-semibold shrink-0"
          >
            Print / Save as PDF
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

      {/* Invoice Document Body */}
      <div className="flex justify-center p-6 print:p-0">
        <Suspense
          fallback={
            <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
              Rendering {theme.name}...
            </div>
          }
        >
          <Component data={data} options={options} />
        </Suspense>
      </div>
    </div>
  );
};
