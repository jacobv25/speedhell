// LAB — playtest experiment switches (r50). Browser-only shell; never touches
// src/core. One registry (EXPERIMENTS) drives: rows in the options menu,
// the URL config (?lab=id:choice,…  — a shareable link IS a configuration),
// persistence via the options store, and the stamp that the receipt, the
// hi-score table and recordings carry. Hidden unless the URL has `?lab`, so
// ordinary players never see it; at release the whole file goes.
//
// Lifecycle rule (wiki §10): every experiment has a wiki open-question number
// and a decision date. When Jacob decides, the winner becomes a constant, the
// losers are deleted in the same commit, and the changelog records the verdict.
// Presentation-only knobs (renderer/fx prefs) may switch live, mid-run — they
// never touch g.rng, scoring, or the referee (the sim always runs defaults).
import { store } from './options.js';
import { prefs } from './render/renderer.js';

export const EXPERIMENTS = [
  { id: 'speedPopup', label: 'SPEED popup', def: 'both', ref: 'wiki §2.6 / open Q4',
    choices: [['both', 'SPEED +1600'], ['num', '+1600'], ['word', 'SPEED (old)'], ['off', 'none']],
    apply: (v) => { prefs.speedPopup = v; } },
  // r51 explosions — renderer-only (particle counts/positions/fx-rng untouched);
  // always drawn below bullets, so size can grow without masking a threat (S2).
  { id: 'fxSize', label: 'explosion size', def: '1', ref: 'wiki §10 / open Q12',
    choices: [['1', '1× (current)'], ['1.5', '1.5×'], ['2', '2×']],
    apply: (v) => { prefs.fxSize = +v; } },
  { id: 'fxStyle', label: 'explosion look', def: 'classic', ref: 'wiki §10 / open Q12',
    choices: [['classic', 'classic (current)'], ['bloom', 'bloom — halos + streak sparks'], ['heavy', 'heavy — bloom + 2nd shockwave + smoke']],
    apply: (v) => { prefs.fxStyle = v; } },
];

const KEY = 'speedhell.lab';
const $ = (id) => document.getElementById(id);
let enabled = false;
const cfg = {};

export function labEnabled() { return enabled; }
export function labGet(id) { return cfg[id]; }
const choiceLabel = (e) => (e.choices.find((c) => c[0] === cfg[e.id]) || [])[1] || String(cfg[e.id]);
// '' when every experiment sits at its default — receipts/scores stamp only real deviations
export function labStamp() {
  return EXPERIMENTS.filter((e) => cfg[e.id] !== e.def).map((e) => `${e.label} = ${choiceLabel(e)}`).join(' · ');
}
const encode = () => EXPERIMENTS.filter((e) => cfg[e.id] !== e.def).map((e) => e.id + ':' + cfg[e.id]).join(',');
function decode(s) {
  for (const part of (s || '').split(',')) {
    const [id, v] = part.split(':');
    const e = EXPERIMENTS.find((x) => x.id === id);
    if (e && e.choices.some((c) => c[0] === v)) cfg[id] = v;
  }
}
export function shareUrl() {
  const u = new URL(location.href); u.search = '';
  return u.href + '?lab' + (encode() ? '=' + encode() : '');
}
function applyAll() {
  for (const e of EXPERIMENTS) e.apply(cfg[e.id]);
  if (!enabled) return;
  store.set(KEY, encode());
  try { history.replaceState(null, '', shareUrl()); } catch { /* file:// */ } // the address bar is always the share link
  for (const e of EXPERIMENTS) { const b = document.querySelector(`[data-lab="${e.id}"]`); if (b) b.textContent = choiceLabel(e) + (cfg[e.id] === e.def ? '  (default)' : ''); }
  const st = $('labStamp'); if (st) st.textContent = labStamp() || 'all defaults';
}
function cycle(e, dir) {
  const i = e.choices.findIndex((c) => c[0] === cfg[e.id]);
  cfg[e.id] = e.choices[(i + dir + e.choices.length) % e.choices.length][0];
  applyAll();
}

export function initLab() {
  for (const e of EXPERIMENTS) cfg[e.id] = e.def;
  const q = new URLSearchParams(location.search);
  enabled = q.has('lab');
  if (!enabled) { applyAll(); return; } // defaults only; no rows, no store writes, nothing to see
  decode(store.get(KEY, ''));   // last session's choices…
  decode(q.get('lab'));          // …overridden by whatever the link says
  const panel = $('lab'); if (!panel) { applyAll(); return; }
  panel.classList.remove('hide');
  panel.innerHTML = '<div class="title">LAB — playtest experiments</div>';
  for (const e of EXPERIMENTS) {
    const row = document.createElement('div'); row.className = 'row';
    const lab = document.createElement('label'); lab.textContent = e.label;
    const btn = document.createElement('button'); btn.className = 'btn'; btn.dataset.lab = e.id; btn.title = e.ref;
    btn.onclick = () => cycle(e, 1);
    btn.addEventListener('cycle', (ev) => cycle(e, ev.detail)); // options.js menuNav ←→ (no import cycle)
    row.append(lab, btn); panel.appendChild(row);
  }
  const share = document.createElement('div'); share.className = 'row';
  const sl = document.createElement('label'); sl.textContent = 'share';
  const sb = document.createElement('button'); sb.className = 'btn'; sb.textContent = 'copy link with these settings';
  sb.onclick = () => {
    const url = shareUrl(), msg = $('optMsg');
    const done = (ok) => { if (msg) msg.textContent = ok ? 'link copied — send it and the receiver gets exactly these settings' : 'copy blocked (pad press?) — the address bar already holds this link'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
    else done(false);
  };
  share.append(sl, sb); panel.appendChild(share);
  const reset = document.createElement('div'); reset.className = 'row';
  const rl = document.createElement('label'); rl.textContent = '';
  const rb = document.createElement('button'); rb.className = 'btn'; rb.textContent = 'reset lab to defaults';
  rb.onclick = () => { for (const e of EXPERIMENTS) cfg[e.id] = e.def; applyAll(); };
  reset.append(rl, rb); panel.appendChild(reset);
  const note = document.createElement('div'); note.className = 'note'; note.innerHTML = 'live, mid-run · stamped on receipts + hi-scores · <span id="labStamp"></span>';
  panel.appendChild(note);
  applyAll();
}
