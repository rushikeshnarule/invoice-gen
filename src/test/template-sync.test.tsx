import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  normalizeRemoteManifestUrl,
  getRemoteServerUrl,
  setRemoteServerUrl,
  DEFAULT_REMOTE_URL,
  BUNDLED_REMOTE_TEMPLATES,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getCachedRemoteTemplates,
  saveCachedRemoteTemplates,
  deleteRemoteTemplate,
  syncRemoteTemplates,
  REMOTE_TEMPLATES_UPDATED_EVENT,
} from '@/services/templateSyncService';
import { getAllThemes, getTheme, THEMES } from '@/themes';
import type { RemoteTemplateDefinition } from '@/types';

describe('Cloud / Remote Template Synchronization Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('URL Normalization', () => {
    it('appends /templates.json if missing from domain root', () => {
      expect(normalizeRemoteManifestUrl('https://my-invoices.netlify.app')).toBe(
        'https://my-invoices.netlify.app/templates.json'
      );
    });

    it('handles trailing slash correctly', () => {
      expect(normalizeRemoteManifestUrl('https://my-invoices.netlify.app/')).toBe(
        'https://my-invoices.netlify.app/templates.json'
      );
    });

    it('preserves url if templates.json is already specified', () => {
      expect(
        normalizeRemoteManifestUrl('https://my-invoices.netlify.app/templates.json')
      ).toBe('https://my-invoices.netlify.app/templates.json');
    });

    it('returns empty string on empty input', () => {
      expect(normalizeRemoteManifestUrl('')).toBe('');
      expect(normalizeRemoteManifestUrl('   ')).toBe('');
    });
  });

  describe('Settings Storage & Persistence', () => {
    it('stores and retrieves remote server URL', () => {
      expect(getRemoteServerUrl()).toBe(DEFAULT_REMOTE_URL);
      setRemoteServerUrl('https://test-templates.netlify.app');
      expect(getRemoteServerUrl()).toBe('https://test-templates.netlify.app');
    });

    it('stores and retrieves auto-sync preference', () => {
      expect(isAutoSyncEnabled()).toBe(true); // default true
      setAutoSyncEnabled(false);
      expect(isAutoSyncEnabled()).toBe(false);
      setAutoSyncEnabled(true);
      expect(isAutoSyncEnabled()).toBe(true);
    });
  });

  describe('Offline Cache Management', () => {
    const mockTemplates: RemoteTemplateDefinition[] = [
      {
        id: 'gold-lux',
        name: 'Luxury Gold Edition',
        version: '1.2.0',
        description: 'Gold headers and borders',
        paper: ['A4'],
        cssUrl: 'https://test-templates.netlify.app/gold.css',
        cachedCss: '.remote-invoice-root { color: #d97706; }',
        cachedAt: Date.now(),
      },
    ];

    it('saves and retrieves cached remote templates from localStorage', () => {
      expect(getCachedRemoteTemplates()).toEqual(BUNDLED_REMOTE_TEMPLATES);
      saveCachedRemoteTemplates(mockTemplates);

      const cached = getCachedRemoteTemplates();
      expect(cached.length).toBe(1);
      expect(cached[0].id).toBe('gold-lux');
      expect(cached[0].name).toBe('Luxury Gold Edition');
      expect(cached[0].cachedCss).toContain('#d97706');
    });

    it('deletes a template from offline cache and fires update event', () => {
      saveCachedRemoteTemplates(mockTemplates);
      expect(getCachedRemoteTemplates().length).toBe(1);

      let eventFired = false;
      const handler = () => {
        eventFired = true;
      };
      window.addEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handler);

      deleteRemoteTemplate('gold-lux');

      expect(getCachedRemoteTemplates().length).toBe(0);
      expect(eventFired).toBe(true);

      window.removeEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handler);
    });
  });

  describe('Syncing Remote Templates from Live Cloud Server', () => {
    it('successfully downloads manifest and CSS assets, storing them offline', async () => {
      const mockManifest = {
        version: '1.0.0',
        templates: [
          {
            id: 'retro-pos',
            name: 'Retro POS 80mm',
            version: '2.0.0',
            description: 'Thermal receipt with pixel font',
            paper: ['80mm'],
            cssUrl: '/assets/retro.css',
            defaultOptions: {
              paper: '80mm',
            },
          },
        ],
      };

      const mockCss = '.theme-retro-pos { font-family: monospace; }';

      // Mock fetch
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('templates.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockManifest,
          } as Response;
        }
        if (urlStr.includes('retro.css')) {
          return {
            ok: true,
            status: 200,
            text: async () => mockCss,
          } as Response;
        }
        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const result = await syncRemoteTemplates('https://retro-invoicing.netlify.app');

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(1);

      const cached = getCachedRemoteTemplates();
      expect(cached.length).toBe(1);
      expect(cached[0].id).toBe('retro-pos');
      expect(cached[0].cachedCss).toBe(mockCss);
    });

    it('handles manifest fetch network failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await syncRemoteTemplates('https://broken-url.netlify.app');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch from Cloud');
    });

    it('rejects invalid manifest structure without templates array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ someOtherData: true }),
      } as Response);

      const result = await syncRemoteTemplates('https://empty-site.netlify.app');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid templates.json format');
    });
  });

  describe('Dynamic Remote Theme Integration with Theme Registry', () => {
    it('dynamically merges cached remote themes into getAllThemes()', () => {
      const initialCount = THEMES.length + BUNDLED_REMOTE_TEMPLATES.length;
      expect(getAllThemes().length).toBe(initialCount);

      const mockRemoteTemplate: RemoteTemplateDefinition = {
        id: 'emerald-corporate-test',
        name: 'Emerald Corporate (Remote)',
        version: '1.0.0',
        description: 'Deep emerald borders with clean modern layout',
        paper: ['A4', 'A5'],
        cssUrl: 'https://test.netlify.app/emerald.css',
        cachedCss: '.emerald-theme { color: emerald; }',
        cachedAt: Date.now(),
      };

      saveCachedRemoteTemplates([mockRemoteTemplate]);

      const updatedThemes = getAllThemes();
      expect(updatedThemes.length).toBe(THEMES.length + 1);

      const found = updatedThemes.find((t) => t.id === 'emerald-corporate-test');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Emerald Corporate (Remote) (Cloud)');
      expect((found as any)?.isRemote).toBe(true);
    });

    it('retrieves dynamic remote theme using getTheme(id)', () => {
      const mockRemoteTemplate: RemoteTemplateDefinition = {
        id: 'sky-minimal',
        name: 'Sky Minimalist',
        version: '1.0.0',
        description: 'Clean sky blue minimal layout',
        paper: ['A4'],
        cssUrl: 'https://test.netlify.app/sky.css',
        cachedCss: '.sky-theme { color: skyblue; }',
        cachedAt: Date.now(),
      };

      saveCachedRemoteTemplates([mockRemoteTemplate]);

      const theme = getTheme('sky-minimal');
      expect(theme.id).toBe('sky-minimal');
      expect(theme.name).toBe('Sky Minimalist (Cloud)');
      expect((theme as any).isRemote).toBe(true);
      expect(typeof theme.component).toBe('function');
    });
  });
});
