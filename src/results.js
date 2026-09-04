// Results receipt + hi-score table (r44, audit MUSTs #2+#3; HOMAGE_STUDY L4/R8:
// "grade the run with an itemized receipt… teaches routing between runs").
// Browser-only shell. The receipt replaces the canvas gameover/clear banner;
// a qualifying FULL RUN flows into arcade 3-letter initials entry, then the
// top-10 table (localStorage via the options store adapter — file-backed in a
// Steam shell later). Practice runs get the receipt, never the table
// (g.practice / Pillar 4: practice is rehearsal).
import { store } from './options.js';
import { BUILD } from './version.js';

const $ = (id) => document.getElementById(id);
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.';
let onShown = null;
let receiptShown = false, entryOpen = false, tableOpen = false;
let slots = [0, 0, 0], slot = 0, pendingEntry = null;

// r45: pure, testable — a run enters initials ONLY if it is a full run that
// beats the board. Practice never qualifies, at any score (Jacob: no shmup
// shows the initials card in practice). This is the ONLY practice gate (r47
// removed the redundant r45 latch — the r45 bug was CSS, never JS).
export function qualifies(state, practice, score, scores) {
  if (practice > 0) return false;
  if (state !== 'gameover' && state !== 'clear') return false;
  return scores.length < 10 || score > scores[scores.length - 1].score;
}

