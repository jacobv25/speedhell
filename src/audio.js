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

let ac = null, master = null, sfxBus = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('speedhell.muted') === '1'; } catch (_) {}

// r29 options: user volumes are 0..1 MULTIPLIERS on the tuned mix above
// (1 = the mix as shipped), persisted; buses pick them up on unlock().
const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);
let musicVol = 1, sfxVol = 1;
try { musicVol = clamp01(parseFloat(localStorage.getItem('speedhell.vol.music'))); } catch (_) {}
try { sfxVol = clamp01(parseFloat(localStorage.getItem('speedhell.vol.sfx'))); } catch (_) {}
export function getMusicVolume() { return musicVol; }
export function getSfxVolume() { return sfxVol; }
export function setMusicVolume(v) {
  musicVol = clamp01(v);
  try { localStorage.setItem('speedhell.vol.music', String(musicVol)); } catch (_) {}
  applyMusicVolumes(); // instant — element volume, works everywhere incl. Safari
}
export function setSfxVolume(v) {
  sfxVol = clamp01(v);
  try { localStorage.setItem('speedhell.vol.sfx', String(sfxVol)); } catch (_) {}
  if (sfxBus) sfxBus.gain.setTargetAtTime(SFX_VOL * sfxVol, ac.currentTime, 0.02);
}

const tracks = {}; // name -> { el, level (current 0..1), target, tc (fade time-constant) }
let musicShouldPlay = false; // r43: what the GAME wants, vs what the browser allowed
let current = null; // name of the playing track

// AudioContext can only start from a user gesture; call from keydown/gamepad.
// r43: gamepad presses are NOT a browser "user gesture", so a stick-only
// session never unlocks audio (Jacob: "on first startup the sound doesn't
// work… retrying used to fix it" — R was a keyboard gesture; r38 removed it).
// unlock() is now armed on every real gesture (main.js), is safe to call
// repeatedly, and recovers a music track that failed to start while locked.
export function audioBlocked() { return !ac || ac.state !== 'running'; }
function recoverMusic() {
  if (!current || !musicShouldPlay) return;
  const t = tracks[current];
  if (t && t.el.paused) { const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
}
export function unlock() {
  if (ac) {
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.then) p.then(recoverMusic); }
    recoverMusic();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
  // soft limiter so shot spam + explosions never clip
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
  comp.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = SFX_VOL * sfxVol; sfxBus.connect(comp);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const k in MUSIC) {
    const el = new Audio(MUSIC[k].src); el.preload = 'auto'; el.volume = 0;
    // manual loop so the re-entry lands on the section, not the intro
    el.addEventListener('ended', () => { if (current === k) { el.currentTime = MUSIC[k].loopTo; el.play().catch(() => {}); } });
    tracks[k] = { el, level: 0, target: 0, tc: 0.2 };
  }
  setInterval(musicTick, 50);
}
export function ready() { return !!ac; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('speedhell.muted', muted ? '1' : '0'); } catch (_) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.02); // sfx
  applyMusicVolumes(); // music (element volume)
  return muted;
}
export function isMuted() { return muted; }

// ---------- music ----------
// r30: music volume rides HTMLMediaElement.volume, NOT a MediaElementSource
// gain — Safari can leave a MediaElementSource-wired element playing straight
// to the speakers, which made mute and the music slider silent no-ops in the
// r29 playtest (sfx, pure WebAudio, was fine). A 50ms ticker eases each
// track's level toward its target (crossfades, ducks); element volume is
// always level x tuned mix x user slider x mute.
const musicBase = () => (muted ? 0 : MUSIC_VOL * musicVol);
function applyMusicVolumes() { for (const k in tracks) { const t = tracks[k]; t.el.volume = Math.min(1, musicBase() * t.level); } }
function musicTick() {
  for (const k in tracks) {
    const t = tracks[k];
    t.level += (t.target - t.level) * (1 - Math.exp(-0.05 / t.tc));
    if (Math.abs(t.target - t.level) < 0.001) t.level = t.target;
  }
  applyMusicVolumes();
}
function fadeTo(t, v, secs) { t.target = v; t.tc = Math.max(0.02, secs / 3); }

