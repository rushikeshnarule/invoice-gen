import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import type { InvoiceRenderData, ThemeOptions } from '../../types';
import { getTheme } from '../../themes';
import {
  RiZoomInLine,
  RiZoomOutLine,
  RiScanLine,
  RiAspectRatioLine,
} from '@remixicon/react';

interface ThemePreviewProps {
  themeId: string;
  data: InvoiceRenderData;
  options: ThemeOptions;
  scale?: number | 'auto'; // Forced scale number, or 'auto' for responsive screen adaptation
  isThumbnail?: boolean; // When true, clips to thumbnail card bounds
  className?: string;
  showControls?: boolean; // Optional override to hide/show canvas zoom controls
}

const ThemePreviewComponent: React.FC<ThemePreviewProps> = ({
  themeId,
  data,
  options,
  scale: propScale,
  isThumbnail = false,
  className = '',
  showControls = true,
}) => {
  const isNumericProp = typeof propScale === 'number' && !isNaN(propScale);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(() => !isNumericProp);
  const [manualZoom, setManualZoom] = useState<number>(() => (isNumericProp ? (propScale as number) : 0.85));
  const [autoScale, setAutoScale] = useState<number>(0.85);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const theme = getTheme(themeId);
  const Component = theme.component;

  const paperWidth = options.paper === '80mm' ? '76mm' : options.paper === 'A5' ? '148mm' : '210mm';
  const minPaperHeight = options.paper === '80mm' ? '140mm' : options.paper === 'A5' ? '210mm' : '297mm';

  // Synchronize when propScale changes externally
  useEffect(() => {
    if (typeof propScale === 'number' && !isNaN(propScale)) {
      setManualZoom(propScale);
      setIsAutoFit(false);
    } else if (propScale === 'auto') {
      setIsAutoFit(true);
    }
  }, [propScale]);

  // Measure natural unscaled content size via ResizeObserver
  useEffect(() => {
    if (isThumbnail) return;
    const el = contentRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const updateSize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const roundW = Math.ceil(w);
      const roundH = Math.ceil(h);
      setContentSize((prev) => {
        if (prev.width === roundW && prev.height === roundH) return prev;
        return { width: roundW, height: roundH };
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const w = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          updateSize(w, h);
        });
      });
      ro.observe(el);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    } else {
      updateSize(el.offsetWidth, el.offsetHeight);
    }
  }, [isThumbnail, themeId]);

  // Compute adaptive screen-size scale dynamically based on viewport / container width & height
  const computeAdaptiveScale = useCallback(() => {
    if (isThumbnail) return;
    const container = containerRef.current;
    if (!container) return;

    const parent = container.parentElement || container;
    const availableWidth = parent.clientWidth || window.innerWidth || 800;
    const availableHeight = parent.clientHeight || window.innerHeight || 900;

    const unscaledW = contentSize.width > 0 ? contentSize.width : options.paper === '80mm' ? 288 : 794;
    const unscaledH = contentSize.height > 0 ? contentSize.height : 1123;

    // Responsive margins: tighter on mobile, comfortable on ultra-wide / 4K
    const horizontalMargin = availableWidth < 640 ? 20 : availableWidth < 1024 ? 36 : availableWidth < 1600 ? 56 : 80;
    const verticalMargin = availableWidth < 640 ? 32 : 64;

    const targetWidth = Math.max(100, availableWidth - horizontalMargin);
    const targetHeight = Math.max(100, availableHeight - verticalMargin);

    let calculated: number;

    if (options.paper === '80mm') {
      // Thermal receipt is narrow: prioritize 1:1 readability with sensible cap
      calculated = Math.min(1.25, Math.max(0.85, Number((targetWidth / unscaledW).toFixed(2))));
    } else {
      // Standard documents: calculate fit-to-width with bounds
      const widthFit = targetWidth / unscaledW;
      const heightFit = targetHeight / unscaledH;

      // On large desktop screens, prioritize balanced comfortable scaling
      if (availableWidth >= 1280 && heightFit > 0.6) {
        calculated = Math.min(1.45, Math.max(0.75, widthFit));
      } else {
        calculated = Math.min(1.4, Math.max(0.35, widthFit));
      }
    }

    const rounded = Number(calculated.toFixed(2));
    setAutoScale((prev) => (Math.abs(prev - rounded) > 0.02 ? rounded : prev));
  }, [contentSize.width, contentSize.height, options.paper, isThumbnail]);

  // Observe container / viewport resize to recompute adaptive scale
  useEffect(() => {
    if (isThumbnail) return;
    computeAdaptiveScale();

    const parent = containerRef.current?.parentElement || containerRef.current;
    if (!parent) return;

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        computeAdaptiveScale();
      });
      ro.observe(parent);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', computeAdaptiveScale);
      return () => window.removeEventListener('resize', computeAdaptiveScale);
    }
  }, [computeAdaptiveScale, isThumbnail]);

  // Effective current zoom level
  const currentScale = isAutoFit ? autoScale : manualZoom;

  // Zoom control actions
  const handleZoomOut = () => {
    setIsAutoFit(false);
    setManualZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))));
  };

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setManualZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))));
  };

  const handleResetTo100 = () => {
    setIsAutoFit(false);
    setManualZoom(1.0);
  };

  const handleToggleAutoFit = () => {
    setIsAutoFit(true);
    computeAdaptiveScale();
  };

  // Thumbnail mode: lightweight rendering for gallery cards
  if (isThumbnail) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'transparent',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: paperWidth,
            backgroundColor: '#ffffff',
          }}
        >
          <Suspense
            fallback={
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Loading {theme.name}...
              </div>
            }
          >
            <Component data={data} options={options} />
          </Suspense>
        </div>
      </div>
    );
  }

  const scaledWidth = contentSize.width > 0 ? Math.ceil(contentSize.width * currentScale) : undefined;
  const scaledHeight = contentSize.height > 0 ? Math.ceil(contentSize.height * currentScale) : undefined;

  return (
    <div
      ref={containerRef}
      className={`invoice-canvas-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        minHeight: '100%',
        overflow: 'visible',
        position: 'relative',
        backgroundColor: '#f8fafc',
        padding: '16px 8px 64px 8px',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── SLEEK ADAPTIVE CANVAS TOOLBAR ─── */}
      {showControls && (
        <div
          className="no-print sticky top-2 z-10 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-md mb-4 text-xs select-none transition-all duration-150"
          style={{ maxWidth: '95%' }}
        >
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Canvas Zoom Out"
            aria-label="Canvas Zoom Out"
          >
            <RiZoomOutLine className="size-4" />
          </button>

          {/* Current Zoom Percentage */}
          <span className="font-mono font-semibold text-slate-800 text-[11px] sm:text-xs min-w-12 text-center">
            {Math.round(currentScale * 100)}%
          </span>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Canvas Zoom In"
            aria-label="Canvas Zoom In"
          >
            <RiZoomInLine className="size-4" />
          </button>

          <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

          {/* Auto Fit Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAutoFit}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              isAutoFit
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Auto-adapt invoice scale to screen size"
          >
            <RiScanLine className="size-3.5" />
            <span>Auto Fit</span>
          </button>

          {/* 100% 1:1 Print Size Toggle Button */}
          <button
            type="button"
            onClick={handleResetTo100}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              !isAutoFit && Math.round(currentScale * 100) === 100
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="View in 100% true print dimensions"
          >
            <RiAspectRatioLine className="size-3.5" />
            <span>100%</span>
          </button>
        </div>
      )}

      {/* Sized Wrapper that reserves the EXACT scaled footprint */}
      <div
        style={{
          width: scaledWidth ? `${scaledWidth}px` : paperWidth,
          height: scaledHeight ? `${scaledHeight}px` : minPaperHeight,
          minHeight: scaledHeight ? `${scaledHeight}px` : minPaperHeight,
          position: 'relative',
          margin: '0 auto',
          marginBottom: 48,
          transition: 'width 0.15s ease-out, height 0.15s ease-out',
        }}
      >
        {/* Scaled Invoice Paper */}
        <div
          ref={contentRef}
          style={{
            width: paperWidth,
            transform: `scale(${currentScale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#ffffff',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  width: paperWidth,
                  height: minPaperHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                Loading {theme.name} theme...
              </div>
            }
          >
            <Component data={data} options={options} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export const ThemePreview = React.memo(ThemePreviewComponent);
export default ThemePreview;
