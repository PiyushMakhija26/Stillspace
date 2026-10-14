const $ = id => document.getElementById(id);
const DEFAULTS = { theme: 'stealth', wallpaper: 'aurora', customWallpaper: '', font: 'modern', motion: 'ambient', storeTheme: null, customAccent: '#c5f2d7', customBase: '#10151d', wallpaperId: 'wp-001' };
let toastTimer;

function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
function clockTick() {
  const now = new Date();
  $('clock').textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const fullTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  if ($('widgetClock')) $('widgetClock').textContent = fullTime;
  if ($('widgetDate')) $('widgetDate').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  if ($('widgetTimezone')) $('widgetTimezone').textContent = `${Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'} · 24-hour`;
  $('dateLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase();
  const hour = now.getHours();
  $('greeting').innerHTML = hour < 12 ? 'Good <em>morning.</em>' : hour < 18 ? 'Good <em>afternoon.</em>' : 'Good <em>evening.</em>'; 
}
function applyAppearance(settings) {
  document.body.dataset.theme = settings.theme || DEFAULTS.theme;
  document.body.dataset.wallpaper = settings.wallpaper || DEFAULTS.wallpaper; document.body.dataset.font = settings.font || 'modern'; document.body.dataset.motion = settings.motion || 'ambient';
  const layer = document.querySelector('.wallpaper-layer');
  if (settings.wallpaper === 'custom' && settings.customWallpaper) {
    layer.style.background = '#10151d';
    layer.style.backgroundImage = `url("${settings.customWallpaper}")`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center center';
    layer.style.backgroundRepeat = 'no-repeat';
  } else if (settings.wallpaper === 'built-in' && settings.wallpaperId) {
    // Resolve the actual bundled filename from the shared catalog. The first 100
    // wallpapers are SVG; the cinematic collection uses JPG files.
    const wallpaper = (window.STILLSPACE_WALLPAPERS || []).find(item => item.id === settings.wallpaperId);
    layer.style.background = '#050608';
    layer.style.backgroundImage = wallpaper?.file ? `url("${chrome.runtime.getURL(`wallpapers/${wallpaper.file}`)}")` : '';
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center center';
    layer.style.backgroundRepeat = 'no-repeat';
  } else if (settings.wallpaper === 'store' && settings.storeTheme?.background) {
    layer.style.backgroundImage = '';
    layer.style.background = settings.storeTheme.background;
  } else {
    layer.style.backgroundImage = '';
    layer.style.background = '';
  }
  document.documentElement.style.setProperty('--mint', settings.storeTheme?.accent || settings.customAccent || '#c5f2d7');
  document.documentElement.style.setProperty('--theme-accent', settings.storeTheme?.accent || settings.customAccent || '#c5f2d7');
  document.body.dataset.experience = settings.storeTheme?.experience || '';
  document.body.style.setProperty('--theme-background', settings.storeTheme?.background || '');
  if (settings.storeTheme?.experience === 'blackops') document.body.dataset.theme = 'blackops';
  document.querySelectorAll('[data-theme-choice]').forEach(button => button.classList.toggle('active', button.dataset.themeChoice === (settings.theme || DEFAULTS.theme)));
  document.querySelectorAll('[data-wallpaper-choice]').forEach(button => button.classList.toggle('active', button.dataset.wallpaperChoice === (settings.wallpaper || DEFAULTS.wallpaper)));
  document.querySelectorAll('[data-font-choice]').forEach(button => button.classList.toggle('active', button.dataset.fontChoice === (settings.font || DEFAULTS.font)));
  document.querySelectorAll('[data-motion-choice]').forEach(button => button.classList.toggle('active', button.dataset.motionChoice === (settings.motion || DEFAULTS.motion)));
}
async function getSettings() { return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) }; }
async function updateSettings(partial) {
  const settings = { ...(await getSettings()), ...partial };
  await chrome.storage.local.set(partial); applyAppearance(settings);
}
function relativeDate(value) {
  const elapsed = Math.max(0, Date.now() - value);
  if (elapsed < 60000) return 'Just now';
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}
async function renderWorkspaces() {
  const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
  $('wsCount').textContent = workspaces.length;
  const grid = $('workspaceGrid'); grid.replaceChildren();
  $('workspaceEmpty').hidden = workspaces.length > 0;
  workspaces.slice().sort((a,b) => b.updatedAt - a.updatedAt).slice(0,6).forEach(ws => {
    const card = document.createElement('article'); card.className = 'workspace-card';
    const top = document.createElement('div'); top.className = 'card-top';
    const monogram = document.createElement('div'); monogram.className = 'card-monogram'; monogram.textContent = ws.name.trim().charAt(0).toUpperCase() || 'W';
    const count = document.createElement('div'); count.className = 'tab-number'; count.textContent = `${ws.tabs.length} tabs`;
    top.append(monogram, count);
    const title = document.createElement('div'); title.className = 'card-title'; title.textContent = ws.name;
    const meta = document.createElement('div'); meta.className = 'card-meta'; meta.textContent = `Saved ${relativeDate(ws.updatedAt)}`;
    const restore = document.createElement('button'); restore.className = 'card-restore'; restore.textContent = `Restore ${ws.name}`; restore.setAttribute('aria-label', `Restore workspace ${ws.name}`); restore.addEventListener('click', () => restoreWorkspace(ws.id));
    card.append(top, title, meta, restore); grid.append(card);
  });
  if (workspaces.length > 6) { const more = document.createElement('button'); more.className = 'text-button'; more.style.gridColumn = '1 / -1'; more.textContent = `+ ${workspaces.length - 6} more workspaces — open extension`; more.addEventListener('click', () => showToast('Use the Stillspace toolbar icon to manage all workspaces.')); grid.append(more); }
}
async function restoreWorkspace(id) {
  const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
  const ws = workspaces.find(w => w.id === id); if (!ws) return;
  const active = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let index = active ? active.index + 1 : undefined; let opened = 0;
  for (const tab of ws.tabs) {
    try {
      const created = await chrome.tabs.create({ url: tab.url, active: false, ...(index === undefined ? {} : { index }) });
      if (tab.pinned) await chrome.tabs.update(created.id, { pinned: true });
      if (tab.muted) await chrome.tabs.update(created.id, { muted: true });
      opened++; if (index !== undefined) index++;
    } catch (e) { console.warn('Restore failed for tab', tab.url, e); }
  }
  showToast(`Restored ${opened} of ${ws.tabs.length} tabs.`);
}

