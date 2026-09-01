// SPEEDHELL playtest Booth — the real game + renderer (same as src/main.js),
// plus: a flag key that freezes the moment and opens an interview panel, an
// input recording (seed + packed inputs = the whole run, since the core is
// deterministic), automatic state snapshots per flag, and a reply channel to
// Claude through tools/booth-server.mjs. Dev-only: never imported by the game
// or the referee, never edits the core.
//
// Interview protocol (playtest-interview-mode-report.md): raw feeling first in
// the player's words (Gow 2010: "What were you doing here? What did you feel
// here?"), then an optional word list, then the expectation gap. "I don't
// know" is a valid answer and still a flag.
import { makeGame, startRun, update, W, H } from './core/game.js';
import { draw, resetHud } from './render/renderer.js';
import * as audio from './audio.js';
import { BUILD } from './version.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game'); canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

// section names by stageT (mirrors the renderer's SEC_T)
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const SEC_NAME = ['intro', 'S1 popcorn intro', 'S2 turret alley', 'S3 mid gauntlet', 'S4 midboss', 'S5 rush', 'S6 elite pair', 'S7 release', 'S8 boss'];
const sectionOf = (g) => { let s = 0; for (let i = SEC_T.length - 1; i >= 0; i--) if (g.stageT >= SEC_T[i]) { s = i; break; } if (g.gate === 'midboss') return 'S4 midboss'; if (g.gate === 'boss') return 'S8 boss'; return SEC_NAME[s]; };
const ENEMY = ['zako', 'mid', 'turret', 'elite', 'midboss', 'boss', 'boss-part'];

const WORDS = ['Frustrated', 'Challenged', 'Confused', 'In control', 'Controlled', 'Bored', 'Tense', 'Relieved', 'Annoyed', 'Surprised', 'Satisfied', 'Powerful', 'Curious', 'Immersed', 'Disappointed', 'Determined', 'Relaxed', 'Excited', 'Interested', 'Confident'];
const TAGS = ['split attention', 'directional noise', 'off-motif', 'no route', 'unreadable', 'too easy', 'felt great'];

// ---------------------------------------------------------------- state
let g = makeGame((Math.random() * 0xffffffff) >>> 0);
let paused = false, flagged = false, bgScroll = 0;
let session = null, run = 0, tick = 0, inputs = [], flagN = 0, repliesSeen = 0, currentFlag = null, pollT = 0;
let pendingReplies = 0, pendingCards = [], snapByFlag = {};

async function api(path, data) {
  const r = await fetch(path, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : undefined);
  return r.json();
}
(async () => {
  try { session = (await api('/booth/session')).session; $('meta').textContent = `session ${session} · build ${BUILD}`; }
  catch { $('meta').textContent = 'server not reachable — run: node tools/booth-server.mjs'; }
  // start at the current end of the replies file: only replies written after this page loaded count
  try { repliesSeen = (await api('/booth/replies?since=999999')).next; } catch { /* offline */ }
})();

function beginRun() {
  audio.unlock(); startRun(g); resetHud(); audio.playMusic('stage');
  activeVariant = applyVariants(g); // r26: variants land here, never mid-run
  $('variantNow').textContent = 'active: ' + activeVariant;
  run++; tick = 0; inputs = [];
  logLine(`run ${run} · ${activeVariant} · seed ${g.seed.toString(16)}`);
}

