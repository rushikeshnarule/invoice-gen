// ─── Electron Desktop Main Process ────────────────────────────────────
// Standalone desktop runtime for Invoice Gen (macOS & Windows).
// Embedded local HTTP server ensures offline SPA routing, fixed-origin persistence,
// and automatic system storage directly in the user's Documents folder.
// This ensures memory survives uninstalls, restarts, and re-downloads on both Mac and Windows.

const { app, BrowserWindow, shell, Menu, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const originalFs = require('original-fs');
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');

// On Windows, explicitly register the Application User Model ID so the taskbar groups properly
// and displays the correct application icon instead of generic electron
if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('com.invoicegen.desktop');
  } catch {}
}

// Enforce single instance across desktop platforms: prevent duplicate background processes
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const isMac = process.platform === 'darwin';

// Generate cryptographically strong loopback session token to prevent cross-site exfiltration
const sessionAuthToken = crypto.randomBytes(32).toString('hex');
process.env.INVOICE_SESSION_TOKEN = sessionAuthToken;

// In-memory set of legitimate updates downloaded and validated by our updater
const validDownloadedUpdates = new Set();

/**
 * Safe JSON parser with prototype pollution protection (CWE-1321)
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch (err) {
    if (fallback !== null) return fallback;
    throw err;
  }
}

/**
 * Validate that a download URL points to an authorized release distribution host (SSRF / CWE-918 prevention)
 */
function isTrustedDownloadUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'github.com' ||
      host === 'api.github.com' ||
      host.endsWith('.github.com') ||
      host === 'githubusercontent.com' ||
      host.endsWith('.githubusercontent.com') ||
      host.endsWith('.amazonaws.com')
    );
  } catch {
    return false;
  }
}

let pendingOpenedFile = null;

function detectOpenedFileFromArgv(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (typeof arg === 'string' && (arg.endsWith('.inv') || arg.endsWith('.invoice') || arg.endsWith('.json'))) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          return path.resolve(arg);
        }
      } catch {}
    }
  }
  return null;
}

const initialFile = detectOpenedFileFromArgv(process.argv);
if (initialFile) {
  pendingOpenedFile = initialFile;
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  pendingOpenedFile = filePath;
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('app:file-opened', filePath);
  }
});

let mainWindow = null;
let server = null;
let serverPort = 48721;

const PREFERRED_PORT = 48721;
const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50MB request limit

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getStoragePaths() {
  let docsDir;
  try {
    docsDir = app.getPath('documents');
  } catch {
    docsDir = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Documents');
  }
  const dataDir = path.join(docsDir, 'Invoice Gen Data');
  const dbFile = path.join(dataDir, 'database.json');
  const backupsDir = path.join(dataDir, 'backups');
  return { dataDir, dbFile, backupsDir };
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port <= 65535; port++) {
    try {
      const availablePort = await new Promise((resolve, reject) => {
        const testServer = http.createServer();
        testServer.listen(port, '127.0.0.1', () => {
          const p = testServer.address().port;
          testServer.close(() => resolve(p));
        });
        testServer.on('error', (err) => {
          try { testServer.close(); } catch {}
          reject(err);
        });
      });
      return availablePort;
    } catch {
      // Port in use, proceed to next port in sequence
    }
  }
  throw new Error(`No available loopback port found between ${startPort} and 65535`);
}

