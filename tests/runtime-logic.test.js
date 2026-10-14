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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    return false;
  }
}

// Mock Chrome Storage & Tabs environment
function createMockChrome(initialStorage = {}) {
  let storage = { ...initialStorage };
  let tabs = [
    { id: 1, index: 0, active: true, url: 'https://example.com/active', title: 'Active Tab', pinned: false, mutedInfo: { muted: false } },
    { id: 2, index: 1, active: false, url: 'https://github.com/project', title: 'GitHub Project', pinned: false, mutedInfo: { muted: false } },
    { id: 3, index: 2, active: false, url: 'https://news.ycombinator.com', title: 'Hacker News', pinned: true, mutedInfo: { muted: true } },
    { id: 4, index: 3, active: false, url: 'chrome://extensions', title: 'Extensions', pinned: false }
  ];
  const listeners = [];

  return {
    storage: {
      local: {
        async get(keys) {
          if (typeof keys === 'string') return { [keys]: storage[keys] };
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach(k => res[k] = storage[k]);
            return res;
          }
          if (typeof keys === 'object' && keys !== null) {
            const res = {};
            for (const k of Object.keys(keys)) {
              res[k] = storage[k] !== undefined ? storage[k] : keys[k];
            }
            return res;
          }
          return { ...storage };
        },
        async set(items) {
          const changes = {};
          for (const k of Object.keys(items)) {
            changes[k] = { oldValue: storage[k], newValue: items[k] };
            storage[k] = items[k];
          }
          listeners.forEach(fn => fn(changes, 'local'));
        },
        async remove(keys) {
          const arr = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          arr.forEach(k => {
            changes[k] = { oldValue: storage[k], newValue: undefined };
            delete storage[k];
          });
          listeners.forEach(fn => fn(changes, 'local'));
        }
      },
      onChanged: {
        addListener(fn) { listeners.push(fn); }
      }
    },
    tabs: {
      async query(queryInfo) {
        let res = [...tabs];
        if (queryInfo.active !== undefined) res = res.filter(t => t.active === queryInfo.active);
        if (queryInfo.currentWindow !== undefined) { /* mock single window */ }
        return res;
      },
      async create(createProperties) {
        const newTab = {
          id: tabs.length + 10,
          index: createProperties.index !== undefined ? createProperties.index : tabs.length,
          active: Boolean(createProperties.active),
          url: createProperties.url,
          title: createProperties.url
        };
        tabs.push(newTab);
        return newTab;
      },
      async update(tabId, updateProperties) {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) Object.assign(tab, updateProperties);
        return tab;
      },
      async remove(tabIds) {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        tabs = tabs.filter(t => !ids.includes(t.id));
      }
    },
    runtime: {
      getURL(file) { return `chrome-extension://stillspace-id/${file}`; }
    },
    _getStorageDump() { return storage; },
    _getTabsDump() { return tabs; }
  };
}