// ---------------------------------------------------------------- recording
// one byte per update(): dx+1 | (dy+1)<<2 | fire<<4 | bomb<<5 | focus<<6.
// Recorded per update() CALL (not per g.frame): hitstop frames return early
// from update() without advancing g.frame, and the replay must call update()
// exactly as many times, with the same inputs, to land on the same state.
function packInput(i) { return (i.dx + 1) | ((i.dy + 1) << 2) | ((i.fire ? 1 : 0) << 4) | ((i.bomb ? 1 : 0) << 5) | ((i.focus ? 1 : 0) << 6); }
function inputsB64() { let s = ''; const a = Uint8Array.from(inputs); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
async function uploadRecording(reason) {
  if (!session) return;
  try { await api('/booth/recording', { session, run, seed: g.seed, build: BUILD, variant: activeVariant, tune: g.tune, ticks: tick, frame: g.frame, state: g.state, reason, inputs: inputsB64() }); } catch { /* offline */ }
}

// ---------------------------------------------------------------- snapshot
function snapshot() {
  const p = g.player, enemies = [];
  for (let i = 0; i < g.enemies.count; i++) {
    const e = g.enemies.items[i];
    enemies.push({ t: ENEMY[e.type] || e.type, x: e.x | 0, y: e.y | 0, age: e.age, hp: +e.hp.toFixed(1), phase: e.phase, vuln: e.vulnAt >= 0 });
  }
  return {
    frame: g.frame, tick, stageT: g.stageT, section: sectionOf(g), gate: g.gate, state: g.state,
    lives: p.lives, bombs: p.bombs, score: g.score, chain: g.chain, kills: g.kills, speedKills: g.speedKills,
    player: { x: p.x | 0, y: p.y | 0, invuln: p.invuln }, bullets: g.eBullets.count, items: g.items.count, enemies,
    recentKills: g.stats.killLog.slice(-8), deaths: g.stats.deaths.length, timeouts: g.stats.timeoutLog,
  };
}

// ---------------------------------------------------------------- flag UI
const chipsEl = $('chips');
for (const w of TAGS) { const c = document.createElement('span'); c.className = 'chip tag'; c.textContent = w; c.onclick = () => c.classList.toggle('on'); chipsEl.appendChild(c); }
for (const w of WORDS) { const c = document.createElement('span'); c.className = 'chip'; c.textContent = w; c.onclick = () => c.classList.toggle('on'); chipsEl.appendChild(c); }
const chosen = () => [...chipsEl.querySelectorAll('.chip.on')].map((c) => c.textContent);
// ---------------------------------------------------------------- variants (r26)
// Picked in the panel, applied at the NEXT run (R) — never mid-run, so every
// run is a fair, deterministic sample of exactly one configuration. Each run,
// recording and flag is stamped with its variant label.
const VARIANTS = [
  { id: 'eliteHp220', label: 'elite HP 220', group: 'eliteHp', apply: (t) => { t.eliteHp = 220; } },
  { id: 'eliteHp280', label: 'elite HP 280', group: 'eliteHp', apply: (t) => { t.eliteHp = 280; } },
  { id: 'eliteHp340', label: 'elite HP 340', group: 'eliteHp', apply: (t) => { t.eliteHp = 340; } },
  { id: 'eliteSide', label: 'elite side entry', apply: (t) => { t.eliteEntry = 'side'; } },
  { id: 'eliteEscort', label: 'elite escort', apply: (t) => { t.eliteEscort = 1; } },
  { id: 'midboss130', label: 'midboss HP 130', apply: (t) => { t.midbossHp = 130; } },
];
const varEl = $('variants');
for (const v of VARIANTS) {
  const c = document.createElement('span'); c.className = 'chip'; c.textContent = v.label; c.dataset.group = v.group || '';
  c.onclick = () => {
    if (v.group && !c.classList.contains('on'))
      varEl.querySelectorAll(`.chip[data-group="${v.group}"].on`).forEach((o) => o.classList.remove('on'));
    c.classList.toggle('on');
    $('variantNow').textContent = 'next run: ' + (variantLabel() || 'baseline');
  };
  varEl.appendChild(c);
}
function variantLabel() { return [...varEl.querySelectorAll('.chip.on')].map((c) => c.textContent).join(' + '); }
function applyVariants(g) {
  let label = [];
  for (const v of VARIANTS) { const c = [...varEl.children][VARIANTS.indexOf(v)]; if (c.classList.contains('on')) { v.apply(g.tune); label.push(v.label); } }
  return label.join(' + ') || 'baseline';
}
let activeVariant = 'baseline';
const clearChips = () => chipsEl.querySelectorAll('.chip.on').forEach((c) => c.classList.remove('on'));

function openFlag() {
  if (flagged) return;
  flagged = true; audio.pauseMusic(true);
  if (pendingCards.length) {
    // a reply arrived after you resumed: reopen THAT flag's thread — not a new flag
    const f = pendingCards[0].flag;
    currentFlag = { flag: f, snap: snapByFlag[f] || snapshot(), turn: 1 };
  } else if (g.state === 'play') { flagN++; currentFlag = { flag: flagN, snap: snapshot(), turn: 0 }; }
  else if (!currentFlag) { currentFlag = { flag: ++flagN, snap: snapshot(), turn: 0 }; }
  snapByFlag[currentFlag.flag] = currentFlag.snap;
  $('idle').classList.add('hide'); $('flag').classList.remove('hide'); $('badge').style.display = 'none';
  const s = currentFlag.snap;
  $('flagWho').textContent = `Flag #${currentFlag.flag}` + (pendingCards.length ? ' · reply' : '');
  for (const c of pendingCards) card('claude', c.text, true);
  pendingCards = []; pendingReplies = 0;
  $('flagMeta').textContent = `${s.section} · stageT ${s.stageT} · frame ${s.frame} · lives ${s.lives} · chain ${s.chain} · ${s.enemies.length} enemies / ${s.bullets} bullets`;
  $('status').textContent = '';
  setTimeout(() => { $('flag').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $('text').focus(); }, 30);
  uploadRecording('flag');
  pollReplies(true);
}
function closeFlag() {
  flagged = false; audio.pauseMusic(false);
  $('flag').classList.add('hide'); $('idle').classList.remove('hide');
  $('text').value = ''; $('expected').value = ''; clearChips();
  currentFlag = null; $('thread').innerHTML = '';
  canvas.focus(); document.activeElement?.blur();
}
function card(who, text, q) { const d = document.createElement('div'); d.className = 'card' + (q ? ' q' : ''); d.innerHTML = `<div class="who">${who}</div>`; const t = document.createElement('div'); t.textContent = text; d.appendChild(t); $('thread').appendChild(d); d.scrollIntoView({ block: 'nearest' }); }
function logLine(s) { $('log').textContent = `${s}\n` + $('log').textContent; }

async function sendNote(dunno) {
  if (!currentFlag) return;
  const text = dunno ? "(I don't know)" : $('text').value.trim();
  if (!text && !chosen().length && !$('expected').value.trim()) { $('status').textContent = "say anything — or press “I don't know”"; return; }
  const note = { kind: 'flag', session, run, flag: currentFlag.flag, turn: currentFlag.turn++, seed: g.seed, build: BUILD, variant: activeVariant, tune: g.tune,
    text, words: chosen(), expected: $('expected').value.trim(), snap: currentFlag.turn === 1 ? currentFlag.snap : { frame: currentFlag.snap.frame, tick: currentFlag.snap.tick, section: currentFlag.snap.section } };
  card('you', [text, chosen().length ? `[${chosen().join(', ')}]` : '', note.expected ? `expected: ${note.expected}` : ''].filter(Boolean).join('\n'));
  $('text').value = ''; $('expected').value = ''; clearChips();
  try { await api('/booth/note', note); $('status').textContent = 'sent · Claude is looking at this moment…'; logLine(`flag #${note.flag}.${note.turn} · ${note.snap.section || currentFlag.snap.section} · ${text.slice(0, 40)}`); }
  catch { $('status').textContent = 'could not reach the booth server — note kept in the panel only'; }
  setTimeout(() => $('text').focus(), 30);
}

async function pollReplies(now) {
  try {
    const r = await api(`/booth/replies?since=${repliesSeen}`);
    repliesSeen = r.next;
    for (const rep of r.replies) {
      if (flagged && currentFlag && (rep.flag == null || rep.flag === currentFlag.flag)) { card('claude', rep.text, true); $('status').textContent = ''; }
      else { pendingCards.push({ flag: rep.flag ?? flagN, text: rep.text }); pendingReplies = pendingCards.length; $('badge').textContent = `${pendingReplies} reply from Claude — press Tab / button 3 to read`; $('badge').style.display = 'block'; }
      logLine(`claude → flag #${rep.flag ?? '?'}: ${rep.text.slice(0, 40)}`);
    }
  } catch { /* offline */ }
}
setInterval(() => pollReplies(), 1500);

// r26: vertical-monitor layout — panel drops below the canvas, game fills the
// width. Persisted per browser; also settable with ?vertical in the URL.
function setLayout(vertical) {
  document.body.classList.toggle('vertical', vertical);
  $('layout').textContent = vertical ? 'Layout: vertical monitor · switch for side panel' : 'Layout: side panel · switch for vertical monitor';
  try { localStorage.setItem('boothLayout', vertical ? 'vertical' : 'side'); } catch { /* private mode */ }
}
$('layout').onclick = () => setLayout(!document.body.classList.contains('vertical'));
// TATE: rotate the game output for a physically rotated monitor (arcade
// convention). Pure display transform — the stick isn't bolted to the
// monitor, so pushing "up" is already physical-up: no input remap.
const TATE = ['off', '90°', '270°'];
function setTate(n) {
  document.body.classList.toggle('tate', n === 1);
  document.body.classList.toggle('tate270', n === 2);
  $('tate').textContent = 'TATE: ' + TATE[n];
  try { localStorage.setItem('boothTate', String(n)); } catch { /* private mode */ }
}
$('tate').onclick = () => setTate(((+(localStorage.getItem('boothTate') || 0)) + 1) % 3);
try { setTate(new URLSearchParams(location.search).has('tate') ? 1 : +(localStorage.getItem('boothTate') || 0)); } catch { setTate(0); }
try { setLayout(new URLSearchParams(location.search).has('vertical') || localStorage.getItem('boothLayout') === 'vertical'); } catch { setLayout(false); }

$('send').onclick = () => sendNote(false);
$('dunno').onclick = () => sendNote(true);
$('resume').onclick = closeFlag;
$('text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendNote(false); } });

// ---------------------------------------------------------------- input (as main.js)
const keys = {};
addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); if (!flagged) openFlag(); return; }
  if (e.key === 'Escape') { if (flagged) closeFlag(); return; }
  const typing = e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');
  if (typing || flagged) return; // the panel owns the keyboard while a flag is open
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  audio.unlock();
  if (e.key === 'Enter' && g.state === 'title') beginRun();
  if (e.key.toLowerCase() === 'r' && (g.state === 'gameover' || g.state === 'clear' || g.state === 'play')) { uploadRecording('restart'); g.seed = (Math.random() * 0xffffffff) >>> 0; beginRun(); }
  if (e.key.toLowerCase() === 'p') { paused = !paused; audio.pauseMusic(paused); }
  if (e.key.toLowerCase() === 'm') audio.toggleMute();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