async function startLocalServer(distPath) {
  const portToUse = await findAvailablePort(PREFERRED_PORT);
  serverPort = portToUse;

  return new Promise((resolve, reject) => {

    server = http.createServer((req, res) => {
      // Hardened Security Headers on all responses
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' data: blob: https://rushi-invoice-templates.netlify.app; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:* http://localhost:* https://rushi-invoice-templates.netlify.app https://api.github.com https://github.com https://*.githubusercontent.com https://objects.githubusercontent.com; img-src 'self' data: blob: https:;"
      );

      // Validate Host header to protect against DNS rebinding attacks
      const reqHost = req.headers.host || '';
      const allowedHosts = [`127.0.0.1:${serverPort}`, `localhost:${serverPort}`, '127.0.0.1', 'localhost'];
      if (reqHost && !allowedHosts.includes(reqHost)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
        return;
      }

      // Strict Origin validation (disallow wildcard CORS; restrict to local application origin)
      const reqOrigin = req.headers.origin;
      const allowedOrigin = `http://127.0.0.1:${serverPort}`;
      if (reqOrigin) {
        if (reqOrigin === allowedOrigin || reqOrigin === `http://localhost:${serverPort}`) {
          res.setHeader('Access-Control-Allow-Origin', reqOrigin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-invoice-token');
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Cross-origin access disallowed' }));
          return;
        }
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const parsedUrl = new URL(req.url, `http://localhost:${serverPort}`);
        let pathname;
        try {
          pathname = decodeURIComponent(parsedUrl.pathname);
        } catch {
          pathname = parsedUrl.pathname;
        }

        // Enforce session authentication token on all system storage APIs
        if (pathname.startsWith('/api/system-storage')) {
          const rawToken = req.headers['x-invoice-token'];
          const reqToken = typeof rawToken === 'string' ? rawToken.trim() : '';
          const isValid =
            reqToken.length === sessionAuthToken.length &&
            crypto.timingSafeEqual(Buffer.from(reqToken), Buffer.from(sessionAuthToken));
          if (!isValid) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing session token' }));
            return;
          }
        }

        // ─── API: System Storage Status & Metadata ───
        if (pathname === '/api/system-storage/info' && req.method === 'GET') {
          const { dbFile } = getStoragePaths();
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf8');
              const stats = fs.statSync(dbFile);
              const parsed = safeJsonParse(content, {});
              const DEMO_IDS = new Set(['inv-089', 'inv-090', 'inv-091', 'inv-092', 'inv-093']);
              const realInvoices = Array.isArray(parsed.invoices)
                ? parsed.invoices.filter((inv) => !DEMO_IDS.has(inv?.id) && !/^inv-0(89|90|91|92|93)$/i.test(inv?.id || ''))
                : [];
              const invoiceCount = realInvoices.length;
              const businessName =
                parsed.businessProfile && parsed.businessProfile.name
                  ? parsed.businessProfile.name
                  : '';
              const isDemoBiz = !businessName || businessName.includes('Apex Infotech') || businessName === 'My Business';

              if (invoiceCount === 0 && isDemoBiz) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ exists: false, path: dbFile }));
                return;
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  exists: true,
                  path: dbFile,
                  businessName,
                  invoiceCount,
                  lastModified: stats.mtime.toISOString(),
                  hasCompletedSetup: Boolean(parsed.hasCompletedSetup),
                })
              );
              return;
            } catch (err) {
              console.error('Failed to inspect database:', err);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: false, path: dbFile }));
          return;
        }

        // ─── API: Load System Storage ───
        if (pathname === '/api/system-storage' && req.method === 'GET') {
          const { dbFile } = getStoragePaths();
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf8');
              const stats = fs.statSync(dbFile);
              const parsed = safeJsonParse(content, {});
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  exists: true,
                  path: dbFile,
                  lastModified: stats.mtime.toISOString(),
                  data: parsed,
                })
              );
              return;
            } catch (err) {
              console.error('Failed to read system database:', err);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: false, path: dbFile }));
          return;
        }

        // ─── API: Save System Storage (Atomic write + daily snapshot) ───
        if (pathname === '/api/system-storage' && req.method === 'POST') {
          let body = '';
          let aborted = false;
          req.on('data', (chunk) => {
            if (aborted) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              aborted = true;
              req.destroy();
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Payload too large (50MB max)' }));
            }
          });
          req.on('end', () => {
            if (aborted) return;
            let tmpFile = null;
            try {
              const { dataDir, dbFile, backupsDir } = getStoragePaths();
              fs.mkdirSync(dataDir, { recursive: true });
              fs.mkdirSync(backupsDir, { recursive: true });

              let existing = {};
              if (fs.existsSync(dbFile)) {
                try {
                  existing = safeJsonParse(fs.readFileSync(dbFile, 'utf8'), {}) || {};
                } catch {
                  existing = {};
                }
              }

              const parsed = safeJsonParse(body, {});
              const merged = { ...existing, ...parsed };
              if (existing.licenseData && !parsed.licenseData) {
                merged.licenseData = existing.licenseData;
              }

              tmpFile = path.join(dataDir, `database.tmp.${Date.now()}.json`);
              fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf8');
              fs.renameSync(tmpFile, dbFile);
              tmpFile = null;

              // Create daily rolling backup snapshot
              const dateStr = new Date().toISOString().split('T')[0];
              const dailyBackup = path.join(backupsDir, `backup-${dateStr}.json`);
              if (!fs.existsSync(dailyBackup)) {
                fs.copyFileSync(dbFile, dailyBackup);
              }

              // Rotate daily backups: retain last 30 backups to prevent disk exhaustion
              try {
                const files = fs.readdirSync(backupsDir)
                  .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
                  .sort()
                  .reverse();
                if (files.length > 30) {
                  for (const oldFile of files.slice(30)) {
                    try { fs.unlinkSync(path.join(backupsDir, oldFile)); } catch {}
                  }
                }
              } catch {}

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  path: dbFile,
                  savedAt: new Date().toISOString(),
                })
              );
            } catch (err) {
              if (tmpFile && fs.existsSync(tmpFile)) {
                try { fs.unlinkSync(tmpFile); } catch {}
              }
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // ─── API: Reveal Storage Folder in Explorer ───
        if (pathname === '/api/system-storage/open-folder' && req.method === 'POST') {
          const { dataDir } = getStoragePaths();
          fs.mkdirSync(dataDir, { recursive: true });
          shell.openPath(dataDir);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, path: dataDir }));
          return;
        }

        // ─── API: License Data Storage (Persistent PC Memory) ───
        if (pathname === '/api/system-storage/license' && req.method === 'GET') {
          const { dbFile } = getStoragePaths();
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf8');
              const parsed = safeJsonParse(content, null);
              if (parsed && parsed.licenseData) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ exists: true, licenseData: parsed.licenseData }));
                return;
              }
            } catch (err) {
              console.error('Failed to read license from database:', err);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: false }));
          return;
        }

        if (pathname === '/api/system-storage/license' && req.method === 'POST') {
          let body = '';
          let aborted = false;
          req.on('data', (chunk) => {
            if (aborted) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              aborted = true;
              req.destroy();
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Payload too large (50MB max)' }));
            }
          });
          req.on('end', () => {
            if (aborted) return;
            let tmpFile = null;
            try {
              const { dataDir, dbFile } = getStoragePaths();
              fs.mkdirSync(dataDir, { recursive: true });

              let existing = {};
              if (fs.existsSync(dbFile)) {
                try {
                  existing = safeJsonParse(fs.readFileSync(dbFile, 'utf8'), {}) || {};
                } catch {
                  existing = {};
                }
              }

              const licensePayload = safeJsonParse(body, {});
              existing.licenseData = licensePayload;
              existing.updatedAt = new Date().toISOString();

              tmpFile = path.join(dataDir, `database.tmp.${Date.now()}.json`);
              fs.writeFileSync(tmpFile, JSON.stringify(existing, null, 2), 'utf8');
              fs.renameSync(tmpFile, dbFile);
              tmpFile = null;

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, savedAt: existing.updatedAt }));
            } catch (err) {
              if (tmpFile && fs.existsSync(tmpFile)) {
                try { fs.unlinkSync(tmpFile); } catch {}
              }
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // ─── Static SPA Routing ───
        const resolvedDist = path.resolve(distPath);
        const resolvedDistLower = resolvedDist.toLowerCase();
        let safePath = path.resolve(path.join(distPath, pathname));

        // Windows case-insensitive boundary check to prevent directory traversal
        if (!safePath.toLowerCase().startsWith(resolvedDistLower)) {
          safePath = path.join(distPath, 'index.html');
        }

        // If file doesn't exist (SPA client route like /invoices or /print), serve index.html
        if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
          safePath = path.join(distPath, 'index.html');
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(safePath, (err, content) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          });
          res.end(content);
        });
      } catch (err) {
        console.error('Static server handler error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
    });

    server.listen(serverPort, '127.0.0.1', () => {
      resolve(serverPort);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

function setupApplicationMenu() {
  if (isMac) {
    const template = [
      {
        label: app.name || 'Invoice Gen',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Open Data Folder',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => {
              const { dataDir } = getStoragePaths();
              fs.mkdirSync(dataDir, { recursive: true });
              shell.openPath(dataDir);
            },
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Invoice',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              if (mainWindow) {
                mainWindow.loadURL(`http://127.0.0.1:${serverPort}/invoices`);
              }
            },
          },
          {
            label: 'Open System Data Directory',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              const { dataDir } = getStoragePaths();
              fs.mkdirSync(dataDir, { recursive: true });
              shell.openPath(dataDir);
            },
          },
          { type: 'separator' },
          { role: 'close' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    Menu.setApplicationMenu(null);
  }
}

