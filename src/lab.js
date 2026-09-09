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
import { prefs, setSkin } from './render/renderer.js';
import { setHitWeight } from './audio.js';
import { SKINS } from './render/skins/index.js';

export const EXPERIMENTS = [
  // r60 — art direction skins (renderer-only; bullets, dot, hitboxes never move)
  { id: 'skin', label: 'art skin', def: 'cute-occult', ref: 'wiki §11 art rounds / concepts',
    choices: Object.values(SKINS).map((s) => [s.id, s.name]),
    apply: (v) => { setSkin(v); } },
  { id: 'speedPopup', label: 'SPEED popup', def: 'both', ref: 'wiki §2.6 / open Q4',
    choices: [['both', 'SPEED +1600'], ['num', '+1600'], ['word', 'SPEED (old)'], ['off', 'none']],
    apply: (v) => { prefs.speedPopup = v; } },
  // r67: fxSize + fxStyle (r51/r52) and killAudio (r54) left the Lab — 2×, chunky, heavy shipped (open Q12/Q14 decided 2026-09-07)
  // r53 — dress the natural meta (research/explosion-and-weapon-feel §5 option 4)
  // r70 bossHp (1×–3×) left the Lab in r71: 3× shipped as the constant (open Q16 decided 2026-09-08)
  // r73 EXPERIMENT — boss parts bite back (run-start tune knob → g.tune.partBite; open Q17)
  { id: 'bossParts', label: 'boss parts (next run)', def: 'current', ref: 'wiki §10 / open Q17',
    choices: [['current', 'current — a dead part takes its attack with it'], ['clock', 'angrier — each dead part +1 rep on the escalation clock'], ['inherit', 'inherit — the core takes the part\'s attack, denser'], ['burst', 'burst — retaliation ring + angrier + inherit']],
    apply: () => {} },
  { id: 'speedDress', label: 'speed-kill reward', def: 'off', ref: 'wiki §10 / open Q13',
    choices: [['off', 'current'], ['on', 'speed kill = tier up · rush = chain + big boom · cancels pop']],
    apply: (v) => { prefs.speedDress = v === 'on' ? 1 : 0; } },
  // r75 — the player shot as a bolt (renderer + one gated fx spawn in core, fx rng only; open Q22)
  // r76 — 'heavy' = bolt + the six research recipes (frame-study order): flame muzzle, 28px bolt + echo + 16px
  // trail, messy stream, layered impact, hit-sound weight (audio.js setHitWeight), spine shimmer
  { id: 'shotLook', label: 'shot look', def: 'current', ref: 'wiki §10 / open Q22',
    choices: [['current', 'current — 4×20 rect + white core'], ['bolt', 'bolt — pixel bolt · trail · muzzle flash · impact blob'], ['heavy', 'heavy — flame muzzle · 28px bolt + echo · messy stream · 6f impact · hit click']],
    apply: (v) => { prefs.shotLook = v; setHitWeight(v === 'heavy'); } },
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
