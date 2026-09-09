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
//
// r74 stem layers (lab `musicLayers`, default OFF; docs/plans/stem-layers.md):
// `grid` is the stage track's bar grid (`firstBeat + (barPhase + 4n)·beat` = a
// bar line) — re-fit 2026-09-07 to the Demucs drum onsets: 125 BPM / 0.480 s /
// first beat 0.004 (30 % of drum onsets within ±20 ms vs 12.5 % chance; the
// old 123 / 3.692 grid in skyline-breaker.mp3.json sits at chance, as does
// the analyzer's fresh 126.05 / 0.046 guess). `layersUrl` is the layer map
// (stems per layer, per-section gains); its grid fields override `grid` when
// it loads. Only read when the row is on.
const MUSIC = {
  stage: { src: 'assets/music/skyline-breaker.mp3', start: 0, loopTo: 3.69,
    grid: { firstBeat: 0.004, beat: 0.48, bar: 4, barPhase: 0 }, layersUrl: 'docs/music/skyline-breaker.layers.json', layers: null },
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
  applyStemsVolume(); // r74: the stems' master gain (only exists with the lab row on)
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
  if (!current || !musicShouldPlay || stemsLive) return; // r74: on the stems path the stage element is parked silent — never "recover" it
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
  if (musicLayers) loadLayers(); // r74: row on → fetch + decode the stems now, so the first run starts on them
}
export function ready() { return !!ac; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('speedhell.muted', muted ? '1' : '0'); } catch (_) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.02); // sfx
  applyMusicVolumes(); // music (element volume)
  applyStemsVolume(); // r74 stems (also under `master`, so this is belt-and-braces)
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
    stemsStop(fade); // r74: a track switch retires the stems too (the WARNING cut has normally done it already)
  }
  const t = tracks[name]; if (!t) return;
  musicShouldPlay = true;
  if (name === 'stage' && musicLayers) { // r74 stems path — always a fresh start from 0 (every caller passes restart)
    pendingHandoff = false;
    if (current === 'stage') stemsStop(0.05); // retry from the pause menu: the old sources retire, new ones start at 0
    if (stems.ready) {
      if (!t.el.paused) t.el.pause(); t.level = t.target = 0; applyMusicVolumes(); // the element is parked silent for the whole run
      stemsStart(MUSIC.stage.start, { fresh: true });
      current = name;
      return;
    }
    if (!stems.failed) { pendingHandoff = true; loadLayers(); } // not decoded yet (first run): the element carries the run until the stems arrive, then hands off at its position
  }
  if (restart) t.el.currentTime = MUSIC[name].start;
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  fadeTo(t, 1, current === name ? 0.05 : fade);
  current = name;
}
export function stopMusic(fade = 0.8) {
  musicShouldPlay = false; pendingHandoff = false;
  if (!ac || !current) return;
  const t = tracks[current];
  if (stemsLive || stems.paused) { stemsStop(fade); current = null; return; } // r74: the WARNING's stopMusic(0.12) cuts the stems exactly as it cuts the element
  fadeTo(t, 0, fade);
  setTimeout(() => { if (current === null) t.el.pause(); }, fade * 1000 + 100);
  current = null;
}
export function duckMusic(v, secs = 0.3) {
  if (!ac || !current) return;
  if (stemsLive) { const now = ac.currentTime; hold(stems.duck.gain, now); stems.duck.gain.setTargetAtTime(v, now, Math.max(0.005, secs / 3)); return; } // r74: one duck gain over every layer
  fadeTo(tracks[current], v, secs);
}
// Pause = silence: the element pauses in place and resumes from the same spot.
export function pauseMusic(on) {
  if (!ac || !current) return;
  clearTimeout(burstT); // an explicit pause/resume always outlives a live burst
  musicShouldPlay = !on;
  const t = tracks[current];
  if (on) {
    if (stemsLive) { stemsPause(true); return; } // r74: sources stop, the song position is bookmarked, an armed (not yet started) ramp is held for the resume
    pausedAt = t.el.currentTime; t.el.pause(); return; // bookmark the run's position
  }
  // r74: the lab row may have flipped while the menu was open — resume on whichever path it says now
  if (current === 'stage' && musicLayers && stems.ready) {
    const pos = stems.paused ? stems.pos : (pausedAt >= 0 ? pausedAt : t.el.currentTime);
    if (!stems.paused) { t.el.pause(); t.level = t.target = 0; applyMusicVolumes(); } // element → stems hand-off at the element's bookmark
    stems.paused = false; pausedAt = -1;
    stemsStart(pos, { fresh: false }); // same position, one t0 for every layer; the held ramp re-arms on the next bar line
    return;
  }
  if (stems.paused) { // row flipped OFF mid-run: the element takes the run over at the stems' bookmark (an element seek — today's path)
    stems.paused = false; stems.armed = null;
    try { t.el.currentTime = stems.pos; } catch (_) { /* not seekable yet */ }
    t.level = t.target = 1; applyMusicVolumes();
    const p = t.el.play(); if (p && p.catch) p.catch(() => {});
    return;
  }
  // r33: bursts play the SAME element forward, so restore the bookmark —
  // slider auditions must never move where the run's music resumes.
  if (pausedAt >= 0) { try { t.el.currentTime = pausedAt; } catch (_) { /* not seekable yet */ } pausedAt = -1; }
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
}
// r32: options-menu feedback — the menu pauses music (arcade pause = silence),
// so the music slider speaks by playing ~1.5s of the current track from where
// it sits, at the new volume, then re-pausing. Mirrors the sfx release-blip.
let burstT = 0, pausedAt = -1;
export function musicBurst(ms = 1500) {
  if (!ac || !current) return;
  clearTimeout(burstT);
  if (stemsLive) return; // r74: already sounding (a burst only makes sense over a pause)
  if (stems.paused) { // r74: the layers play from the bookmark and halt again WITHOUT moving it (r33)
    stemsStart(stems.pos, { fresh: false, rearm: false });
    burstT = setTimeout(() => stemsPause(false), ms);
    return;
  }
  const t = tracks[current];
  const p = t.el.play(); if (p && p.catch) p.catch(() => {});
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
  if (name === current && !stemsLive && !stems.paused) { if (pausedAt >= 0) { try { t.el.currentTime = pausedAt; } catch (_) { /* ok */ } } } // back to the run's bookmark
  else { t.level = t.target = 0; applyMusicVolumes(); } // (r74: on the stems path the stage element stays parked silent)
}