$('searchForm').addEventListener('submit', event => {
  event.preventDefault(); const query = $('searchInput').value.trim(); if (!query) return;
  const url = /^(https?:\/\/|chrome:\/\/)/i.test(query) ? query : (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(query) && !query.includes(' ') ? `https://${query}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`);
  location.href = url;
});
$('settingsToggle').addEventListener('click', () => { $('settingsPanel').classList.add('open'); $('settingsPanel').setAttribute('aria-hidden','false'); });
$('closeSettings').addEventListener('click', () => { $('settingsPanel').classList.remove('open'); $('settingsPanel').setAttribute('aria-hidden','true'); });
$('manageButton').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') }));
$('openThemeStore').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('theme-store.html') }));
const openStore = () => chrome.tabs.create({ url: chrome.runtime.getURL('theme-store.html') });
$('openThemeStoreTop').addEventListener('click', openStore);
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', async () => { await updateSettings({ theme: button.dataset.themeChoice, storeTheme: null }); showToast(`Color mood: ${button.textContent.trim()}`); }));
document.querySelectorAll('[data-wallpaper-choice]').forEach(button => button.addEventListener('click', async () => { await updateSettings({ wallpaper: button.dataset.wallpaperChoice, customWallpaper: '', storeTheme: null }); showToast(`Wallpaper: ${button.textContent.trim()}`); }));
document.querySelectorAll('[data-font-choice]').forEach(button => button.addEventListener('click', async () => { await updateSettings({font:button.dataset.fontChoice}); document.querySelectorAll('[data-font-choice]').forEach(b=>b.classList.toggle('active',b===button)); showToast(`Typography: ${button.textContent.trim()}`); }));
document.querySelectorAll('[data-motion-choice]').forEach(button => button.addEventListener('click', async () => { await updateSettings({motion:button.dataset.motionChoice}); document.querySelectorAll('[data-motion-choice]').forEach(b=>b.classList.toggle('active',b===button)); showToast(`Motion: ${button.textContent.trim()}`); }));
async function saveUploadedWallpaper(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('Choose an image file.');return}
  if(file.size>15*1024*1024){showToast('Choose an image smaller than 15 MB.');return}
  try{
    showToast('Preparing wallpaper…');
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,1920/bitmap.width,1080/bitmap.height);
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not compress image')),'image/jpeg',.84));
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read image'));reader.readAsDataURL(blob)});
    await updateSettings({wallpaper:'custom',customWallpaper:data,wallpaperId:'',storeTheme:null});
    showToast('Wallpaper saved and applied.');
  }catch(err){console.error('Stillspace wallpaper upload failed',err);showToast('Could not save wallpaper. Try another image.')}
}
$('wallpaperUpload').addEventListener('change',async event=>{await saveUploadedWallpaper(event.target.files?.[0]);event.target.value='';});
$('resetWallpaper').addEventListener('click', () => updateSettings({ wallpaper: 'aurora', customWallpaper: '' }));
window.addEventListener('keydown', event => { if (event.key === 'Escape') { $('settingsPanel').classList.remove('open'); $('settingsPanel').setAttribute('aria-hidden','true'); } });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.workspaces) renderWorkspaces(); if (area === 'local' && ['theme','wallpaper','wallpaperId','customWallpaper','font','motion','storeTheme','customAccent'].some(key => changes[key])) getSettings().then(applyAppearance); });
// v2.4: local-only focus timer, priorities and lightweight stats.
let focusPresetMinutes=25, focusInterval=null;
async function getDailyState(){return await chrome.storage.local.get({dailyTasks:[],focusStats:{sessions:0,minutes:0},focusTimer:{running:false,duration:1500,endsAt:0,remaining:1500}})}
function formatDuration(seconds){seconds=Math.max(0,Math.floor(seconds));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
async function paintFocus(){const s=await getDailyState();let remaining=s.focusTimer.running?Math.max(0,Math.ceil((s.focusTimer.endsAt-Date.now())/1000)):s.focusTimer.remaining;if(s.focusTimer.running&&remaining===0){await finishFocus(s);return} $('focusClock').textContent=formatDuration(remaining);$('focusStatus').textContent=s.focusTimer.running?'IN SESSION':'READY';$('focusStart').textContent=s.focusTimer.running?'Pause focus':'Start focus';$('statSessions').textContent=s.focusStats.sessions||0;$('statMinutes').textContent=s.focusStats.minutes||0;}
async function finishFocus(s){clearInterval(focusInterval);focusInterval=null;const stats={sessions:(s.focusStats.sessions||0)+1,minutes:(s.focusStats.minutes||0)+Math.round((s.focusTimer.duration||1500)/60)};await chrome.storage.local.set({focusStats:stats,focusTimer:{running:false,duration:focusPresetMinutes*60,remaining:focusPresetMinutes*60,endsAt:0}});showToast('Focus session complete. Take a short break.');paintFocus()}
async function toggleFocus(){const s=await getDailyState();if(s.focusTimer.running){const remaining=Math.max(0,Math.ceil((s.focusTimer.endsAt-Date.now())/1000));await chrome.storage.local.set({focusTimer:{...s.focusTimer,running:false,remaining,endsAt:0}});clearInterval(focusInterval);focusInterval=null;paintFocus();return}const remaining=s.focusTimer.remaining||focusPresetMinutes*60;await chrome.storage.local.set({focusTimer:{running:true,duration:s.focusTimer.duration||focusPresetMinutes*60,remaining,endsAt:Date.now()+remaining*1000}});if(!focusInterval)focusInterval=setInterval(paintFocus,1000);paintFocus()}
async function resetFocus(){clearInterval(focusInterval);focusInterval=null;const seconds=focusPresetMinutes*60;await chrome.storage.local.set({focusTimer:{running:false,duration:seconds,remaining:seconds,endsAt:0}});paintFocus()}
document.querySelectorAll('[data-focus-minutes]').forEach(b=>b.addEventListener('click',async()=>{focusPresetMinutes=Number(b.dataset.focusMinutes);document.querySelectorAll('[data-focus-minutes]').forEach(x=>x.classList.toggle('active',x===b));await resetFocus()}));$('focusStart').addEventListener('click',toggleFocus);$('focusReset').addEventListener('click',resetFocus);
async function renderTasks(){const s=await getDailyState(),tasks=s.dailyTasks;const root=$('taskList');root.replaceChildren();$('taskCount').textContent=tasks.length;$('taskProgress').textContent=`${tasks.filter(t=>t.done).length} done`;$('taskEmpty').hidden=tasks.length>0;tasks.forEach(task=>{const row=document.createElement('label');row.className='task-row'+(task.done?' done':'');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!task.done;cb.addEventListener('change',async()=>{const current=(await getDailyState()).dailyTasks;const t=current.find(x=>x.id===task.id);if(t)t.done=cb.checked;await chrome.storage.local.set({dailyTasks:current});renderTasks()});const text=safeText('span','',task.text);const del=safeText('button','','×');del.type='button';del.setAttribute('aria-label','Delete task');del.addEventListener('click',async e=>{e.preventDefault();await chrome.storage.local.set({dailyTasks:(await getDailyState()).dailyTasks.filter(x=>x.id!==task.id)});renderTasks()});row.append(cb,text,del);root.append(row)})}
$('taskForm').addEventListener('submit',async e=>{e.preventDefault();const text=$('taskInput').value.trim();if(!text)return;const s=await getDailyState();s.dailyTasks.push({id:crypto.randomUUID(),text,done:false,createdAt:Date.now()});await chrome.storage.local.set({dailyTasks:s.dailyTasks});$('taskInput').value='';renderTasks()});$('clearCompletedTasks').addEventListener('click',async()=>{const s=await getDailyState();await chrome.storage.local.set({dailyTasks:s.dailyTasks.filter(t=>!t.done)});renderTasks()});
getDailyState().then(s=>{focusPresetMinutes=Math.round((s.focusTimer.duration||1500)/60);document.querySelectorAll('[data-focus-minutes]').forEach(b=>b.classList.toggle('active',Number(b.dataset.focusMinutes)===focusPresetMinutes));if(s.focusTimer.running)focusInterval=setInterval(paintFocus,1000);paintFocus();renderTasks()});

// v2.5: a local checkpoint for project continuity. No network calls or API keys.
const resumeIds = ['resumeProject','resumeLast','resumeNext'];
async function loadResumeCheckpoint(){
  const {resumeCheckpoint={}}=await chrome.storage.local.get({resumeCheckpoint:{}});
  $('resumeProject').value=resumeCheckpoint.project||''; $('resumeLast').value=resumeCheckpoint.last||''; $('resumeNext').value=resumeCheckpoint.next||'';
  $('resumeSavedAt').textContent=resumeCheckpoint.savedAt ? 'Last saved '+new Date(resumeCheckpoint.savedAt).toLocaleString() : 'No checkpoint saved yet';
}
$('resumeSave').addEventListener('click',async()=>{
  const project=$('resumeProject').value.trim(), last=$('resumeLast').value.trim(), next=$('resumeNext').value.trim();
  if(!project&&!last&&!next){showToast('Add a project or a next step first.');return}
  const resumeCheckpoint={project,last,next,savedAt:Date.now()};
  await chrome.storage.local.set({resumeCheckpoint});
  $('resumeSavedAt').textContent='Last saved '+new Date(resumeCheckpoint.savedAt).toLocaleString();
  showToast('Checkpoint saved locally. Pick it up whenever you return.');
});
$('resumeClear').addEventListener('click',async()=>{
  if(!resumeIds.some(id=>$(id).value.trim()))return;
  await chrome.storage.local.remove('resumeCheckpoint'); resumeIds.forEach(id=>$(id).value=''); $('resumeSavedAt').textContent='No checkpoint saved yet'; showToast('Checkpoint cleared.');
});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.resumeCheckpoint)loadResumeCheckpoint()});
clockTick(); setInterval(clockTick, 1000); getSettings().then(applyAppearance); renderWorkspaces(); renderMemory(); loadResumeCheckpoint(); loadQuickNote();

