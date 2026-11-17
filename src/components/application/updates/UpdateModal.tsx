import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  RiDownload2Line,
  RiCloseLine,
  RiExternalLinkLine,
  RiSparklingFill,
  RiWindowsFill,
  RiAppleFill,
  RiAndroidFill,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiRefreshLine,
} from "@remixicon/react";
import type { ReleaseInfo, ReleaseAsset, DownloadProgress } from "@/services/updateService";
import {
  detectPlatform,
  saveUpdatePreferences,
  downloadUpdate,
  installUpdate,
  isDesktopEnvironment,
} from "@/services/updateService";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: ReleaseInfo | null;
  currentVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  release,
  currentVersion,
}) => {
  const [showAllDownloads, setShowAllDownloads] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "downloaded" | "installing" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ percent: 0, bytesReceived: 0, totalBytes: 0, speed: 0 });
  const [downloadedFilePath, setDownloadedFilePath] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string>("");

  if (!isOpen || !release) return null;

  const { platform } = detectPlatform();
  const isDesktop = isDesktopEnvironment();

  const handleSkipVersion = () => {
    saveUpdatePreferences({ dismissedVersion: release.version });
    onClose();
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

  const getAssetIcon = (assetName: string) => {
    const lower = assetName.toLowerCase();
    if (lower.endsWith(".exe")) return <RiWindowsFill className="size-4 text-blue-500" />;
    if (lower.endsWith(".pkg") || lower.endsWith(".dmg")) return <RiAppleFill className="size-4 text-slate-800" />;
    if (lower.endsWith(".apk")) return <RiAndroidFill className="size-4 text-emerald-500" />;
    return <RiDownload2Line className="size-4 text-slate-500" />;
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
        setDownloadedFilePath(result.filePath);
        // Automatically proceed to launch installer after brief confirmation
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

  const handleManualBrowserDownload = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const recommendedAsset = release.recommendedAsset;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white p-6 pb-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
            aria-label="Close"
          >
            <RiCloseLine className="size-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
              <RiSparklingFill className="size-3 text-amber-300" /> New Update Available
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/30 backdrop-blur-md text-white text-[11px] font-semibold border border-emerald-300/40">
              <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Pushed to GitHub now
            </span>
            <span className="text-xs text-blue-100">
              Current: v{currentVersion}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
            {release.name || `Invoice Gen v${release.version}`}
          </h2>
          <p className="text-sm text-blue-100/90">
            Pushed to GitHub on {new Date(release.publishedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* In-App Direct Download & Auto-Install Card */}
          {recommendedAsset && (
            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-sm shadow-blue-500/30">
                    <RiDownload2Line className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Seamless In-App Upgrade
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                        No Setup Wizard
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 capitalize">
                        {platform}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 font-mono">
                      {recommendedAsset.name} {recommendedAsset.size ? `(${formatFileSize(recommendedAsset.size)})` : ""}
                    </p>
                  </div>
                </div>

                {downloadState === "idle" && (
                  <button
                    onClick={() => handleStartInAppUpdate(recommendedAsset)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all shrink-0 active:scale-95 cursor-pointer"
                  >
                    <span>Update Now</span>
                    <RiArrowRightLine className="size-4" />
                  </button>
                )}
              </div>

              {/* Downloading Progress Bar */}
              {downloadState === "downloading" && (
                <div className="space-y-2 pt-2 border-t border-blue-200/60 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <RiRefreshLine className="size-3.5 animate-spin text-blue-600" />
                      Downloading update package directly in app...
                    </span>
                    <span className="font-mono text-blue-600">{downloadProgress.percent}%</span>
                  </div>

                  <div className="w-full bg-blue-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>
                      {formatFileSize(downloadProgress.bytesReceived)} / {formatFileSize(downloadProgress.totalBytes)}
                    </span>
                    {downloadProgress.speed > 0 && (
                      <span>Speed: {formatSpeed(downloadProgress.speed)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Downloaded / Installing State */}
              {(downloadState === "downloaded" || downloadState === "installing") && (
                <div className="p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <RiCheckboxCircleFill className="size-5 text-emerald-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950">
                        {downloadState === "installing"
                          ? "Updating application & restarting..."
                          : platform === "android"
                          ? "APK Package Downloaded!"
                          : "Download Complete!"}
                      </h5>
                      <p className="text-[11px] text-emerald-800">
                        {downloadState === "installing"
                          ? "Invoice Gen will reload automatically with the updated version."
                          : platform === "android"
                          ? "Tap Install APK below or check your notifications to finish installing."
                          : "Ready to update."}
                      </p>
                    </div>
                  </div>

                  {platform === "android" && recommendedAsset && (
                    <a
                      href={recommendedAsset.downloadUrl}
                      target="_system"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      Install APK
                    </a>
                  )}

                  {downloadState === "downloaded" && downloadedFilePath && platform !== "android" && (
                    <button
                      onClick={() => {
                        setDownloadState("installing");
                        installUpdate(downloadedFilePath);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      Install Now
                    </button>
                  )}
                </div>
              )}

              {/* Error State */}
              {downloadState === "error" && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                  <RiAlertFill className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">In-app update encountered an issue</p>
                    <p className="text-[11px] text-red-600 mt-0.5">{downloadError}</p>
                    <button
                      onClick={() => handleManualBrowserDownload(recommendedAsset.downloadUrl)}
                      className="inline-flex items-center gap-1 text-blue-700 underline font-semibold mt-1 cursor-pointer"
                    >
                      <span>Download directly from browser instead</span>
                      <RiExternalLinkLine className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Release Notes / What's New */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              What's New in v{release.version}
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
              {release.body || "Detailed improvements and bug fixes are included in this release."}
            </div>
          </div>

          {/* All Platform Packages Toggle */}
          {release.assets.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowAllDownloads(!showAllDownloads)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-blue-600 py-1 cursor-pointer"
              >
                <span>All Available Platform Packages ({release.assets.length})</span>
                <span className="text-blue-600 text-xs">{showAllDownloads ? "Hide" : "Show All"}</span>
              </button>

              {showAllDownloads && (
                <div className="mt-3 space-y-2">
                  {release.assets.map((asset) => (
                    <div
                      key={asset.name}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {getAssetIcon(asset.name)}
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {asset.name}
                        </span>
                        {asset.size > 0 && (
                          <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                            {formatFileSize(asset.size)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDesktop && (
                          <button
                            onClick={() => handleStartInAppUpdate(asset)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                            Install
                          </button>
                        )}
                        <button
                          onClick={() => handleManualBrowserDownload(asset.downloadUrl)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Browser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleSkipVersion}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            Skip this version
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleManualBrowserDownload(release.htmlUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <span>View on GitHub</span>
              <RiExternalLinkLine className="size-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
