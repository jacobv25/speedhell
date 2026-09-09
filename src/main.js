// Browser bootstrap: input, fixed 60Hz logic, render on RAF.
// r38 (Jacob: "Blue Revolver doesn't have hotkeys — controller needs the same
// support as keyboard"): gameplay hotkeys (R/P/M/T/Q) are GONE. The pause
// menu is the shell — retry/quit/mute/TATE live there — and the gamepad is a
// first-class citizen: START = menu, d-pad/stick navigates it, A activates,
// B backs out; title picker on d-pad; death screen A/shot = retry, B = title.
import { makeGame, startRun, nextStage, update, W, H, SFX } from './core/game.js';
import { STAGES } from './core/stages/index.js'; // r78: the campaign table (one entry today)
import { draw, resetHud, prefs as renderPrefs } from './render/renderer.js';
import * as audio from './audio.js';
import { BUILD } from './version.js';
import { initOptions, isOpen as optionsOpen, openOptions, menuNav, binds, padBinds, isBoundKey, isCapturing, capturePad, store } from './options.js';
import { initHowTo, isHowToOpen, openHowTo, closeHowTo, openBriefing, closeBriefing, isBriefingOpen } from './howto.js';
import { initResults, syncReceipt, busy as resultsBusy, padNav as resultsPad, showScores } from './results.js';
import { initLab, labGet } from './lab.js';
import { initSoundTest, openSoundTest, busy as soundBusy, padNav as soundPad } from './soundtest.js';

// build tag pinned bottom-right, its own element — confirms which build loaded
const ver = document.getElementById('ver');
if (ver) ver.textContent = BUILD;

const canvas = document.getElementById('game');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

let g = makeGame((Math.random() * 0xffffffff) >>> 0);
let bgScroll = 0;

// r36 practice/section select — left/right on the title picks where the run
// starts; retry re-enters the SAME section (die at the midboss, retry the
// midboss in two seconds). r78: the list is built from the stage modules'
// SECTIONS tables (no hand-mirrored SEC_T). With ONE stage it is exactly the
// r36 rows, S1..S8 of stage 1. With more, the PRACTICE row gains the stage
// dimension (plan §6 stage select — Pillar 3's practice tool, boghog T3):
// every later stage adds a "STAGE N — NAME" entry (its full run, from its own
// startRun(g, 0, level)) followed by its sections, tagged STn. A run started
// past stage 1 is practice (g.startLevel > 0): receipt yes, hi-score board no.
const PRACTICE = [];
STAGES.forEach((st, L) => {
  const tag = STAGES.length > 1 ? `ST${L + 1} ` : '';
  if (L > 0) PRACTICE.push({ level: L, t: 0, label: `STAGE ${L + 1} — ${st.name}` });
  st.SECTIONS.forEach((s, i) => { if (i > 0) PRACTICE.push({ level: L, t: s.t, label: tag + s.label }); });
});
let practiceSel = 0;   // PRACTICE[] index — the row's ◀▶ value (0 = S1 POPCORN, as r36)
let currentStart = 0;  // what retry re-enters (0 = full run)
let currentLevel = 0;  // r78: …and on which stage
// r78: `?level=N` (NOT `?stage=` — that is the sandbox's stageT jump) preselects
// stage N on the PRACTICE row; `speedhell.level` remembers the last stage
// picked. Both exist only when there is more than one stage, so today's title
// reads nothing and stores nothing.
if (STAGES.length > 1) {
  const q = new URLSearchParams(location.search);
  const L = q.has('level') ? (+q.get('level') | 0) : (+store.get('speedhell.level', 0) | 0);
  const i = PRACTICE.findIndex((p) => p.level === L);
  if (i >= 0) practiceSel = i;
}

