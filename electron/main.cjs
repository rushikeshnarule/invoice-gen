// ─── Electron Desktop Main Process ────────────────────────────────────
// Standalone desktop runtime for Invoice Gen (macOS & Windows).
// Embedded local HTTP server ensures offline SPA routing, fixed-origin persistence,
// and automatic system storage directly in the user's Documents folder.
// This ensures memory survives uninstalls, restarts, and re-downloads on both Mac and Windows.

const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const isMac = process.platform === 'darwin';

let mainWindow = null;
let server = null;
let serverPort = 48721;

const PREFERRED_PORT = 48721;

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

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.listen(startPort, '127.0.0.1', () => {
      const port = testServer.address().port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function startLocalServer(distPath) {
  return new Promise(async (resolve, reject) => {
    const portToUse = await findAvailablePort(PREFERRED_PORT);
    serverPort = portToUse;

    server = http.createServer((req, res) => {
      // Enable CORS for flexibility
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const parsedUrl = new URL(req.url, `http://localhost:${serverPort}`);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // ─── API: System Storage Status & Metadata ───
        if (pathname === '/api/system-storage/info' && req.method === 'GET') {
          const { dataDir, dbFile } = getStoragePaths();
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf8');
              const stats = fs.statSync(dbFile);
              const parsed = JSON.parse(content);
              const invoiceCount = Array.isArray(parsed.invoices) ? parsed.invoices.length : 0;
              const businessName =
                parsed.businessProfile && parsed.businessProfile.name
                  ? parsed.businessProfile.name
                  : '';

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
              const parsed = JSON.parse(content);
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
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { dataDir, dbFile, backupsDir } = getStoragePaths();
              fs.mkdirSync(dataDir, { recursive: true });
              fs.mkdirSync(backupsDir, { recursive: true });

              const parsed = JSON.parse(body);
              const tmpFile = path.join(dataDir, `database.tmp.${Date.now()}.json`);
              fs.writeFileSync(tmpFile, JSON.stringify(parsed, null, 2), 'utf8');
              fs.renameSync(tmpFile, dbFile);

              // Create daily rolling backup snapshot
              const dateStr = new Date().toISOString().split('T')[0];
              const dailyBackup = path.join(backupsDir, `backup-${dateStr}.json`);
              if (!fs.existsSync(dailyBackup)) {
                fs.copyFileSync(dbFile, dailyBackup);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  path: dbFile,
                  savedAt: new Date().toISOString(),
                })
              );
            } catch (err) {
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

        // ─── Static SPA Routing ───
        let safePath = path.normalize(path.join(distPath, pathname));
        if (!safePath.startsWith(distPath)) {
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
  const distPath = path.join(__dirname, '../dist');

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

  const iconIco = path.join(__dirname, '../public/icon.ico');
  const iconPng = path.join(__dirname, '../public/icon.png');
  const iconPath = isMac
    ? (fs.existsSync(iconPng) ? iconPng : iconIco)
    : (fs.existsSync(iconIco) ? iconIco : fs.existsSync(iconPng) ? iconPng : path.join(__dirname, '../public/favicon.svg'));

  if (isMac && app.dock && fs.existsSync(iconPng)) {
    try {
      app.dock.setIcon(iconPng);
    } catch {
      // Dock icon is handled automatically by OS in production app bundle
    }
  }

  setupApplicationMenu();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Invoice Gen',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: !isMac,
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the application from the stable fixed-origin loopback server
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/invoices`);

  // Handle external link clicks in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

ipcMain.handle('desktop:print', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return { success: false };
  win.webContents.print({ silent: false, printBackground: true });
  return { success: true };
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