let prevSelect = false, prevStart = false, prevFlagBtn = false, lastPadBtn = -1;
function pollInput() {
  const i = g.input;
  i.dx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  i.dy = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  i.focus = !!keys['shift'];
  i.fire = !!(keys['z'] || keys[' ']);
  i.bomb = !!keys['x'];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads || []) if (p && p.connected && p.buttons.length) { gp = p; break; }
  if (gp) {
    if (Math.abs(gp.axes[0] || 0) > 0.35) i.dx = Math.sign(gp.axes[0]);
    if (Math.abs(gp.axes[1] || 0) > 0.35) i.dy = Math.sign(gp.axes[1]);
    if (gp.buttons[14]?.pressed) i.dx = -1; if (gp.buttons[15]?.pressed) i.dx = 1;
    if (gp.buttons[12]?.pressed) i.dy = -1; if (gp.buttons[13]?.pressed) i.dy = 1;
    i.fire = i.fire || gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
    i.bomb = i.bomb || gp.buttons[1]?.pressed; // button 3 is the Booth's FLAG button (Jacob's stick)
    i.focus = i.focus || gp.buttons[4]?.pressed || gp.buttons[5]?.pressed || gp.buttons[6]?.pressed || gp.buttons[7]?.pressed;
    // START = flag (arcade stick: every action button is taken; start is free during play)
    const start = !!gp.buttons[9]?.pressed, flagBtn = !!gp.buttons[3]?.pressed;
    if (start && !prevStart) { if (g.state === 'title') beginRun(); else if (g.state === 'play') openFlag(); }
    if (flagBtn && !prevFlagBtn && g.state === 'play') openFlag();
    prevStart = start; prevFlagBtn = flagBtn;
    // show which pad button is down, so Jacob can name a different flag button
    for (let b = 0; b < gp.buttons.length; b++) if (gp.buttons[b]?.pressed && b !== lastPadBtn) { lastPadBtn = b; $('meta').textContent = `session ${session} · build ${BUILD} · pad button ${b}`; }
    const sel = !!gp.buttons[8]?.pressed;
    if (sel && !prevSelect && g.state !== 'title') { uploadRecording('restart'); g.seed = (Math.random() * 0xffffffff) >>> 0; beginRun(); }
    prevSelect = sel;
  }
}
// while a flag is open the game ignores the pad, but START still resumes (edge-triggered)
function padResumePoll() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null; for (const p of pads || []) if (p && p.connected && p.buttons.length) { gp = p; break; }
  const start = !!gp?.buttons[9]?.pressed, flagBtn = !!gp?.buttons[3]?.pressed;
  if ((start && !prevStart) || (flagBtn && !prevFlagBtn)) closeFlag();
  prevStart = start; prevFlagBtn = flagBtn;
}

// ---------------------------------------------------------------- loop
const STEP_MS = 1000 / 60;
let last = performance.now(), acc = 0, lastState = g.state;
function frame(now) {
  acc += now - last; last = now;
  if (acc > 200) acc = 200;
  while (acc >= STEP_MS) {
    if (!flagged) pollInput(); else padResumePoll();
    if (!paused && !flagged) {
      if (g.state === 'play') { inputs.push(packInput(g.input)); tick++; }
      update(g); audio.drain(g); bgScroll += 1.05;
      if (g.state !== lastState) { if (g.state === 'gameover' || g.state === 'clear') uploadRecording(g.state); lastState = g.state; }
    }
    acc -= STEP_MS;
  }
  draw(g, ctx, bgScroll);
  if (flagged) { ctx.fillStyle = 'rgba(11,14,25,0.55)'; ctx.fillRect(0, 0, W, 14); ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#c3a8ff'; ctx.fillText(`FLAG #${currentFlag ? currentFlag.flag : ''} — frozen · Esc resumes`, 4, 10); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