// ---------- r74 stem layers (lab `musicLayers`, docs/plans/stem-layers.md) ----------
// The stage track BREATHES with the stage instead of jumping (the parked r66
// bar-snapped seeks read as "a scissor cut"): its Demucs stems play in
// sample-locked sync from 0:00 as pure Web Audio buffers, and stage moments
// ramp LAYER GAINS on the next bar line — the same song position at every
// moment, so nothing can cut. Presentation only: the CORE NEVER READS THE
// AUDIO CLOCK; main.js watches g.stageT / g.enemies each frame and calls
// setLayerSection(id). Row off (the default, and what the referee and every
// recording assume): nothing here runs — no fetch, no node, today's single
// <audio> path byte-for-byte; setLayerSection only remembers the id.
//
// Buffers, not elements — r30 forbids MediaElementSource, not AudioBuffers:
// each stem is decoded straight into a STEM_RATE mono OfflineAudioContext and
// summed into its layer buffer (docs/music/skyline-breaker.layers.json:
// rhythm = drums + bass, lead = other, voice = vocals). 32 kHz mono × 3
// layers ≈ 74 MB of PCM for 3:12 (stereo 44.1 kHz × 4 stems would be 271 MB).
// Graph: layer gain → duck → fade → stems master (mix × slider × mute) → master.
// Sources are recreated on every start (pause = stop + bookmark the song
// position; resume = start every layer again at that position, one t0) — the
// only "seeks" are pause/resume bookmarks; a layer change is a gain ramp,
// never a seek. Loop points sit on bar lines, so a wrap keeps the bar lattice.
const STEM_RATE = 32000;
const LAYER_LEAD = 0.06; // s — a ramp never starts inside the current bar's last 60 ms (scheduling slack)
let musicLayers = false, stemsLive = false, pendingHandoff = false;
const stems = { loading: false, ready: false, failed: false, paused: false, gain: null, duck: null, fade: null, layers: {}, names: [], retiring: [],
  t0: 0, offset: 0, pos: 0, loopStart: 0, loopEnd: 0, section: null, armed: null, bytes: 0 };
