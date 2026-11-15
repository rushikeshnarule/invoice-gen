import React, { useEffect, useState } from "react";
import {
  RiSparklingFill,
  RiCloseLine,
  RiArrowRightLine,
} from "@remixicon/react";
import {
  checkForUpdates,
  getUpdatePreferences,
  getAppVersion,
  type ReleaseInfo,
} from "@/services/updateService";
import { UpdateModal } from "./UpdateModal";

export const UpdateBanner: React.FC = () => {
  const currentVersion = getAppVersion();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    const prefs = getUpdatePreferences();
    if (!prefs.autoCheckOnStartup) return;

    // Run check silently in background after 2 seconds
    const timer = setTimeout(() => {
      checkForUpdates(false)
        .then((res) => {
          if (res.hasUpdate && res.release) {
            setRelease(res.release);
            setUpdateAvailable(true);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!updateAvailable || dismissedBanner || !release) {
    return (
      <UpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        release={release}
        currentVersion={currentVersion}
      />
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3 md:px-4 py-2 flex items-center justify-between text-xs font-medium shadow-sm transition-all animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-md bg-white/20 shrink-0">
            <RiSparklingFill className="size-3.5 text-amber-300" />
          </span>
          <p className="truncate">
            <span className="font-bold">Invoice Gen v{release.version}</span> is available! Upgrade for new features and improvements.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-bold transition-all text-xs cursor-pointer shadow-sm"
          >
            <span>Update Now</span>
            <RiArrowRightLine className="size-3" />
          </button>
          <button
            onClick={() => setDismissedBanner(true)}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      </div>

      <UpdateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        release={release}
        currentVersion={currentVersion}
      />
    </>
  );
};
