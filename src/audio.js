// Browser-only audio (r7-sfx). Procedural Web Audio SFX — no sample files — plus
// two music tracks: Skyline Breaker for the stage, Insert Coin Skies for the boss.
// Drains the core's per-frame sound ring (g.sfx / g.sfxN); core stays DOM-free.
import { SFX } from './core/game.js';

// Analysis (librosa, 2026-08-24): Skyline Breaker 123 BPM, flat full energy
// 0:03-3:08 — never loops within a stage, any entry point works. Insert Coin
// Skies 172 BPM: quiet intro until 0:39, then full; peak 1:33-1:38, breakdown
// 1:39-1:43, slam 1:44-end. A boss fight is 35-70s, so it enters at the 0:39
// section (on the beat grid: 0.975 + n*0.3483) and loops back there, never
// to the intro. `start` = seconds; `loopTo` = seek target on end.
const MUSIC = {
  stage: { src: 'assets/music/skyline-breaker.mp3', start: 0, loopTo: 3.69 },
  boss: { src: 'assets/music/insert-coin-skies.mp3', start: 38.94, loopTo: 38.94 },
};
const MUSIC_VOL = 0.55, SFX_VOL = 0.5;

let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('speedhell.muted') === '1'; } catch (_) {}

const tracks = {}; // name -> { el, node, gain }
let current = null; // name of the playing track

// AudioContext can only start from a user gesture; call from keydown/gamepad.
export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
  // soft limiter so shot spam + explosions never clip
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
  comp.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = SFX_VOL; sfxBus.connect(comp);
  musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const k in MUSIC) {
    const el = new Audio(MUSIC[k].src); el.preload = 'auto';
    // manual loop so the re-entry lands on the section, not the intro
    el.addEventListener('ended', () => { if (current === k) { el.currentTime = MUSIC[k].loopTo; el.play().catch(() => {}); } });
    const node = ac.createMediaElementSource(el);
    const gain = ac.createGain(); gain.gain.value = 0;
    node.connect(gain); gain.connect(musicBus);
    tracks[k] = { el, node, gain };
  }
}
export function ready() { return !!ac; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('speedhell.muted', muted ? '1' : '0'); } catch (_) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.02);
  return muted;
}
export function isMuted() { return muted; }

// ---------- music ----------
function fadeTo(t, v, secs) { t.gain.gain.cancelScheduledValues(ac.currentTime); t.gain.gain.setTargetAtTime(v, ac.currentTime, secs / 3); }

export function playMusic(name, { restart = true, fade = 0.6 } = {}) {
  if (!ac) return;
  if (current && current !== name) {
    const old = current, t = tracks[old]; fadeTo(t, 0, fade);
    setTimeout(() => { if (current !== old) t.el.pause(); }, fade * 1000 + 100);
  }
  const t = tracks[name]; if (!t) return;
  if (restart) t.el.currentTime = MUSIC[name].start;
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  fadeTo(t, 1, current === name ? 0.05 : fade);
  current = name;
}
export function stopMusic(fade = 0.8) {
  if (!ac || !current) return;
  const t = tracks[current]; fadeTo(t, 0, fade);
  setTimeout(() => { if (current === null) t.el.pause(); }, fade * 1000 + 100);
  current = null;
}
export function duckMusic(v, secs = 0.3) { if (ac && current) fadeTo(tracks[current], v, secs); }
// Pause = silence: the element pauses in place and resumes from the same spot.
export function pauseMusic(on) {
  if (!ac || !current) return;
  const t = tracks[current];
  if (on) t.el.pause();
  else { const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
}

// ---------- procedural SFX ----------
function osc(type, f0, f1, dur, vol, { t0 = 0, curve = 'exp', detune = 0 } = {}) {
  const t = ac.currentTime + t0;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.detune.value = detune;
  if (f1 !== f0) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); else o.frequency.linearRampToValueAtTime(f1, t + dur); }
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, { t0 = 0, hp = 0, lp = 20000, lpEnd = 0, q = 0.7 } = {}) {
  const t = ac.currentTime + t0;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = s;
  if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
  if (lp < 20000) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(lp, t); if (lpEnd) f.frequency.exponentialRampToValueAtTime(lpEnd, t + dur); n.connect(f); n = f; }
  n.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.02);
}
function explosion(size) { // size 1 = popcorn, 2 = elite, 3 = boss phase
  noise(0.18 * size, 0.6, { lp: 3500 * size, lpEnd: 150, q: 1.2 });
  osc('sine', 160 * size, 30, 0.22 * size, 0.7);
  if (size >= 2) { osc('square', 90, 25, 0.35, 0.25); noise(0.5 * size, 0.35, { t0: 0.04, lp: 900, lpEnd: 60 }); }
}
function arp(notes, step, dur, type = 'square', vol = 0.25) { notes.forEach((f, i) => osc(type, f, f, dur, vol, { t0: i * step })); }