// r42 title menu (audit MUST #1 — BR/Gunvein/M2 all use list menus; the old
// banner-with-hidden-keys was the root of the "gaps surfacing one at a time"
// symptom). DOM rows; keyboard arrows+Enter, pad d-pad+A/START, mouse click.
const titleEl = document.getElementById('title');
const tRows = [...document.querySelectorAll('#titleMenu .trow')];
let titleSel = 0;
function titleRender() {
  tRows.forEach((r, i) => r.classList.toggle('sel', i === titleSel));
  document.getElementById('tPractice').textContent = '◀ ' + PRACTICE[practiceSel].label + ' ▶';
}
function titleNav(act) {
  if (act === 'up' || act === 'down') { titleSel = (titleSel + (act === 'down' ? 1 : tRows.length - 1)) % tRows.length; titleRender(); return; }
  const a = tRows[titleSel].dataset.act;
  if (act === 'left' || act === 'right') {
    if (a === 'practice') {
      practiceSel = (practiceSel + (act === 'right' ? 1 : PRACTICE.length - 1)) % PRACTICE.length; titleRender();
      if (STAGES.length > 1) store.set('speedhell.level', PRACTICE[practiceSel].level); // r78: persist the stage pick
    }
    return;
  }
  if (act !== 'activate') return;
  if (a === 'start') beginRun(0);
  else if (a === 'practice') beginRun(PRACTICE[practiceSel].t, PRACTICE[practiceSel].level);
  else if (a === 'scores') showScores();
  else if (a === 'howto') openHowTo();
  else if (a === 'options') openOptions();
}
tRows.forEach((r, i) => { r.onclick = () => { titleSel = i; titleRender(); titleNav('activate'); }; });
titleRender();

initHowTo(); // r35: one-card briefing, auto once ever (registered first so it wins the capture phase)
initResults(); // r44: receipt + hi-scores (capture listener registered before options)
initSoundTest(); // r55: sound test card (capture listener registered before options — it sits on top of the menu)
initLab(); // r50: playtest experiment rows (only with ?lab in the URL)
initOptions({
  enterToggles: () => g.state === 'play', // title Enter starts; end-screen Enter retries
  onQuit: () => quitToTitle(),
  onRetry: () => retryRun(),
  onSoundTest: () => openSoundTest(), // r55
});

function beginRun(t = currentStart, level = currentLevel) { // every run-start path
  currentStart = t; currentLevel = level;
  audio.unlock(); startRun(g, t, level); resetHud(); audio.playMusic('stage');
  g.tune.partBite = { current: 0, clock: 1, inherit: 2, burst: 3 }[labGet('bossParts')] || 0; // r73 Lab experiment — AFTER startRun (it rebuilds g)
}
function retryRun() { g.seed = (Math.random() * 0xffffffff) >>> 0; beginRun(); } // same start, fresh seed — restart <2s (S7)
function quitToTitle() { // r37: back to the picker
  g = makeGame((Math.random() * 0xffffffff) >>> 0);
  audio.stopMusic(0.4);
}
const atEnd = () => g.state === 'gameover' || g.state === 'clear';

// r78 stage-clear flow (plan §4 rule 10, boghog [WS05] "even ship intro
// animations add up over many runs"): a non-final stage's boss dies →
// g.state 'stageclear' → this stage's receipt holds STAGE_CLEAR_HOLD frames
// (SHOT skips it after a beat) → the target-briefing card "STAGE N — NAME" for
// BRIEFING_HOLD frames → nextStage(g). Zero-input total 3.5 + 2 = 5.5 s ≤ 6 s.
// Dormant with one stage: the final boss still ends in 'clear' as always.
const STAGE_CLEAR_HOLD = 210, BRIEFING_HOLD = 120;
let stageClearT = 0;
function stepStageClear(skip) {
  if (!isBriefingOpen()) {
    stageClearT++;
    if (stageClearT >= STAGE_CLEAR_HOLD || (skip && stageClearT > 45)) {
      const next = STAGES[g.level + 1];
      openBriefing(`STAGE ${g.level + 2}`, next ? next.name : ''); stageClearT = 0;
    }
  } else if (++stageClearT >= BRIEFING_HOLD) {
    closeBriefing(); stageClearT = 0;
    nextStage(g); resetHud(); audio.playMusic('stage');
  }
}

// r43: arm audio unlock on every REAL gesture (keyboard/mouse/touch — pads
// don't count as gestures, per browser autoplay policy). Idempotent.
for (const ev of ['pointerdown', 'keydown', 'touchstart'])
  addEventListener(ev, () => audio.unlock(), true);

