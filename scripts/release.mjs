#!/usr/bin/env node
import { execSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function run(command, options = {}) {
  return execSync(command, { cwd: rootDir, stdio: 'inherit', ...options });
}

function runSilent(command) {
  try {
    return execSync(command, { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version;
  const tag = `v${version}`;

  console.log('\n========================================================================');
  console.log(`🚀 Invoice Gen Release Workflow — ${tag}`);
  console.log('========================================================================\n');

  console.log(`[1/4] Running automated test suite...`);
  try {
    run('npm test');
    console.log('✓ All tests passed!\n');
  } catch {
    console.error('❌ Test suite failed. Please fix test issues before releasing.');
    process.exit(1);
  }

  console.log(`[2/4] Compiling production web build...`);
  try {
    run('npm run build');
    console.log('✓ Web build compiled into dist/!\n');
  } catch {
    console.error('❌ Build failed.');
    process.exit(1);
  }

  console.log(`[3/4] Synchronizing Capacitor Android assets...`);
  try {
    run('npx cap sync android');
    console.log('✓ Android assets synchronized!\n');
  } catch (err) {
    console.warn('⚠️ Capacitor sync skipped or reported warning:', err.message);
  }

  console.log('========================================================================');
  console.log(`📦 Release Summary for ${tag}`);
  console.log('------------------------------------------------------------------------');
  console.log(`  • Version:            v${version}`);
  console.log(`  • Windows Installer:  Invoice-Gen-Setup-${version}.exe`);
  console.log(`  • Windows Portable:   Invoice Gen ${version}.exe`);
  console.log(`  • macOS Apple Silicon: Invoice-Gen-Setup-${version}-arm64.pkg`);
  console.log(`  • macOS Intel x64:    Invoice-Gen-Setup-${version}-x64.pkg`);
  console.log(`  • Android APK:        Invoice-Gen-${version}.apk`);
  console.log('========================================================================\n');

  // Mandatory confirmation prompt
  const answer = await askQuestion(`❓ Do you want to push this release to GitHub now? (y/N): `);

  if (answer !== 'y' && answer !== 'yes') {
    console.log('\n🛑 [Release Kept Local]');
    console.log('You chose NOT to push to GitHub.');
    console.log('All packages and builds remain safely on your local workstation.');
    console.log('Nothing has been pushed to GitHub.\n');
    process.exit(0);
  }

  console.log('\n[4/4] Pushing release to GitHub now...');
  try {
    // 1. Commit any pending version or sync changes
    const status = runSilent('git status --porcelain');
    if (status) {
      console.log('  → Staging and committing release files...');
      run(`git add -A`);
      run(`git commit -m "chore(release): prepare v${version} for GitHub release"`);
    }

    // 2. Push to main branch
    console.log('  → Pushing git branch to origin main...');
    run('git push origin main');

    // 3. Ensure tag exists and push tag
    const tagExists = runSilent(`git tag -l ${tag}`);
    if (!tagExists) {
      console.log(`  → Creating git tag ${tag}...`);
      run(`git tag -a ${tag} -m "Invoice Gen Release ${tag}"`);
    }
    console.log(`  → Pushing git tag ${tag} to origin...`);
    run(`git push origin ${tag}`);

    console.log('\n========================================================================');
    console.log(`🎉 Pushed to GitHub now!`);
    console.log(`Invoice Gen ${tag} is pushed and live on GitHub.`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('❌ Failed while pushing to GitHub:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled release error:', err);
  process.exit(1);
});
