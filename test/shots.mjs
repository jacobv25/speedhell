// Screenshot referee — zero-dependency headless-Chrome driver.
// Serves the repo over local http (ES modules refuse file://), drives
// test/shots.html via raw CDP on Node's built-in WebSocket, and writes
// evidence/shots/shot-*.png + manifest.json for gauntlet critics.
// Determinism guard: the harness replays the sim's expert run (same seed,
// same bot); this driver FAILS if the replay's outcome diverges from
// evidence/metrics.json — screenshots must come from the certified run.
// Usage: node test/shots.mjs   (finds chrome-headless-shell in the
// playwright cache, or set SHOTS_CHROME=/path/to/chrome)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { tmpdir, homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'evidence', 'shots');

// --- locate a chrome ---------------------------------------------------------
function findChrome() {
  if (process.env.SHOTS_CHROME) return { bin: process.env.SHOTS_CHROME, shell: true };
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).sort().reverse()) {
      if (!d.startsWith('chromium_headless_shell-')) continue;
      const bin = join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
      if (existsSync(bin)) return { bin, shell: true };
    }
    for (const d of readdirSync(cache).sort().reverse()) {
      if (!d.startsWith('chromium-')) continue;
      const bin = join(cache, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
      if (existsSync(bin)) return { bin, shell: false };
    }
  }
  const sys = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(sys)) return { bin: sys, shell: false };
  throw new Error('no chrome found — set SHOTS_CHROME=/path/to/chrome');
}

// --- static server (repo root) ----------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      try {
        const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
        const file = join(ROOT, path);
        if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
        const body = readFileSync(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// --- minimal CDP client ------------------------------------------------------
function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pending = new Map();
    ws.onerror = (e) => reject(new Error('ws error: ' + e.message));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id); pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method === 'Runtime.exceptionThrown') {
        console.error('PAGE EXCEPTION:', JSON.stringify(m.params.exceptionDetails).slice(0, 600));
      } else if (m.method === 'Runtime.consoleAPICalled') {
        console.error('PAGE CONSOLE:', m.params.args.map((a) => a.value ?? a.description).join(' '));
      }
    };
    ws.onopen = () => resolve({
      ws,
      send: (method, params = {}, sessionId) => new Promise((res, rej) => {
        const msg = { id: ++id, method, params };
        if (sessionId) msg.sessionId = sessionId;
        pending.set(msg.id, { res, rej });
        ws.send(JSON.stringify(msg));
      }),
    });
  });
}

// --- main --------------------------------------------------------------------
const t0 = performance.now();
const { bin, shell } = findChrome();
const srv = await serve();
const port = srv.address().port;
const profile = mkdtempSync(join(tmpdir(), 'speedhell-shots-'));
const args = [
  shell ? '--headless' : '--headless=new',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
  'about:blank',
];
const chrome = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const timer = setTimeout(() => reject(new Error('chrome did not announce DevTools ws:\n' + buf)), 15000);
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(timer); resolve(m[1]); }
  });
  chrome.on('exit', (c) => reject(new Error('chrome exited early (' + c + '):\n' + buf)));
});
console.log('chrome:', bin.includes('ms-playwright') ? 'playwright cache headless-shell' : bin);

let exitCode = 1;
try {
  const cdp = await connectCdp(wsUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: `http://127.0.0.1:${port}/test/shots.html` });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sessionId);

  // wait for module load
  for (let i = 0; ; i++) {
    const r = await cdp.send('Runtime.evaluate', { expression: '!!window.__shots', returnByValue: true }, sessionId);
    if (r.result.value) break;
    if (i > 100) throw new Error('harness page never exposed window.__shots');
    await new Promise((r2) => setTimeout(r2, 100));
  }

  console.log('replaying certified expert run + extra scenes…');
  const evalRes = await cdp.send('Runtime.evaluate', {
    expression: 'window.__shots.run()', awaitPromise: true, returnByValue: true,
  }, sessionId);
  if (evalRes.exceptionDetails) throw new Error('harness failed: ' + JSON.stringify(evalRes.exceptionDetails).slice(0, 800));
  const out = evalRes.result.value;

  // determinism guard vs the certified sim run
  const metrics = JSON.parse(readFileSync(join(ROOT, 'evidence', 'metrics.json'), 'utf8'));
  const cert = metrics.runs.find((r) => r.name === 'expert');
  const rep = out.expert;
  const match = cert && rep.frames === cert.frames && rep.score === cert.score
    && rep.kills === cert.kills && rep.outcome === cert.outcome;
  console.log(`replay: ${rep.outcome} f=${rep.frames} score=${rep.score} kills=${rep.kills}  vs certified: ${cert.outcome} f=${cert.frames} score=${cert.score} kills=${cert.kills}  → ${match ? 'MATCH' : 'DIVERGED'}`);
  if (!match) throw new Error('replay diverged from evidence/metrics.json expert run — shots rejected');

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const s of out.shots) {
    const { png, ...meta } = s;
    const file = `shot-${s.id}.png`;
    writeFileSync(join(OUT, file), Buffer.from(png.split(',')[1], 'base64'));
    manifest.push({ file, ...meta });
    console.log(`  ${file.padEnd(28)} frame=${String(meta.frame).padStart(5)} stageT=${String(meta.stageT).padStart(5)} bullets=${String(meta.eBullets).padStart(3)} enemies=${String(meta.enemies).padStart(2)} ${meta.note || ''}`);
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
    seed: out.seed, field: out.field, scale: out.scale, generated: 'shots.mjs',
    certifiedRun: { matched: true, ...rep }, sectionEntryFrames: out.entered, shots: manifest,
  }, null, 2));
  console.log(`section entry frames: ${JSON.stringify(out.entered)}`);
  console.log(`wrote ${manifest.length} shots + manifest.json to evidence/shots/ in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  exitCode = 0;
} finally {
  chrome.kill();
  srv.close();
  rmSync(profile, { recursive: true, force: true });
}
process.exit(exitCode);