export function busy() { return entryOpen || tableOpen; } // an overlay that owns input
const fmtTime = (f) => { const s = Math.floor(f / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const pad9 = (n) => String(n).padStart(9, '0');

function loadScores() { try { const j = JSON.parse(store.get('speedhell.scores', '[]')); return Array.isArray(j) ? j : []; } catch { return []; } }
const saveScores = (a) => store.set('speedhell.scores', JSON.stringify(a));

// called every frame from main.js — shows/hides with the game state
export function syncReceipt(g, label) {
  const end = g.state === 'gameover' || g.state === 'clear';
  if (!end) {
    if (receiptShown) { receiptShown = false; entryOpen = false; pendingEntry = null; $('results').classList.add('hide'); }
    return;
  }
  if (receiptShown) return;
  receiptShown = true;
  buildReceipt(g, label);
  $('results').classList.remove('hide');
}

function buildReceipt(g, label) {
  const clear = g.state === 'clear';
  const practice = g.practice > 0;
  // r46: practice is a visibly DIFFERENT card — gold accent, PRACTICE subtitle,
  // "not saved" note, and NO score-submission chrome at all. r47: the heading
  // keeps the OUTCOME (a death in practice still reads GAME OVER); the
  // subtitle carries the mode + section.
  $('resultsCard').classList.toggle('practice', practice);
  $('resTitle').textContent = clear ? 'STAGE CLEAR' : 'GAME OVER';
  $('resSub').classList.toggle('hide', !practice);
  $('resSub').textContent = practice ? 'PRACTICE · ' + label : '';
  $('resTag').classList.toggle('hide', !practice);
  $('resTag').textContent = practice ? 'practice run — not saved to hi-scores' : '';
  $('resScore').textContent = pad9(g.score);
  const st = g.stats, pct = g.kills ? Math.round((100 * g.speedKills) / g.kills) : 0;
  $('resStats').innerHTML =
    `speed kills ${g.speedKills}/${g.kills} (${pct}%)<br>` +
    `longest chain ${st.maxChain}<br>` +
    `time ${fmtTime(g.frame)} · deaths ${st.deaths.length} · bombs used ${st.bombsUsed}` +
    (clear ? `<br>stock bonus +${g.clearBonus}` : '');
  const badges = [];
  if (!st.deaths.length) badges.push('NO MISS');
  if (!st.bombsUsed) badges.push('NO BOMB');
  $('resBadges').textContent = badges.join('  ·  ');
  // qualification: FULL RUNS only, top 10 (pure gate, practice can never pass)
  entryOpen = false; pendingEntry = null;
  if (qualifies(g.state, g.practice, g.score, loadScores())) {
    pendingEntry = { score: g.score, speedKills: g.speedKills, kills: g.kills, maxChain: st.maxChain, cleared: clear, date: new Date().toISOString().slice(0, 10), build: BUILD };
    const init = (store.get('speedhell.initials', 'AAA') + 'AAA').slice(0, 3);
    slots = [...init].map((c) => Math.max(0, CHARS.indexOf(c)));
    slot = 0; entryOpen = true;
  }
  renderEntry();
  $('resHint').textContent = entryOpen ? '' : (practice ? 'SHOT retry section · Ⓑ title · START menu' : 'SHOT retry · Ⓑ title · START menu');
}

function renderEntry() {
  $('entry').classList.toggle('hide', !entryOpen); // needs the generic .hide rule (r46) — test/shell.mjs guards it
  if (!entryOpen) return;
  $('entry').querySelectorAll('.eslots span').forEach((sp, i) => {
    sp.textContent = CHARS[slots[i]]; sp.classList.toggle('sel', i === slot);
  });
}

function confirmEntry() {
  const name = slots.map((i) => CHARS[i]).join('');
  store.set('speedhell.initials', name);
  const rec = { name, ...pendingEntry };
  const scores = loadScores();
  scores.push(rec); scores.sort((a, b) => b.score - a.score);
  saveScores(scores.slice(0, 10));
  const rank = scores.indexOf(rec) + 1;
  entryOpen = false; pendingEntry = null; renderEntry();
  $('resHint').textContent = `saved — rank #${rank}  ·  SHOT retry · Ⓑ title`;
}

function entryNav(act) {
  if (!entryOpen) return;
  if (act === 'up') slots[slot] = (slots[slot] + CHARS.length - 1) % CHARS.length;
  else if (act === 'down') slots[slot] = (slots[slot] + 1) % CHARS.length;
  else if (act === 'left') slot = (slot + 2) % 3;
  else if (act === 'right') slot = (slot + 1) % 3;
  else if (act === 'activate') { if (slot < 2) slot++; else return confirmEntry(); }
  else if (act === 'close') return confirmEntry(); // Esc/Ⓑ/START = save as shown; nothing discards a run
  renderEntry();
}

export function showScores() {
  const scores = loadScores();
  $('scoreTable').innerHTML =
    '<tr><th>#</th><th>name</th><th>score</th><th>speed</th><th>chain</th><th></th></tr>' +
    (scores.length
      ? scores.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${pad9(s.score)}</td><td>${s.speedKills}/${s.kills}</td><td>${s.maxChain}</td><td>${s.cleared ? 'CLEAR' : ''}</td></tr>`).join('')
      : '<tr><td colspan="6">no scores yet — go set one</td></tr>');
  tableOpen = true; $('scores').classList.remove('hide');
}
function closeScores() { tableOpen = false; $('scores').classList.add('hide'); }

export function padNav(pe) { // main.js routes pad edges here while busy()
  if (tableOpen) { if (pe.a || pe.b || pe.start) closeScores(); return; }
  if (!entryOpen) return;
  if (pe.up) entryNav('up'); if (pe.down) entryNav('down');
  if (pe.left) entryNav('left'); if (pe.right) entryNav('right');
  if (pe.a) entryNav('activate'); if (pe.b || pe.start) entryNav('close');
}

export function initResults() {
  // capture-phase, registered BEFORE options so entry/table own the keyboard
  addEventListener('keydown', (e) => {
    if (tableOpen) { e.preventDefault(); e.stopImmediatePropagation(); if (['Escape', 'Enter', ' '].includes(e.key)) closeScores(); return; }
    if (!entryOpen) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const k = e.key;
    if (k === 'ArrowUp') entryNav('up'); else if (k === 'ArrowDown') entryNav('down');
    else if (k === 'ArrowLeft') entryNav('left'); else if (k === 'ArrowRight') entryNav('right');
    else if (k === 'Enter') entryNav('activate');
    else if (k === 'Escape') entryNav('close');
    else if (k === 'Backspace') { slot = (slot + 2) % 3; renderEntry(); }
    else if (k.length === 1) { const i = CHARS.indexOf(k.toUpperCase()); if (i >= 0) { slots[slot] = i; if (slot < 2) slot++; renderEntry(); } }
  }, true);
}
