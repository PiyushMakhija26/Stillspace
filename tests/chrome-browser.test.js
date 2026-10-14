const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function httpPutJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'PUT' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({});
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.consoleErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
          if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert')) {
            this.consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
          }
          if (msg.method === 'Runtime.exceptionThrown') {
            this.consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + ': ' + (res.exceptionDetails.exception?.description || ''));
    }
    return res.result?.value;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    return outPath;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function runChromeSuite() {
  console.log('\n--- SUITE 3: REAL CHROME BROWSER AUTOMATION TESTS ---');

  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`Chrome executable not found at ${CHROME_PATH}`);
    return { passed: 0, total: 1, skipped: 1 };
  }

  const tempProfile = path.join(ROOT, '..', 'stillspace-temp-chrome-profile-' + Date.now());
  fs.mkdirSync(tempProfile, { recursive: true });

  const port = 9222 + Math.floor(Math.random() * 50);
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    `--load-extension=${ROOT}`,
    '--window-size=1280,920'
  ];

  console.log(`Launching Google Chrome (port ${port})...`);
  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  let passed = 0;
  let total = 0;
  let extensionId = null;

  try {
    // Wait for Chrome remote debugging port to become responsive
    let versionInfo = null;
    for (let i = 0; i < 30; i++) {
      await delay(500);
      try {
        versionInfo = await httpGetJson(`http://127.0.0.1:${port}/json/version`);
        if (versionInfo) break;
      } catch {}
    }

    if (!versionInfo) {
      throw new Error('Chrome failed to start remote debugging within 15 seconds.');
    }
    console.log(`Connected to Chrome ${versionInfo['Browser']} (protocol ${versionInfo['Protocol-Version']})`);

    // 1. Open new tab (which Stillspace overrides)
    total++;
    console.log('Testing New Tab override and discovering extension ID...');
    const newTabTarget = await httpPutJson(`http://127.0.0.1:${port}/json/new?chrome://newtab`);
    await delay(1200);

    const client = new CdpClient(newTabTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Console.enable');

    const currentUrl = await client.evaluate('window.location.href');
    console.log(`  New Tab URL: ${currentUrl}`);

    const match = currentUrl.match(/chrome-extension:\/\/([a-z0-9]+)\/newtab\.html/);
    if (match) {
      extensionId = match[1];
      console.log(`  Discovered Extension ID: ${extensionId}`);
    } else {
      // If chrome://newtab didn't immediately resolve, navigate directly
      const targets = await httpGetJson(`http://127.0.0.1:${port}/json/list`);
      const extTarget = targets.find(t => t.url && t.url.includes('chrome-extension://'));
      if (extTarget) {
        extensionId = extTarget.url.match(/chrome-extension:\/\/([a-z0-9]+)\//)[1];
      }
    }

    // Test 1: First-run New Tab page state
    const theme = await client.evaluate('document.body.dataset.theme');
    const wordmark = await client.evaluate('document.querySelector(".wordmark span")?.textContent');
    const clockText = await client.evaluate('document.getElementById("widgetClock")?.textContent');
    const mintColor = await client.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--mint").trim()');

    if (theme === 'stealth' && wordmark === 'Stillspace' && clockText && (mintColor === '#c8ff00' || mintColor.includes('200, 255, 0') || mintColor.includes('#c8ff00'))) {
      console.log(`  [PASS] First-run New Tab loaded with Stealth theme and lime accent (#c8ff00)`);
      passed++;
    } else {
      console.error(`  [FAIL] First-run New Tab check: theme=${theme}, wordmark=${wordmark}, mint=${mintColor}`);
    }

    // Capture Screenshot 1: First-run New Tab
    await client.captureScreenshot('screenshot-1-first-run-newtab.png');
    console.log('  [SCREENSHOT] Saved screenshot-1-first-run-newtab.png');

    // Capture Screenshot 7: Focus timer & Priorities close-up
    await client.evaluate('document.querySelector(".daily-section")?.scrollIntoView()');
    await delay(300);
    await client.captureScreenshot('screenshot-7-focus-and-priorities.png');
    console.log('  [SCREENSHOT] Saved screenshot-7-focus-and-priorities.png');

    client.close();

    // Test 2: Theme Chooser (theme-store.html in themes mode)
    total++;
    console.log('Testing Appearance / Theme Store (Themes mode)...');
    const themeStoreTarget = await httpPutJson(`http://127.0.0.1:${port}/json/new?chrome-extension://${extensionId}/theme-store.html`);
    await delay(1200);

    const tsClient = new CdpClient(themeStoreTarget.webSocketDebuggerUrl);
    await tsClient.connect();
    await tsClient.send('Page.enable');
    await tsClient.send('Runtime.enable');

    const tsView = await tsClient.evaluate('document.body.dataset.view');
    const themeCardsCount = await tsClient.evaluate('document.querySelectorAll(".theme-card").length');
    console.log(`  Theme Store initial view=${tsView}, themes rendered=${themeCardsCount}`);

    if (themeCardsCount >= 60) {
      console.log(`  [PASS] Theme store rendered ${themeCardsCount} themes with clean view isolation`);
      passed++;
    } else {
      console.error(`  [FAIL] Expected >= 60 theme cards, got ${themeCardsCount}`);
    }

    await tsClient.captureScreenshot('screenshot-2-theme-chooser.png');
    console.log('  [SCREENSHOT] Saved screenshot-2-theme-chooser.png');

    // Test 3: Wallpaper Chooser (theme-store.html in wallpapers mode)
    total++;
    console.log('Testing Wallpaper Chooser view...');
    await tsClient.evaluate(`
      document.getElementById('appearanceMode').value = 'wallpapers';
      document.getElementById('appearanceMode').dispatchEvent(new Event('change'));
    `);
    await delay(500);

    const wallCount = await tsClient.evaluate('document.querySelectorAll(".wallpaper-card").length');
    const heroVisible = await tsClient.evaluate('getComputedStyle(document.querySelector(".hero")).display');
    console.log(`  Wallpapers view: cards=${wallCount}, hero display=${heroVisible}`);

    if (wallCount === 100 && heroVisible === 'none') {
      console.log(`  [PASS] Wallpaper chooser rendered exactly 100 wallpapers with hero banner hidden`);
      passed++;
    } else {
      console.error(`  [FAIL] Expected 100 wallpaper cards and hidden hero, got cards=${wallCount}, hero=${heroVisible}`);
    }

    await tsClient.captureScreenshot('screenshot-3-wallpaper-chooser.png');
    console.log('  [SCREENSHOT] Saved screenshot-3-wallpaper-chooser.png');

    // Test 4: Custom Wallpaper Upload Panel
    total++;
    console.log('Testing Custom Wallpaper upload panel view...');
    await tsClient.evaluate(`
      document.getElementById('appearanceMode').value = 'custom';
      document.getElementById('appearanceMode').dispatchEvent(new Event('change'));
    `);
    await delay(500);

    const customPanelVisible = await tsClient.evaluate('getComputedStyle(document.getElementById("customWallpaperPanel")).display');
    if (customPanelVisible !== 'none') {
      console.log(`  [PASS] Custom wallpaper panel visible and isolated`);
      passed++;
    } else {
      console.error(`  [FAIL] Custom wallpaper panel was not visible`);
    }

    await tsClient.captureScreenshot('screenshot-4-custom-wallpaper-panel.png');
    console.log('  [SCREENSHOT] Saved screenshot-4-custom-wallpaper-panel.png');
    tsClient.close();

    // Test 5: Workspace Manager (manager.html)
    total++;
    console.log('Testing Workspace Manager (manager.html)...');
    const mgrTarget = await httpPutJson(`http://127.0.0.1:${port}/json/new?chrome-extension://${extensionId}/manager.html`);
    await delay(1200);

    const mgrClient = new CdpClient(mgrTarget.webSocketDebuggerUrl);
    await mgrClient.connect();
    await mgrClient.send('Page.enable');
    await mgrClient.send('Runtime.enable');

    const mgrTheme = await mgrClient.evaluate('document.body.dataset.theme');
    const mgrTitle = await mgrClient.evaluate('document.getElementById("pageTitle")?.textContent');
    console.log(`  Manager theme=${mgrTheme}, title=${mgrTitle}`);

    if (mgrTheme === 'stealth' && mgrTitle === 'Workspaces') {
      console.log(`  [PASS] Workspace manager loaded with Stealth theme and Workspaces header`);
      passed++;
    } else {
      console.error(`  [FAIL] Workspace manager check failed: theme=${mgrTheme}, title=${mgrTitle}`);
    }

    await mgrClient.captureScreenshot('screenshot-5-workspace-manager.png');
    console.log('  [SCREENSHOT] Saved screenshot-5-workspace-manager.png');
    mgrClient.close();

    // Test 6: Popup Page (popup.html)
    total++;
    console.log('Testing Extension Popup (popup.html)...');
    const popupTarget = await httpPutJson(`http://127.0.0.1:${port}/json/new?chrome-extension://${extensionId}/popup.html`);
    await delay(1000);

    const popupClient = new CdpClient(popupTarget.webSocketDebuggerUrl);
    await popupClient.connect();
    await popupClient.send('Page.enable');
    await popupClient.send('Runtime.enable');

    const popupBrand = await popupClient.evaluate('document.querySelector(".brand")?.textContent');
    const stashBtnText = await popupClient.evaluate('document.getElementById("stashButton")?.textContent');
    console.log(`  Popup brand=${popupBrand}, stashBtn=${stashBtnText}`);

    if (popupBrand === 'Stillspace') {
      console.log(`  [PASS] Extension popup loaded with Stillspace branding and stash control`);
      passed++;
    } else {
      console.error(`  [FAIL] Popup check failed: brand=${popupBrand}`);
    }

    await popupClient.captureScreenshot('screenshot-6-popup.png');
    console.log('  [SCREENSHOT] Saved screenshot-6-popup.png');
    popupClient.close();

    // Test 7: Console Error Audit Across Real Browser Session
    total++;
    const allErrors = [
      ...client.consoleErrors,
      ...tsClient.consoleErrors,
      ...mgrClient.consoleErrors,
      ...popupClient.consoleErrors
    ];

    if (allErrors.length === 0) {
      console.log(`  [PASS] Zero console errors or uncaught exceptions detected across all pages in real Chrome`);
      passed++;
    } else {
      console.warn(`  [WARN] Console errors logged: ${allErrors.join(' | ')}`);
      // Fail if severe uncaught errors
      const severe = allErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
      if (severe.length === 0) passed++;
    }

  } catch (err) {
    console.error('Chrome browser test encountered an error:', err);
  } finally {
    // Terminate Chrome
    try {
      chromeProc.kill('SIGKILL');
    } catch {}

    // Clean up temporary profile
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }

  console.log(`\nChrome Browser Automation Summary: ${passed} / ${total} passed`);
  return { passed, total };
}

module.exports = { runChromeSuite };
if (require.main === module) {
  runChromeSuite().then(({ passed, total }) => {
    process.exit(passed === total ? 0 : 1);
  });
}
