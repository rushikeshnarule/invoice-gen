// ─── Auto-Update Service ───────────────────────────────────────────────
// Connects to GitHub Releases API to detect new versions, fetch platform-specific
// download links (.exe, .pkg, .dmg, .apk), and notify users inside the software.

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  assets: ReleaseAsset[];
  recommendedAsset?: ReleaseAsset | null;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release?: ReleaseInfo;
  error?: string;
}

declare const __APP_VERSION__: string | undefined;

export interface UpdatePreferences {
  autoCheckOnStartup: boolean;
  lastCheckedAt?: string;
  dismissedVersion?: string;
}

/**
 * Returns the true current version of the application:
 * 1. From Electron native runtime (window.invoiceDesktop.appVersion)
 * 2. Injected by Vite at build time (__APP_VERSION__)
 * 3. Default fallback
 */
export function getAppVersion(): string {
  if (typeof window !== "undefined") {
    const desktop = (window as unknown as { invoiceDesktop?: { appVersion?: string } }).invoiceDesktop;
    if (desktop?.appVersion) {
      return desktop.appVersion.replace(/^v/i, "").trim();
    }
  }
  if (typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__) {
    return String(__APP_VERSION__).replace(/^v/i, "").trim();
  }
  return "1.5.1.1";
}

export const CURRENT_APP_VERSION = getAppVersion();
const GITHUB_REPO = "rushikeshnarule/invoice-gen";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const UPDATE_PREFS_KEY = "invoice_gen_update_prefs";

/**
 * Robust SemVer comparison: returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) => v.replace(/^v/i, "").trim();
  const parts1 = clean(v1).split(".").map(Number);
  const parts2 = clean(v2).split(".").map(Number);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Detects the client's operating system environment.
 */
export function detectPlatform(): { platform: "windows" | "macos" | "android" | "web" | "linux"; arch?: string } {
  // 1. Prioritize native desktop bridge if running inside Electron
  if (typeof window !== "undefined") {
    const desktop = (window as unknown as { invoiceDesktop?: { platform?: string; isDesktop?: boolean } }).invoiceDesktop;
    if (desktop?.platform === "win32") {
      return { platform: "windows", arch: "x64" };
    }
    if (desktop?.platform === "darwin") {
      return { platform: "macos", arch: "arm64" };
    }
  }

  // 2. Prioritize native Android bridge if running inside Android APK
  if (isAndroidAppEnvironment()) {
    return { platform: "android" };
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";

  // Check Android
  if (ua.includes("android")) {
    return { platform: "android" };
  }

  // Check macOS
  if (ua.includes("mac os") || ua.includes("macintosh")) {
    // Check if Apple Silicon (arm64) or Intel
    return { platform: "macos", arch: "arm64" };
  }

  // Check Windows
  if (ua.includes("win")) {
    return { platform: "windows", arch: "x64" };
  }

  // Check Linux
  if (ua.includes("linux")) {
    return { platform: "linux" };
  }

  return { platform: "web" };
}

/**
 * Identifies the best direct download asset for the user's platform.
 * Prioritizes high-speed in-app update packages (.asar) on desktop
 * so users can update seamlessly without re-running setup installers.
 */
export function getRecommendedAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  const isDesktop = isDesktopEnvironment();
  const { platform, arch } = detectPlatform();

  // 1. For Desktop (Electron runtime, Windows or macOS), strictly prioritize seamless in-app update bundle (.asar)
  // This updates the workstation in-place without running setup or installer wizards
  if (isDesktop || platform === "windows" || platform === "macos") {
    const updateAsar = assets.find(
      (a) => a.name.toLowerCase().endsWith(".asar") && a.name.toLowerCase().includes("update")
    ) || assets.find((a) => a.name.toLowerCase().endsWith(".asar"));
    if (updateAsar) return updateAsar;
  }

  if (platform === "windows") {
    // Fallback: Windows NSIS setup (installed silently via /S) or portable
    const installer = assets.find((a) => a.name.toLowerCase().includes("setup") && a.name.toLowerCase().endsWith(".exe"));
    if (installer) return installer;
    const portable = assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
    if (portable) return portable;
  }

  if (platform === "macos") {
    // Fallback: PKG or DMG
    if (arch === "arm64") {
      const armPkg = assets.find((a) => a.name.toLowerCase().includes("arm64") && a.name.toLowerCase().endsWith(".pkg"));
      if (armPkg) return armPkg;
    }
    const pkg = assets.find((a) => a.name.toLowerCase().endsWith(".pkg"));
    if (pkg) return pkg;

    const dmg = assets.find((a) => a.name.toLowerCase().endsWith(".dmg"));
    if (dmg) return dmg;
  }

  if (platform === "android") {
    const apk = assets.find((a) => a.name.toLowerCase().endsWith(".apk"));
    if (apk) return apk;
  }

  // Return the first valid installer asset as fallback
  return assets[0] || null;
}

