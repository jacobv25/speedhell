// SOUND TEST (r55) — arcade-canon extras card (every M2 port, CAVE option
// menus): audition every sfx and both music tracks in isolation. Browser-only
// shell; never touches src/core. Opened from OPTIONS, which stays open (and
// paused) underneath — this card just owns the input while it is up. Effects
// play DRY (no music cuts/ducks — you audition the sound, not the transition)
// and honour the live lab settings (r54 killAudio), so it is the A/B tool for
// the audio pass and the way Mark can hear one sound at a time.
import { SFX } from './core/game.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const SFX_LABEL = {
  SHOT: 'shot', HIT: 'hit', KILL: 'kill', KILL_BIG: 'kill (big)', SPEED: 'speed kill', RUSH: 'rush shower',
  ITEM: 'item', CANCEL: 'bullet cancel', BOMB: 'bomb', DIE: 'death', WARNING: 'warning', MIDBOSS: 'midboss arrives',
  BOSS: 'boss arrives', PHASE: 'boss phase down', CLEAR: 'stage clear', GAMEOVER: 'game over',
};
const ITEMS = [
  ...Object.keys(SFX).map((k) => ({ kind: 'sfx', id: SFX[k], label: SFX_LABEL[k] || k.toLowerCase() })),
  { kind: 'music', id: 'stage', label: '♪ stage — Skyline Breaker' },
  { kind: 'music', id: 'boss', label: '♪ boss — Insert Coin Skies' },
];
let open = false, sel = 0, playing = null;
export function busy() { return open; }

function render() {
  const rows = $('soundList').children;
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.toggle('sel', i === sel);
    const it = ITEMS[i];
    rows[i].textContent = it.label + (it.kind === 'music' ? (playing === it.id ? '  ▶ playing' : '') : '');
  }
}
function activate() {
  const it = ITEMS[sel];
  audio.unlock();
  if (it.kind === 'sfx') { audio.playSfx(it.id); return; }
  if (playing === it.id) { audio.stopPreview(); playing = null; }
  else { audio.previewMusic(it.id); playing = it.id; }
  render();
}
export function openSoundTest() { open = true; sel = 0; playing = null; $('sounds').classList.remove('hide'); render(); }
function close() { audio.stopPreview(); playing = null; open = false; $('sounds').classList.add('hide'); }
export function nav(act) {
  if (!open) return;
  if (act === 'up' || act === 'down') { sel = (sel + (act === 'down' ? 1 : ITEMS.length - 1)) % ITEMS.length; render(); }
  else if (act === 'activate') activate();
  else if (act === 'close') close();
}
export function padNav(pe) { // main.js routes pad edges here while busy()
  if (pe.up) nav('up'); if (pe.down) nav('down');
  if (pe.a) nav('activate'); if (pe.b || pe.start) nav('close');
}
export function initSoundTest() {
  const list = $('soundList');
  ITEMS.forEach((it, i) => {
    const d = document.createElement('div'); d.className = 'srow'; d.textContent = it.label;
    d.onclick = () => { sel = i; render(); activate(); };
    list.appendChild(d);
  });
  // capture-phase, registered BEFORE options so this card owns the keyboard while up
  addEventListener('keydown', (e) => {
    if (!open) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.key === 'ArrowUp') nav('up'); else if (e.key === 'ArrowDown') nav('down');
    else if (e.key === 'Enter' || e.key === ' ') nav('activate');
    else if (e.key === 'Escape') nav('close');
  }, true);
}
