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

export interface UpdatePreferences {
  autoCheckOnStartup: boolean;
  lastCheckedAt?: string;
  dismissedVersion?: string;
}

export const CURRENT_APP_VERSION = "1.4.0";
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
 */
export function getRecommendedAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  const { platform, arch } = detectPlatform();

  if (platform === "windows") {
    // Prefer Setup.exe installer, then any .exe
    const installer = assets.find((a) => a.name.toLowerCase().includes("setup") && a.name.toLowerCase().endsWith(".exe"));
    if (installer) return installer;
    const portable = assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
    if (portable) return portable;
  }

  if (platform === "macos") {
    // Prefer PKG wizard, then DMG
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
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawTag = (data.tag_name || "").replace(/^v/i, "");
    const latestVersion = rawTag || CURRENT_APP_VERSION;

    const rawAssets = Array.isArray(data.assets) ? data.assets : [];
    const assets: ReleaseAsset[] = rawAssets.map((a: { name: string; size: number; browser_download_url: string; content_type: string }) => ({
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
      contentType: a.content_type,
    }));

    const release: ReleaseInfo = {
      version: latestVersion,
      tagName: data.tag_name,
      name: data.name || `Version ${latestVersion}`,
      body: data.body || "",
      publishedAt: data.published_at || new Date().toISOString(),
      htmlUrl: data.html_url,
      assets,
      recommendedAsset: getRecommendedAsset(assets),
    };

    saveUpdatePreferences({ lastCheckedAt: new Date().toISOString() });

    // Compare versions
    const hasUpdate = compareSemver(latestVersion, CURRENT_APP_VERSION) > 0;

    // Check if dismissed and not forced
    if (hasUpdate && !force && prefs.dismissedVersion === latestVersion) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        release,
      };
    }

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion,
      release,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to update server";
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      error: message,
    };
  }
}
