// ─── Theme Registry ─────────────────────────────────────────────────
// Central registry of all available themes. Built-in themes are compiled into
// the bundle, and remote cloud themes from Netlify are dynamically loaded.

import React from 'react';
import type { ThemeDefinition, ThemeOptions, RemoteTemplateDefinition } from '../types';
import { DEFAULT_THEME_OPTIONS } from '../types';
import { getCachedRemoteTemplates } from '../services/templateSyncService';
import { DynamicRemoteTheme } from './DynamicRemoteTheme';

// Lazy-load theme definitions so only the selected theme loads
import classicMeta from './classic/meta';
import minimalMeta from './minimal/meta';
import modernMeta from './modern/meta';
import compactMeta from './compact/meta';
import corporateMeta from './corporate/meta';
import boldMeta from './bold/meta';
import elegantMeta from './elegant/meta';
import thermalMeta from './thermal/meta';

/**
 * All registered built-in themes, keyed by id.
 */
export const themeRegistry: Record<string, ThemeDefinition> = {
  classic: classicMeta,
  minimal: minimalMeta,
  modern: modernMeta,
  compact: compactMeta,
  corporate: corporateMeta,
  bold: boldMeta,
  elegant: elegantMeta,
  thermal: thermalMeta,
};

/**
 * Ordered list of built-in theme IDs for display.
 */
export const themeOrder = [
  'classic',
  'minimal',
  'modern',
  'compact',
  'corporate',
  'bold',
  'elegant',
  'thermal',
] as const;

export const THEMES = themeOrder.map((id) => themeRegistry[id]);

// ─── Remote Theme Cache ───────────────────────────────────────────────
// Preserves stable React component identities and ThemeDefinition references
// across re-renders to prevent unmount/remount churn and layout recalculations.
const remoteComponentCache = new Map<string, React.FC<any>>();
const remoteThemeDefCache = new Map<string, ThemeDefinition & { isRemote?: boolean }>();

function getRemoteComponent(remote: RemoteTemplateDefinition): React.FC<any> {
  const existing = remoteComponentCache.get(remote.id);
  if (existing) return existing;

  const Comp: React.FC<any> = (props: any) => {
    return React.createElement(DynamicRemoteTheme, { ...props, templateDef: remote });
  };
  Comp.displayName = `RemoteTheme_${remote.id}`;
  remoteComponentCache.set(remote.id, Comp);
  return Comp;
}

function remoteToThemeDef(remote: RemoteTemplateDefinition): ThemeDefinition & { isRemote?: boolean } {
  const cacheKey = `${remote.id}_${remote.updatedAt || '0'}`;
  const cached = remoteThemeDefCache.get(cacheKey);
  if (cached) return cached;

  const def: ThemeDefinition & { isRemote?: boolean } = {
    id: remote.id,
    name: `${remote.name} (Netlify)`,
    description: remote.description || 'Cloud-synchronized invoice template from Netlify.',
    paper: remote.paper || ['A4', 'A5'],
    isRemote: true,
    component: getRemoteComponent(remote),
    defaultOptions: {
      ...DEFAULT_THEME_OPTIONS,
      ...(remote.defaultOptions || {}),
    },
  };
  remoteThemeDefCache.set(cacheKey, def);
  return def;
}

/**
 * Get a theme definition by ID, checking built-in themes first, then cached Netlify templates.
 */
export function getTheme(id: string): ThemeDefinition {
  if (themeRegistry[id]) return themeRegistry[id];
  const remoteList = getCachedRemoteTemplates();
  const remote = remoteList.find((t) => t.id === id);
  if (remote) return remoteToThemeDef(remote);
  return themeRegistry.classic;
}

/**
 * Merge default options + theme-specific defaults + user overrides.
 */
export function resolveOptions(
  themeId: string,
  userOptions: Partial<ThemeOptions> = {}
): ThemeOptions {
  const theme = getTheme(themeId);
  return {
    ...DEFAULT_THEME_OPTIONS,
    ...theme.defaultOptions,
    ...userOptions,
  };
}

let cachedAllThemes: ThemeDefinition[] | null = null;
let lastRemoteHash = '';

/**
 * Get all themes as an array (both built-in and cached Netlify cloud templates).
 * Uses memoization to return the exact same array reference if the template list hasn't changed.
 */
export function getAllThemes(): ThemeDefinition[] {
  const builtIn = themeOrder.map((id) => themeRegistry[id]);
  const remoteList = getCachedRemoteTemplates();
  const currentHash = `${remoteList.length}_${remoteList.map((r) => r.id + (r.updatedAt || '')).join(',')}`;

  if (cachedAllThemes && lastRemoteHash === currentHash) {
    return cachedAllThemes;
  }

  const remoteThemes = remoteList.map(remoteToThemeDef);
  cachedAllThemes = [...builtIn, ...remoteThemes];
  lastRemoteHash = currentHash;
  return cachedAllThemes;
}