async function createWindow() {
  const baseAppPath = app.getAppPath();
  let distPath = path.join(baseAppPath, 'dist');
  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
    distPath = path.join(__dirname, '../dist');
  }

  // Verify production build exists
  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error('dist/index.html not found. Please build the project first.');
  }

  if (!server) {
    try {
      await startLocalServer(distPath);
    } catch (err) {
      console.error('Failed to start local static server:', err);
    }
  }

  const candidateIconPaths = [
    path.join(baseAppPath, 'build/icon.ico'),
    path.join(baseAppPath, 'public/icon.ico'),
    path.join(baseAppPath, 'dist/icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(process.resourcesPath || '', 'build/icon.ico'),
    path.join(process.resourcesPath || '', 'public/icon.ico'),
    path.join(baseAppPath, 'build/icon.png'),
    path.join(baseAppPath, 'public/icon.png'),
    path.join(baseAppPath, 'dist/icon.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../public/icon.png'),
  ];

  let resolvedIconPath = candidateIconPaths.find((p) => p && fs.existsSync(p));
  let windowIcon = null;
  if (resolvedIconPath) {
    try {
      windowIcon = nativeImage.createFromPath(resolvedIconPath);
    } catch (err) {
      console.error('Failed to create nativeImage from icon:', err);
    }
  }

  if (isMac && app.dock) {
    const dockIconPath = [
      path.join(baseAppPath, 'public/icon.png'),
      path.join(baseAppPath, 'build/icon.png'),
      path.join(__dirname, '../public/icon.png'),
    ].find((p) => p && fs.existsSync(p));
    if (dockIconPath) {
      try {
        app.dock.setIcon(dockIconPath);
      } catch {}
    }
  }

  setupApplicationMenu();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Invoice Gen',
    icon: (windowIcon && !windowIcon.isEmpty()) ? windowIcon : (resolvedIconPath || undefined),
    autoHideMenuBar: !isMac,
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    },
  });

  if (process.platform === 'win32' && windowIcon && !windowIcon.isEmpty()) {
    try {
      mainWindow.setIcon(windowIcon);
    } catch {}
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the application from the stable fixed-origin loopback server
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/invoices`);

  // Handle external link clicks safely: validate scheme and restrict to safe web protocols
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
        Number(parsed.port) === serverPort
      ) {
        return { action: 'allow' };
      }
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      } else {
        console.warn(`[Security] Blocked attempt to open unsafe URL scheme: ${parsed.protocol}`);
      }
    } catch {
      console.warn(`[Security] Blocked malformed URL: ${url}`);
    }
    return { action: 'deny' };
  });

  // Guard against untrusted external navigation inside the main window
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
        Number(parsed.port) === serverPort
      ) {
        return;
      }
    } catch {}
    event.preventDefault();
    console.warn(`[Security] Prevented untrusted navigation to: ${navigationUrl}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Session Token IPC (Sandboxed Preload Bridge) ──────────────────────────
ipcMain.on('desktop:get-session-token-sync', (event) => {
  event.returnValue = sessionAuthToken;
});
ipcMain.handle('desktop:get-session-token', () => sessionAuthToken);

// ─── Native PDF Export & Print IPC ──────────────────────────────────────
ipcMain.handle('desktop:save-pdf', async (event, args) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const rawFilename = (args && args.defaultFilename) ? args.defaultFilename : 'invoice.pdf';
  const safeFilename = rawFilename.replace(/[\\/:*?"<>|]/g, '-');
  
  let defaultDir;
  try {
    defaultDir = app.getPath('documents');
  } catch {
    defaultDir = process.env.USERPROFILE || process.env.HOME || '.';
  }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Invoice as PDF',
    defaultPath: path.join(defaultDir, safeFilename),
    filters: [
      { name: 'PDF Document', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    if (args && args.base64) {
      const cleanBase64 = String(args.base64).replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    }
    const pdfBuffer = await event.sender.printToPDF({
      printBackground: true,
      pageSize: args?.paper === 'A5' ? 'A5' : 'A4',
    });
    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:save-excel', async (event, args) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const rawFilename = (args && args.defaultFilename) ? args.defaultFilename : 'invoice.xlsx';
  const safeFilename = rawFilename.replace(/[\\/:*?"<>|]/g, '-');

  let defaultDir;
  try {
    defaultDir = app.getPath('documents');
  } catch {
    defaultDir = process.env.USERPROFILE || process.env.HOME || '.';
  }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Invoice as Excel Sheet',
    defaultPath: path.join(defaultDir, safeFilename),
    filters: [
      { name: 'Excel Spreadsheet (*.xlsx)', extensions: ['xlsx'] },
      { name: 'All Files', extensions: ['*'] }
    ],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    const base64Data = args.base64;
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to save Excel file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:print', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return { success: false };
  win.webContents.print({ silent: false, printBackground: true });
  return { success: true };
});

ipcMain.handle('desktop:get-machine-info', async () => {
  let machineId = '';
  let osName = 'Windows';
  const platform = process.platform === 'win32' ? 'windows' : (process.platform === 'darwin' ? 'mac' : 'linux');

  if (process.platform === 'win32') {
    try {
      const reg = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8', timeout: 2000, windowsHide: true });
      const m = reg.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/i);
      if (m) machineId = m[1].trim();
    } catch {}

    try {
      const ver = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).Caption"', { encoding: 'utf8', timeout: 2000, windowsHide: true });
      if (ver.trim()) osName = ver.trim();
    } catch {
      osName = `Windows ${os.release()}`;
    }
  } else if (process.platform === 'darwin') {
    try {
      const ioreg = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8', timeout: 2000 });
      const m = ioreg.match(/"IOPlatformUUID"\s+=\s+"([^"]+)"/i);
      if (m) machineId = m[1].trim();
    } catch {}
    try {
      const sw = execSync('sw_vers -productVersion', { encoding: 'utf8', timeout: 2000 });
      osName = `macOS ${sw.trim()}`;
    } catch {
      osName = 'macOS';
    }
  } else {
    try {
      if (fs.existsSync('/etc/machine-id')) {
        machineId = fs.readFileSync('/etc/machine-id', 'utf8').trim();
      } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
        machineId = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
      }
    } catch {}
    osName = `Linux ${os.release()}`;
  }

  if (!machineId) {
    machineId = `${os.hostname()}-${os.arch()}`;
  }

  const cpus = os.cpus() || [];
  const cpuModel = cpus[0] ? cpus[0].model.trim() : 'Unknown CPU';
  const cpuCores = cpus.length;
  const ramGB = (os.totalmem() / 1073741824).toFixed(1) + ' GB';
  let username = '';
  try {
    username = os.userInfo() ? os.userInfo().username : '';
  } catch {}

  return {
    machineId,
    deviceName: os.hostname(),
    platform,
    osVersion: `${osName} (${os.arch()})`,
    arch: os.arch(),
    cpuModel,
    cpuCores,
    ramGB,
    username,
    appVersion: 'v' + app.getVersion(),
  };
});

ipcMain.on('desktop:get-app-version-sync', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.handle('desktop:get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('desktop:get-opened-file', async () => {
  if (pendingOpenedFile && fs.existsSync(pendingOpenedFile)) {
    try {
      const content = fs.readFileSync(pendingOpenedFile, 'utf8');
      const file = pendingOpenedFile;
      pendingOpenedFile = null;
      return { success: true, filePath: file, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false };
});

// ─── Direct In-App Auto-Update & Installer Engine ───────────────────────
function fetchGitHubRelease() {
  return new Promise((resolve, reject) => {
    const fetchUrl = (url, fallback = true) => {
      const parsed = new URL(url);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Invoice-Gen-Workstation-Desktop',
          'Accept': 'application/vnd.github.v3+json',
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = safeJsonParse(body);
              if (Array.isArray(parsedData)) {
                return resolve(parsedData[0] || null);
              }
              return resolve(parsedData);
            } catch {
              return reject(new Error('Failed to parse release JSON'));
            }
          }
          if (fallback && url.endsWith('/latest')) {
            return fetchUrl('https://api.github.com/repos/rushikeshnarule/invoice-gen/releases', false);
          }
          reject(new Error(`GitHub API returned status ${res.statusCode}`));
        });
      });
      req.on('error', (err) => {
        if (fallback && url.endsWith('/latest')) {
          return fetchUrl('https://api.github.com/repos/rushikeshnarule/invoice-gen/releases', false);
        }
        reject(err);
      });
    };

    fetchUrl('https://api.github.com/repos/rushikeshnarule/invoice-gen/releases/latest');
  });
}