export function isAsarAsset(asset?: ReleaseAsset | null): boolean {
  return Boolean(asset && asset.name.toLowerCase().endsWith(".asar"));
}

/**
 * Retrieves update preferences from local storage.
 */
export function getUpdatePreferences(): UpdatePreferences {
  try {
    const stored = localStorage.getItem(UPDATE_PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { autoCheckOnStartup: true };
}

/**
 * Persists update preferences.
 */
export function saveUpdatePreferences(prefs: Partial<UpdatePreferences>): void {
  try {
    const current = getUpdatePreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(UPDATE_PREFS_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Checks GitHub Releases API for a newer version.
 */
export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  const prefs = getUpdatePreferences();

  try {
    let data: Record<string, unknown> | null = null;

    // 1. Try Desktop IPC first (runs via Node.js: zero CSP, zero CORS, resilient user-agent)
    const desktop = typeof window !== "undefined" ? (window as unknown as {
      invoiceDesktop?: {
        checkUpdates?: () => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
      };
    }).invoiceDesktop : undefined;

    if (desktop?.checkUpdates) {
      try {
        const ipcRes = await desktop.checkUpdates();
        if (ipcRes && ipcRes.success && ipcRes.data) {
          data = ipcRes.data;
        }
      } catch (ipcErr) {
        console.warn("Desktop checkUpdates IPC failed, falling back to fetch:", ipcErr);
      }
    }

    // 2. Fallback to fetch (browser / mobile / fallback)
    if (!data) {
      let response = await fetch(GITHUB_API_URL, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.ok) {
        data = await response.json() as Record<string, unknown>;
      } else {
        // Fallback to releases list in case /latest endpoint lags
        const fallbackUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (fallbackRes.ok) {
          const list = await fallbackRes.json() as Record<string, unknown>[];
          if (Array.isArray(list) && list.length > 0) {
            data = list[0];
          }
        }
      }

      if (!data) {
        throw new Error(`GitHub API returned status ${response?.status || 500}`);
      }
    }

    const currentVersion = getAppVersion();
    const rawTag = (String(data.tag_name || "")).replace(/^v/i, "");
    const latestVersion = rawTag || currentVersion;

    const rawAssets = Array.isArray(data.assets) ? data.assets : [];
    const assets: ReleaseAsset[] = rawAssets.map((a: { name: string; size: number; browser_download_url: string; content_type: string }) => ({
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
      contentType: a.content_type,
    }));

    const release: ReleaseInfo = {
      version: latestVersion,
      tagName: String(data.tag_name || ""),
      name: String(data.name || `Version ${latestVersion}`),
      body: String(data.body || ""),
      publishedAt: String(data.published_at || new Date().toISOString()),
      htmlUrl: String(data.html_url || ""),
      assets,
      recommendedAsset: getRecommendedAsset(assets),
    };

    saveUpdatePreferences({ lastCheckedAt: new Date().toISOString() });

    // Compare versions: ONLY notify update if latest on GitHub is strictly newer than current installed version
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

    // Check if dismissed and not forced
    if (hasUpdate && !force && prefs.dismissedVersion === latestVersion) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion,
        release,
      };
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      release,
    };
  } catch (err: unknown) {
    const currentVersion = getAppVersion();
    const message = err instanceof Error ? err.message : "Failed to connect to update server";
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: message,
    };
  }
}

export interface DownloadProgress {
  percent: number;
  bytesReceived: number;
  totalBytes: number;
  speed: number;
}

export function isDesktopEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { invoiceDesktop?: { isDesktop?: boolean } }).invoiceDesktop?.isDesktop);
}

