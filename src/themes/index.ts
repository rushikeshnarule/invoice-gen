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

function remoteToThemeDef(remote: RemoteTemplateDefinition): ThemeDefinition & { isRemote?: boolean } {
  return {
    id: remote.id,
    name: `${remote.name} (Netlify)`,
    description: remote.description || 'Cloud-synchronized invoice template from Netlify.',
    paper: remote.paper || ['A4', 'A5'],
    isRemote: true,
    component: (props) => React.createElement(DynamicRemoteTheme, { ...props, templateDef: remote }),
    defaultOptions: {
      ...DEFAULT_THEME_OPTIONS,
      ...(remote.defaultOptions || {}),
    },
  };
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

/**
 * Get all themes as an array (both built-in and cached Netlify cloud templates).
 */
export function getAllThemes(): ThemeDefinition[] {
  const builtIn = themeOrder.map((id) => themeRegistry[id]);
  const remoteList = getCachedRemoteTemplates();
  const remoteThemes = remoteList.map(remoteToThemeDef);
  return [...builtIn, ...remoteThemes];
}