ipcMain.handle('desktop:check-updates', async () => {
  try {
    const data = await fetchGitHubRelease();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function validateAsarPackage(filePath) {
  let fd;
  try {
    const stats = originalFs.statSync(filePath);
    if (!stats.isFile() || stats.size < 32) {
      return { valid: false, error: 'Downloaded .asar update package is empty or incomplete' };
    }
    const header = Buffer.alloc(16);
    fd = originalFs.openSync(filePath, 'r');
    const bytesRead = originalFs.readSync(fd, header, 0, 16, 0);
    if (bytesRead < 16) {
      return { valid: false, error: 'Downloaded .asar update package header is truncated' };
    }
    // Chromium Pickle ASAR header layout: [4, headerPickleSize, headerPickleSize - 4, jsonLen]
    const firstWord = header.readUInt32LE(0);
    const headerSize = header.readUInt32LE(4);
    if (firstWord !== 4 || headerSize < 8 || headerSize + 8 >= stats.size) {
      return { valid: false, error: 'Downloaded file is not a valid ASAR archive' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err && err.message ? err.message : 'Unable to verify downloaded .asar archive' };
  } finally {
    if (fd !== undefined) {
      try { originalFs.closeSync(fd); } catch {}
    }
  }
}

function downloadFileWithRedirects(fileUrl, destPath, onProgress, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects while downloading update'));
    if (!isTrustedDownloadUrl(fileUrl)) return reject(new Error('Untrusted download URL origin: only HTTPS releases from verified hosts are allowed'));

    const isHttps = fileUrl.startsWith('https');
    const client = isHttps ? https : http;
    // Stage to .part via original-fs so Electron's ASAR virtual-fs never intercepts .asar writes.
    const partPath = `${destPath}.part`;

    const req = client.get(fileUrl, {
      headers: {
        'User-Agent': 'InvoiceGen-Workstation-AutoUpdater',
        'Accept': 'application/octet-stream',
      },
    }, (res) => {
      // Follow redirects (GitHub Releases redirect to AWS S3 / CloudFront storage)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(fileUrl);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        if (!isTrustedDownloadUrl(redirectUrl)) {
          res.resume();
          return reject(new Error('Blocked redirect to untrusted host'));
        }
        res.resume();
        return resolve(downloadFileWithRedirects(redirectUrl, destPath, onProgress, maxRedirects - 1));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Update server returned HTTP status ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let bytesReceived = 0;
      const startTime = Date.now();
      let lastProgressDispatch = 0;

      try {
        if (originalFs.existsSync(partPath)) originalFs.unlinkSync(partPath);
      } catch {}

      const fileStream = originalFs.createWriteStream(partPath);

      res.on('data', (chunk) => {
        bytesReceived += chunk.length;
        const now = Date.now();
        if (now - lastProgressDispatch > 150 || bytesReceived === totalBytes) {
          lastProgressDispatch = now;
          const elapsedSec = (now - startTime) / 1000 || 0.001;
          const speed = bytesReceived / elapsedSec;
          const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesReceived / totalBytes) * 100)) : 0;
          if (onProgress) {
            onProgress({
              percent,
              bytesReceived,
              totalBytes,
              speed,
            });
          }
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          try {
            if (originalFs.existsSync(destPath)) originalFs.unlinkSync(destPath);
            originalFs.renameSync(partPath, destPath);
            resolve({ destPath, totalBytes: bytesReceived });
          } catch (renameErr) {
            try { originalFs.unlinkSync(partPath); } catch {}
            reject(renameErr);
          }
        });
      });

      fileStream.on('error', (err) => {
        try { originalFs.unlinkSync(partPath); } catch {}
        reject(err);
      });
    });

    req.on('error', (err) => {
      try { originalFs.unlinkSync(partPath); } catch {}
      reject(err);
    });
  });
}

