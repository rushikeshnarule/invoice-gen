import React, { Suspense, useState, useRef, useEffect } from 'react';
import type { InvoiceRenderData, ThemeOptions } from '../../types';
import { getTheme } from '../../themes';

interface ThemePreviewProps {
  themeId: string;
  data: InvoiceRenderData;
  options: ThemeOptions;
  scale?: number; // Optional forced scale (used by thumbnail cards or external zoom)
  isThumbnail?: boolean; // When true, clips to thumbnail card bounds
  className?: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  themeId,
  data,
  options,
  scale: propScale,
  isThumbnail = false,
  className = '',
}) => {
  const [zoom, setZoom] = useState<number>(0.85);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const theme = getTheme(themeId);
  const Component = theme.component;

  const currentScale = propScale !== undefined ? propScale : zoom;

  const paperWidth = options.paper === '80mm' ? '76mm' : options.paper === 'A5' ? '148mm' : '210mm';
  const minPaperHeight = options.paper === '80mm' ? '140mm' : options.paper === 'A5' ? '210mm' : '297mm';

  useEffect(() => {
    if (isThumbnail) return;
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      if (el) {
        const w = el.offsetWidth || el.scrollWidth;
        const h = el.offsetHeight || el.scrollHeight;
        if (w > 0 && h > 0) {
          setContentSize((prev) => {
            if (prev.width === w && prev.height === h) return prev;
            return { width: w, height: h };
          });
        }
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [isThumbnail, themeId, data, options]);

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
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        minHeight: 'auto',
        height: 'auto',
        overflow: 'visible',
        position: 'relative',
        backgroundColor: '#f8fafc',
        padding: '24px 12px 64px 12px',
        boxSizing: 'border-box',
      }}
    >
      {/* Zoom controls (only in standalone preview mode when no external zoom is passed) */}
      {propScale === undefined && (
        <div
          className="no-print"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(4px)',
            padding: '6px 14px',
            borderRadius: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: 16,
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            style={{
              border: 'none',
              background: '#f1f5f9',
              width: 26,
              height: 26,
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            -
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: 42, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
            style={{
              border: 'none',
              background: '#f1f5f9',
              width: 26,
              height: 26,
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.85)}
            style={{
              border: 'none',
              background: '#e2e8f0',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Reset
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

export default ThemePreview;
