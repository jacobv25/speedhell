import { createServer } from 'node:http'; import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path'; import { tmpdir, homedir } from 'node:os';
// Screenshot a harness page in headless Chrome (zero-dep CDP, same pattern as
// test/shots.mjs). Builder tool for the presentation experiments (wiki §10):
//   node tools/peek.mjs test/fxpeek.html out.png [WxH]
// The page sets window.__done = true when it has drawn.
import { fileURLToPath } from 'node:url'; import { dirname } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = process.argv[2] || 'test/fxpeek.html', OUT = process.argv[3] || 'peek.png';
const [VW, VH] = (process.argv[4] || '1920x2562').split('x').map(Number);
const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright'); let bin;
for (const d of readdirSync(cache).sort().reverse()) if (d.startsWith('chromium_headless_shell-')) { const b = join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'); if (existsSync(b)) { bin = b; break; } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = await new Promise((res) => { const s = createServer((q, r) => { try { const f = join(ROOT, normalize(new URL(q.url, 'http://x').pathname)); const body = readFileSync(f); r.writeHead(200, { 'content-type': MIME[extname(f)] || 'text/plain' }); r.end(body); } catch { if (!r.headersSent) r.writeHead(404); r.end(); } }); s.listen(0, '127.0.0.1', () => res(s)); });
const chrome = spawn(bin, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pk-'))}`, '--no-first-run', '--mute-audio', `--window-size=${VW},${VH}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res) => { let b = ''; chrome.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); });
const ws = new WebSocket(wsUrl); let id = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}, sessionId) => new Promise((r) => { const msg = { id: ++id, method, params }; if (sessionId) msg.sessionId = sessionId; pend.set(msg.id, r); ws.send(JSON.stringify(msg)); });
const { result: { targetId } } = await send('Target.createTarget', { url: `http://127.0.0.1:${srv.address().port}/${PAGE}` });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false }, sessionId);
for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: '!!window.__done', returnByValue: true }, sessionId); if (r.result?.result?.value) break; await new Promise((r2) => setTimeout(r2, 100)); }
const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
writeFileSync(OUT, Buffer.from(shot.result.data, 'base64')); console.log('wrote', OUT);
chrome.kill(); srv.close(); ws.close();