ipcMain.handle('desktop:download-update', async (_event, { downloadUrl, fileName }) => {
  if (!downloadUrl) return { success: false, error: 'No download URL specified' };
  if (!isTrustedDownloadUrl(downloadUrl)) {
    return { success: false, error: 'Untrusted download URL origin: only HTTPS releases from verified hosts are allowed' };
  }

  try {
    const tempDir = path.resolve(app.getPath('temp'));
    const safeName = (fileName || 'Invoice-Gen-Update.exe').replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(safeName).toLowerCase();
    if (!['.asar', '.exe', '.pkg', '.dmg'].includes(ext)) {
      return { success: false, error: 'Disallowed file extension for update package' };
    }

    const destPath = path.resolve(tempDir, safeName);
    if (!destPath.startsWith(tempDir)) {
      return { success: false, error: 'Invalid destination path traversal' };
    }

    if (originalFs.existsSync(destPath)) {
      try { originalFs.unlinkSync(destPath); } catch {}
    }

    await downloadFileWithRedirects(downloadUrl, destPath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('desktop:update-progress', progress);
      }
    });

    if (ext === '.asar') {
      const check = validateAsarPackage(destPath);
      if (!check.valid) {
        try { originalFs.unlinkSync(destPath); } catch {}
        return { success: false, error: check.error };
      }
    }

    validDownloadedUpdates.add(destPath);
    return { success: true, filePath: destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:install-update', async (_event, { filePath }) => {
  if (!filePath) {
    return { success: false, error: 'Update package file not specified' };
  }

  const resolvedPath = path.resolve(filePath);
  const tempDir = path.resolve(app.getPath('temp'));

  // Path containment & verification check (CWE-78 / CWE-426 protection)
  if (!resolvedPath.startsWith(tempDir)) {
    return { success: false, error: 'Access denied: Update file must originate from temporary download directory' };
  }
  if (!validDownloadedUpdates.has(resolvedPath)) {
    return { success: false, error: 'Unauthorized update execution: file was not validated by the updater service' };
  }
  if (!originalFs.existsSync(resolvedPath)) {
    return { success: false, error: 'Update package file not found on disk' };
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if (!['.asar', '.exe', '.pkg', '.dmg'].includes(ext)) {
    return { success: false, error: 'Unsupported file extension for update package' };
  }

  try {
    const isWin = process.platform === 'win32';
    const isDarwin = process.platform === 'darwin';

    // ─── Format 1: Direct In-App .asar Hot-Update (Zero Setup Wizard) ───
    if (ext === '.asar') {
      const check = validateAsarPackage(resolvedPath);
      if (!check.valid) {
        return { success: false, error: check.error };
      }

      let targetAsar = null;

      // Locate current app.asar in production resources using original-fs so Electron does not lock it
      if (process.resourcesPath) {
        const candidate = path.join(process.resourcesPath, 'app.asar');
        if (originalFs.existsSync(candidate)) {
          targetAsar = candidate;
        }
      }
      if (!targetAsar) {
        const appPath = app.getAppPath();
        if (appPath.endsWith('.asar') && originalFs.existsSync(appPath)) {
          targetAsar = appPath;
        }
      }

      // If running unpack or dev, target resources or base
      if (!targetAsar && process.resourcesPath) {
        targetAsar = path.join(process.resourcesPath, 'app.asar');
      }

      if (isWin && targetAsar) {
        // Windows updater: detached helper script waits for parent process to exit,
        // copies updated app.asar into place, relaunches application, and cleans up.
        const updaterBat = path.join(os.tmpdir(), `invoice-gen-update-${Date.now()}.cmd`);
        const appExe = process.execPath;
        const parentPid = process.pid;
        const exeName = path.basename(appExe);
        const cleanNewAsar = filePath.replace(/"/g, '');
        const cleanTargetAsar = targetAsar.replace(/"/g, '');
        const cleanAppExe = appExe.replace(/"/g, '');

        const batContent = `@echo off
setlocal enabledelayedexpansion
set "PARENT_PID=${parentPid}"
set "EXE_NAME=${exeName}"
set "NEW_ASAR=${cleanNewAsar}"
set "TARGET_ASAR=${cleanTargetAsar}"
set "APP_EXE=${cleanAppExe}"

:: Force kill parent Electron process and any lingering child handles
taskkill /f /pid %PARENT_PID% >nul 2>&1
timeout /t 1 /nobreak >nul
taskkill /f /im "%EXE_NAME%" >nul 2>&1
timeout /t 1 /nobreak >nul

set RETRY=0
:RETRY_LOOP
set /a RETRY+=1
copy /y "%NEW_ASAR%" "%TARGET_ASAR%" >nul 2>&1
if not errorlevel 1 goto DONE
if !RETRY! geq 30 goto FAILED
timeout /t 1 /nobreak >nul
goto RETRY_LOOP

:DONE
del /f /q "%NEW_ASAR%" >nul 2>&1
start "" "%APP_EXE%"
(goto) 2>nul & del "%~f0"
exit /b 0

:FAILED
exit /b 1
`;
        fs.writeFileSync(updaterBat, batContent, 'utf8');

        const child = spawn('cmd.exe', ['/c', updaterBat], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();

        if (server) {
          try { server.close(); } catch {}
          server = null;
        }
        setTimeout(() => {
          app.exit(0);
        }, 300);
        return { success: true };
      }

      if (isDarwin && targetAsar) {
        // macOS updater: replaces app.asar inside Invoice Gen.app/Contents/Resources/
        // and immediately re-opens the application bundle.
        const appBundle = path.resolve(process.resourcesPath, '..', '..');
        const updaterSh = path.join(os.tmpdir(), `invoice-gen-update-${Date.now()}.sh`);
        const parentPid = process.pid;
        const shContent = `#!/bin/bash
PARENT_PID="${parentPid}"
NEW_ASAR="${filePath}"
TARGET_ASAR="${targetAsar}"
APP_BUNDLE="${appBundle}"

# Force terminate parent Electron process and any lingering helper instances
kill -9 "$PARENT_PID" 2>/dev/null
pkill -f "Invoice Gen" 2>/dev/null
sleep 1

for i in {1..30}; do
  if cp -f "$NEW_ASAR" "$TARGET_ASAR" 2>/dev/null; then
    rm -f "$NEW_ASAR"
    open "$APP_BUNDLE"
    rm -f "$0"
    exit 0
  fi
  sleep 1
done
exit 1
`;
        fs.writeFileSync(updaterSh, shContent, { mode: 0o755 });

        const child = spawn('/bin/bash', [updaterSh], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        if (server) {
          try { server.close(); } catch {}
          server = null;
        }
        setTimeout(() => {
          app.exit(0);
        }, 300);
        return { success: true };
      }
    }

    // ─── Format 2: Windows Installer Fallback (Silent Mode /S, No GUI Wizard) ───
    if (isWin && ext === '.exe') {
      const isSetup = path.basename(filePath).toLowerCase().includes('setup');
      const updaterBat = path.join(os.tmpdir(), `invoice-gen-installer-${Date.now()}.cmd`);
      const parentPid = process.pid;
      const appExe = process.execPath;
      const exeName = path.basename(appExe);
      const cleanInstaller = filePath.replace(/"/g, '');
      const cleanAppExe = appExe.replace(/"/g, '');

      const batContent = `@echo off
setlocal enabledelayedexpansion
set "PARENT_PID=${parentPid}"
set "EXE_NAME=${exeName}"
set "INSTALLER=${cleanInstaller}"
set "APP_EXE=${cleanAppExe}"

:: Force kill parent Electron process and any lingering instances so setup has zero file locks
taskkill /f /pid %PARENT_PID% >nul 2>&1
timeout /t 1 /nobreak >nul
taskkill /f /im "%EXE_NAME%" >nul 2>&1
timeout /t 1 /nobreak >nul

:: Launch installer silently if setup, or interactive
${isSetup ? 'start "" /wait "%INSTALLER%" /S' : 'start "" /wait "%INSTALLER%"'}

:: Relaunch updated application
start "" "%APP_EXE%"

:: Cleanup installer and script
del /f /q "%INSTALLER%" >nul 2>&1
(goto) 2>nul & del "%~f0"
exit /b 0
`;
      fs.writeFileSync(updaterBat, batContent, 'utf8');

      const child = spawn('cmd.exe', ['/c', updaterBat], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      if (server) {
        try { server.close(); } catch {}
        server = null;
      }
      setTimeout(() => {
        app.exit(0);
      }, 300);
      return { success: true };
    }

    // ─── Format 3: macOS PKG / DMG Fallback ───
    if (isDarwin) {
      const parentPid = process.pid;
      const updaterSh = path.join(os.tmpdir(), `invoice-gen-installer-${Date.now()}.sh`);
      const shContent = `#!/bin/bash
PARENT_PID="${parentPid}"
INSTALLER="${filePath}"

# Force terminate parent Electron process and lingering helpers
kill -9 "$PARENT_PID" 2>/dev/null
pkill -f "Invoice Gen" 2>/dev/null
sleep 1

open "$INSTALLER"
rm -f "$0"
exit 0
`;
      fs.writeFileSync(updaterSh, shContent, { mode: 0o755 });

      const child = spawn('/bin/bash', [updaterSh], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      if (server) {
        try { server.close(); } catch {}
        server = null;
      }
      setTimeout(() => {
        app.exit(0);
      }, 300);
      return { success: true };
    }

    const child = spawn('xdg-open', [filePath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    app.exit(0);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (!isMac) {
    if (server) {
      server.close();
      server = null;
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
    server = null;
  }
});