const keys = {};
addEventListener('keydown', (e) => {
  if (optionsOpen() || isHowToOpen() || resultsBusy() || soundBusy()) return; // an overlay owns the keyboard (their own capture listeners)
  const k = e.key.toLowerCase();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || isBoundKey(k)) e.preventDefault();
  keys[k] = true;
  audio.unlock(); // any key is the user gesture the AudioContext needs
  if (g.state === 'title') { // r42: the title menu owns these keys
    const NAV = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'activate' };
    if (NAV[e.key]) titleNav(NAV[e.key]);
  } else if (atEnd()) {
    if (!e.repeat && (e.key === 'Enter' || binds().fire.includes(k))) retryRun(); // one press — S7 restart <2s
  }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// ---------------------------------------------------------------- gamepad
// Arcade-stick friendly held mapping (8BitDo Arcade Stick etc.): A/X fire,
// B/Y bomb, any shoulder focus; d-pad or left stick moves. Shell actions run
// on EDGES (padEdges) so menus never machine-gun.
let padName = null, padPrev = [], axPrev = [0, 0];
// r39: a pad press that operates an overlay must not leak into the game on
// the same (or any later held) tick — B closed the menu AND dropped a bomb.
// While latched, pad fire/bomb are ignored until buttons 0-3 are all released.
let padLatch = false;
export function activePad() { return padName; }

function getPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads || []) if (p && p.connected && p.buttons.length) return p;
  return null;
}
function padEdges(gp) {
  const e = { start: 0, sel: 0, a: 0, b: 0, up: 0, down: 0, left: 0, right: 0, btns: [] };
  const cur = [];
  if (gp) {
    for (let i = 0; i < gp.buttons.length; i++) cur[i] = !!gp.buttons[i]?.pressed;
    const ed = (i) => cur[i] && !padPrev[i];
    e.start = ed(9); e.sel = ed(8); e.a = ed(0); e.b = ed(1);
    e.up = ed(12); e.down = ed(13); e.left = ed(14); e.right = ed(15);
    e.btns = []; for (let i = 0; i < cur.length; i++) if (ed(i)) e.btns.push(i); // raw fresh presses (r40 rebind capture)
    const st = (v) => (v > 0.5 ? 1 : v < -0.5 ? -1 : 0);
    const sx = st(gp.axes[0] || 0), sy = st(gp.axes[1] || 0);
    if (sx === 1 && axPrev[0] !== 1) e.right = 1;
    if (sx === -1 && axPrev[0] !== -1) e.left = 1;
    if (sy === 1 && axPrev[1] !== 1) e.down = 1;
    if (sy === -1 && axPrev[1] !== -1) e.up = 1;
    axPrev = [sx, sy];
  } else axPrev = [0, 0];
  padPrev = cur;
  return e;
}

function pollInput(gp) { // held state only — edges are padEdges' job
  const i = g.input;
  i.dx = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
  i.dy = (keys['arrowdown'] || keys['s'] ? 1 : 0) - (keys['arrowup'] || keys['w'] ? 1 : 0);
  const B = binds(); // r29 rebinds; held, not automated [BOGHOG_CRAFT]
  i.focus = B.focus.some((k) => keys[k]);
  i.fire = B.fire.some((k) => keys[k]);
  i.bomb = B.bomb.some((k) => keys[k]);
  if (gp) {
    if (Math.abs(gp.axes[0] || 0) > 0.35) i.dx = Math.sign(gp.axes[0]);
    if (Math.abs(gp.axes[1] || 0) > 0.35) i.dy = Math.sign(gp.axes[1]);
    if (gp.buttons[14]?.pressed) i.dx = -1; if (gp.buttons[15]?.pressed) i.dx = 1;
    if (gp.buttons[12]?.pressed) i.dy = -1; if (gp.buttons[13]?.pressed) i.dy = 1;
    const PB = padBinds(); // r40: rebindable pad buttons
    if (padLatch && ![...PB.fire, ...PB.bomb].some((n) => gp.buttons[n]?.pressed)) padLatch = false; // all action buttons released
    if (!padLatch) {
      i.fire = i.fire || PB.fire.some((n) => gp.buttons[n]?.pressed);
      i.bomb = i.bomb || PB.bomb.some((n) => gp.buttons[n]?.pressed);
    }
    i.focus = i.focus || PB.focus.some((n) => gp.buttons[n]?.pressed);
  }
}

