// SPEEDHELL playtest Booth server — dev tool, no dependencies.
// Serves the repo (no-store, so Safari never shows a stale build) and adds the
// Booth's tiny API. The game core is never touched; this is plumbing between
// the browser (booth.html) and the files Claude reads/writes during a session.
//
//   node tools/booth-server.mjs [port=8002]
//
//   GET  /booth/session              -> { session }                new session id
//   POST /booth/note                 <- one flag/answer, appended to playtest/notes.jsonl
//   POST /booth/recording            <- seed + packed inputs, playtest/recordings/<session>-run<N>.json
//   GET  /booth/replies?since=N      -> replies N.. from playtest/replies.jsonl
//   everything else                  -> static file from the repo root
import { createServer } from 'node:http';
import { readFile, appendFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8002);
const PT = join(ROOT, 'playtest');
const NOTES = join(PT, 'notes.jsonl'), REPLIES = join(PT, 'replies.jsonl'), REC = join(PT, 'recordings');
await mkdir(REC, { recursive: true });
for (const f of [NOTES, REPLIES]) if (!existsSync(f)) await writeFile(f, '');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.md': 'text/plain; charset=utf-8' };

const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const body = (req) => new Promise((res, rej) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > 8e6) req.destroy(); }); req.on('end', () => res(s)); req.on('error', rej); });
const send = (res, code, data, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof data === 'string' ? data : JSON.stringify(data)); };
const safe = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '');

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/booth/session') return send(res, 200, { session: stamp() });
    if (url.pathname === '/booth/note' && req.method === 'POST') {
      const note = JSON.parse(await body(req));
      note.at = new Date().toISOString();
      const lines = (await readFile(NOTES, 'utf8')).split('\n').filter(Boolean);
      note.i = lines.length;
      await appendFile(NOTES, JSON.stringify(note) + '\n');
      return send(res, 200, { ok: true, i: note.i });
    }
    if (url.pathname === '/booth/recording' && req.method === 'POST') {
      const rec = JSON.parse(await body(req));
      const name = `${safe(rec.session)}-run${Number(rec.run) || 0}.json`;
      await writeFile(join(REC, name), JSON.stringify(rec));
      return send(res, 200, { ok: true, file: `playtest/recordings/${name}` });
    }
    if (url.pathname === '/music/cues' && req.method === 'POST') { // music lab (tools/music/lab.html) marker file
      const { name, data } = JSON.parse(await body(req));
      const file = join(ROOT, 'docs', 'music', `${safe(name)}.cues.json`);
      await writeFile(file, JSON.stringify(data, null, 1) + '\n');
      return send(res, 200, { ok: true, file: `docs/music/${safe(name)}.cues.json` });
    }
    if (url.pathname === '/booth/replies') {
      const since = Number(url.searchParams.get('since') || 0);
      const lines = (await readFile(REPLIES, 'utf8')).split('\n').filter(Boolean);
      const out = [];
      lines.forEach((l, i) => { if (i >= since) { try { out.push({ i, ...JSON.parse(l) }); } catch { out.push({ i, text: l }); } } });
      return send(res, 200, { next: lines.length, replies: out });
    }
    // static
    let p = normalize(decodeURIComponent(url.pathname)); if (p === '/' || p === '\\') p = '/booth.html';
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch (e) { send(res, 500, String(e), 'text/plain'); }
}).listen(PORT, () => console.log(`booth: http://localhost:${PORT}/booth.html  (notes -> playtest/notes.jsonl, replies <- playtest/replies.jsonl)`));
