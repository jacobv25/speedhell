// Shell regression check — zero-dependency headless-Chrome driver (same CDP
// pattern as shots.mjs). Loads index.html over local http and asserts that
// every element carrying class="hide" actually computes to display:none.
// Exists because r44–r45 shipped an initials card that "hid" via a class no
// stylesheet rule matched, and the JS-only headless check could not see it.
// Usage: node test/shell.mjs   (chrome located like shots.mjs; SHOTS_CHROME
// overrides)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { tmpdir, homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function findChrome() {
  if (process.env.SHOTS_CHROME) return process.env.SHOTS_CHROME;
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).sort().reverse()) {
      if (!d.startsWith('chromium_headless_shell-')) continue;
      const bin = join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(sys)) return sys;
  throw new Error('no chrome found — set SHOTS_CHROME=/path/to/chrome');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = await new Promise((resolve) => {
  const s = createServer((req, res) => {
    try {
      const file = join(ROOT, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const port = srv.address().port;
const profile = mkdtempSync(join(tmpdir(), 'speedhell-shell-'));
const bin = findChrome();
const chrome = spawn(bin, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const timer = setTimeout(() => reject(new Error('chrome did not announce DevTools ws:\n' + buf)), 15000);
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
  chrome.on('exit', (c) => reject(new Error('chrome exited early (' + c + '):\n' + buf)));
});

let exitCode = 1;
try {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const msg = { id: ++id, method, params }; if (sessionId) msg.sessionId = sessionId; pending.set(msg.id, { res, rej }); ws.send(JSON.stringify(msg)); });
  const { targetId } = await send('Target.createTarget', { url: `http://127.0.0.1:${port}/index.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  // wait for the module to boot (footer build tag renders from src/version.js)
  for (let i = 0; ; i++) {
    const r = await send('Runtime.evaluate', { expression: '/r\\d+/.test(document.body.innerText)', returnByValue: true }, sessionId);
    if (r.result.value) break;
    if (i > 100) throw new Error('index.html never rendered a build tag');
    await new Promise((r2) => setTimeout(r2, 100));
  }
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      build: (document.body.innerText.match(/r\\d+/) || [])[0],
      leaks: [...document.querySelectorAll('.hide')].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.id || el.className),
      ids: Object.fromEntries(['results', 'entry', 'resTag', 'resSub', 'scores', 'title', 'howto', 'opts'].map((i) => [i, document.getElementById(i) ? getComputedStyle(document.getElementById(i)).display : 'MISSING'])),
    })`, returnByValue: true,
  }, sessionId);
  const out = JSON.parse(r.result.value);
  console.log('build', out.build);
  for (const [k, v] of Object.entries(out.ids)) console.log(`  #${k.padEnd(8)} ${v}`);
  const missing = Object.entries(out.ids).filter(([, v]) => v === 'MISSING').map(([k]) => k);
  if (out.leaks.length) console.log('FAIL: .hide elements still visible:', out.leaks.join(', '));
  else if (missing.length) console.log('FAIL: missing overlay ids:', missing.join(', '));
  else { console.log('PASS: every .hide element computes to display:none'); exitCode = 0; }
  ws.close();
} finally {
  srv.close();
  await new Promise((res) => { chrome.once('exit', res); chrome.kill(); }); // profile dir is busy until chrome is gone
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}
process.exit(exitCode);
