const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

const stagingDir = path.join(PROJECT_ROOT, '.cache', 'asar-staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Ensure dist exists
const distDir = path.join(PROJECT_ROOT, 'dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('Building web bundle first...');
  execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
}

// Copy essential folders into staging
const folders = ['dist', 'electron', 'public', 'build'];
for (const folder of folders) {
  const src = path.join(PROJECT_ROOT, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(stagingDir, folder), { recursive: true });
  }
}

// Copy minimal package.json
const minimalPkg = {
  name: pkg.name,
  version: pkg.version,
  main: pkg.main || 'electron/main.cjs',
  productName: pkg.productName || 'Invoice Gen',
  description: pkg.description || 'Commercial Invoice & Billing Workstation'
};
fs.writeFileSync(path.join(stagingDir, 'package.json'), JSON.stringify(minimalPkg, null, 2), 'utf8');

const distElectron = path.join(PROJECT_ROOT, 'dist-electron');
fs.mkdirSync(distElectron, { recursive: true });

const outAsar = path.join(distElectron, `Invoice-Gen-Update-${version}.asar`);
const genericAsar = path.join(distElectron, 'app.asar');

console.log(`Packaging clean standalone application ASAR: ${outAsar}...`);
execSync(`npx asar pack "${stagingDir}" "${outAsar}"`, { stdio: 'inherit' });

// Also copy to dist-electron/app.asar for build-mac.py
fs.copyFileSync(outAsar, genericAsar);

const sizeMB = (fs.statSync(outAsar).size / (1024 * 1024)).toFixed(2);
console.log(`✓ Application ASAR generated successfully: ${sizeMB} MB`);

// Clean up staging
try {
  fs.rmSync(stagingDir, { recursive: true, force: true });
} catch {}
