// Options menu (r29, polish phase) — browser-only shell UI; never touches
// src/core. Esc opens/closes; the main loop freezes while open (main.js checks
// isOpen()). Everything persists to localStorage through `store`, a tiny
// adapter kept deliberately swappable: a future desktop (Steam) build replaces
// these two functions with file-backed storage and nothing else changes.
import * as audio from './audio.js';

const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- keybinds
// Rebindable: the three gameplay buttons. Movement (arrows/WASD) and the
// system keys (R/P/M/T/Esc) stay fixed — they're listed in the panel.
const DEFAULT_BINDS = { fire: ['z', ' '], focus: ['shift'], bomb: ['x'] };
const RESERVED = new Set(['r', 'p', 'm', 't', 'escape', 'enter', 'tab',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
let bindMap = loadBinds();
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
// Same 'tate' key main.js always used: 0 off, 1 = 90°, 2 = 270°.
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
let open = false, capturing = null, escLocked = false, isPausedFn = () => false;
export function isOpen() { return open; }

function setOpen(v) {
  open = v; capturing = null;
  $('opts').classList.toggle('hide', !open);
  // r32: pause = silence (arcade convention); sliders speak on release instead
  if (open) { audio.unlock(); audio.pauseMusic(true); refresh(); }
  else if (!isPausedFn()) audio.pauseMusic(false); // stay silent if P-paused
}

function refresh() {
  $('optMusic').value = Math.round(audio.getMusicVolume() * 100);
  $('optSfx').value = Math.round(audio.getSfxVolume() * 100);
  $('optMusicV').textContent = $('optMusic').value + '%';
  $('optSfxV').textContent = $('optSfx').value + '%';
  $('optMute').textContent = audio.isMuted() ? 'muted (M)' : 'sound on';
  $('optTate').textContent = TATE_NAME[tateN()];
  $('optFull').textContent = document.fullscreenElement ? 'exit fullscreen' : 'enter fullscreen';
  for (const b of document.querySelectorAll('.bind'))
    b.textContent = capturing === b.dataset.act ? 'press a key…' : actLabel(b.dataset.act);
  const controls = $('controls');
  if (controls) controls.textContent =
    `arrows/WASD move · ${actLabel('fire')} shot · ${actLabel('focus')} focus · ${actLabel('bomb')} bomb · R restart · P pause · M mute · T rotate · ESC options`;
}

export function initOptions({ isPaused } = {}) {
  if (isPaused) isPausedFn = isPaused;
  applyTate(tateN());

  $('optMusic').addEventListener('input', (e) => { audio.setMusicVolume(e.target.value / 100); refresh(); });
  $('optMusic').addEventListener('change', () => audio.musicBurst()); // r32: ~1.5s of the current track at the new volume, then silence again
  $('optSfx').addEventListener('input', (e) => { audio.setSfxVolume(e.target.value / 100); refresh(); });
  $('optSfx').addEventListener('change', () => audio.sfxTest()); // r31: one blip at the final value, on release
  $('optMute').onclick = () => { audio.toggleMute(); refresh(); };
  $('optTate').onclick = () => cycleTate();
  // r30: in fullscreen the browser owns Esc (it exits fullscreen). Where the
  // Keyboard Lock API exists (Chrome/Edge) we lock Esc so the menu keeps
  // working inside fullscreen; elsewhere (Safari/Firefox) the first Esc drops
  // fullscreen and the menu simply stays as it was — press Esc again for it.
  const lockEsc = async () => { try { if (navigator.keyboard && navigator.keyboard.lock) { await navigator.keyboard.lock(['Escape']); escLocked = true; } } catch { escLocked = false; } };
  $('optFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().then(lockEsc).catch(() => {});
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) { escLocked = false; try { navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } catch { /* ok */ } }
    refresh();
  });
  for (const b of document.querySelectorAll('.bind'))
    b.onclick = () => { capturing = capturing === b.dataset.act ? null : b.dataset.act; $('optMsg').textContent = capturing ? 'press the new key — Esc cancels' : 'Esc closes · settings save automatically'; refresh(); };
  $('optReset').onclick = () => { bindMap = structuredClone(DEFAULT_BINDS); saveBinds(); refresh(); };

  // capture-phase so the menu owns the keyboard while open (main.js also
  // early-returns on isOpen(), belt and suspenders)
  addEventListener('keydown', (e) => {
    if (capturing) {
      e.preventDefault(); e.stopPropagation();
      const k = e.key.toLowerCase();
      if (k === 'escape') { capturing = null; }
      else if (RESERVED.has(k)) { $('optMsg').textContent = `“${keyLabel(k)}” is taken (movement/system key) — pick another`; refresh(); return; }
      else {
        for (const a of Object.keys(bindMap)) bindMap[a] = bindMap[a].filter((x) => x !== k);
        for (const a of Object.keys(bindMap)) if (!bindMap[a].length) bindMap[a] = structuredClone(DEFAULT_BINDS[a]); // never leave an action unbound
        bindMap[capturing] = [k];
        capturing = null; saveBinds();
      }
      $('optMsg').textContent = 'Esc closes · settings save automatically';
      refresh(); return;
    }
    if (open && e.key.toLowerCase() === 'm') { audio.toggleMute(); refresh(); return; } // mute reachable inside the menu
    if (e.key === 'Escape') {
      if (document.fullscreenElement && !escLocked) return; // this Esc exits fullscreen (browser); menu untouched
      e.preventDefault(); setOpen(!open);
    }
  }, true);

  refresh();
}