export const layerLog = []; // probe / console trace: { id, at, fireAt, end, targets } per ramp · { id, at, immediate, targets } per snap
export function musicLayersOn(v) { musicLayers = !!v; if (musicLayers && ac) loadLayers(); }
export function layersOn() { return musicLayers; }
export function musicGrid(name) { const m = MUSIC[name || 'stage']; return m && m.grid ? { ...m.grid } : null; }
const barLen = (gr) => gr.beat * gr.bar;
const bar0 = (gr) => gr.firstBeat + gr.barPhase * gr.beat;
const nextBar = (gr, t) => bar0(gr) + Math.ceil((t - bar0(gr)) / barLen(gr) - 1e-6) * barLen(gr); // first bar line ≥ t
const prevBar = (gr, t) => bar0(gr) + Math.floor((t - bar0(gr)) / barLen(gr) + 1e-6) * barLen(gr); // last bar line ≤ t
// cancel every scheduled change from `t` on and hold the value it has there (no jump back to the pre-ramp value)
function hold(p, t) { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); } }
function applyStemsVolume() { if (stems.gain) stems.gain.gain.setTargetAtTime(musicBase(), ac.currentTime, 0.02); }
// decodeAudioData resamples to ITS context's rate — decoding inside a STEM_RATE offline context skips a second render pass
function decodeAt(ab, rate) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const o = new OAC(1, 1, rate);
  return new Promise((res, rej) => { const p = o.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
}
async function loadLayers() {
  if (stems.loading || stems.ready || stems.failed || typeof fetch !== 'function') return;
  stems.loading = true;
  const m = MUSIC.stage;
  try {
    const r0 = await fetch(m.layersUrl, { cache: 'no-store' }); if (!r0 || !r0.ok) throw new Error('layers json: ' + (r0 && r0.status));
    const j = await r0.json();
    if (!j || !j.layers || !j.sections) throw new Error('layers json: no layers/sections');
    if (j.first_beat != null && j.beat_period) m.grid = { firstBeat: +j.first_beat, beat: +j.beat_period, bar: j.beats_per_bar || 4, barPhase: j.bar_phase | 0 };
    m.layers = j;
    const dir = j.stem_dir || 'assets/music/stems/skyline-breaker', names = Object.keys(j.layers), layers = {};
    let bytes = 0;
    for (const name of names) {
      let buf = null;
      for (const stem of j.layers[name]) { // one stem at a time: the stereo decode is transient, only the mono sum is kept
        const r = await fetch(`${dir}/${stem}.m4a`); if (!r || !r.ok) throw new Error(`stem ${stem}: ${r && r.status}`);
        const dec = await decodeAt(await r.arrayBuffer(), STEM_RATE);
        if (!buf) buf = ac.createBuffer(1, dec.length, STEM_RATE);
        const out = buf.getChannelData(0), n = Math.min(out.length, dec.length), k = 1 / dec.numberOfChannels;
        for (let c = 0; c < dec.numberOfChannels; c++) { const d = dec.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] * k; }
      }
      layers[name] = { buf, gain: null, src: null };
      bytes += buf.length * buf.numberOfChannels * 4;
    }
    // the graph is built only once every layer decoded — with the row off (or a 404) no music node ever exists
    stems.gain = ac.createGain(); stems.gain.gain.value = musicBase(); stems.gain.connect(master);
    stems.fade = ac.createGain(); stems.fade.gain.value = 1; stems.fade.connect(stems.gain);
    stems.duck = ac.createGain(); stems.duck.gain.value = 1; stems.duck.connect(stems.fade);
    for (const name of names) { const L = layers[name]; L.gain = ac.createGain(); L.gain.gain.value = 1; L.gain.connect(stems.duck); }
    const gr = m.grid, dur = Math.min(...names.map((n) => layers[n].buf.duration));
    stems.loopStart = nextBar(gr, m.loopTo - 0.01); // the element's re-entry (3.69) on the grid → bar 2 (3.844): past the intro, on a bar line
    stems.loopEnd = prevBar(gr, dur);               // whole bars only, so a wrap keeps every later bar line on the grid
    stems.layers = layers; stems.names = names; stems.bytes = bytes; stems.ready = true;
    if (pendingHandoff) handoff();
  } catch (e) { stems.failed = true; try { console.warn('[speedhell] stem layers unavailable — the element path stays:', e && e.message); } catch (_) { /* no console */ } }
  stems.loading = false;
}
// r74: the current stage section as reported by the shell (main.js). `immediate`
// snaps the gains (practice starts, run start); otherwise every layer ramps
// from the next bar line ≥ now + LAYER_LEAD over `fade_bars` bars. Bar lines
// in context time sit at t0 − offset + bar0 + k·barLen (the loop is whole
// bars, so a wrap keeps the lattice). A newer section replaces an armed one.
function songPos(at = ac.currentTime) {
  if (at <= stems.t0) return stems.offset;
  let p = stems.offset + (at - stems.t0);
  if (p > stems.loopEnd) p = stems.loopStart + ((p - stems.loopEnd) % (stems.loopEnd - stems.loopStart));
  return p;
}
function nextBarAc(acT) { const gr = MUSIC.stage.grid, base = stems.t0 - stems.offset + bar0(gr), bl = barLen(gr); return base + Math.ceil((acT - base) / bl - 1e-6) * bl; }
function snapLayers(sec, at) { for (const n of stems.names) { const p = stems.layers[n].gain.gain; hold(p, at); p.setValueAtTime(sec[n] != null ? +sec[n] : 1, at); } }
export function setLayerSection(id, immediate = false) {
  stems.section = id;
  if (!musicLayers || !stemsLive) return; // off, or not sounding yet: stemsStart applies the remembered section
  const L = MUSIC.stage.layers, sec = L && L.sections[id]; if (!sec) return;
  const now = ac.currentTime;
  stems.armed = null;
  if (immediate) { snapLayers(sec, now); layerLog.push({ id, at: songPos(now), immediate: true, targets: sec }); return; }
  // (a section arriving before t0 — e.g. a held ramp re-armed on resume — still ramps: the bar lattice t0 − offset + bar0 + k·barLen is defined before t0 too)
  const fireAt = nextBarAc(now + LAYER_LEAD), end = fireAt + (L.fade_bars || 1) * barLen(MUSIC.stage.grid);
  for (const n of stems.names) {
    const p = stems.layers[n].gain.gain, v = sec[n] != null ? +sec[n] : 1;
    hold(p, now); p.setValueAtTime(p.value, fireAt); p.linearRampToValueAtTime(v, end);
  }
  stems.armed = { id, fireAt, end };
  layerLog.push({ id, at: songPos(now), fireAt: songPos(fireAt), end: songPos(end), targets: sec });
}
// every layer starts at ONE t0 from the same song offset; `fresh` = a new run
// (reset duck, snap to the remembered section), else a resume (gains persist,
// an armed ramp that never started re-arms on the next bar line)
function stemsStart(offset, { fresh = true, rearm = true, fadeIn = 0 } = {}) {
  const now = ac.currentTime, t0 = now + 0.05;
  for (const s of stems.retiring) { try { s.stop(now); } catch (_) { /* already stopped */ } } stems.retiring.length = 0;
  for (const n of stems.names) {
    const L = stems.layers[n];
    const s = ac.createBufferSource(); s.buffer = L.buf; s.loop = true; s.loopStart = stems.loopStart; s.loopEnd = stems.loopEnd;
    s.connect(L.gain); s.start(t0, offset); L.src = s;
  }
  const armed = stems.armed; stems.t0 = t0; stems.offset = offset; stemsLive = true; stems.paused = false; stems.armed = null;
  hold(stems.fade.gain, now);
  if (fadeIn > 0) { stems.fade.gain.setValueAtTime(0, now); stems.fade.gain.linearRampToValueAtTime(1, t0 + fadeIn); } else stems.fade.gain.setValueAtTime(1, t0);
  if (fresh) {
    hold(stems.duck.gain, now); stems.duck.gain.setValueAtTime(1, now);
    const sec = MUSIC.stage.layers && stems.section && MUSIC.stage.layers.sections[stems.section];
    if (sec) { snapLayers(sec, now); layerLog.push({ id: stems.section, at: offset, immediate: true, targets: sec }); }
    else for (const n of stems.names) { const p = stems.layers[n].gain.gain; hold(p, now); p.setValueAtTime(1, now); }
  } else if (armed && rearm) { stems.armed = armed; setLayerSection(armed.id); } // still pending when the pause hit — fires on the next bar line of the new timeline
  else stems.armed = armed; // a burst leaves the real resume's re-arm untouched
}
// stop every source; `bookmark` = remember where the song is (a pause) — a burst passes false so it never moves the resume point (r33)
function stemsPause(bookmark) {
  if (!stemsLive) return;
  const now = ac.currentTime;
  if (bookmark) {
    stems.pos = songPos(now);
    if (stems.armed && stems.armed.fireAt > now) for (const n of stems.names) hold(stems.layers[n].gain.gain, now); // the ramp never started: hold, re-arm on resume
    else stems.armed = null; // in flight or done: it completes on its own (context time keeps running through a pause)
  } // a burst's halt leaves `armed` exactly as the real pause left it
  hold(stems.fade.gain, now); stems.fade.gain.setTargetAtTime(0, now, 0.01);
  for (const n of stems.names) { const s = stems.layers[n].src; stems.layers[n].src = null; if (s) { try { s.stop(now + 0.06); } catch (_) { /* ok */ } stems.retiring.push(s); } }
  stemsLive = false; stems.paused = true;
}
function stemsStop(fade) {
  stems.armed = null; stems.paused = false;
  if (!stemsLive) return;
  const now = ac.currentTime; stems.pos = songPos(now); stemsLive = false;
  hold(stems.fade.gain, now); stems.fade.gain.setTargetAtTime(0, now, Math.max(0.005, fade / 3));
  for (const n of stems.names) { const s = stems.layers[n].src; stems.layers[n].src = null; if (s) { try { s.stop(now + fade + 0.1); } catch (_) { /* ok */ } stems.retiring.push(s); } }
}
// first run before the decode finished: the element carried the run; the stems take over at its position (one beat crossfade — a gain ramp, no seek)
function handoff() {
  pendingHandoff = false;
  if (current !== 'stage' || !musicShouldPlay || stemsLive || !musicLayers) return; // paused → pauseMusic(false) hands off from the bookmark instead
  const t = tracks.stage, beat = MUSIC.stage.grid.beat;
  stemsStart(t.el.currentTime, { fresh: true, fadeIn: beat });
  fadeTo(t, 0, beat); setTimeout(() => { if (stemsLive && current === 'stage') t.el.pause(); }, beat * 1000 + 100);
}
// devtools / probe / headless check: what the stems path is doing right now
export function layerState() {
  const now = ac ? ac.currentTime : 0;
  return { on: musicLayers, ready: stems.ready, failed: stems.failed, live: stemsLive, paused: stems.paused, section: stems.section, ctx: ac ? ac.state : null, rate: ac ? ac.sampleRate : 0,
    t0: stems.t0, offset: stems.offset, pos: stemsLive ? songPos(now) : stems.pos, loopStart: stems.loopStart, loopEnd: stems.loopEnd, bytes: stems.bytes,
    sources: stems.names.filter((n) => stems.layers[n].src).length, durations: stems.names.map((n) => stems.layers[n].buf.duration),
    gains: Object.fromEntries(stems.names.map((n) => [n, stems.layers[n].gain.gain.value])), master: stems.gain ? stems.gain.gain.value : null,
    armed: stems.armed, grid: musicGrid('stage'), log: layerLog.length };
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
// r55 sound test: `dry` suppresses the music side-effects (cut/duck/switch)
// that a few handlers carry, so the card auditions the sound, not the transition.
let dry = false;
export function playSfx(id) { if (!ac) return; const h = HANDLERS[id]; if (!h) return; dry = true; try { h(); } finally { dry = false; } }
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
  [SFX.DIE]: () => { osc('square', 600, 40, 0.6, 0.35, { curve: 'lin' }); noise(0.6, 0.5, { lp: 4000, lpEnd: 100 }); if (!dry) { duckMusic(0.35, 0.05); setTimeout(() => duckMusic(1, 0.6), 700); } },
  [SFX.WARNING]: () => { for (let i = 0; i < 3; i++) { osc('square', 440, 440, 0.18, 0.22, { t0: i * 0.36 }); osc('square', 330, 330, 0.18, 0.22, { t0: i * 0.36 + 0.18 }); } if (!dry) stopMusic(0.12); }, // r20 (Booth flag): the stage track used to FADE over 0.9s and was still audible under the siren — arcade warnings cut the music; the boss track then starts clean
  [SFX.MIDBOSS]: () => { osc('sawtooth', 80, 200, 0.6, 0.3); osc('square', 55, 55, 0.7, 0.2); },
  [SFX.BOSS]: () => { if (!dry) playMusic('boss'); osc('sawtooth', 60, 160, 1.0, 0.35); noise(1.2, 0.25, { lp: 700, lpEnd: 100 }); },
  [SFX.CLEAR]: () => { if (!dry) stopMusic(1.5); arp([523, 659, 784, 1047, 1319, 1568], 0.09, 0.5, 'square', 0.22); },
  [SFX.GAMEOVER]: () => { if (!dry) stopMusic(0.5); arp([392, 370, 349, 330, 262], 0.16, 0.45, 'square', 0.2); },
};

export function drain(g) {
  if (!ac) { g.sfxN = 0; return; }
  for (let i = 0; i < g.sfxN; i++) { const h = HANDLERS[g.sfx[i]]; if (h) h(); }
  g.sfxN = 0;
}
