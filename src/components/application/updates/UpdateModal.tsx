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
} from "@remixicon/react";
import type { ReleaseInfo } from "@/services/updateService";
import { detectPlatform, saveUpdatePreferences } from "@/services/updateService";

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

  if (!isOpen || !release) return null;

  const { platform } = detectPlatform();

  const handleDownload = (assetUrl: string) => {
    window.open(assetUrl, "_blank", "noopener,noreferrer");
  };

  const handleSkipVersion = () => {
    saveUpdatePreferences({ dismissedVersion: release.version });
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getAssetIcon = (assetName: string) => {
    const lower = assetName.toLowerCase();
    if (lower.endsWith(".exe")) return <RiWindowsFill className="size-4 text-blue-500" />;
    if (lower.endsWith(".pkg") || lower.endsWith(".dmg")) return <RiAppleFill className="size-4 text-slate-800" />;
    if (lower.endsWith(".apk")) return <RiAndroidFill className="size-4 text-emerald-500" />;
    return <RiDownload2Line className="size-4 text-slate-500" />;
  };

  const recommendedAsset = release.recommendedAsset;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white p-6 pb-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close"
          >
            <RiCloseLine className="size-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
              <RiSparklingFill className="size-3 text-amber-300" /> New Update Available
            </span>
            <span className="text-xs text-blue-100">
              Current: v{currentVersion}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
            {release.name || `Invoice Gen v${release.version}`}
          </h2>
          <p className="text-sm text-blue-100/90">
            Released on {new Date(release.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Primary Recommendation Card */}
          {recommendedAsset ? (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                  <RiDownload2Line className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      Recommended for Your Device
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 capitalize">
                      {platform}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 font-mono">
                    {recommendedAsset.name} {recommendedAsset.size ? `(${formatFileSize(recommendedAsset.size)})` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(recommendedAsset.downloadUrl)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <span>Download Now</span>
                <RiArrowRightLine className="size-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Download Update from GitHub</p>
                <p className="text-xs text-slate-500">View release assets and binaries directly.</p>
              </div>
              <button
                onClick={() => handleDownload(release.htmlUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
              >
                <span>Open Release</span>
                <RiExternalLinkLine className="size-3.5" />
              </button>
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
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-blue-600 py-1"
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
                      <button
                        onClick={() => handleDownload(asset.downloadUrl)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-medium transition-colors shrink-0 cursor-pointer"
                      >
                        Download
                      </button>
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
              onClick={() => handleDownload(release.htmlUrl)}
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