// Local Browser Memory: saved pages, notes and tags remain on this device.
let memoryResults = [], commandIndex = 0;
async function getMemory(){ return (await chrome.storage.local.get({savedPages:[]})).savedPages; }
function safeText(tag, cls, value){ const el=document.createElement(tag); if(cls)el.className=cls; el.textContent=value||''; return el; }
async function renderMemory(query=''){
 const all=await getMemory(), q=query.trim().toLowerCase();
 const list=all.filter(x=>!q||[x.title,x.url,x.note,...(x.tags||[])].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.savedAt-a.savedAt);
 $('memoryCount').textContent=all.length; const grid=$('memoryGrid'); grid.replaceChildren(); $('memoryEmpty').hidden=list.length>0;
 list.slice(0,8).forEach(item=>{const card=document.createElement('article');card.className='memory-card';const top=document.createElement('div');top.className='memory-card-top';top.append(safeText('span','memory-domain',new URL(item.url).hostname.replace(/^www\./,'')),safeText('span','memory-date',relativeDate(item.savedAt)));const title=safeText('a','memory-title',item.title||item.url);title.href=item.url;title.addEventListener('click',e=>{e.preventDefault();chrome.tabs.create({url:item.url})});const note=safeText('p','memory-note',item.note||'No note yet');const actions=document.createElement('div');actions.className='memory-card-actions';const edit=safeText('button','text-button','Add note');edit.onclick=async()=>{const value=prompt('Add a note for this saved page:',item.note||'');if(value===null)return;const latest=await getMemory();const target=latest.find(x=>x.id===item.id);if(target)target.note=value;await chrome.storage.local.set({savedPages:latest});renderMemory($('memorySearch').value)};const remove=safeText('button','text-button','Remove');remove.onclick=async()=>{await chrome.storage.local.set({savedPages:(await getMemory()).filter(x=>x.id!==item.id)});renderMemory($('memorySearch').value)};actions.append(edit,remove);card.append(top,title,note,actions);grid.append(card)});
}
async function saveCurrentPage(){const tabs=await chrome.tabs.query({lastFocusedWindow:true});const tab=tabs.filter(t=>!t.active&&t.url&&!/^(chrome|chrome-extension|edge|devtools):/i.test(t.url)).sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0))[0];if(!tab?.url||/^(chrome|chrome-extension|edge|devtools):/i.test(tab.url)){showToast('This browser page cannot be saved. Open a website first.');return}const pages=await getMemory();if(pages.some(x=>x.url===tab.url)){showToast('This page is already in Browser Memory.');return}pages.push({id:crypto.randomUUID(),url:tab.url,title:tab.title||tab.url,note:'',tags:[],savedAt:Date.now()});await chrome.storage.local.set({savedPages:pages});showToast('Saved to Browser Memory.');renderMemory($('memorySearch').value)}
function commandList(q=''){const query=q.trim().toLowerCase();const items=[{label:'Save current page to Browser Memory',hint:'Save this website',run:saveCurrentPage},{label:'Open workspace manager',hint:'Manage and restore workspaces',run:()=>chrome.tabs.create({url:chrome.runtime.getURL('manager.html')})},{label:'Open Theme Store',hint:'Themes and wallpapers',run:()=>chrome.tabs.create({url:chrome.runtime.getURL('theme-store.html')})},{label:'Open appearance settings',hint:'Customize this New Tab',run:()=>$('settingsToggle').click()},{label:'Focus search box',hint:'Search the web',run:()=>$('searchInput').focus()},{label:'Start or pause focus session',hint:'Local focus timer',run:toggleFocus},{label:'Add today priority',hint:'Daily task list',run:()=>$('taskInput').focus()}];return items.filter(x=>(x.label+' '+x.hint).toLowerCase().includes(query)).concat(memoryResults.filter(x=>(x.title+' '+x.url+' '+(x.note||'')).toLowerCase().includes(query)).map(x=>({label:x.title,hint:x.url,run:()=>chrome.tabs.create({url:x.url})}))).slice(0,8)}
function renderCommands(){const q=$('commandInput').value;const items=commandList(q);const root=$('commandResults');root.replaceChildren();commandIndex=Math.min(commandIndex,Math.max(0,items.length-1));items.forEach((item,i)=>{const b=safeText('button','command-result',item.label);b.append(safeText('small','',item.hint));b.classList.toggle('selected',i===commandIndex);b.onclick=()=>{closeCommands();item.run()};root.append(b)});root.dataset.count=items.length}
function openCommands(){ $('commandPalette').hidden=false;$('commandInput').value='';commandIndex=0;getMemory().then(x=>{memoryResults=x;renderCommands()});$('commandInput').focus() }
function closeCommands(){ $('commandPalette').hidden=true }
$('saveCurrentPage').addEventListener('click',saveCurrentPage);$('memorySearch').addEventListener('input',e=>renderMemory(e.target.value));$('clearMemorySearch').addEventListener('click',()=>{$('memorySearch').value='';renderMemory()});$('commandOpen').addEventListener('click',openCommands);$('commandInput').addEventListener('input',()=>{commandIndex=0;renderCommands()});$('commandPalette').addEventListener('click',e=>{if(e.target===$('commandPalette'))closeCommands()});$('commandInput').addEventListener('keydown',e=>{const count=Number($('commandResults').dataset.count||0);if(e.key==='Escape'){closeCommands();return}if(e.key==='ArrowDown'){e.preventDefault();commandIndex=Math.min(count-1,commandIndex+1);renderCommands()}if(e.key==='ArrowUp'){e.preventDefault();commandIndex=Math.max(0,commandIndex-1);renderCommands()}if(e.key==='Enter'){e.preventDefault();$('commandResults').querySelectorAll('.command-result')[commandIndex]?.click()}});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('commandPalette').hidden?openCommands():closeCommands()}});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.savedPages)renderMemory($('memorySearch').value);if(area==='local'&&(changes.dailyTasks||changes.focusStats||changes.focusTimer)){renderTasks();paintFocus()}});