export function isAndroidAppEnvironment(): boolean {
  if (typeof window !== "undefined") {
    const android = (window as unknown as { invoiceAndroid?: { isAndroidApp?: () => boolean } }).invoiceAndroid;
    if (android?.isAndroidApp && typeof android.isAndroidApp === "function") {
      try {
        return Boolean(android.isAndroidApp());
      } catch {}
    }
  }
  return false;
}

export function isNativeAppEnvironment(): boolean {
  return isDesktopEnvironment() || isAndroidAppEnvironment();
}

export async function downloadUpdate(
  asset: ReleaseAsset,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // 1. Desktop Electron IPC bridge
  const desktop = typeof window !== "undefined" ? (window as unknown as {
    invoiceDesktop?: {
      downloadUpdate?: (options: { downloadUrl: string; fileName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      onUpdateProgress?: (cb: (p: DownloadProgress) => void) => () => void;
    };
  }).invoiceDesktop : undefined;

  if (desktop?.downloadUpdate) {
    let unsubscribe: (() => void) | undefined;
    if (onProgress && desktop.onUpdateProgress) {
      unsubscribe = desktop.onUpdateProgress(onProgress);
    }

    try {
      const res = await desktop.downloadUpdate({
        downloadUrl: asset.downloadUrl,
        fileName: asset.name,
      });
      return res;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  // 2. Android Native Bridge: full in-app background download stream + PackageInstaller
  const android = typeof window !== "undefined" ? (window as unknown as {
    invoiceAndroid?: {
      downloadAndInstallUpdate?: (downloadUrl: string, fileName: string) => void;
      installDownloadedApk?: (filePath?: string) => void;
    };
  }).invoiceAndroid : undefined;

  if (android && typeof android.downloadAndInstallUpdate === "function") {
    const triggerAndroidDownload = android.downloadAndInstallUpdate.bind(android);
    return new Promise((resolve) => {
      const win = window as unknown as {
        __onAndroidUpdateProgress?: (percent: number, bytesReceived: number, totalBytes: number, speed: number) => void;
        __onAndroidUpdateDownloaded?: (filePath: string) => void;
        __onAndroidUpdateError?: (error: string) => void;
      };

      win.__onAndroidUpdateProgress = (percent: number, bytesReceived: number, totalBytes: number, speed: number) => {
        if (onProgress) {
          onProgress({ percent, bytesReceived, totalBytes, speed });
        }
      };

      win.__onAndroidUpdateDownloaded = (filePath: string) => {
        cleanup();
        resolve({ success: true, filePath });
      };

      win.__onAndroidUpdateError = (error: string) => {
        cleanup();
        resolve({ success: false, error: error || "Android update download failed" });
      };

      function cleanup() {
        try {
          delete win.__onAndroidUpdateProgress;
          delete win.__onAndroidUpdateDownloaded;
          delete win.__onAndroidUpdateError;
        } catch {}
      }

      try {
        triggerAndroidDownload(asset.downloadUrl, asset.name);
      } catch (err) {
        cleanup();
        resolve({ success: false, error: err instanceof Error ? err.message : "Failed to initiate update download" });
      }
    });
  }

  // Fallback for web browser environment only: trigger browser download
  if (typeof window !== "undefined") {
    try {
      window.open(asset.downloadUrl, "_system");
    } catch {}
    const a = document.createElement("a");
    a.href = asset.downloadUrl;
    a.download = asset.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true };
  }

  return { success: false, error: "Download is only supported in browser or native application" };
}

export async function installUpdate(filePath: string): Promise<{ success: boolean; error?: string }> {
  const desktop = typeof window !== "undefined" ? (window as unknown as {
    invoiceDesktop?: {
      installUpdate?: (options: { filePath: string }) => Promise<{ success: boolean; error?: string }>;
    };
  }).invoiceDesktop : undefined;

  if (desktop?.installUpdate) {
    return desktop.installUpdate({ filePath });
  }

  const android = typeof window !== "undefined" ? (window as unknown as {
    invoiceAndroid?: {
      installDownloadedApk?: (filePath?: string) => void;
    };
  }).invoiceAndroid : undefined;

  if (android?.installDownloadedApk) {
    try {
      android.installDownloadedApk(filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to trigger Android installation" };
    }
  }

  return { success: false, error: "Auto-install is available on Windows, macOS, and Android editions" };
}
