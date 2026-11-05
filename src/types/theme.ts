// ─── Theme System Types ─────────────────────────────────────────────
import type { ComponentType } from 'react';
import type { InvoiceRenderData, PaperSize } from './invoice';

// ─── Font options ───────────────────────────────────────────────────
export type ThemeFontFamily = 'system' | 'inter' | 'serif' | 'mono';
export type ThemeFontSize = 'small' | 'normal' | 'large';
export type LogoPosition = 'left' | 'center' | 'right';
export type WatermarkType = 'none' | 'PAID' | 'DRAFT' | 'custom';

// ─── Accent colour palette ─────────────────────────────────────────
export const ACCENT_PALETTE = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#059669', // Emerald
  '#DC2626', // Red
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#DB2777', // Pink
  '#65A30D', // Lime
  '#0D9488', // Teal
] as const;

// ─── Theme options (persisted as JSON) ──────────────────────────────
export interface ThemeOptions {
  accentColor: string;
  fontFamily: ThemeFontFamily;
  fontSize: ThemeFontSize;
  showLogo: boolean;
  showSignature: boolean;
  showStamp?: boolean;
  showBankDetails: boolean;
  showUpiQr: boolean;
  showHsnSacColumn: boolean;
  showDiscountColumn: boolean;
  showTaxSummaryTable: boolean;
  showAmountInWords: boolean;
  showNotes: boolean;
  showTerms: boolean;
  showThankYouFooter: boolean;
  logoPosition: LogoPosition;
  paper: PaperSize;
  watermark: WatermarkType;
  watermarkCustomText: string;
  footerText: string;
  currencySymbol: string;
  numberFormat: string; // locale string e.g. 'en-IN'
}

export const DEFAULT_THEME_OPTIONS: ThemeOptions = {
  accentColor: '#2563EB',
  fontFamily: 'system',
  fontSize: 'normal',
  showLogo: true,
  showSignature: true,
  showStamp: true,
  showBankDetails: true,
  showUpiQr: true,
  showHsnSacColumn: true,
  showDiscountColumn: true,
  showTaxSummaryTable: true,
  showAmountInWords: true,
  showNotes: true,
  showTerms: true,
  showThankYouFooter: true,
  logoPosition: 'left',
  paper: 'A4',
  watermark: 'none',
  watermarkCustomText: '',
  footerText: '',
  currencySymbol: '₹',
  numberFormat: 'en-IN',
};

// ─── Theme component props ──────────────────────────────────────────
export interface ThemeComponentProps {
  data: InvoiceRenderData;
  options: ThemeOptions;
}

// ─── Theme definition (registry entry) ──────────────────────────────
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  paper: PaperSize[];          // supported paper sizes
  component: ComponentType<ThemeComponentProps>;
  defaultOptions: Partial<ThemeOptions>;
}

// ─── Named preset ───────────────────────────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  themeId: string;
  options: ThemeOptions;
  createdAt: string;
}

// ─── Remote / Netlify Cloud Template Types ─────────────────────────
export interface RemoteTemplateDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  paper: PaperSize[];
  cssUrl: string;
  cachedCss?: string;
  previewUrl?: string;
  layout?: 'contractor' | 'standard' | string;
  defaultOptions?: Partial<ThemeOptions>;
  updatedAt?: string;
}

export interface RemoteTemplateManifest {
  version: string;
  updatedAt?: string;
  templates: RemoteTemplateDefinition[];
}