export function playMusic(name, { restart = true, fade = 0.6 } = {}) {
  if (!ac) return;
  if (current && current !== name) {
    const old = current, t = tracks[old]; fadeTo(t, 0, fade);
    setTimeout(() => { if (current !== old) t.el.pause(); }, fade * 1000 + 100);
  }
  const t = tracks[name]; if (!t) return;
  musicShouldPlay = true;
  if (restart) t.el.currentTime = MUSIC[name].start;
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  fadeTo(t, 1, current === name ? 0.05 : fade);
  current = name;
}
export function stopMusic(fade = 0.8) {
  musicShouldPlay = false;
  if (!ac || !current) return;
  const t = tracks[current]; fadeTo(t, 0, fade);
  setTimeout(() => { if (current === null) t.el.pause(); }, fade * 1000 + 100);
  current = null;
}
export function duckMusic(v, secs = 0.3) { if (ac && current) fadeTo(tracks[current], v, secs); }
// Pause = silence: the element pauses in place and resumes from the same spot.
export function pauseMusic(on) {
  if (!ac || !current) return;
  clearTimeout(burstT); // an explicit pause/resume always outlives a live burst
  musicShouldPlay = !on;
  const t = tracks[current];
  if (on) { pausedAt = t.el.currentTime; t.el.pause(); } // bookmark the run's position
  else {
    // r33: bursts play the SAME element forward, so restore the bookmark —
    // slider auditions must never move where the run's music resumes.
    if (pausedAt >= 0) { try { t.el.currentTime = pausedAt; } catch (_) { /* not seekable yet */ } pausedAt = -1; }
    const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  }
}
// r32: options-menu feedback — the menu pauses music (arcade pause = silence),
// so the music slider speaks by playing ~1.5s of the current track from where
// it sits, at the new volume, then re-pausing. Mirrors the sfx release-blip.
let burstT = 0, pausedAt = -1;
export function musicBurst(ms = 1500) {
  if (!ac || !current) return;
  const t = tracks[current];
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  clearTimeout(burstT);
  burstT = setTimeout(() => t.el.pause(), ms);
}

