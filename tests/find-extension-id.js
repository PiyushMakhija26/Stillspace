const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const port = 9340;

const p = spawn(CHROME_PATH, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu',
  `--load-extension=${ROOT}`,
  `--user-data-dir=${path.join(ROOT, '..', 'test-prof-extid')}`
]);

setTimeout(async () => {
  try {
    const newTarget = await new Promise(resolve => {
      const req = http.request(`http://127.0.0.1:${port}/json/new?chrome://extensions`, { method: 'PUT' }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.end();
    });

    const ws = new WebSocket(newTarget.webSocketDebuggerUrl);
    ws.onopen = () => {
      // Query chrome.management.getAll() or DOM in chrome://extensions
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              (function() {
                const manager = document.querySelector('extensions-manager');
                if (!manager) return 'no manager';
                const list = manager.shadowRoot.querySelector('extensions-item-list');
                if (!list) return 'no list';
                const items = list.shadowRoot.querySelectorAll('extensions-item');
                return Array.from(items).map(i => ({ id: i.id, name: i.shadowRoot.querySelector('#name')?.textContent }));
              })()
            `,
            returnByValue: true
          }
        }));
      }, 1500);
    };

    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Extensions found:', JSON.stringify(msg.result?.value));
        p.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error(err);
    p.kill();
    process.exit(1);
  }
}, 2000);