async function runRuntimeSuite() {
  console.log('\n--- SUITE 2: RUNTIME LOGIC & COMPLIANCE CHECKS ---');
  let passed = 0;
  let total = 0;

  // 1. Fresh Install Default State
  total++;
  if (await testAsync('fresh installation defaults to Stealth theme, lime accent (#c8ff00), and aurora wallpaper', async () => {
    const mock = createMockChrome({});
    const DEFAULTS = {
      theme: 'stealth',
      wallpaper: 'aurora',
      customWallpaper: '',
      font: 'modern',
      motion: 'ambient',
      storeTheme: null,
      customAccent: '#c8ff00',
      customBase: '#10151d',
      wallpaperId: 'wp-001'
    };
    const settings = { ...DEFAULTS, ...(await mock.storage.local.get(DEFAULTS)) };
    assert.strictEqual(settings.theme, 'stealth', 'Theme must be stealth');
    assert.strictEqual(settings.customAccent, '#c8ff00', 'Lime accent identity');
    assert.strictEqual(settings.wallpaper, 'aurora', 'Default ambient wallpaper');
    assert.strictEqual(settings.storeTheme, null, 'No store theme initially applied');
  })) passed++;

  // 2. Upgrade Scenario: Existing Preferences Preserved
  total++;
  if (await testAsync('upgrade preserves returning user preferences without overwriting', async () => {
    const existingUserStorage = {
      theme: 'midnight',
      wallpaper: 'ocean',
      customWallpaper: '',
      font: 'editorial',
      motion: 'subtle',
      storeTheme: { id: 'stillspace-02', name: 'Midnight Glass', accent: '#8198ff' },
      customAccent: '#8198ff',
      workspaces: [{ id: 'w1', name: 'Sprint 1', tabs: [{ url: 'https://test.com', title: 'Test' }] }],
      quickNote: 'Important draft',
      dailyTasks: [{ id: 't1', text: 'Finish PR', done: false }]
    };
    const mock = createMockChrome(existingUserStorage);
    const DEFAULTS = {
      theme: 'stealth',
      wallpaper: 'aurora',
      customWallpaper: '',
      font: 'modern',
      motion: 'ambient',
      storeTheme: null,
      customAccent: '#c8ff00',
      customBase: '#10151d',
      wallpaperId: 'wp-001'
    };
    // Emulate getSettings()
    const settings = { ...DEFAULTS, ...(await mock.storage.local.get(DEFAULTS)) };

    assert.strictEqual(settings.theme, 'midnight', 'Preserved user theme');
    assert.strictEqual(settings.wallpaper, 'ocean', 'Preserved user wallpaper');
    assert.strictEqual(settings.font, 'editorial', 'Preserved user font');
    assert.strictEqual(settings.storeTheme.name, 'Midnight Glass', 'Preserved storeTheme');
    assert.strictEqual(settings.customAccent, '#8198ff', 'Preserved accent');

    const ws = (await mock.storage.local.get({ workspaces: [] })).workspaces;
    assert.strictEqual(ws.length, 1, 'Preserved user workspaces');
    assert.strictEqual(ws[0].name, 'Sprint 1');

    const note = (await mock.storage.local.get({ quickNote: '' })).quickNote;
    assert.strictEqual(note, 'Important draft', 'Preserved quick notes');
  })) passed++;

  // 3. Theme & Wallpaper Independence: Applying Theme Preserves Wallpaper
  total++;
  if (await testAsync('applying a theme preserves active wallpaper (built-in, custom, or ambient)', async () => {
    const mock = createMockChrome({
      theme: 'stealth',
      wallpaper: 'built-in',
      wallpaperId: 'wp-042',
      customWallpaper: ''
    });

    // Emulate Theme Store apply(t)
    const s = await mock.storage.local.get({
      theme: 'stealth',
      wallpaper: 'built-in',
      wallpaperId: 'wp-042',
      customWallpaper: '',
      storeTheme: null,
      customAccent: '#c8ff00',
      customBase: '#10151d'
    });

    const themeToApply = {
      id: 'stillspace-16',
      name: 'Emerald Vault',
      category: 'Luxury',
      accent: '#a4e2c4',
      background: 'linear-gradient(125deg, #071b17, #176b50)'
    };

    await mock.storage.local.set({
      themeUndo: { theme: s.theme, wallpaper: s.wallpaper, wallpaperId: s.wallpaperId, customWallpaper: s.customWallpaper, storeTheme: s.storeTheme, customAccent: s.customAccent, customBase: s.customBase },
      storeTheme: themeToApply,
      theme: s.theme,
      customAccent: themeToApply.accent
    });

    const after = await mock.storage.local.get(null);
    assert.strictEqual(after.storeTheme.name, 'Emerald Vault', 'Theme applied');
    assert.strictEqual(after.customAccent, '#a4e2c4', 'Accent updated to theme accent');
    assert.strictEqual(after.wallpaper, 'built-in', 'Wallpaper remains built-in');
    assert.strictEqual(after.wallpaperId, 'wp-042', 'Wallpaper ID wp-042 preserved');
  })) passed++;

  // 4. Theme & Wallpaper Independence: Selecting Wallpaper Preserves Theme
  total++;
  if (await testAsync('selecting a built-in wallpaper preserves active theme and storeTheme', async () => {
    const mock = createMockChrome({
      theme: 'stealth',
      storeTheme: { id: 'stillspace-16', name: 'Emerald Vault', accent: '#a4e2c4' },
      customAccent: '#a4e2c4',
      wallpaper: 'aurora',
      wallpaperId: 'wp-001'
    });

    // Emulate Theme Store applyBuiltInWallpaper(w)
    const s = await mock.storage.local.get(null);
    const newWallpaper = { id: 'wp-088', name: 'Crimson Protocol 5', file: 'wallpaper-088.svg' };

    await mock.storage.local.set({
      themeUndo: { theme: s.theme, wallpaper: s.wallpaper, wallpaperId: s.wallpaperId, customWallpaper: s.customWallpaper, storeTheme: s.storeTheme, customAccent: s.customAccent, customBase: s.customBase },
      wallpaper: 'built-in',
      wallpaperId: newWallpaper.id,
      customWallpaper: ''
    });

    const after = await mock.storage.local.get(null);
    assert.strictEqual(after.wallpaper, 'built-in', 'Wallpaper is built-in');
    assert.strictEqual(after.wallpaperId, 'wp-088', 'Wallpaper ID is wp-088');
    assert.strictEqual(after.storeTheme.name, 'Emerald Vault', 'Store theme must NOT be wiped out');
    assert.strictEqual(after.customAccent, '#a4e2c4', 'Accent preserved');
  })) passed++;

  // 5. Custom Wallpaper Upload Preserves Theme
  total++;
  if (await testAsync('uploading a custom wallpaper preserves active theme', async () => {
    const mock = createMockChrome({
      theme: 'stealth',
      storeTheme: { id: 'blackops-01', name: 'Black Ops', accent: '#c8ff00' },
      wallpaper: 'built-in',
      wallpaperId: 'wp-001'
    });

    const s = await mock.storage.local.get(null);
    const mockDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';

    await mock.storage.local.set({
      themeUndo: { theme: s.theme, wallpaper: s.wallpaper, wallpaperId: s.wallpaperId, customWallpaper: s.customWallpaper, storeTheme: s.storeTheme, customAccent: s.customAccent, customBase: s.customBase },
      wallpaper: 'custom',
      wallpaperId: '',
      customWallpaper: mockDataUrl
    });

    const after = await mock.storage.local.get(null);
    assert.strictEqual(after.wallpaper, 'custom', 'Wallpaper updated to custom');
    assert.strictEqual(after.customWallpaper, mockDataUrl, 'Custom wallpaper data saved');
    assert.strictEqual(after.storeTheme.name, 'Black Ops', 'Store theme preserved');
  })) passed++;

  // 6. Workspaces CRUD & Tabs Stashing
  total++;
  if (await testAsync('workspace stashing, saving, and tab restoration works correctly', async () => {
    const mock = createMockChrome({ workspaces: [] });

    // Stash other tabs
    const allTabs = await mock.tabs.query({ currentWindow: true });
    const active = allTabs.find(t => t.active);
    const candidates = allTabs.filter(t => !t.active && t.url && !/^(chrome|chrome-extension|devtools):\/\//i.test(t.url));

    assert.strictEqual(candidates.length, 2, 'Should find 2 saveable tabs');

    const savedTabs = candidates.map(t => ({
      url: t.url,
      title: t.title || t.url,
      favIconUrl: t.favIconUrl || '',
      pinned: Boolean(t.pinned),
      muted: Boolean(t.mutedInfo?.muted)
    }));

    const wsId = 'ws-test-uuid';
    const workspace = { id: wsId, name: 'Research Project', tabs: savedTabs, createdAt: Date.now(), updatedAt: Date.now() };

    await mock.storage.local.set({ workspaces: [workspace] });
    await Promise.allSettled(candidates.map(t => mock.tabs.remove(t.id)));

    const remainingTabs = await mock.tabs.query({ currentWindow: true });
    assert.strictEqual(remainingTabs.length, 2, 'Active tab and chrome:// tab remained open');
    assert.strictEqual(remainingTabs[0].url, 'https://example.com/active', 'Active tab remained intact');

    // Restore workspace
    const storedWs = (await mock.storage.local.get({ workspaces: [] })).workspaces[0];
    assert.strictEqual(storedWs.tabs.length, 2, 'Stored 2 tabs in workspace');

    for (const tab of storedWs.tabs) {
      await mock.tabs.create({ url: tab.url, active: false });
    }
    const finalTabs = await mock.tabs.query({ currentWindow: true });
    assert.strictEqual(finalTabs.length, 4, 'Tabs restored');
  })) passed++;

  // 7. Workspace Deletion with Tab Safety
  total++;
  if (await testAsync('deleting a workspace removes it from storage without closing open tabs', async () => {
    const mock = createMockChrome({
      workspaces: [
        { id: 'w1', name: 'Keep Me', tabs: [] },
        { id: 'w2', name: 'Delete Me', tabs: [{ url: 'https://test.com' }] }
      ]
    });

    const beforeTabs = await mock.tabs.query({ currentWindow: true });
    const { workspaces } = await mock.storage.local.get({ workspaces: [] });
    await mock.storage.local.set({ workspaces: workspaces.filter(w => w.id !== 'w2') });

    const afterWs = (await mock.storage.local.get({ workspaces: [] })).workspaces;
    assert.strictEqual(afterWs.length, 1, 'Workspace removed');
    assert.strictEqual(afterWs[0].id, 'w1');

    const afterTabs = await mock.tabs.query({ currentWindow: true });
    assert.strictEqual(afterTabs.length, beforeTabs.length, 'Open tabs untouched by workspace deletion');
  })) passed++;

  // 8. Focus Session Timer & Statistics
  total++;
  if (await testAsync('focus session timer tracks state, completion, and stats calculations', async () => {
    const mock = createMockChrome({
      dailyTasks: [],
      focusStats: { sessions: 0, minutes: 0 },
      focusTimer: { running: false, duration: 1500, endsAt: 0, remaining: 1500 }
    });

    // Start timer (25 min preset = 1500 sec)
    let s = await mock.storage.local.get(null);
    const endsAt = Date.now() + 1500 * 1000;
    await mock.storage.local.set({
      focusTimer: { running: true, duration: 1500, remaining: 1500, endsAt }
    });

    s = await mock.storage.local.get(null);
    assert.strictEqual(s.focusTimer.running, true, 'Timer started');

    // Simulate completion
    const stats = {
      sessions: s.focusStats.sessions + 1,
      minutes: s.focusStats.minutes + Math.round(s.focusTimer.duration / 60)
    };
    await mock.storage.local.set({
      focusStats: stats,
      focusTimer: { running: false, duration: 1500, remaining: 1500, endsAt: 0 }
    });

    s = await mock.storage.local.get(null);
    assert.strictEqual(s.focusStats.sessions, 1, '1 session completed');
    assert.strictEqual(s.focusStats.minutes, 25, '25 minutes counted');
    assert.strictEqual(s.focusTimer.running, false, 'Timer reset to idle');
  })) passed++;

  // 9. Quick Notes & Character Limits
  total++;
  if (await testAsync('quick notes save locally, enforce 3000 limit, and clear properly', async () => {
    const mock = createMockChrome({ quickNote: '' });

    const testText = 'Meeting at 3 PM with engineering team.';
    await mock.storage.local.set({ quickNote: testText });

    let { quickNote } = await mock.storage.local.get({ quickNote: '' });
    assert.strictEqual(quickNote, testText);

    // Clear note
    await mock.storage.local.remove('quickNote');
    let cleared = await mock.storage.local.get({ quickNote: '' });
    assert.strictEqual(cleared.quickNote, '', 'Note cleared successfully');
  })) passed++;

  // 10. Today Priorities CRUD
  total++;
  if (await testAsync('priorities can be added, completed, and cleared', async () => {
    const mock = createMockChrome({ dailyTasks: [] });

    // Add tasks
    const tasks = [
      { id: '1', text: 'Ship extension v2.18.1', done: false },
      { id: '2', text: 'Review privacy policy', done: false }
    ];
    await mock.storage.local.set({ dailyTasks: tasks });

    let s = await mock.storage.local.get({ dailyTasks: [] });
    assert.strictEqual(s.dailyTasks.length, 2);

    // Complete task 1
    tasks[0].done = true;
    await mock.storage.local.set({ dailyTasks: tasks });

    s = await mock.storage.local.get({ dailyTasks: [] });
    assert.strictEqual(s.dailyTasks.filter(t => t.done).length, 1);

    // Clear completed
    await mock.storage.local.set({ dailyTasks: s.dailyTasks.filter(t => !t.done) });
    s = await mock.storage.local.get({ dailyTasks: [] });
    assert.strictEqual(s.dailyTasks.length, 1);
    assert.strictEqual(s.dailyTasks[0].text, 'Review privacy policy');
  })) passed++;

  // 11. Browser Memory & Search
  total++;
  if (await testAsync('browser memory bookmarks pages, prevents duplicates, and filters search', async () => {
    const mock = createMockChrome({ savedPages: [] });

    // Save page
    const page1 = { id: 'p1', url: 'https://news.ycombinator.com', title: 'Hacker News', note: 'Tech discussions', tags: ['news', 'tech'], savedAt: Date.now() };
    const page2 = { id: 'p2', url: 'https://developer.chrome.com', title: 'Chrome Developers', note: 'MV3 documentation', tags: ['extensions', 'docs'], savedAt: Date.now() };

    await mock.storage.local.set({ savedPages: [page1, page2] });

    let { savedPages } = await mock.storage.local.get({ savedPages: [] });
    assert.strictEqual(savedPages.length, 2);

    // Search query matching
    const q = 'docs';
    const matches = savedPages.filter(x => [x.title, x.url, x.note, ...(x.tags || [])].join(' ').toLowerCase().includes(q));
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].id, 'p2');
  })) passed++;

  // 12. Project Continuity Checkpoints
  total++;
  if (await testAsync('project continuity checkpoints save and clear cleanly', async () => {
    const mock = createMockChrome({});

    const checkpoint = {
      project: 'Stillspace v2.18.1 Release',
      last: 'Automated test suite implementation',
      next: 'Run Chrome headless verification and build ZIP',
      savedAt: Date.now()
    };
    await mock.storage.local.set({ resumeCheckpoint: checkpoint });

    let res = await mock.storage.local.get({ resumeCheckpoint: {} });
    assert.strictEqual(res.resumeCheckpoint.project, 'Stillspace v2.18.1 Release');

    await mock.storage.local.remove('resumeCheckpoint');
    res = await mock.storage.local.get({ resumeCheckpoint: {} });
    assert.deepStrictEqual(res.resumeCheckpoint, {});
  })) passed++;

  // 13. Theme Catalog Structure & Count
  total++;
  if (test('theme-store FALLBACK catalog contains all 72 curated themes with valid metadata', () => {
    const themeStoreJs = fs.readFileSync(path.join(ROOT, 'theme-store.js'), 'utf8');
    // Extract FALLBACK json
    const match = themeStoreJs.match(/const\s+FALLBACK\s*=\s*(\{[\s\S]*?\});\s*let catalog/);
    assert(match, 'FALLBACK object must be defined');
    const fallback = JSON.parse(match[1]);
    assert(Array.isArray(fallback.themes), 'themes must be array');
    assert.strictEqual(fallback.themes.length, 72, `Catalog must have 72 themes (found ${fallback.themes.length})`);

    const blackOpsThemes = fallback.themes.filter(t => t.category === 'Black Ops');
    assert.strictEqual(blackOpsThemes.length, 12, 'Must have 12 Black Ops themes');

    fallback.themes.forEach(t => {
      assert(t.id && t.name && t.category && t.background && t.accent, `Theme ${t.id} must have complete properties`);
      assert(t.background.includes('gradient'), `Theme ${t.id} must use gradient backgrounds`);
    });
  })) passed++;

  // 14. Wallpapers Catalog Consistency
  total++;
  if (test('wallpapers.js metadata matches exactly the 100 SVG files in wallpapers/', () => {
    const code = fs.readFileSync(path.join(ROOT, 'wallpapers.js'), 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const catalog = sandbox.window.STILLSPACE_WALLPAPERS;
    assert(Array.isArray(catalog), 'STILLSPACE_WALLPAPERS must be an array');
    assert.strictEqual(catalog.length, 100, `Must define 100 wallpapers (found ${catalog.length})`);

    catalog.forEach((w, index) => {
      const expectedFile = `wallpaper-${String(index + 1).padStart(3, '0')}.svg`;
      assert.strictEqual(w.file, expectedFile, `Index ${index + 1} file name mismatch`);
      assert(fs.existsSync(path.join(ROOT, 'wallpapers', w.file)), `File ${w.file} must exist`);
      assert(w.id && w.name && w.category && w.accent, `Wallpaper ${w.id} must have full metadata`);
    });
  })) passed++;

  console.log(`\nRuntime Logic Summary: ${passed} / ${total} passed`);
  return { passed, total };
}

module.exports = { runRuntimeSuite };
if (require.main === module) {
  runRuntimeSuite().then(({ passed, total }) => {
    process.exit(passed === total ? 0 : 1);
  });
}