// v2.8: small persistent notes widget. Autosaves locally; no network calls.
let quickNoteTimer;
async function loadQuickNote(){
  const {quickNote=''}=await chrome.storage.local.get({quickNote:''});
  const field=$('quickNote'); if(!field)return;
  field.value=quickNote; $('noteCharCount').textContent=`${quickNote.length} / 3000`;
  $('noteSaveStatus').textContent=quickNote ? 'Saved on this device' : 'Ready · saves as you type';
}
$('quickNote').addEventListener('input',()=>{
  const value=$('quickNote').value;
  $('noteCharCount').textContent=`${value.length} / 3000`;
  $('noteSaveStatus').textContent='Saving…';
  clearTimeout(quickNoteTimer);
  quickNoteTimer=setTimeout(async()=>{
    await chrome.storage.local.set({quickNote:value});
    $('noteSaveStatus').textContent='Saved on this device';
  },350);
});
$('clearQuickNote').addEventListener('click',async()=>{
  clearTimeout(quickNoteTimer);
  $('quickNote').value=''; $('noteCharCount').textContent='0 / 3000';
  await chrome.storage.local.remove('quickNote');
  $('noteSaveStatus').textContent='Note cleared';
  showToast('Quick note cleared.');
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&changes.quickNote&&document.activeElement!==$('quickNote'))loadQuickNote();
});
