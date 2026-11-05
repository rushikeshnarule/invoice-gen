// ─── Theme Context ──────────────────────────────────────────────────
// Provides theme selection and options to the entire app.

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ThemeOptions, ThemePreset } from '../types';
import { resolveOptions } from '../themes';

interface ThemeContextValue {
  // Current theme
  currentThemeId: string;
  setThemeId: (id: string) => void;

  // Options
  options: ThemeOptions;
  setOptions: (options: Partial<ThemeOptions>) => void;
  resetOptions: () => void;
  getOptionsForTheme: (themeId: string) => ThemeOptions;
  getUserOptionsForTheme: (themeId: string) => Partial<ThemeOptions>;

  // Presets
  presets: ThemePreset[];
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  exportPresets: () => string;
  importPresets: (json: string) => boolean;

  // Per-client default
  clientDefaults: Record<string, string>; // clientId → themeId
  setClientDefault: (clientId: string, themeId: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'invoice-theme-settings';
const THEME_OPTIONS_MAP_KEY = 'invoice-theme-options-map';
const PRESETS_KEY = 'invoice-theme-presets';
const CLIENT_DEFAULTS_KEY = 'invoice-client-theme-defaults';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to ${key}:`, e);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(
    () => loadFromStorage<{ themeId: string }>(STORAGE_KEY, { themeId: 'classic' }).themeId
  );

  const [userOptionsByTheme, setUserOptionsByTheme] = useState<Record<string, Partial<ThemeOptions>>>(() => {
    try {
      const stored = localStorage.getItem(THEME_OPTIONS_MAP_KEY);
      if (stored) return JSON.parse(stored);
      // Migrate legacy single-theme options if present
      const legacy = localStorage.getItem(STORAGE_KEY + '-options');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const cur = loadFromStorage<{ themeId: string }>(STORAGE_KEY, { themeId: 'classic' }).themeId;
        return { [cur]: parsed };
      }
      return {};
    } catch {
      return {};
    }
  });

  const [presets, setPresets] = useState<ThemePreset[]>(
    () => loadFromStorage<ThemePreset[]>(PRESETS_KEY, [])
  );

  const [clientDefaults, setClientDefaults] = useState<Record<string, string>>(
    () => loadFromStorage<Record<string, string>>(CLIENT_DEFAULTS_KEY, {})
  );

  const getOptionsForTheme = useCallback((themeId: string): ThemeOptions => {
    const themeOverrides = userOptionsByTheme[themeId] || {};
    return resolveOptions(themeId, themeOverrides);
  }, [userOptionsByTheme]);

  const getUserOptionsForTheme = useCallback((themeId: string): Partial<ThemeOptions> => {
    return userOptionsByTheme[themeId] || {};
  }, [userOptionsByTheme]);

  const options = useMemo(
    () => getOptionsForTheme(currentThemeId),
    [getOptionsForTheme, currentThemeId]
  );

  const setThemeId = useCallback((id: string) => {
    setCurrentThemeId(id);
    saveToStorage(STORAGE_KEY, { themeId: id });
  }, []);

  const setOptions = useCallback((partial: Partial<ThemeOptions>) => {
    setUserOptionsByTheme((prev) => {
      const currentOverrides = prev[currentThemeId] || {};
      const next = {
        ...prev,
        [currentThemeId]: { ...currentOverrides, ...partial },
      };
      saveToStorage(THEME_OPTIONS_MAP_KEY, next);
      return next;
    });
  }, [currentThemeId]);

  const resetOptions = useCallback(() => {
    setUserOptionsByTheme((prev) => {
      const next = { ...prev };
      delete next[currentThemeId];
      saveToStorage(THEME_OPTIONS_MAP_KEY, next);
      return next;
    });
  }, [currentThemeId]);

  const savePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const preset: ThemePreset = {
        id: `preset-${Date.now()}`,
        name,
        themeId: currentThemeId,
        options,
        createdAt: new Date().toISOString(),
      };
      const next = [...prev, preset];
      saveToStorage(PRESETS_KEY, next);
      return next;
    });
  }, [currentThemeId, options]);

  const loadPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setCurrentThemeId(preset.themeId);
    setUserOptionsByTheme((prev) => {
      const next = {
        ...prev,
        [preset.themeId]: preset.options,
      };
      saveToStorage(THEME_OPTIONS_MAP_KEY, next);
      return next;
    });
    saveToStorage(STORAGE_KEY, { themeId: preset.themeId });
  }, [presets]);

  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== presetId);
      saveToStorage(PRESETS_KEY, next);
      return next;
    });
  }, []);

  const exportPresets = useCallback(() => {
    return JSON.stringify(presets, null, 2);
  }, [presets]);

  const importPresets = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json) as ThemePreset[];
      if (!Array.isArray(imported)) return false;
      setPresets((prev) => {
        const next = [...prev, ...imported];
        saveToStorage(PRESETS_KEY, next);
        return next;
      });
      return true;
    } catch (e) {
      console.error('Failed to import presets:', e);
      return false;
    }
  }, []);

  const setClientDefault = useCallback((clientId: string, themeId: string | null) => {
    setClientDefaults((prev) => {
      const next = { ...prev };
      if (themeId) {
        next[clientId] = themeId;
      } else {
        delete next[clientId];
      }
      saveToStorage(CLIENT_DEFAULTS_KEY, next);
      return next;
    });
  }, []);

  const value: ThemeContextValue = {
    currentThemeId,
    setThemeId,
    options,
    setOptions,
    resetOptions,
    getOptionsForTheme,
    getUserOptionsForTheme,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    exportPresets,
    importPresets,
    clientDefaults,
    setClientDefault,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