let shotTick = 0;
const HANDLERS = {
  [SFX.SHOT]: () => { if ((shotTick++ & 1) === 0) { osc('square', 880, 220, 0.06, 0.12); noise(0.03, 0.08, { hp: 3000 }); } },
  [SFX.HIT]: () => { osc('triangle', 300, 120, 0.04, 0.18); },
  [SFX.KILL]: () => explosion(1),
  [SFX.KILL_BIG]: () => explosion(2),
  [SFX.PHASE]: () => { explosion(3); arp([523, 659, 784, 1047], 0.06, 0.25, 'square', 0.18); },
  [SFX.SPEED]: () => { arp([1319, 1760], 0.05, 0.12, 'square', 0.14); },
  [SFX.RUSH]: () => { arp([784, 988, 1175, 1568, 1976], 0.045, 0.2, 'square', 0.18); },
  [SFX.ITEM]: () => { osc('sine', 1400, 2100, 0.07, 0.14); },
  [SFX.CANCEL]: () => { noise(0.5, 0.35, { hp: 1200 }); osc('sawtooth', 200, 1600, 0.45, 0.2); },
  [SFX.BOMB]: () => { noise(0.9, 0.7, { lp: 6000, lpEnd: 80 }); osc('sawtooth', 60, 20, 0.9, 0.5); osc('sine', 800, 40, 0.5, 0.4); },
  [SFX.DIE]: () => { osc('square', 600, 40, 0.6, 0.35, { curve: 'lin' }); noise(0.6, 0.5, { lp: 4000, lpEnd: 100 }); duckMusic(0.35, 0.05); setTimeout(() => duckMusic(1, 0.6), 700); },
  [SFX.WARNING]: () => { for (let i = 0; i < 3; i++) { osc('square', 440, 440, 0.18, 0.22, { t0: i * 0.36 }); osc('square', 330, 330, 0.18, 0.22, { t0: i * 0.36 + 0.18 }); } duckMusic(0, 0.9); },
  [SFX.MIDBOSS]: () => { osc('sawtooth', 80, 200, 0.6, 0.3); osc('square', 55, 55, 0.7, 0.2); },
  [SFX.BOSS]: () => { playMusic('boss'); osc('sawtooth', 60, 160, 1.0, 0.35); noise(1.2, 0.25, { lp: 700, lpEnd: 100 }); },
  [SFX.CLEAR]: () => { stopMusic(1.5); arp([523, 659, 784, 1047, 1319, 1568], 0.09, 0.5, 'square', 0.22); },
  [SFX.GAMEOVER]: () => { stopMusic(0.5); arp([392, 370, 349, 330, 262], 0.16, 0.45, 'square', 0.2); },
};

export function drain(g) {
  if (!ac) { g.sfxN = 0; return; }
  for (let i = 0; i < g.sfxN; i++) { const h = HANDLERS[g.sfx[i]]; if (h) h(); }
  g.sfxN = 0;
}
