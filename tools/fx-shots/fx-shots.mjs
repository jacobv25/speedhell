import { createServer } from 'node:http'; import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync } from 'node:fs';
import { join, extname } from 'node:path'; import { tmpdir, homedir } from 'node:os';
const ROOT = new URL('../..', import.meta.url).pathname, S = new URL('.', import.meta.url).pathname;
const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
let bin; for (const d of readdirSync(cache).sort().reverse()) { if (d.startsWith('chromium_headless_shell-')) { const b = join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'); if (existsSync(b)) { bin = b; break; } } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = createServer((req, res) => { try { const p = new URL(req.url, 'http://x').pathname; const file = p === '/fx-shots.html' ? join(S, 'fx-shots.html') : join(ROOT, p); res.writeHead(200, { 'content-type': MIME[extname(file)] || 'text/plain' }); res.end(readFileSync(file)); } catch { res.writeHead(404).end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const chrome = spawn(bin, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'fx-'))}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res) => { let b = ''; chrome.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); });
const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.error('PAGE EXC', JSON.stringify(m.params.exceptionDetails).slice(0, 500)); };
await new Promise((r) => ws.onopen = r);
const send = (method, params = {}, sessionId) => new Promise((r) => { const msg = { id: ++id, method, params }; if (sessionId) msg.sessionId = sessionId; pending.set(msg.id, r); ws.send(JSON.stringify(msg)); });
const { result: { targetId } } = await send('Target.createTarget', { url: `http://127.0.0.1:${port}/fx-shots.html` });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: '!!window.__fx', returnByValue: true }, sessionId); if (r.result?.result?.value) break; await new Promise((r2) => setTimeout(r2, 100)); }
const r = await send('Runtime.evaluate', { expression: 'window.__fx()', returnByValue: true }, sessionId);
if (r.error || r.result.exceptionDetails) { console.error(JSON.stringify(r).slice(0, 800)); process.exit(1); }
for (const [k, v] of Object.entries(r.result.result.value)) writeFileSync(join(S, 'out', `fx-${k}.png`), Buffer.from(v.split(',')[1], 'base64'));
console.log('wrote', Object.keys(r.result.result.value).join(' ')); chrome.kill(); srv.close(); process.exit(0);
