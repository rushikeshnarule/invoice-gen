// ─── Automated Ad Creative Renderer ──────────────────────────────────
// Uses Electron's Chromium engine to render pixel-perfect, high-DPI marketing graphics.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Disable GPU acceleration for deterministic headless rendering
app.disableHardwareAcceleration();

const AD_SPECS = [
  { id: 'ad-square', name: 'ad-1-square-1080x1080.png', width: 1080, height: 1080 },
  { id: 'ad-landscape', name: 'ad-2-landscape-1200x628.png', width: 1200, height: 628 },
  { id: 'ad-story', name: 'ad-3-story-1080x1920.png', width: 1080, height: 1920 },
  { id: 'ad-comparison', name: 'ad-4-comparison-1200x900.png', width: 1200, height: 900 },
  { id: 'ad-cyber', name: 'ad-5-dark-cyber-1200x675.png', width: 1200, height: 675 },
];

async function renderCreatives() {
  const htmlPath = path.resolve(__dirname, '../marketing-assets/templates-render.html');
  const outDir = path.resolve(__dirname, '../marketing-assets');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Initializing headless Electron rendering window...');
  const win = new BrowserWindow({
    width: 1200,
    height: 1200,
    show: false,
    frame: false,
    enableLargerThanScreen: true,
    webPreferences: {
      offscreen: true,
    },
  });

  await win.loadFile(htmlPath);
  console.log('Loaded templates-render.html successfully.');

  // Give web fonts and layout time to settle
  await new Promise((r) => setTimeout(r, 1200));

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`Renderer Console: [${level}] ${message} (${sourceId}:${line})`);
  });

  for (const spec of AD_SPECS) {
    console.log(`Rendering ${spec.name} (${spec.width}x${spec.height})...`);
    win.setContentSize(spec.width, spec.height);

    try {
      await win.webContents.executeJavaScript(`
        try {
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.body.style.overflow = 'hidden';
          document.body.style.background = '#f8fafc';
          
          const containers = document.querySelectorAll('.ad-container');
          for (let i = 0; i < containers.length; i++) {
            containers[i].style.display = 'none';
          }
          
          const target = document.getElementById('${spec.id}');
          if (target) {
            target.style.display = 'flex';
            target.style.position = 'absolute';
            target.style.top = '0px';
            target.style.left = '0px';
            target.style.width = '${spec.width}px';
            target.style.height = '${spec.height}px';
          } else {
            console.error('Target not found: ${spec.id}');
          }
          window.scrollTo(0, 0);
          true;
        } catch(e) {
          console.error('Inside page error:', e.message, e.stack);
          throw e;
        }
      `);
    } catch (e) {
      console.error('executeJavaScript error:', e);
    }

    // Give DOM time to update layout
    await new Promise((r) => setTimeout(r, 500));

    const image = await win.capturePage({
      x: 0,
      y: 0,
      width: spec.width,
      height: spec.height,
    });

    const pngBuffer = image.toPNG();
    const destPath = path.join(outDir, spec.name);
    fs.writeFileSync(destPath, pngBuffer);
    console.log(`Saved: ${destPath} (${pngBuffer.length} bytes)`);
  }

  win.destroy();
  console.log('All ad creatives successfully rendered!');
  app.quit();
}

app.whenReady().then(renderCreatives).catch((err) => {
  console.error('Render error:', err);
  app.quit();
});
