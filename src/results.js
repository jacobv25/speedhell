// Results receipt + hi-score table (r44, audit MUSTs #2+#3; HOMAGE_STUDY L4/R8:
// "grade the run with an itemized receipt… teaches routing between runs").
// Browser-only shell. The receipt replaces the canvas gameover/clear banner;
// a qualifying FULL RUN flows into arcade 3-letter initials entry, then the
// top-10 table (localStorage via the options store adapter — file-backed in a
// Steam shell later). Practice runs get the receipt, never the table
// (g.practice / Pillar 4: practice is rehearsal).
import { store } from './options.js';
import { BUILD } from './version.js';
import { labStamp } from './lab.js';
import { STAGES } from './core/stages/index.js'; // r78: stage stamp on the receipt + board when there is more than one stage

const $ = (id) => document.getElementById(id);
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.';
let onShown = null;
let receiptShown = false, entryOpen = false, tableOpen = false;
let shownCampaign = false; // r85: which card is up — the stage's receipt or the CAMPAIGN receipt
let slots = [0, 0, 0], slot = 0, pendingEntry = null;

// r45: pure, testable — a run enters initials ONLY if it is a full run that
// beats the board. Practice never qualifies, at any score (Jacob: no shmup
// shows the initials card in practice). This is the ONLY practice gate (r47
// removed the redundant r45 latch — the r45 bug was CSS, never JS).
export function qualifies(state, practice, score, scores, startLevel = 0) {
  if (practice > 0 || startLevel > 0) return false; // r78: a run started past stage 1 is practice too
  if (state !== 'gameover' && state !== 'clear') return false;
  return scores.length < 10 || score > scores[scores.length - 1].score;
}

