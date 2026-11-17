const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'out', 'util', 'normalizePackageData.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf-8');
  if (!content.includes('semver.coerce(data.version)')) {
    content = content.replace(
      /if \(!semver\.valid\(data\.version, loose\)\) \{\s*throw new Error\(`Invalid version: "\${data\.version}"`\);\s*\}/,
      `if (!semver.valid(data.version, loose)) {
            const coerced = semver.coerce(data.version);
            if (coerced) {
                data.version = coerced.version;
                return true;
            }
            throw new Error(\`Invalid version: "\${data.version}"\`);
        }`
    );
    fs.writeFileSync(target, content, 'utf-8');
    console.log('✓ Patched app-builder-lib to support 4-digit version strings (1.4.2.1)');
  }
}
