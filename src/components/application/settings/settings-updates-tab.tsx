import React, { useState, useEffect } from "react";
import {
  RiRefreshLine,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiDownload2Line,
  RiExternalLinkLine,
  RiWindowsFill,
  RiAppleFill,
  RiAndroidFill,
  RiSparklingFill,
  RiShieldCheckLine,
  RiArrowRightLine,
} from "@remixicon/react";
import {
  checkForUpdates,
  getUpdatePreferences,
  saveUpdatePreferences,
  getAppVersion,
  detectPlatform,
  downloadUpdate,
  installUpdate,
  type ReleaseInfo,
  type ReleaseAsset,
  type DownloadProgress,
} from "@/services/updateService";

export const SettingsUpdatesTab: React.FC = () => {
  const currentVersion = getAppVersion();
  const [checking, setChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<{
    status: "idle" | "up-to-date" | "update-available" | "error";
    release?: ReleaseInfo;
    error?: string;
  }>({ status: "idle" });

  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "downloaded" | "installing" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ percent: 0, bytesReceived: 0, totalBytes: 0, speed: 0 });
  const [downloadError, setDownloadError] = useState("");
  const [autoCheck, setAutoCheck] = useState(() => getUpdatePreferences().autoCheckOnStartup);
  const { platform, arch } = detectPlatform();

  useEffect(() => {
    // Perform update check on mount so current status is immediately reflected
    checkForUpdates(false)
      .then((res) => {
        if (!res.error && res.release) {
          if (res.hasUpdate) {
            setLastCheckResult({ status: "update-available", release: res.release });
          } else {
            setLastCheckResult({ status: "up-to-date", release: res.release });
          }
        }
      })
      .catch(() => {});
  }, []);

  const targetVersion = lastCheckResult.release?.version || currentVersion;

  const getPackageUrl = (type: 'win-installer' | 'win-portable' | 'mac-pkg-arm' | 'mac-pkg-intel' | 'android-apk') => {
    const assets = lastCheckResult.release?.assets;
    if (assets && assets.length > 0) {
      if (type === 'win-installer') {
        const a = assets.find(x => x.name.toLowerCase().includes('setup') && x.name.endsWith('.exe'));
        if (a) return a.downloadUrl;
      } else if (type === 'win-portable') {
        const a = assets.find(x => !x.name.toLowerCase().includes('setup') && x.name.endsWith('.exe'));
        if (a) return a.downloadUrl;
      } else if (type === 'mac-pkg-arm') {
        const a = assets.find(x => x.name.endsWith('.pkg') && x.name.includes('arm64'));
        if (a) return a.downloadUrl;
      } else if (type === 'mac-pkg-intel') {
        const a = assets.find(x => x.name.endsWith('.pkg') && x.name.includes('x64'));
        if (a) return a.downloadUrl;
      } else if (type === 'android-apk') {
        const a = assets.find(x => x.name.endsWith('.apk'));
        if (a) return a.downloadUrl;
      }
    }
    switch (type) {
      case 'win-installer':
        return `https://github.com/rushikeshnarule/invoice-gen/releases/download/v${targetVersion}/Invoice-Gen-Setup-${targetVersion}.exe`;
      case 'win-portable':
        return `https://github.com/rushikeshnarule/invoice-gen/releases/download/v${targetVersion}/Invoice%20Gen%20${targetVersion}.exe`;
      case 'mac-pkg-arm':
        return `https://github.com/rushikeshnarule/invoice-gen/releases/download/v${targetVersion}/Invoice-Gen-Setup-${targetVersion}-arm64.pkg`;
      case 'mac-pkg-intel':
        return `https://github.com/rushikeshnarule/invoice-gen/releases/download/v${targetVersion}/Invoice-Gen-Setup-${targetVersion}-x64.pkg`;
      case 'android-apk':
        return `https://github.com/rushikeshnarule/invoice-gen/releases/download/v${targetVersion}/Invoice-Gen-${targetVersion}.apk`;
    }
  };

  const handleToggleAutoCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoCheck(enabled);
    saveUpdatePreferences({ autoCheckOnStartup: enabled });
  };

  const handleCheckNow = async () => {
    setChecking(true);
    setDownloadState("idle");
    try {
      const res = await checkForUpdates(true);
      if (res.error) {
        setLastCheckResult({ status: "error", error: res.error });
      } else if (res.hasUpdate && res.release) {
        setLastCheckResult({ status: "update-available", release: res.release });
      } else {
        setLastCheckResult({ status: "up-to-date", release: res.release });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to update server";
      setLastCheckResult({ status: "error", error: message });
    } finally {
      setChecking(false);
    }
  };

  const handleStartInAppUpdate = async (asset: ReleaseAsset) => {
    setDownloadState("downloading");
    setDownloadError("");
    setDownloadProgress({ percent: 0, bytesReceived: 0, totalBytes: asset.size || 0, speed: 0 });

    try {
      const result = await downloadUpdate(asset, (p) => {
        setDownloadProgress(p);
      });

      if (!result.success) {
        setDownloadState("error");
        setDownloadError(result.error || "Failed to download update package");
        return;
      }

      setDownloadState("downloaded");
      if (result.filePath) {
        setDownloadState("installing");
        setTimeout(async () => {
          await installUpdate(result.filePath!);
        }, 1500);
      }
    } catch (err: unknown) {
      setDownloadState("error");
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec) return "";
    const mb = bytesPerSec / (1024 * 1024);
    return `${mb.toFixed(1)} MB/s`;
  };

  return (
    <div className="space-y-6">
      {/* Current Version & Health Card */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <RiShieldCheckLine className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">Invoice Gen Workstation</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                v{currentVersion}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pushed to GitHub now
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Platform: {platform === 'macos' ? `macOS ${arch === 'arm64' ? '(Apple Silicon M-Series)' : '(Intel x64)'}` : platform === 'android' ? 'Android (Touch Mobile Edition)' : `Windows (${arch || 'x64'})`} • Commercial Edition
            </p>
          </div>
        </div>

        <button
          onClick={handleCheckNow}
          disabled={checking}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <RiRefreshLine className={`size-4 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "Checking..." : "Check for Updates"}</span>
        </button>
      </div>

      {/* Result Alerts */}
      {lastCheckResult.status === "up-to-date" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 animate-in fade-in">
          <RiCheckboxCircleFill className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                <span>You're up to date!</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 text-[10px] font-bold tracking-wide uppercase">
                  Pushed to GitHub now
                </span>
              </h4>
              {lastCheckResult.release?.htmlUrl && (
                <a
                  href={lastCheckResult.release.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 underline"
                >
                  <span>View on GitHub</span>
                  <RiExternalLinkLine className="size-3" />
                </a>
              )}
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              Invoice Gen v{currentVersion} is verified and pushed to GitHub now. All platform packages (Windows, macOS, Android) are live and synchronized.
            </p>
            {lastCheckResult.release?.publishedAt && (
              <p className="text-[11px] text-emerald-600 mt-1 font-mono">
                Pushed to GitHub: {new Date(lastCheckResult.release.publishedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {lastCheckResult.status === "update-available" && lastCheckResult.release && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                <RiSparklingFill className="size-4 text-amber-300" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900">
                    New Version Available: v{lastCheckResult.release.version}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                    Pushed to GitHub now
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pushed to GitHub on {new Date(lastCheckResult.release.publishedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {lastCheckResult.release.recommendedAsset && downloadState === "idle" && (
              <button
                onClick={() => handleStartInAppUpdate(lastCheckResult.release!.recommendedAsset!)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
              >
                <RiDownload2Line className="size-4" />
                <span>Download &amp; Install ({formatFileSize(lastCheckResult.release.recommendedAsset.size)})</span>
                <RiArrowRightLine className="size-3.5" />
              </button>
            )}
          </div>

          {/* Download Progress Bar */}
          {downloadState === "downloading" && (
            <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <RiRefreshLine className="size-3.5 animate-spin text-blue-600" />
                  Downloading update directly within workstation...
                </span>
                <span className="font-mono text-blue-600">{downloadProgress.percent}%</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{formatFileSize(downloadProgress.bytesReceived)} / {formatFileSize(downloadProgress.totalBytes)}</span>
                {downloadProgress.speed > 0 && <span>Speed: {formatSpeed(downloadProgress.speed)}</span>}
              </div>
            </div>
          )}

          {/* Installing / Downloaded status */}
          {(downloadState === "downloaded" || downloadState === "installing") && (
            <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <RiCheckboxCircleFill className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-950">
                    {platform === "android"
                      ? "APK Download Started!"
                      : downloadState === "installing"
                      ? "Download Complete! Launching installer..."
                      : "Download Complete! Installing automatically..."}
                  </h5>
                  <p className="text-[11px] text-emerald-800">
                    {platform === "android"
                      ? "Check your notifications or tap Install APK below to install the update."
                      : "The application will restart with the latest update."}
                  </p>
                </div>
              </div>
              {platform === "android" && lastCheckResult.release.recommendedAsset && (
                <a
                  href={lastCheckResult.release.recommendedAsset.downloadUrl}
                  target="_system"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 shadow-sm cursor-pointer"
                >
                  Install APK
                </a>
              )}
            </div>
          )}

          {downloadState === "error" && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              <p className="font-semibold">Update download failed: {downloadError}</p>
              <a
                href={lastCheckResult.release.recommendedAsset?.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold mt-1 inline-block"
              >
                Download via browser instead
              </a>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-white/80 border border-blue-100 text-xs text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
            {lastCheckResult.release.body}
          </div>
        </div>
      )}

      {lastCheckResult.status === "error" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <RiAlertFill className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">Unable to check for updates</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              {lastCheckResult.error || "Please check your network connection or browse GitHub directly."}
            </p>
            <a
              href="https://github.com/rushikeshnarule/invoice-gen/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mt-2"
            >
              <span>Visit GitHub Releases</span>
              <RiExternalLinkLine className="size-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Auto-check Settings */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Automatic Update Notifications</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Silently check GitHub for new versions whenever Invoice Gen starts up
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={handleToggleAutoCheck}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Official Download Links Matrix */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Direct Platform Packages &amp; Installers
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Windows */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-200 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <RiWindowsFill className="size-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">Windows (x64)</h5>
                <p className="text-[11px] text-slate-500">Windows 10, 11</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
              <a
                href={getPackageUrl('win-installer')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-medium transition-colors"
              >
                Installer (.exe)
              </a>
              <a
                href={getPackageUrl('win-portable')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                Portable (.exe)
              </a>
            </div>
          </div>

          {/* macOS */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <RiAppleFill className="size-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">macOS (Apple Silicon &amp; Intel)</h5>
                <p className="text-[11px] text-slate-500">macOS 12.0+ Monterey, Sonoma, Sequoia</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
              <a
                href={getPackageUrl('mac-pkg-arm')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
              >
                Apple Silicon (.pkg)
              </a>
              <a
                href={getPackageUrl('mac-pkg-intel')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                Intel (.pkg)
              </a>
            </div>
          </div>

          {/* Android */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-200 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <RiAndroidFill className="size-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">Android APK</h5>
                <p className="text-[11px] text-slate-500">Phones &amp; Tablets (Android 8.0+)</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <a
                href={getPackageUrl('android-apk')}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
              >
                Download APK (.apk)
              </a>
            </div>
          </div>

          {/* All GitHub Releases */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-200 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <RiExternalLinkLine className="size-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">All Releases Archive</h5>
                <p className="text-[11px] text-slate-500">View all version tags, change logs &amp; packages</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <a
                href="https://github.com/rushikeshnarule/invoice-gen/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-700 text-xs font-medium transition-colors"
              >
                Browse GitHub Releases
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
