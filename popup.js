const $ = (id) => document.getElementById(id);
const store = {
  async get() { return (await chrome.storage.local.get({ workspaces: [] })).workspaces; },
  async set(workspaces) { await chrome.storage.local.set({ workspaces }); }
};

function prettyDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
  catch { return 'Saved workspace'; }
}

async function getCurrentTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.sort((a, b) => a.index - b.index);
}

async function render() {
  const tabs = await getCurrentTabs();
  const inactiveCount = tabs.filter(t => !t.active && !t.url?.startsWith('chrome://')).length;
  $('tabCount').textContent = tabs.length;
  $('stashButton').disabled = inactiveCount === 0;
  $('stashButton').innerHTML = inactiveCount ? `Stash ${inactiveCount} other tab${inactiveCount === 1 ? '' : 's'} <span>→</span>` : 'Nothing to stash';

  const workspaces = await store.get();
  $('workspaceCount').textContent = workspaces.length;
  $('emptyState').classList.toggle('hidden', workspaces.length > 0);
  const list = $('workspaceList');
  list.replaceChildren();
  workspaces.slice().sort((a,b) => b.updatedAt - a.updatedAt).forEach(ws => {
    const card = document.createElement('article'); card.className = 'workspace-card';
    const icon = document.createElement('div'); icon.className = 'workspace-icon'; icon.textContent = ws.name.trim().charAt(0).toUpperCase() || 'W';
    const info = document.createElement('div'); info.className = 'workspace-info';
    const name = document.createElement('div'); name.className = 'workspace-name'; name.textContent = ws.name;
    const meta = document.createElement('div'); meta.className = 'workspace-meta'; meta.textContent = `${ws.tabs.length} tab${ws.tabs.length === 1 ? '' : 's'} · ${prettyDate(ws.updatedAt)}`;
    info.append(name, meta);
    const actions = document.createElement('div'); actions.className = 'workspace-actions';
    const restore = document.createElement('button'); restore.className = 'small-button restore'; restore.textContent = 'Restore'; restore.title = 'Open saved tabs'; restore.addEventListener('click', () => restoreWorkspace(ws.id));
    const remove = document.createElement('button'); remove.className = 'small-button'; remove.textContent = '×'; remove.title = 'Delete workspace'; remove.addEventListener('click', () => deleteWorkspace(ws.id));
    actions.append(restore, remove); card.append(icon, info, actions); list.append(card);
  });
}

async function stashOtherTabs() {
  const allTabs = await getCurrentTabs();
  const active = allTabs.find(t => t.active);
  if (!active) return;
  const candidates = allTabs.filter(t => !t.active && t.url && !/^(chrome|chrome-extension|devtools):\/\//i.test(t.url));
  if (!candidates.length) { showStatus('No other saveable tabs in this window.'); return; }
  const name = $('workspaceName').value.trim() || `Workspace ${new Date().toLocaleDateString()}`;
  const savedTabs = candidates.map(t => ({ url: t.url, title: t.title || t.url, favIconUrl: t.favIconUrl || '', pinned: Boolean(t.pinned), muted: Boolean(t.mutedInfo?.muted) }));
  const workspaces = await store.get();
  const workspace = { id: crypto.randomUUID(), name, tabs: savedTabs, createdAt: Date.now(), updatedAt: Date.now() };
  workspaces.push(workspace);
  await store.set(workspaces);
  // Store first, close second: if persistence fails, no tabs are removed.
  const results = await Promise.allSettled(candidates.map(t => chrome.tabs.remove(t.id)));
  const failed = results.filter(r => r.status === 'rejected').length;
  showStatus(failed ? `Saved ${savedTabs.length} tabs; ${failed} could not be closed.` : `Saved ${savedTabs.length} tabs to “${name}”.`);
  $('workspaceName').value = '';
  await render();
}

async function restoreWorkspace(id) {
  const workspaces = await store.get();
  const ws = workspaces.find(item => item.id === id);
  if (!ws) return;
  const current = await chrome.tabs.query({ active: true, currentWindow: true });
  let index = current[0] ? current[0].index + 1 : undefined;
  let opened = 0;
  for (const tab of ws.tabs) {
    try {
      const created = await chrome.tabs.create({ url: tab.url, active: false, ...(index === undefined ? {} : { index }) });
      if (tab.pinned) await chrome.tabs.update(created.id, { pinned: true });
      if (tab.muted) await chrome.tabs.update(created.id, { muted: true });
      opened++; if (index !== undefined) index++;
    } catch (error) { console.warn('Could not restore tab:', tab.url, error); }
  }
  showStatus(`Restored ${opened} of ${ws.tabs.length} tabs.`);
  await render();
}

async function deleteWorkspace(id) {
  const workspaces = await store.get();
  await store.set(workspaces.filter(ws => ws.id !== id));
  showStatus('Workspace removed.');
  await render();
}
function showStatus(message) { $('status').textContent = message; }
$('stashButton').addEventListener('click', stashOtherTabs);
$('workspaceName').addEventListener('keydown', e => { if (e.key === 'Enter') stashOtherTabs(); });
$('openDashboard').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') }));
render().catch(err => { console.error(err); showStatus('Could not load workspaces. Try reopening the extension.'); });



// Customization is deliberately promoted in the popup; the arrow-only dashboard link is not enough.
$('customizeExperience').addEventListener('click', async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('theme-store.html') });
});
(async () => {
  try {
    const { storeTheme } = await chrome.storage.local.get({ storeTheme: null });
    if (storeTheme?.name) {
      $('customizeTitle').textContent = `Current look: ${storeTheme.name}`;
      $('customizeDescription').textContent = 'Change your wallpaper, layout, colors and effects anytime';
      $('customizeExperience').querySelector('.customize-cta').firstChild.textContent = 'CHANGE EXPERIENCE ';
    }
  } catch {}
})();