// r55 sound test music preview: plays a track's element from its musical
// entry point WITHOUT touching `current` / musicShouldPlay — the run's own
// music bookkeeping (options has it paused with a bookmark) is untouched, so
// closing the card and resuming the run brings back exactly what was playing.
let preview = null;
export function previewMusic(name) {
  if (!ac || !tracks[name]) return;
  stopPreview();
  const t = tracks[name]; clearTimeout(burstT);
  try { t.el.currentTime = MUSIC[name].start; } catch (_) { /* not seekable yet */ }
  t.level = t.target = 1; applyMusicVolumes();
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  preview = name;
}
export function stopPreview() {
  if (!preview) return;
  const name = preview, t = tracks[name]; preview = null;
  t.el.pause();
  if (name === current) { if (pausedAt >= 0) { try { t.el.currentTime = pausedAt; } catch (_) { /* ok */ } } } // back to the run's bookmark
  else { t.level = t.target = 0; applyMusicVolumes(); }
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
// r54 → r67 (shipped; was lab `killAudio`, wiki §10 / open Q14): kill sounds carry
// weight. Mark MSX on DOJ: "you hear the laser, you hear the explosion" — half
// the feel is audio and none of the Lazy Devs episodes cover it. 'heavy' layers
// a sub-bass thump under every explosion, pitched DOWN by tier (popcorn 100 Hz
// → boss 60 Hz, all sliding to ~22 Hz), plus a short low-passed transient so
// the thump has an attack. The sfx bus + compressor
// keep it from clipping the music.
function thump(size) {
  osc('sine', 120 - 20 * size, 22, 0.2 + 0.1 * size, 0.95);
  noise(0.06, 0.45, { lp: 500 });
}
function explosion(size) { // size 1 = popcorn, 2 = elite, 3 = boss phase
  thump(size); // r67: heavy shipped (Lab open Q14 decided 2026-09-07)
  noise(0.18 * size, 0.6, { lp: 3500 * size, lpEnd: 150, q: 1.2 });
  osc('sine', 160 * size, 30, 0.22 * size, 0.7);
  if (size >= 2) { osc('square', 90, 25, 0.35, 0.25); noise(0.5 * size, 0.35, { t0: 0.04, lp: 900, lpEnd: 60 }); }
}
export function sfxTest() { if (ac) explosion(1); } // r30: audible feedback for the options sfx slider
function arp(notes, step, dur, type = 'square', vol = 0.25) { notes.forEach((f, i) => osc(type, f, f, dur, vol, { t0: i * step })); }

let shotTick = 0;
// r76 → r77 (shipped; was Lab shotLook=heavy): hit-sound WEIGHT — every hit keeps its tick, plus ONE 25ms low
// click (150 Hz sine, −6 dB under the tick) per frame in which any shot landed (the Lazy Devs cart's rule: sfx
// once per frame, so point-blank becomes a buzz, not a clip). drain() runs once per frame and resets the latch;
// boghog 101 "make damage sounds more powerful".
let hitClicked = false;
// r55 sound test: `dry` suppresses the music side-effects (cut/duck/switch)
// that a few handlers carry, so the card auditions the sound, not the transition.
let dry = false;
export function playSfx(id) { if (!ac) return; const h = HANDLERS[id]; if (!h) return; dry = true; hitClicked = false; try { h(); } finally { dry = false; } }
const HANDLERS = {
  [SFX.SHOT]: () => { if ((shotTick++ & 1) === 0) { osc('square', 880, 220, 0.06, 0.12); noise(0.03, 0.08, { hp: 3000 }); } },
  [SFX.HIT]: () => { osc('triangle', 300, 120, 0.04, 0.18); if (!hitClicked) { hitClicked = true; osc('sine', 150, 150, 0.025, 0.09); } },
  [SFX.KILL]: () => explosion(1),
  [SFX.KILL_BIG]: () => explosion(2),
  [SFX.PHASE]: () => { explosion(3); arp([523, 659, 784, 1047], 0.06, 0.25, 'square', 0.18); },
  [SFX.SPEED]: () => { arp([1319, 1760], 0.05, 0.12, 'square', 0.14); },
  [SFX.RUSH]: () => { arp([784, 988, 1175, 1568, 1976], 0.045, 0.2, 'square', 0.18); },
  [SFX.ITEM]: () => { osc('sine', 1400, 2100, 0.07, 0.14); },
  [SFX.CANCEL]: () => { noise(0.5, 0.35, { hp: 1200 }); osc('sawtooth', 200, 1600, 0.45, 0.2); },
  [SFX.BOMB]: () => { noise(0.9, 0.7, { lp: 6000, lpEnd: 80 }); osc('sawtooth', 60, 20, 0.9, 0.5); osc('sine', 800, 40, 0.5, 0.4); },
  [SFX.DIE]: () => { osc('square', 600, 40, 0.6, 0.35, { curve: 'lin' }); noise(0.6, 0.5, { lp: 4000, lpEnd: 100 }); if (!dry) { duckMusic(0.35, 0.05); setTimeout(() => duckMusic(1, 0.6), 700); } },
  [SFX.WARNING]: () => { for (let i = 0; i < 3; i++) { osc('square', 440, 440, 0.18, 0.22, { t0: i * 0.36 }); osc('square', 330, 330, 0.18, 0.22, { t0: i * 0.36 + 0.18 }); } if (!dry) stopMusic(0.12); }, // r20 (Booth flag): the stage track used to FADE over 0.9s and was still audible under the siren — arcade warnings cut the music; the boss track then starts clean
  [SFX.MIDBOSS]: () => { osc('sawtooth', 80, 200, 0.6, 0.3); osc('square', 55, 55, 0.7, 0.2); },
  [SFX.DEFLECT]: () => { osc('square', 1900, 1500, 0.03, 0.07); noise(0.025, 0.05, { hp: 5000 }); }, // r84: a dry metallic tick, quieter and higher than SFX.HIT — 'that bounced'
  [SFX.EXTEND]: () => { arp([523, 659, 784, 1047, 1319], 0.07, 0.22, 'square', 0.22); osc('sine', 1319, 1319, 0.5, 0.12, { t0: 0.35 }); }, // r79: the one extend — a bright rising five, unmistakable
  [SFX.BOSS]: () => { if (!dry) playMusic('boss'); osc('sawtooth', 60, 160, 1.0, 0.35); noise(1.2, 0.25, { lp: 700, lpEnd: 100 }); },
  [SFX.CLEAR]: () => { if (!dry) stopMusic(1.5); arp([523, 659, 784, 1047, 1319, 1568], 0.09, 0.5, 'square', 0.22); },
  [SFX.GAMEOVER]: () => { if (!dry) stopMusic(0.5); arp([392, 370, 349, 330, 262], 0.16, 0.45, 'square', 0.2); },
};

export function drain(g) {
  if (!ac) { g.sfxN = 0; return; }
  hitClicked = false; // r76/r77: one hit click per drained frame
  for (let i = 0; i < g.sfxN; i++) { const h = HANDLERS[g.sfx[i]]; if (h) h(); }
  g.sfxN = 0;
}
