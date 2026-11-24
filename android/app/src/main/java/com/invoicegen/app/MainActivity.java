package com.invoicegen.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {

    private boolean waitingForInstallPermission = false;
    private File downloadedUpdateFile = null;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);

                // Register native Android bridge for printing, PDF generation, and OTA update operations
                webView.addJavascriptInterface(new AndroidNativeInterface(this, webView), "invoiceAndroid");

                // Attach download listener for non-OTA file downloads (Excel, PDF)
                webView.setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                        try {
                            if (url.startsWith("blob:") || url.startsWith("data:")) {
                                Intent intent = new Intent(Intent.ACTION_VIEW);
                                intent.setData(Uri.parse(url));
                                startActivity(intent);
                                return;
                            }

                            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                            request.setMimeType(mimeType);
                            String cookies = CookieManager.getInstance().getCookie(url);
                            if (cookies != null) {
                                request.addRequestHeader("cookie", cookies);
                            }
                            if (userAgent != null) {
                                request.addRequestHeader("User-Agent", userAgent);
                            }
                            request.setDescription("Downloading file from Invoice Gen...");
                            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                            request.setTitle(fileName);
                            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                            if (dm != null) {
                                dm.enqueue(request);
                                Toast.makeText(getApplicationContext(), "Download started: " + fileName, Toast.LENGTH_SHORT).show();
                            }
                        } catch (Exception e) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW);
                                intent.setData(Uri.parse(url));
                                startActivity(intent);
                            } catch (Exception ignored) {}
                        }
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // If returning from the "Install unknown apps" settings screen, resume installation immediately
        if (waitingForInstallPermission && downloadedUpdateFile != null && downloadedUpdateFile.exists()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (getPackageManager().canRequestPackageInstalls()) {
                    waitingForInstallPermission = false;
                    installApk(downloadedUpdateFile);
                }
            }
        }
    }

    public void installApk(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            Toast.makeText(this, "Update package not found", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            // Check unknown app sources permission for Android 8.0+ (API 26+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    waitingForInstallPermission = true;
                    Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    permissionIntent.setData(Uri.parse("package:" + getPackageName()));
                    permissionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(permissionIntent);
                    Toast.makeText(this, "Please allow installation to complete the update", Toast.LENGTH_LONG).show();
                    return;
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(installIntent);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Failed to launch installer: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    public class AndroidNativeInterface {
        private final MainActivity activity;
        private final Context context;
        private final WebView webView;

        public AndroidNativeInterface(MainActivity activity, WebView webView) {
            this.activity = activity;
            this.context = activity;
            this.webView = webView;
        }

        @JavascriptInterface
        public void printDocument(String jobName) {
            if (context == null || webView == null) return;
            webView.post(() -> {
                try {
                    PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        String name = (jobName != null && !jobName.trim().isEmpty()) ? jobName : "Invoice Document";
                        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(name);
                        printManager.print(name, adapter, new PrintAttributes.Builder().build());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public String getPlatformName() {
            return "Android";
        }

        @JavascriptInterface
        public void downloadAndInstallUpdate(final String downloadUrl, final String fileName) {
            if (context == null || webView == null || downloadUrl == null) return;

            updateExecutor.execute(() -> {
                HttpURLConnection connection = null;
                InputStream input = null;
                FileOutputStream output = null;
                try {
                    String currentUrl = downloadUrl;
                    int redirects = 0;
                    while (redirects < 8) {
                        URL url = new URL(currentUrl);
                        connection = (HttpURLConnection) url.openConnection();
                        connection.setInstanceFollowRedirects(true);
                        connection.setConnectTimeout(15000);
                        connection.setReadTimeout(30000);
                        connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) InvoiceGen/1.5.1");
                        connection.connect();
                        int responseCode = connection.getResponseCode();
                        if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                            responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                            responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                            responseCode == 307 || responseCode == 308) {
                            String loc = connection.getHeaderField("Location");
                            if (loc != null && !loc.isEmpty()) {
                                connection.disconnect();
                                currentUrl = loc;
                                redirects++;
                                continue;
                            }
                        }
                        if (responseCode != HttpURLConnection.HTTP_OK) {
                            throw new Exception("HTTP server returned " + responseCode + " " + connection.getResponseMessage());
                        }
                        break;
                    }

                    final int fileLength = connection != null ? connection.getContentLength() : -1;
                    input = connection != null ? connection.getInputStream() : null;
                    if (input == null) throw new Exception("Failed to open input stream");

                    File cacheDir = context.getCacheDir();
                    String actualFileName = (fileName != null && fileName.endsWith(".apk")) ? fileName : "invoice-gen-update.apk";
                    File outputFile = new File(cacheDir, actualFileName);
                    if (outputFile.exists()) {
                        outputFile.delete();
                    }
                    output = new FileOutputStream(outputFile);

                    byte[] data = new byte[8192];
                    long total = 0;
                    int count;
                    long startTime = System.currentTimeMillis();
                    long lastProgressTime = 0;

                    while ((count = input.read(data)) != -1) {
                        total += count;
                        output.write(data, 0, count);

                        long now = System.currentTimeMillis();
                        if (now - lastProgressTime >= 150) {
                            lastProgressTime = now;
                            final long finalTotal = total;
                            final int percent = fileLength > 0 ? (int) ((total * 100) / fileLength) : 0;
                            double elapsedSec = Math.max((now - startTime) / 1000.0, 0.001);
                            final long speed = (long) (total / elapsedSec);

                            webView.post(() -> {
                                webView.evaluateJavascript(
                                    "if (window.__onAndroidUpdateProgress) { window.__onAndroidUpdateProgress(" +
                                    percent + ", " + finalTotal + ", " + fileLength + ", " + speed + "); }",
                                    null
                                );
                            });
                        }
                    }

                    output.flush();
                    downloadedUpdateFile = outputFile;

                    final String filePath = outputFile.getAbsolutePath();
                    final long finalTotal = total;
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (window.__onAndroidUpdateProgress) { window.__onAndroidUpdateProgress(100, " +
                            finalTotal + ", " + finalTotal + ", 0); } " +
                            "if (window.__onAndroidUpdateDownloaded) { window.__onAndroidUpdateDownloaded('" +
                            filePath.replace("\\", "\\\\").replace("'", "\\'") + "'); }",
                            null
                        );
                    });

                    // Trigger native installer prompt
                    webView.post(() -> activity.installApk(outputFile));

                } catch (final Exception e) {
                    e.printStackTrace();
                    webView.post(() -> {
                        String safeMsg = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "Download failed";
                        webView.evaluateJavascript(
                            "if (window.__onAndroidUpdateError) { window.__onAndroidUpdateError('" + safeMsg + "'); }",
                            null
                        );
                    });
                } finally {
                    try {
                        if (output != null) output.close();
                        if (input != null) input.close();
                    } catch (Exception ignored) {}
                    if (connection != null) connection.disconnect();
                }
            });
        }

        @JavascriptInterface
        public void installDownloadedApk(String filePath) {
            File targetFile = (filePath != null && !filePath.trim().isEmpty())
                ? new File(filePath)
                : downloadedUpdateFile;
            if (targetFile == null || !targetFile.exists()) {
                targetFile = new File(context.getCacheDir(), "invoice-gen-update.apk");
            }
            final File finalTarget = targetFile;
            webView.post(() -> activity.installApk(finalTarget));
        }
    }
}
