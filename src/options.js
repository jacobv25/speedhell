// Options / pause menu (r29–r38, polish phase) — browser-only shell UI; never
// touches src/core. Esc / Enter / START opens it; the main loop freezes while
// open. r38 (Jacob: "Blue Revolver doesn't have hotkeys"): this menu IS the
// pause, and it is fully navigable by keyboard (↑↓←→ Enter) and gamepad
// (main.js routes d-pad/A/B edges into menuNav) — retry, quit, mute, TATE all
// live here, not on hotkeys. Mouse still works. Settings persist through
// `store`, a tiny adapter kept deliberately swappable: a desktop (Steam)
// build replaces its two functions with file-backed storage, nothing else.
import * as audio from './audio.js';

const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- keybinds
// Rebindable: the three gameplay buttons. Movement and the shell keys stay
// fixed. r38 freed r/p/m/t/q for binding (their hotkeys are gone); h stays
// reserved (title how-to key).
const DEFAULT_BINDS = { fire: ['z', ' '], focus: ['shift'], bomb: ['x'] };
const RESERVED = new Set(['h', 'escape', 'enter', 'tab',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
// r40: pad buttons are rebindable too (Jacob tried to rebind with the stick
// and nothing happened). Shell buttons stay fixed: START/SELECT/d-pad
// (8, 9, 12-15) are reserved; everything else can carry fire/focus/bomb.
const DEFAULT_PAD = { fire: [0, 2], focus: [4, 5, 6, 7], bomb: [1, 3] };
const PAD_RESERVED = new Set([8, 9, 12, 13, 14, 15]);
let bindMap = loadBinds();
let padMap = loadPadBinds();
function loadPadBinds() {
  try { const j = JSON.parse(store.get('speedhell.padkeys', 'null')); if (j && j.fire && j.focus && j.bomb) return j; } catch { /* bad json */ }
  return structuredClone(DEFAULT_PAD);
}
function savePadBinds() { store.set('speedhell.padkeys', JSON.stringify(padMap)); }
export function padBinds() { return padMap; }
export function isCapturing() { return !!capturing; }
export function capturePad(btn) { // main.js feeds fresh pad-button presses here while a rebind is armed
  if (!capturing) return false;
  if (btn === 9) { capturing = null; $('optMsg').textContent = MSG_DEFAULT; refresh(); return true; } // START cancels, like Esc
  if (PAD_RESERVED.has(btn)) { $('optMsg').textContent = `pad button ${btn} is taken (menu/movement) — pick another`; return true; }
  for (const a of Object.keys(padMap)) padMap[a] = padMap[a].filter((x) => x !== btn);
  for (const a of Object.keys(padMap)) if (!padMap[a].length) padMap[a] = DEFAULT_PAD[a].filter((x) => x !== btn); // never unbound, never resurrect the stolen button
  padMap[capturing] = [btn];
  capturing = null; savePadBinds();
  $('optMsg').textContent = MSG_DEFAULT; refresh();
  return true;
}
function loadBinds() {
  try { const j = JSON.parse(store.get('speedhell.keys', 'null')); if (j && j.fire && j.focus && j.bomb) return j; } catch { /* bad json */ }
  return structuredClone(DEFAULT_BINDS);
}
function saveBinds() { store.set('speedhell.keys', JSON.stringify(bindMap)); }
export function binds() { return bindMap; }
export function isBoundKey(k) { return bindMap.fire.includes(k) || bindMap.focus.includes(k) || bindMap.bomb.includes(k); }
const keyLabel = (k) => (k === ' ' ? 'space' : k === 'shift' ? 'shift' : k.length === 1 ? k.toUpperCase() : k);
const actLabel = (act) => bindMap[act].map(keyLabel).join(' / ');

// ---------------------------------------------------------------- TATE
const TATE_NAME = ['off', '90°', '270°'];
export function tateN() { return +store.get('tate', 0) || 0; }
export function applyTate(n) {
  document.body.classList.toggle('tate', n === 1);
  document.body.classList.toggle('tate270', n === 2);
  store.set('tate', n);
}
export function cycleTate() { const n = (tateN() + 1) % 3; applyTate(n); refresh(); return n; }

// ---------------------------------------------------------------- menu
const $ = (id) => document.getElementById(id);
let open = false, capturing = null, escLocked = false;
let enterTogglesFn = () => true, onQuitFn = null, onRetryFn = null;
let rows = [], selIdx = 0, auditionT = 0;
export function isOpen() { return open; }
export function openOptions() { if (!open) setOpen(true); }

function setOpen(v) {
  open = v; capturing = null;
  $('opts').classList.toggle('hide', !open);
  // r32: pause = silence (arcade convention); sliders speak on release instead
  if (open) { audio.unlock(); audio.pauseMusic(true); collectRows(); setSel(0); refresh(); }
  else { audio.pauseMusic(false); clearTimeout(auditionT); }
}

function collectRows() {
  rows = [...document.querySelectorAll('#optsPanel .row')].filter((r) => r.querySelector('button, input'));
}
function setSel(i) {
  rows[selIdx]?.classList.remove('sel');
  selIdx = (i + rows.length) % rows.length;
  rows[selIdx]?.classList.add('sel');
}

function adjustSlider(el, delta) {
  el.value = Math.max(0, Math.min(100, +el.value + delta));
  const music = el.id === 'optMusic';
  (music ? audio.setMusicVolume : audio.setSfxVolume)(el.value / 100);
  clearTimeout(auditionT); // audition ~release: after the taps stop
  auditionT = setTimeout(() => (music ? audio.musicBurst() : audio.sfxTest()), 350);
  refresh();
}

// r38: one nav entry point — keyboard (below) and gamepad (main.js) both feed
// it. 'up'/'down' move, 'left'/'right' adjust, 'activate' presses, 'close'.
export function menuNav(act) {
  if (!open) return;
  if (act === 'close') {
    if (capturing) { capturing = null; $('optMsg').textContent = MSG_DEFAULT; refresh(); }
    else setOpen(false);
    return;
  }
  if (capturing) return; // rebind wants a keyboard key
  if (act === 'up' || act === 'down') { setSel(selIdx + (act === 'down' ? 1 : -1)); return; }
  const row = rows[selIdx]; if (!row) return;
  const sl = row.querySelector('input[type=range]');
  if (act === 'left' || act === 'right') {
    if (sl) adjustSlider(sl, act === 'right' ? 5 : -5);
    else if (row.contains($('optTate'))) cycleTate();
    return;
  }
  if (act === 'activate' && !sl) row.querySelector('button')?.click();
}

const MSG_DEFAULT = '↑↓ select · ←→ adjust · Enter/Ⓐ press · Esc/Ⓑ close';

function refresh() {
  $('optMusic').value = Math.round(audio.getMusicVolume() * 100);
  $('optSfx').value = Math.round(audio.getSfxVolume() * 100);
  $('optMusicV').textContent = $('optMusic').value + '%';
  $('optSfxV').textContent = $('optSfx').value + '%';
  $('optMute').textContent = audio.isMuted() ? 'muted' : 'sound on';
  $('optTate').textContent = TATE_NAME[tateN()];
  $('optFull').textContent = document.fullscreenElement ? 'exit fullscreen' : 'enter fullscreen';
  for (const b of document.querySelectorAll('.bind'))
    b.textContent = capturing === b.dataset.act ? 'press a key / pad button…' : `${actLabel(b.dataset.act)} · pad ${padMap[b.dataset.act].join('/')}`;
  if (document.fullscreenElement && !escLocked) $('optMsg').textContent = 'browser rule: Esc leaves fullscreen — Enter/START toggles this menu';
  const controls = $('controls');
  if (controls) controls.textContent =
    `arrows/WASD move · ${actLabel('fire')} shot · ${actLabel('focus')} focus · ${actLabel('bomb')} bomb · ESC or START: menu`;
}

export function initOptions({ enterToggles, onQuit, onRetry } = {}) {
  if (enterToggles) enterTogglesFn = enterToggles;
  if (onQuit) { onQuitFn = onQuit; $('optQuit').onclick = () => { setOpen(false); onQuitFn(); }; }
  if (onRetry) { onRetryFn = onRetry; $('optRetry').onclick = () => { setOpen(false); onRetryFn(); }; }
  $('optResume').onclick = () => setOpen(false);
  applyTate(tateN());

  $('optMusic').addEventListener('input', (e) => { audio.setMusicVolume(e.target.value / 100); refresh(); });
  $('optMusic').addEventListener('change', () => audio.musicBurst()); // r32: ~1.5s at the new volume, then silence again
  $('optSfx').addEventListener('input', (e) => { audio.setSfxVolume(e.target.value / 100); refresh(); });
  $('optSfx').addEventListener('change', () => audio.sfxTest()); // r31: one blip at the final value, on release
  $('optMute').onclick = () => { audio.toggleMute(); refresh(); };
  $('optTate').onclick = () => cycleTate();
  // r30: in fullscreen the browser owns Esc. Where Keyboard Lock exists
  // (Chrome/Edge) we lock Esc so the menu works inside fullscreen; elsewhere
  // (Safari/Firefox) the first Esc drops fullscreen, the menu stays as it was.
  const lockEsc = async () => { try { if (navigator.keyboard && navigator.keyboard.lock) { await navigator.keyboard.lock(['Escape']); escLocked = true; } } catch { escLocked = false; } };
  $('optFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().then(lockEsc)
      .catch(() => { $('optMsg').textContent = 'browser rule: fullscreen needs a keyboard or mouse press'; }); // pad presses lack "user activation"
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) { escLocked = false; try { navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } catch { /* ok */ } }
    refresh();
  });
  for (const b of document.querySelectorAll('.bind'))
    b.onclick = () => { capturing = capturing === b.dataset.act ? null : b.dataset.act; $('optMsg').textContent = capturing ? 'press the new key or pad button — Esc/START cancels' : MSG_DEFAULT; refresh(); };
  $('optReset').onclick = () => { bindMap = structuredClone(DEFAULT_BINDS); padMap = structuredClone(DEFAULT_PAD); saveBinds(); savePadBinds(); refresh(); };

  // capture-phase so the menu owns the keyboard while open (main.js also
  // early-returns on isOpen(), belt and suspenders)
  addEventListener('keydown', (e) => {
    if (capturing) {
      e.preventDefault(); e.stopPropagation();
      const k = e.key.toLowerCase();
      if (k === 'escape') { capturing = null; }
      else if (RESERVED.has(k)) { $('optMsg').textContent = `“${keyLabel(k)}” is taken (movement/shell key) — pick another`; refresh(); return; }
      else {
        for (const a of Object.keys(bindMap)) bindMap[a] = bindMap[a].filter((x) => x !== k);
        for (const a of Object.keys(bindMap)) if (!bindMap[a].length) bindMap[a] = DEFAULT_BINDS[a].filter((x) => x !== k); // never unbound, never resurrect the stolen key
        bindMap[capturing] = [k];
        capturing = null; saveBinds();
      }
      $('optMsg').textContent = MSG_DEFAULT;
      refresh(); return;
    }
    if (open) { // r38: keyboard menu navigation
      const NAV = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'activate' };
      if (NAV[e.key]) { e.preventDefault(); menuNav(NAV[e.key]); return; }
    }
    // r34: Enter opens the menu too — the key that works in Safari fullscreen
    // (Esc there always exits fullscreen; Keyboard Lock is Chromium-only).
    // r38: only during play — title Enter starts, end-screen Enter retries.
    if (e.key === 'Enter' && !open && enterTogglesFn()) { e.preventDefault(); setOpen(true); return; }
    if (e.key === 'Escape') {
      if (document.fullscreenElement && !escLocked) return; // this Esc exits fullscreen (browser); menu untouched
      e.preventDefault(); setOpen(!open);
    }
  }, true);

  refresh();
}
