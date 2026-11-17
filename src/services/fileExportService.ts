// ─── Unified Mobile & Desktop File Export Service ─────────────────────────
// Handles saving, downloading, and native sharing of files (Excel, PDF, JSON)
// across Android (Capacitor), Desktop (Electron), and Web Browsers.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from '@/components/base/toast/toast';
import { haptics } from './nativeMobileService';

/**
 * Robust conversion from ArrayBuffer / Uint8Array to base64 string.
 * Chunked to avoid JavaScript call-stack limit on large files (>100KB).
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export interface ExportFileOptions {
  fileName: string;
  data: ArrayBuffer | Uint8Array | string | Blob;
  mimeType: string;
  shareImmediately?: boolean;
  dialogTitle?: string;
  successMessage?: string;
}

export interface ExportFileResult {
  success: boolean;
  uri?: string;
  filePath?: string;
  error?: string;
}

/**
 * Unified file export and save engine.
 * 
 * • On Native Android / iOS (Capacitor):
 *   Writes binary or text data directly to the device's Documents storage (`Directory.Documents`).
 *   Retrieves the native FileProvider content URI (`content://...` or `file://...`).
 *   If `shareImmediately` is true (default), automatically triggers Android's native Share Sheet
 *   attaching the REAL FILE so the user can send it via WhatsApp, attach it in Gmail,
 *   save it to Google Drive, or open it in Excel/PDF viewers.
 * 
 * • On Desktop Electron:
 *   Invokes desktop save dialog via IPC (`window.invoiceDesktop.saveExcel` / `savePdf`).
 * 
 * • On Web Browser:
 *   Creates a standard Blob object and triggers an `<a>` download element.
 */
export async function exportAndSaveFile(options: ExportFileOptions): Promise<ExportFileResult> {
  const {
    fileName,
    data,
    mimeType,
    shareImmediately = true,
    dialogTitle = `Share ${fileName}`,
    successMessage,
  } = options;

  haptics.selection();

  // 1. Native Mobile (Capacitor Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      let base64Data: string;
      if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          base64Data = data.split(',')[1];
        } else {
          // Plaintext string (e.g. JSON export) -> UTF-8 safe base64
          base64Data = btoa(unescape(encodeURIComponent(data)));
        }
      } else if (data instanceof Blob) {
        const buffer = await data.arrayBuffer();
        base64Data = arrayBufferToBase64(buffer);
      } else {
        base64Data = arrayBufferToBase64(data);
      }

      // 1. Always write to Cache directory first.
      // On Android, Cache directory (context.cacheDir) NEVER requires runtime storage permissions,
      // and is mapped in file_paths.xml via <cache-path name="my_cache_images" path="." />.
      // This guarantees FileProvider can instantly create a valid, shareable content:// URI.
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Retrieve native content/file URI from Cache directory
      const cacheUriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      // 2. Also persist to internal app Data directory so it's permanently preserved on-device
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data,
          recursive: true,
        });
      } catch (dataDirErr) {
        console.warn('Failed to save to internal Data directory:', dataDirErr);
      }

      // 3. Attempt to save in public Documents directory if permitted
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (docDirErr) {
        // Scoped storage on Android 11+ might restrict direct Documents write without intent
        console.warn('Documents directory write bypassed or restricted:', docDirErr);
      }

      if (shareImmediately) {
        try {
          await Share.share({
            title: fileName,
            files: [cacheUriResult.uri],
            dialogTitle,
          });
        } catch (shareErr: any) {
          // User dismissed the share sheet - not an error
          if (shareErr?.name !== 'AbortError') {
            console.warn('Share intent error:', shareErr);
          }
        }
      }

      const msg = successMessage || `Ready & Saved: ${fileName}`;
      toast.success(msg);
      haptics.success();
      return { success: true, uri: cacheUriResult.uri, filePath: fileName };
    } catch (err: any) {
      console.error('Native mobile file export failed:', err);
      toast.error(`Export failed: ${err?.message || err}`);
      haptics.error();
      return { success: false, error: String(err?.message || err) };
    }
  }

  // 2. Desktop Electron Environment
  if (typeof window !== 'undefined' && (window as any).invoiceDesktop) {
    try {
      let base64Data: string;
      if (typeof data === 'string') {
        base64Data = data.startsWith('data:') ? data.split(',')[1] : btoa(unescape(encodeURIComponent(data)));
      } else if (data instanceof Blob) {
        const buffer = await data.arrayBuffer();
        base64Data = arrayBufferToBase64(buffer);
      } else {
        base64Data = arrayBufferToBase64(data);
      }

      if (fileName.endsWith('.xlsx') && (window as any).invoiceDesktop.saveExcel) {
        const res = await (window as any).invoiceDesktop.saveExcel({
          defaultFilename: fileName,
          base64: base64Data,
        });
        if (res.success && res.filePath) {
          toast.success(`Saved Excel to: ${res.filePath}`);
          haptics.success();
          return { success: true, filePath: res.filePath };
        } else if (res.canceled) {
          return { success: false, error: 'Canceled by user' };
        }
      } else if (fileName.endsWith('.pdf') && (window as any).invoiceDesktop.savePdf) {
        const res = await (window as any).invoiceDesktop.savePdf({
          defaultFilename: fileName,
        });
        if (res.success && res.filePath) {
          toast.success(`Saved PDF to: ${res.filePath}`);
          haptics.success();
          return { success: true, filePath: res.filePath };
        } else if (res.canceled) {
          return { success: false, error: 'Canceled by user' };
        }
      }
    } catch (err) {
      console.warn('Electron native save failed, falling back to web download:', err);
    }
  }

  // 3. Web Browser Fallback (Blob + <a> download link)
  try {
    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType });
    } else {
      blob = new Blob([data as any], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const msg = successMessage || `Exported: ${fileName}`;
    toast.success(msg);
    haptics.success();
    return { success: true, filePath: fileName };
  } catch (err: any) {
    toast.error(`Download failed: ${err?.message || err}`);
    haptics.error();
    return { success: false, error: String(err?.message || err) };
  }
}
