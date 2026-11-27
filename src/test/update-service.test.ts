import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  compareSemver,
  getRecommendedAsset,
  getFallbackInstallerAsset,
  runInAppUpdate,
  getUpdatePreferences,
  saveUpdatePreferences,
  checkForUpdates,
  CURRENT_APP_VERSION,
  type ReleaseAsset,
} from "../services/updateService";

describe("Update Service Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("compareSemver", () => {
    it("correctly identifies newer, older, and equal versions", () => {
      expect(compareSemver("1.4.1", "1.4.0")).toBeGreaterThan(0);
      expect(compareSemver("1.5.0", "1.4.0")).toBeGreaterThan(0);
      expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
      expect(compareSemver("v1.4.0", "1.4.0")).toBe(0);
      expect(compareSemver("1.3.3", "1.4.0")).toBeLessThan(0);
      expect(compareSemver("1.2.0", "1.3.0")).toBeLessThan(0);
    });
  });

  describe("getRecommendedAsset", () => {
    const mockAssets: ReleaseAsset[] = [
      { name: "Invoice-Gen-Setup-1.5.0.exe", size: 1000, downloadUrl: "https://example.com/setup.exe", contentType: "application/octet-stream" },
      { name: "Invoice Gen 1.5.0.exe", size: 900, downloadUrl: "https://example.com/portable.exe", contentType: "application/octet-stream" },
      { name: "Invoice-Gen-Setup-1.5.0-arm64.pkg", size: 1100, downloadUrl: "https://example.com/arm64.pkg", contentType: "application/octet-stream" },
      { name: "Invoice-Gen-Setup-1.5.0-x64.pkg", size: 1100, downloadUrl: "https://example.com/x64.pkg", contentType: "application/octet-stream" },
      { name: "Invoice-Gen-1.5.0.apk", size: 200, downloadUrl: "https://example.com/app.apk", contentType: "application/vnd.android.package-archive" },
    ];

    const mockAssetsWithAsar: ReleaseAsset[] = [
      ...mockAssets,
      { name: "Invoice-Gen-Update-1.5.0.asar", size: 500, downloadUrl: "https://example.com/update.asar", contentType: "application/octet-stream" },
    ];

    it("matches installer assets for current platform", () => {
      const asset = getRecommendedAsset(mockAssets);
      expect(asset).toBeTruthy();
      expect(asset?.downloadUrl).toBeTruthy();
    });

    it("prioritizes seamless .asar in-app update bundle on desktop", () => {
      const asset = getRecommendedAsset(mockAssetsWithAsar);
      expect(asset).toBeTruthy();
      expect(asset?.name).toBe("Invoice-Gen-Update-1.5.0.asar");
      expect(asset?.downloadUrl).toBe("https://example.com/update.asar");
    });
  });

  describe("update preferences", () => {
    it("defaults to autoCheckOnStartup: true", () => {
      const prefs = getUpdatePreferences();
      expect(prefs.autoCheckOnStartup).toBe(true);
    });

    it("persists updated preferences", () => {
      saveUpdatePreferences({ autoCheckOnStartup: false, dismissedVersion: "1.4.0" });
      const prefs = getUpdatePreferences();
      expect(prefs.autoCheckOnStartup).toBe(false);
      expect(prefs.dismissedVersion).toBe("1.4.0");
    });
  });

  describe("checkForUpdates", () => {
    it("handles mock GitHub API newer release response", async () => {
      const mockGitHubResponse = {
        tag_name: "v2.0.0",
        name: "Invoice Gen v2.0.0 - Supercharged Release",
        body: "New features and enhancements",
        published_at: "2026-11-20T10:00:00Z",
        html_url: "https://github.com/rushikeshnarule/invoice-gen/releases/tag/v2.0.0",
        assets: [
          {
            name: "Invoice-Gen-Setup-2.0.0.exe",
            size: 150000000,
            browser_download_url: "https://github.com/rushikeshnarule/invoice-gen/releases/download/v2.0.0/Invoice-Gen-Setup-2.0.0.exe",
            content_type: "application/octet-stream",
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      const result = await checkForUpdates(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.currentVersion).toBe(CURRENT_APP_VERSION);
      expect(result.latestVersion).toBe("2.0.0");
      expect(result.release?.name).toContain("v2.0.0");
      expect(result.release?.assets).toHaveLength(1);
    });

    it("handles current or older version gracefully", async () => {
      const mockGitHubResponse = {
        tag_name: "v1.4.0",
        name: "Invoice Gen v1.4.0",
        body: "Current stable version",
        published_at: "2026-11-15T00:00:00Z",
        html_url: "https://github.com/rushikeshnarule/invoice-gen/releases/tag/v1.4.0",
        assets: [],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      const result = await checkForUpdates(true);
      expect(result.hasUpdate).toBe(false);
      expect(result.latestVersion).toBe("1.4.0");
    });
  });

  describe("Android Native OTA Bridge", () => {
    afterEach(() => {
      delete (window as unknown as { invoiceAndroid?: unknown }).invoiceAndroid;
      delete (window as unknown as { __onAndroidUpdateProgress?: unknown }).__onAndroidUpdateProgress;
      delete (window as unknown as { __onAndroidUpdateDownloaded?: unknown }).__onAndroidUpdateDownloaded;
      delete (window as unknown as { __onAndroidUpdateError?: unknown }).__onAndroidUpdateError;
    });

    it("correctly identifies Android environment when native bridge is active", async () => {
      const { isAndroidAppEnvironment, detectPlatform } = await import("../services/updateService");

      (window as unknown as { invoiceAndroid?: { isAndroidApp: () => boolean } }).invoiceAndroid = {
        isAndroidApp: () => true,
      };

      expect(isAndroidAppEnvironment()).toBe(true);
      expect(detectPlatform().platform).toBe("android");
    });

    it("handles Android OTA download with progress and auto-installation", async () => {
      const { downloadUpdate, installUpdate } = await import("../services/updateService");

      const downloadMock = vi.fn((_url: string, _file: string) => {
        // Simulate native thread posting progress and completion
        setTimeout(() => {
          const win = window as unknown as {
            __onAndroidUpdateProgress?: (p: number, r: number, t: number, s: number) => void;
            __onAndroidUpdateDownloaded?: (f: string) => void;
          };
          win.__onAndroidUpdateProgress?.(50, 500, 1000, 250);
          win.__onAndroidUpdateDownloaded?.("/data/user/0/com.invoicegen.app/cache/update.apk");
        }, 10);
      });

      const installMock = vi.fn((_path?: string) => {});

      (window as unknown as {
        invoiceAndroid?: {
          downloadAndInstallUpdate: (url: string, file: string) => void;
          installDownloadedApk: (path?: string) => void;
        };
      }).invoiceAndroid = {
        downloadAndInstallUpdate: downloadMock,
        installDownloadedApk: installMock,
      };

      const progressEvents: number[] = [];
      const res = await downloadUpdate(
        {
          name: "Invoice-Gen-1.5.0.apk",
          size: 1000,
          downloadUrl: "https://example.com/apk",
          contentType: "application/vnd.android.package-archive",
        },
        (p) => progressEvents.push(p.percent)
      );

      expect(downloadMock).toHaveBeenCalledWith("https://example.com/apk", "Invoice-Gen-1.5.0.apk");
      expect(res.success).toBe(true);
      expect(res.filePath).toBe("/data/user/0/com.invoicegen.app/cache/update.apk");
      expect(progressEvents).toContain(50);

      const installRes = await installUpdate("/data/user/0/com.invoicegen.app/cache/update.apk");
      expect(installMock).toHaveBeenCalledWith("/data/user/0/com.invoicegen.app/cache/update.apk");
      expect(installRes.success).toBe(true);
    });
  });

  describe("ASAR fallback and runInAppUpdate", () => {
    afterEach(() => {
      delete (window as unknown as { invoiceDesktop?: unknown }).invoiceDesktop;
    });

    it("selects non-.asar setup installer as fallback when .asar fails", () => {
      (window as unknown as { invoiceDesktop?: unknown }).invoiceDesktop = {
        isDesktop: true,
        platform: "win32",
      };
      const assets: ReleaseAsset[] = [
        { name: "Invoice-Gen-Update-1.5.1.2.asar", size: 30000000, downloadUrl: "https://example.com/u.asar", contentType: "application/octet-stream" },
        { name: "Invoice-Gen-Setup-1.5.1.2.exe", size: 178000000, downloadUrl: "https://example.com/setup.exe", contentType: "application/octet-stream" },
        { name: "Invoice.Gen.1.5.1.2.exe", size: 146000000, downloadUrl: "https://example.com/portable.exe", contentType: "application/octet-stream" },
      ];

      const fallback = getFallbackInstallerAsset(assets, "Invoice-Gen-Update-1.5.1.2.asar");
      expect(fallback?.name).toBe("Invoice-Gen-Setup-1.5.1.2.exe");
    });

    it("automatically falls back to Setup .exe when .asar download throws Invalid package", async () => {
      const downloadUpdateMock = vi.fn(async ({ fileName }: { fileName: string }) => {
        if (fileName.endsWith(".asar")) {
          return { success: false, error: `Invalid package C:\\Temp\\${fileName}` };
        }
        return { success: true, filePath: `C:\\Temp\\${fileName}` };
      });
      const installUpdateMock = vi.fn(async () => ({ success: true }));

      (window as unknown as { invoiceDesktop?: unknown }).invoiceDesktop = {
        isDesktop: true,
        platform: "win32",
        downloadUpdate: downloadUpdateMock,
        installUpdate: installUpdateMock,
      };

      const asarAsset: ReleaseAsset = {
        name: "Invoice-Gen-Update-1.5.1.2.asar",
        size: 30000000,
        downloadUrl: "https://github.com/rushikeshnarule/invoice-gen/releases/download/v1.5.1.2/Invoice-Gen-Update-1.5.1.2.asar",
        contentType: "application/octet-stream",
      };
      const exeAsset: ReleaseAsset = {
        name: "Invoice-Gen-Setup-1.5.1.2.exe",
        size: 178000000,
        downloadUrl: "https://github.com/rushikeshnarule/invoice-gen/releases/download/v1.5.1.2/Invoice-Gen-Setup-1.5.1.2.exe",
        contentType: "application/octet-stream",
      };

      const states: string[] = [];
      const res = await runInAppUpdate({
        asset: asarAsset,
        assets: [asarAsset, exeAsset],
        installDelayMs: 0,
        onStateChange: (s) => states.push(s),
      });

      expect(res.success).toBe(true);
      expect(res.usedAsset.name).toBe("Invoice-Gen-Setup-1.5.1.2.exe");
      expect(downloadUpdateMock).toHaveBeenCalledTimes(2);
      expect(installUpdateMock).toHaveBeenCalledWith({ filePath: "C:\\Temp\\Invoice-Gen-Setup-1.5.1.2.exe" });
      expect(states).toContain("installing");
    });

    it("surfaces installUpdate errors cleanly instead of leaving UI stuck installing", async () => {
      (window as unknown as { invoiceDesktop?: unknown }).invoiceDesktop = {
        isDesktop: true,
        platform: "win32",
        downloadUpdate: vi.fn(async () => ({ success: true, filePath: "C:\\Temp\\Invoice-Gen-Setup-1.5.1.2.exe" })),
        installUpdate: vi.fn(async () => ({ success: false, error: "Installer blocked by antivirus" })),
      };

      const exeAsset: ReleaseAsset = {
        name: "Invoice-Gen-Setup-1.5.1.2.exe",
        size: 178000000,
        downloadUrl: "https://github.com/rushikeshnarule/invoice-gen/releases/download/v1.5.1.2/Invoice-Gen-Setup-1.5.1.2.exe",
        contentType: "application/octet-stream",
      };

      const res = await runInAppUpdate({
        asset: exeAsset,
        assets: [exeAsset],
        installDelayMs: 0,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Installer blocked by antivirus");
    });
  });
});
