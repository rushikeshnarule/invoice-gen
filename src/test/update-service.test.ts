import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  compareSemver,
  getRecommendedAsset,
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
        tag_name: "v1.5.0",
        name: "Invoice Gen v1.5.0 - Supercharged Release",
        body: "New features and enhancements",
        published_at: "2026-11-20T10:00:00Z",
        html_url: "https://github.com/rushikeshnarule/invoice-gen/releases/tag/v1.5.0",
        assets: [
          {
            name: "Invoice-Gen-Setup-1.5.0.exe",
            size: 150000000,
            browser_download_url: "https://github.com/rushikeshnarule/invoice-gen/releases/download/v1.5.0/Invoice-Gen-Setup-1.5.0.exe",
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
      expect(result.latestVersion).toBe("1.5.0");
      expect(result.release?.name).toContain("v1.5.0");
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
});