export function busy() { return entryOpen || tableOpen; } // an overlay that owns input
const fmtTime = (f) => { const s = Math.floor(f / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const pad9 = (n) => String(n).padStart(9, '0');

// r48: arcade default table (Garegga/Cave convention — the board ships full,
// so a weak run is never asked for a name; it has to beat the lowest row).
// Floor 10000: the blind bot's ~29k die-early run makes rank 9, a 7k no-name
// death does not; the expert clear (~175k) tops it. Seed rows carry seed:true,
// are regenerated on every load (never trusted from storage) and render dashed.
const SEED_NAMES = ['SPD', 'HEL', 'MSX', 'HOG', 'ACE', 'JET', 'RAY', 'ZAP', 'VEL', 'RIP'];
const SEED = SEED_NAMES.map((name, i) => ({ name, score: (10 - i) * 10000, speedKills: 0, kills: 0, maxChain: 0, cleared: false, seed: true }));
function loadScores() {
  let stored = [];
  try { const j = JSON.parse(store.get('speedhell.scores', '[]')); if (Array.isArray(j)) stored = j.filter((r) => r && !r.seed); } catch { /* bad json → seeds only */ }
  return [...stored, ...SEED].sort((a, b) => b.score - a.score).slice(0, 10);
}
const saveScores = (a) => store.set('speedhell.scores', JSON.stringify(a));

// called every frame from main.js — shows/hides with the game state
// r85: `campaign` = main.js has held the last stage's receipt long enough and the
// card should turn to the CAMPAIGN receipt. It is a MODE, so a flip rebuilds the
// card (the r44 latch only guarded against rebuilding the same one every frame).
export function syncReceipt(g, label, suppress = false, campaign = false) { // r78: suppress = the briefing card is up (between stages)
  const end = !suppress && (g.state === 'gameover' || g.state === 'clear' || g.state === 'stageclear');
  if (!end) {
    if (receiptShown) { receiptShown = false; shownCampaign = false; entryOpen = false; pendingEntry = null; $('results').classList.add('hide'); }
    return;
  }
  if (receiptShown && shownCampaign === campaign) return;
  receiptShown = true; shownCampaign = campaign;
  buildReceipt(g, label, campaign);
  $('results').classList.remove('hide');
}

function buildReceipt(g, label, campaign = false) {
  const clear = g.state === 'clear' || g.state === 'stageclear';
  const practice = g.practice > 0 || g.startLevel > 0;
  // r85 THE CAMPAIGN RECEIPT (plan §3 stage 5; HOMAGE L4 "grade the run with an
  // itemized receipt"). The last stage's clear shows its own per-stage card first
  // (`turning` below: same card as every earlier stage, with the score-submission
  // chrome held back), then this one. Everything on it is a RE-READ of what the
  // run already paid — core banked one row per stage in g.stageLog and the
  // totals are its sums — so there is no campaign bonus and no new scoring math
  // (plan §8; S6's hierarchy: the speed-kill core stays the only mechanic).
  const isCampaign = campaign && g.state === 'clear' && g.stageLog.length > 1;
  const turning = !campaign && g.state === 'clear' && g.stageLog.length > 1; // the stage card, with the campaign card still to come
  // r78: with more than one stage the card stamps the stage (STAGE n CLEAR /
  // "STAGE n — NAME" line) and the counters are THIS stage's (g.stageBase is
  // the run's counters at the stage's start; all zero on stage 1, so the
  // one-stage receipt is unchanged). Score stays the run total (arcade).
  const multi = STAGES.length > 1, b = g.stageBase, stageLine = `STAGE ${g.level + 1} — ${STAGES[g.level].name}`;
  // r46: practice is a visibly DIFFERENT card — gold accent, PRACTICE subtitle,
  // "not saved" note, and NO score-submission chrome at all. r47: the heading
  // keeps the OUTCOME (a death in practice still reads GAME OVER); the
  // subtitle carries the mode + section.
  $('resultsCard').classList.toggle('practice', practice);
  $('resTitle').textContent = isCampaign ? 'CAMPAIGN CLEAR'
    : g.state === 'stageclear' || (multi && clear) ? `STAGE ${g.level + 1} CLEAR` // r85: the last stage names itself too — its card is one of five, not the end of the run
      : clear ? 'STAGE CLEAR' : 'GAME OVER';
  $('resSub').classList.toggle('hide', !practice && !multi);
  $('resSub').textContent = isCampaign ? `${g.stageLog.length} STAGES · ${STAGES[0].name} → ${STAGES[g.stageLog.length - 1].name}`
    : practice ? 'PRACTICE · ' + label + (multi && g.startLevel > 0 && label.indexOf('STAGE') < 0 ? ` · ${stageLine}` : '') : multi ? stageLine : '';
  $('resTag').classList.toggle('hide', !practice);
  $('resTag').textContent = practice ? 'practice run — not saved to hi-scores' : '';
  const lab = labStamp(); // r50: which experiments this run played under ('' = all defaults)
  $('resLab').classList.toggle('hide', !lab);
  $('resLab').textContent = lab ? 'lab: ' + lab : '';
  $('resScore').textContent = pad9(g.score);
  const st = g.stats, kills = g.kills - b.kills, speedKills = g.speedKills - b.speedKills, deaths = st.deaths.length - b.deaths, bombsUsed = st.bombsUsed - b.bombsUsed;
  const pct = kills ? Math.round((100 * speedKills) / kills) : 0;
  $('resCampaign').classList.toggle('hide', !isCampaign);
  $('resStats').classList.toggle('hide', isCampaign);
  if (isCampaign) {
    // One row per stage: its clock, its score, and its two badges as MARKS — the
    // run reads as a shape before a single number is read (S6 MUST "legible
    // without reading numbers"): a column of ★ is a no-miss campaign, a column
    // of ◇ is a no-bomb one, and the stage that broke either is the gap.
    const rows = g.stageLog.map((r) => `<tr><td class="nm">ST${r.level + 1} ${STAGES[r.level].name}</td>`
      + `<td>${fmtTime(r.frames)}</td><td class="sc">${r.score}</td>`
      + `<td class="bd">${r.deaths ? '·' : '★'}${r.bombsUsed ? '·' : '◇'}</td></tr>`).join('');
    const tf = g.stageLog.reduce((a, r) => a + r.frames, 0), ts = g.stageLog.reduce((a, r) => a + r.score, 0);
    const stock = '▲'.repeat(g.player.lives) + ' ' + '●'.repeat(g.player.bombs);
    $('resCampaign').innerHTML = `<table>${rows}`
      + `<tr class="tot"><td class="nm">TOTAL</td><td>${fmtTime(tf)}</td><td class="sc">${ts}</td><td class="bd"></td></tr></table>`
      + `<div class="stock">STOCK ${stock || '—'}</div>`
      + `<div class="stock">EXTEND ${g.extended ? '● earned' : '— none'}</div>`;
  }
  $('resStats').innerHTML =
    `speed kills ${speedKills}/${kills} (${pct}%)<br>` +
    `longest chain ${st.maxChain}<br>` +
    `time ${fmtTime(g.frame - b.frame)}${multi && g.level > 0 ? ` (run ${fmtTime(g.frame)})` : ''} · deaths ${deaths} · bombs used ${bombsUsed}` +
    (clear ? `<br>stock bonus +${g.clearBonus}` : '');
  const badges = [];
  if (isCampaign) { // the campaign's own badges are the whole run's, not this stage's
    if (!g.stats.deaths.length) badges.push('NO MISS');
    if (!g.stats.bombsUsed) badges.push('NO BOMB');
    badges.push('1CC');
  } else {
    if (!deaths) badges.push('NO MISS');
    if (!bombsUsed) badges.push('NO BOMB');
  }
  $('resBadges').textContent = badges.join('  ·  ');
  // qualification: FULL RUNS only, top 10 (pure gate, practice can never pass)
  entryOpen = false; pendingEntry = null;
  if (!turning && qualifies(g.state, g.practice, g.score, loadScores(), g.startLevel)) { // r85: the stage-5 card never asks for initials — the CAMPAIGN card does
    pendingEntry = { score: g.score, speedKills: g.speedKills, kills: g.kills, maxChain: st.maxChain, cleared: clear, date: new Date().toISOString().slice(0, 10), build: BUILD, ...(lab ? { lab } : {}), ...(multi ? { level: g.level } : {}) }; // r78: the board row remembers how far the run got (only stamped with >1 stage)
    const init = (store.get('speedhell.initials', 'AAA') + 'AAA').slice(0, 3);
    slots = [...init].map((c) => Math.max(0, CHARS.indexOf(c)));
    slot = 0; entryOpen = true;
  }
  renderEntry();
  $('resHint').textContent = g.state === 'stageclear' ? 'next stage…' : turning ? 'campaign receipt…' : entryOpen ? '' : (practice ? 'SHOT retry section · Ⓑ title · START menu' : 'SHOT retry · Ⓑ title · START menu');
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
    scores.map((s, i) => s.seed
      ? `<tr class="seed"><td>${i + 1}</td><td>${s.name}</td><td>${pad9(s.score)}</td><td>—</td><td>—</td><td></td></tr>`
      : `<tr${s.lab ? ` title="lab: ${s.lab}"` : ''}><td>${i + 1}</td><td>${s.name}</td><td>${pad9(s.score)}</td><td>${s.speedKills}/${s.kills}</td><td>${s.maxChain}</td><td>${STAGES.length > 1 && s.level != null ? `ST${s.level + 1} ` : ''}${s.cleared ? 'CLEAR' : ''}${s.lab ? ' ⚗' : ''}</td></tr>`).join('') // r78: stage stamp
    + (scores.some((s) => s.lab) ? '<tr><td colspan="6" class="labnote">⚗ run played under lab experiments</td></tr>' : '');
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
