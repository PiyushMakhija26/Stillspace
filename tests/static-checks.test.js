const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    return false;
  }
}

console.log('\n--- SUITE 1: STATIC & ARCHITECTURE CHECKS ---');
let passed = 0;
let total = 0;

// 1. Manifest V3 validation
total++;
if (test('manifest.json is valid MV3 and passes schema assertions', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(raw);
  assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
  assert.strictEqual(manifest.name, 'Stillspace', 'Name must be Stillspace');
  assert.strictEqual(manifest.version, '2.18.1', 'Version must be 2.18.1');
  assert(manifest.description && manifest.description.length <= 132, 'Description must be <= 132 chars');
  assert.deepStrictEqual(manifest.permissions, ['tabs', 'storage', 'unlimitedStorage'], 'Least-privilege permissions');
  assert(!manifest.host_permissions, 'Must not declare broad host permissions');
  assert.strictEqual(manifest.action.default_popup, 'popup.html');
  assert.strictEqual(manifest.chrome_url_overrides.newtab, 'newtab.html');
  assert(manifest.icons['16'] && manifest.icons['32'] && manifest.icons['48'] && manifest.icons['128'], 'All icons required');
})) passed++;

// 2. Manifest file references exist
total++;
if (test('all files referenced in manifest.json exist on disk', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  assert(fs.existsSync(path.join(ROOT, manifest.action.default_popup)), 'default_popup exists');
  assert(fs.existsSync(path.join(ROOT, manifest.chrome_url_overrides.newtab)), 'newtab override exists');
  for (const size of Object.keys(manifest.icons)) {
    assert(fs.existsSync(path.join(ROOT, manifest.icons[size])), `icon ${size} exists`);
  }
})) passed++;

// 3. Local HTML resource references
total++;
if (test('all HTML files have valid local references (scripts, css, images)', () => {
  const htmlFiles = ['newtab.html', 'popup.html', 'manager.html', 'theme-store.html', 'PRIVACY-POLICY.html', 'index.html'];
  for (const file of htmlFiles) {
    const fullPath = path.join(ROOT, file);
    assert(fs.existsSync(fullPath), `${file} must exist`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Check script src
    const scriptMatches = content.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi);
    for (const match of scriptMatches) {
      const ref = match[1];
      assert(!ref.startsWith('http'), `No remote scripts in ${file}: ${ref}`);
      assert(fs.existsSync(path.join(ROOT, ref)), `Local script ${ref} in ${file} must exist`);
    }

    // Check stylesheet href
    const linkMatches = content.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi);
    for (const match of linkMatches) {
      const fullTag = match[0];
      const ref = match[1];
      if (/rel=["']stylesheet["']/i.test(fullTag) || /rel=["']icon["']/i.test(fullTag)) {
        assert(!ref.startsWith('http'), `No remote styles/icons in ${file}: ${ref}`);
        assert(fs.existsSync(path.join(ROOT, ref)), `Local link ${ref} in ${file} must exist`);
      }
    }

    // Check img src
    const imgMatches = content.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi);
    for (const match of imgMatches) {
      const ref = match[1];
      assert(!ref.startsWith('http'), `No remote images in ${file}: ${ref}`);
      assert(fs.existsSync(path.join(ROOT, ref)), `Local image ${ref} in ${file} must exist`);
    }
  }
})) passed++;

// 4. JavaScript syntax compilation
total++;
if (test('all bundled JavaScript files compile cleanly without syntax errors', () => {
  const jsFiles = ['newtab.js', 'popup.js', 'manager.js', 'theme-store.js', 'wallpapers.js'];
  for (const file of jsFiles) {
    const fullPath = path.join(ROOT, file);
    assert(fs.existsSync(fullPath), `${file} must exist`);
    const code = fs.readFileSync(fullPath, 'utf8');
    // Compile script in isolated context
    new vm.Script(code, { filename: file });
  }
})) passed++;

// 5. SVG wallpapers count and integrity
total++;
if (test('exactly 100 procedural SVG wallpapers exist and contain zero external links', () => {
  const wpDir = path.join(ROOT, 'wallpapers');
  assert(fs.existsSync(wpDir), 'wallpapers directory must exist');
  const files = fs.readdirSync(wpDir).filter(f => f.endsWith('.svg'));
  assert.strictEqual(files.length, 100, `Must have exactly 100 SVG wallpapers (found ${files.length})`);

  for (let i = 1; i <= 100; i++) {
    const filename = `wallpaper-${String(i).padStart(3, '0')}.svg`;
    const fullPath = path.join(wpDir, filename);
    assert(fs.existsSync(fullPath), `${filename} must exist`);
    const svg = fs.readFileSync(fullPath, 'utf8');
    assert(svg.includes('<svg') && svg.includes('</svg>'), `${filename} must have valid SVG tags`);
    assert(svg.includes('viewBox="0 0 1600 900"'), `${filename} must have standard 1600x900 viewBox`);
    assert(!svg.includes('<image'), `${filename} must not contain embedded image tags`);
    assert(!svg.includes('<script'), `${filename} must not contain script tags`);
    const strippedSvg = svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    assert(!strippedSvg.includes('http://') && !strippedSvg.includes('https://'), `${filename} must not contain external URLs`);
  }
})) passed++;

// 6. Icon files verification
total++;
if (test('extension icons (16, 32, 48, 128) exist and have valid PNG headers', () => {
  const iconSizes = [16, 32, 48, 128];
  for (const size of iconSizes) {
    const iconPath = path.join(ROOT, 'icons', `icon${size}.png`);
    assert(fs.existsSync(iconPath), `icon${size}.png must exist`);
    const buf = fs.readFileSync(iconPath);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    assert.strictEqual(buf[0], 0x89, 'PNG signature byte 0');
    assert.strictEqual(buf[1], 0x50, 'PNG signature byte 1 (P)');
    assert.strictEqual(buf[2], 0x4E, 'PNG signature byte 2 (N)');
    assert.strictEqual(buf[3], 0x47, 'PNG signature byte 3 (G)');
  }
})) passed++;

// 7. Security and forbidden patterns check
total++;
if (test('zero eval, new Function, remote scripts, or leftover AI capture in code', () => {
  const scanExtensions = ['.js', '.html', '.css'];
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (scanExtensions.some(ext => entry.name.endsWith(ext))) {
        const text = fs.readFileSync(full, 'utf8');
        assert(!/\beval\s*\(/.test(text), `eval() forbidden in ${entry.name}`);
        assert(!/\bnew\s+Function\s*\(/.test(text), `new Function() forbidden in ${entry.name}`);
        if (entry.name.endsWith('.html')) {
          assert(!/<script[^>]*src=["']https?:/i.test(text), `Remote script forbidden in ${entry.name}`);
        }
        if (entry.name === 'popup.css') {
          assert(!text.includes('.ai-card'), 'Obsolete .ai-card must be removed from popup.css');
        }
      }
    }
  }
  scanDir(ROOT);
})) passed++;

module.exports = { passed, total };
if (require.main === module) {
  console.log(`\nStatic Checks Summary: ${passed} / ${total} passed`);
  process.exit(passed === total ? 0 : 1);
}