const STEP_MS = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += now - last; last = now;
  if (acc > 200) acc = 200; // avoid spiral after tab-out
  while (acc >= STEP_MS) {
    const gp = getPad(); padName = gp ? gp.id : null;
    const pe = padEdges(gp);
    if (isHowToOpen()) {
      if (pe.a || pe.b || pe.start) { closeHowTo(); padLatch = true; }
    } else if (soundBusy()) { // r55: the sound test card sits on top of the options menu and owns the pad
      soundPad(pe);
      if (pe.a || pe.b || pe.start) padLatch = true;
    } else if (optionsOpen()) {
      if (isCapturing() && pe.btns.length) { for (const b of pe.btns) capturePad(b); padLatch = true; } // r40: stick rebinding
      else {
        if (pe.up) menuNav('up'); if (pe.down) menuNav('down');
        if (pe.left) menuNav('left'); if (pe.right) menuNav('right');
        if (pe.a) menuNav('activate'); if (pe.b || pe.start) menuNav('close');
        if (pe.a || pe.b || pe.start) padLatch = true; // never leak the press into the game (r39)
      }
    } else if (resultsBusy()) { // r44: initials entry / hi-score table own the pad
      resultsPad(pe);
      if (pe.a || pe.b || pe.start) padLatch = true;
    } else if (g.state === 'title') { // r42: pad drives the title menu
      if (pe.up) titleNav('up'); if (pe.down) titleNav('down');
      if (pe.left) titleNav('left'); if (pe.right) titleNav('right');
      if (pe.a || pe.start) titleNav('activate');
    } else if (atEnd()) {
      if (pe.a) retryRun();
      else if (pe.start) openOptions();
      else if (pe.b || pe.sel) quitToTitle();
    } else if (g.state === 'stageclear') { // r78: between stages — zero-input; SHOT skips the receipt hold
      stepStageClear(pe.a || binds().fire.some((k) => keys[k]));
    } else { // play
      if (pe.start) openOptions();
    }
    g.fxMeta = renderPrefs.speedDress; // r52/r53 lab: explosion recipe + meta dressing are chosen at spawn in core (fx rng only)
    if (!optionsOpen() && !isHowToOpen()) {
      pollInput(gp); update(g);
      for (let i = 0; i < g.sfxN; i++) if (g.sfx[i] === SFX.SHOT) { renderPrefs.muzzlePrev = renderPrefs.muzzleAt; renderPrefs.muzzleAt = g.frame; renderPrefs.muzzleSide ^= 1; break; } // r75–r77: the muzzle flame's data path — the renderer strobes the flames off these stamps (read BEFORE drain empties the ring): this volley, the one before it, and which barrel flares (alternates)
      audio.drain(g); bgScroll += 1.05;
    }
    acc -= STEP_MS;
  }
  syncReceipt(g, PRACTICE.find((x) => x.t === currentStart && x.level === currentLevel)?.label || 'FULL RUN', isBriefingOpen()); // r44 (r78: the briefing card replaces the receipt between stages)
  draw(g, ctx, bgScroll);
  titleEl.classList.toggle('hide', g.state !== 'title' || optionsOpen() || isHowToOpen()); // r42
  if (g.state === 'title') { // pad readout (the menu itself is DOM)
    ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = padName ? '#57e389' : '#8a8fa8';
    ctx.fillText(padName ? ('PAD: ' + padName.slice(0, 44)) : 'no gamepad — press a button on the stick', W / 2, H / 2 + 62);
  }
  if (audio.isMuted()) {
    ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#8a8fa8';
    ctx.fillText('MUTED', W - 6, H - 6);
  } else if (audio.audioBlocked()) { // r43: never fail silently — say WHY there's no sound
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd24a';
    ctx.fillText('SOUND: press any key or click once (browser rule — pad alone can\'t start audio)', W / 2, H - 6);
  }
  requestAnimationFrame(frame);
}
// devtools handle (r70): probes read the live game without the core knowing — mirrors sandbox.js's __sandbox
window.__speedhell = { g: () => g };
requestAnimationFrame(frame);
