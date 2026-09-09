// r74 stem layers probe — headless, no browser, FAKE audio clock + fake Web Audio.
// Drives makeGame + startRun + update with the expert bot (test/bot.mjs),
// mirrors main.js's per-frame section tracker, and stubs Audio / AudioContext /
// OfflineAudioContext / fetch / timers so src/audio.js runs on a virtual clock
// (1 frame = 1000/60 ms; timers fire at their exact due time; AudioParam
// automation is evaluated from its event list, so gains can be read back).
// Asserts (docs/plans/stem-layers.md "Tests / acceptance"):
//   A. lab row OFF (default): zero fetches, zero layer sources, zero music gain
//      nodes under `master`, empty layerLog; the stage <audio> element plays
//      exactly as today (one seek at start, none after).
//   B. lab row ON: every layer source starts at ONE t0 from offset 0 with equal
//      buffer durations and bar-aligned loop points; s1 snaps at run start, then
//      s2 → s3 → midboss → s5 → s6 → s7 each ramp once, in order, every ramp
//      start on a bar line (< 5 ms off the 125 BPM grid) and lasting one bar;
//      gains reach the JSON targets; the boss WARNING stops every source; the
//      stage element never plays; decoded PCM ≤ 80 MB (reported).
//   C. practice start in S7 snaps to s7 immediately (no ramp).
//   D. pause holds an armed ramp and re-arms it on resume at the bookmark;
//      a burst never moves the bookmark; stop tears every source down;
//      volume slider / mute / duck reach the stems' gains.
//   E. first run before the decode finished: the element carries the run and
//      hands off to the stems at its position (fresh module instance).
// Usage: node tools/probes/stem-layers-probe.mjs [seed]   (paths relative to this file — works from any worktree)
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url);
const SEED = +(process.argv[2] || 1);

// ---------- virtual clock + timers (installed BEFORE audio.js loads)
let vnow = 0; const timers = []; let tid = 0;
globalThis.setTimeout = (fn, ms = 0) => { const t = { id: ++tid, at: vnow + Math.max(0, ms), fn }; timers.push(t); return t.id; };
globalThis.clearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
globalThis.setInterval = (fn, ms) => { const t = { id: ++tid, at: vnow + ms, fn, every: ms }; timers.push(t); return t.id; };
function advance(ms) {
  const end = vnow + ms;
  for (;;) {
    timers.sort((a, b) => a.at - b.at); const t = timers[0];
    if (!t || t.at > end) break;
    vnow = t.at; if (t.every) t.at += t.every; else timers.shift();
    t.fn();
  }
  vnow = end;
}
const now = () => vnow / 1000;
// ---------- fake media element: currentTime runs on the virtual clock while playing
const seeks = []; const played = new Set();
class FakeAudio {
  constructor(src) { this.src = src; this.volume = 1; this.paused = true; this._base = 0; this._at = 0; this.preload = ''; }
  get currentTime() { return this.paused ? this._base : this._base + (vnow - this._at) / 1000; }
  set currentTime(v) { this._base = v; this._at = vnow; seeks.push({ el: this, t: v, vnow }); }
  play() { if (this.paused) { this._at = vnow; this.paused = false; } played.add(this); return Promise.resolve(); }
  pause() { if (!this.paused) { this._base = this.currentTime; this.paused = true; } }
  addEventListener() {}
}
globalThis.Audio = FakeAudio;
// ---------- fake AudioParam with a real automation timeline (what the ramps are checked against)
class FakeParam {
  constructor(v = 1) { this._v0 = v; this.ev = []; }
  get value() { return this.at(now()); }
  set value(v) { this._v0 = v; this.ev.length = 0; }
  _push(e) { this.ev.push(e); this.ev.sort((a, b) => a.t - b.t); }
  setValueAtTime(v, t) { this._push({ k: 'set', v, t }); }
  linearRampToValueAtTime(v, t) { this._push({ k: 'ramp', v, t }); }
  exponentialRampToValueAtTime(v, t) { this._push({ k: 'ramp', v, t }); }
  setTargetAtTime(v, t, tc) { this._push({ k: 'target', v, t, tc }); }
  cancelScheduledValues(t) { this.ev = this.ev.filter((e) => e.t < t); }
  cancelAndHoldAtTime(t) { const v = this.at(t); this.ev = this.ev.filter((e) => e.t < t); this._push({ k: 'set', v, t }); }
  at(t) {
    let v = this._v0, tv = -Infinity, target = null;
    const tval = (tg, at) => tg.v + (tg.from - tg.v) * Math.exp(-(at - tg.t) / tg.tc);
    for (const e of this.ev) {
      if (e.t > t) {
        if (e.k === 'ramp') { const base = target ? tval(target, tv) : v; return t <= tv ? base : base + (e.v - base) * (t - tv) / (e.t - tv); }
        break;
      }
      if (e.k === 'target') { target = { v: e.v, t: e.t, tc: e.tc, from: target ? tval(target, e.t) : v }; tv = e.t; }
      else { v = e.v; tv = e.t; target = null; }
    }
    return target ? tval(target, t) : v;
  }
}
const gains = [], sources = [], decodes = [];
const node = (x = {}) => ({ dst: null, connect(d) { this.dst = d; }, ...x });
const fakeBuffer = (ch, len, rate, shared) => ({ numberOfChannels: ch, length: len, sampleRate: rate, duration: len / rate, _d: [],
  getChannelData(i) { if (shared) return shared; return this._d[i] || (this._d[i] = new Float32Array(len)); } });
class FakeAC {
  constructor() { this.state = 'running'; this.sampleRate = 48000; this.destination = { dest: true }; }
  get currentTime() { return now(); }
  createGain() { const n = node({ gain: new FakeParam(1) }); gains.push(n); return n; }
  createDynamicsCompressor() { return node({ threshold: new FakeParam(), ratio: new FakeParam(), attack: new FakeParam(), release: new FakeParam() }); }
  createBuffer(ch, len, rate) { return fakeBuffer(ch, len, rate); }
  createOscillator() { return node({ type: '', frequency: new FakeParam(), detune: new FakeParam(), start() {}, stop() {} }); }
  createBufferSource() {
    const s = node({ buffer: null, loop: false, loopStart: 0, loopEnd: 0, startedAt: null, offset: 0, stoppedAt: null,
      start(when = now(), offset = 0) { s.startedAt = when; s.offset = offset; sources.push(s); },
      stop(when = now()) { if (s.stoppedAt != null && s.stoppedAt <= now()) throw new Error('InvalidStateError: already stopped'); s.stoppedAt = when; } });
    return s;
  }
  createBiquadFilter() { return node({ type: '', frequency: new FakeParam(), Q: new FakeParam() }); }
  resume() { return Promise.resolve(); }
}
const SONG = 192.4, sharedPcm = new Float32Array(Math.round(SONG * 32000));
class FakeOAC {
  constructor(ch, len, rate) { this.sampleRate = rate; }
  decodeAudioData(ab, ok) { const b = fakeBuffer(2, Math.round(SONG * this.sampleRate), this.sampleRate, sharedPcm); decodes.push(b); if (ok) ok(b); return Promise.resolve(b); }
}
globalThis.window = { AudioContext: FakeAC, OfflineAudioContext: FakeOAC };
const fetches = [];
globalThis.fetch = async (url) => {
  fetches.push(String(url));
  if (String(url).endsWith('.m4a')) return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(16) };
  try { const txt = readFileSync(new URL(url, ROOT), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(txt) }; } catch { return { ok: false, status: 404 }; }
};

const audio = await import(new URL('src/audio.js', ROOT));
const { makeGame, startRun, update } = await import(new URL('src/core/game.js', ROOT));
const { makeBot } = await import(new URL('test/bot.mjs', ROOT));
const J = JSON.parse(readFileSync(new URL('docs/music/skyline-breaker.layers.json', ROOT), 'utf8'));

// ---------- main.js mirror (SECTIONS[1..7].t = SEC_T 120 / 720 / 1700 / 2400 / 2460 / 2900 / 3700)
const SEC_T = [0, 120, 720, 1700, 2400, 2460, 2900, 3700, 3900];
const LAYER_SEC = [['s1', 1], ['s2', 2], ['s3', 3], ['s5', 5], ['s6', 6], ['s7', 7]].map(([id, i]) => [id, SEC_T[i]]);
const layerFired = new Set();
function layerStart(t, a = audio) {
  layerFired.clear(); let pre = 's1';
  for (const [id, at] of LAYER_SEC) if (t >= at) { layerFired.add(id); pre = id; }
  layerFired.add('s1'); if (t >= SEC_T[5]) layerFired.add('midboss');
  a.setLayerSection(pre, true);
}
function layerTick(g, a = audio) {
  if (g.state !== 'play') return;
  if (!layerFired.has('midboss')) for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].type === 4) { layerFired.add('midboss'); a.setLayerSection('midboss'); break; }
  for (const [id, at] of LAYER_SEC) if (!layerFired.has(id) && g.stageT >= at) { layerFired.add(id); a.setLayerSection(id); }
}
const fails = []; const ok = (cond, msg) => { if (!cond) fails.push(msg); };
function runStage(atT = 0, maxFrames = 9000, a = audio) {
  const g = startRun(makeGame(SEED), atT); const bot = makeBot({ aggressive: true, lookahead: 14, reactDelay: 0 });
  layerStart(atT, a); a.playMusic('stage');
  let bossAt = -1;
  while (g.state === 'play' && g.frame < maxFrames) {
    advance(1000 / 60);
    bot(g); update(g); a.drain(g); layerTick(g, a);
    if (bossAt < 0) for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].type === 5) { bossAt = g.frame; break; }
    if (bossAt >= 0 && g.frame > bossAt + 240) break; // four seconds into the boss is enough
  }
  return { g, bossAt };
}
const onBar = (gr, t) => { const bl = gr.beat * gr.bar, b0 = gr.firstBeat + gr.barPhase * gr.beat; const r = ((t - b0) % bl + bl) % bl; return Math.min(r, bl - r); };
const layerSources = () => sources.filter((s) => s.buffer && s.buffer.sampleRate === 32000);
const stageEls = () => [...played].filter((e) => e.src.includes('skyline'));
const masterNode = () => gains.find((n) => n.dst && n.dst.dest);
const musicGainsUnderMaster = () => gains.filter((n) => n.dst === masterNode());
const MB = (b) => (b / 1048576).toFixed(1) + ' MB';

// ---------- A. row OFF (default)
audio.unlock(); await new Promise((r) => setImmediate(r));
const gr = audio.musicGrid('stage');
ok(gr && Math.abs(gr.beat - 0.48) < 1e-9 && Math.abs(gr.firstBeat - 0.004) < 1e-9, 'built-in stage grid is not 0.004 + n·0.48: ' + JSON.stringify(gr));
const A = runStage(0);
const stageSeeksA = seeks.filter((s) => s.el.src.includes('skyline') && s.vnow > 0.5);
ok(fetches.length === 0, 'row OFF: something was fetched: ' + JSON.stringify(fetches));
ok(layerSources().length === 0, 'row OFF: layer sources exist: ' + layerSources().length);
ok(musicGainsUnderMaster().length === 0, 'row OFF: music gain nodes under master: ' + musicGainsUnderMaster().length);
ok(audio.layerLog.length === 0, 'row OFF: layerLog not empty: ' + JSON.stringify(audio.layerLog));
ok(stageEls().length === 1 && stageSeeksA.length === 0, 'row OFF: stage element path changed (played ' + stageEls().length + ', seeks after start ' + stageSeeksA.length + ')');
ok(!audio.layerState().ready && !audio.layerState().on, 'row OFF: stems decoded or flag on: ' + JSON.stringify(audio.layerState()));
ok(A.bossAt > 0, 'row OFF run never reached the boss (bot died? try another seed): state ' + A.g.state + ' stageT ' + A.g.stageT);
console.log(`A (row off, seed ${SEED}): frames ${A.g.frame}, boss at ${A.bossAt}, fetches ${fetches.length}, layer sources ${layerSources().length}, music gains under master ${musicGainsUnderMaster().length}, layerLog ${audio.layerLog.length}, stage element played ${stageEls().length}× seeks-after-start ${stageSeeksA.length}`);

// ---------- B. row ON
audio.stopMusic(0.1); advance(500); played.clear(); seeks.length = 0;
audio.musicLayersOn(true);
for (let i = 0; i < 2000 && !audio.layerState().ready; i++) await new Promise((r) => setImmediate(r));
let st = audio.layerState();
ok(st.ready, 'row ON: stems never became ready: ' + JSON.stringify(st));
ok(fetches.length === 5, 'row ON: expected 1 json + 4 stem fetches, got ' + JSON.stringify(fetches));
ok(st.bytes <= 80 * 1048576, 'decoded PCM over budget: ' + MB(st.bytes));
ok(onBar(gr, st.loopStart) < 1e-6 && onBar(gr, st.loopEnd) < 1e-6 && st.loopStart > 3.6 && st.loopEnd < SONG, `loop points off the grid: ${st.loopStart} .. ${st.loopEnd}`);
console.log(`B decode: layers ${st.durations.length} (${Object.keys(J.layers).join(', ')}), duration ${st.durations.map((d) => d.toFixed(2)).join(' / ')} s, PCM ${MB(st.bytes)} (32 kHz mono), loop ${st.loopStart} → ${st.loopEnd} (bar ${((st.loopStart - 0.004) / 1.92).toFixed(0)} → ${((st.loopEnd - 0.004) / 1.92).toFixed(0)}), fetches ${fetches.length}`);
audio.layerLog.length = 0; sources.length = 0;
const B = runStage(0);
const log = audio.layerLog.slice();
console.log('B (row on) layerLog:'); for (const e of log) console.log('   ', JSON.stringify(e));
const ids = log.map((e) => e.id).join(',');
ok(ids === 's1,s2,s3,midboss,s5,s6,s7', 'sections did not fire once each in order: ' + ids);
ok(log[0] && log[0].immediate && log[0].at === 0, 's1 was not snapped at run start: ' + JSON.stringify(log[0]));
for (const e of log) {
  const want = J.sections[e.id];
  ok(want && Object.keys(want).every((k) => e.targets[k] === want[k]), `${e.id}: targets ${JSON.stringify(e.targets)} ≠ json ${JSON.stringify(want)}`);
  if (e.immediate) continue;
  ok(onBar(gr, e.fireAt) < 0.005, `${e.id}: ramp starts ${(onBar(gr, e.fireAt) * 1000).toFixed(1)} ms off a bar line (at ${e.fireAt.toFixed(4)})`);
  ok(Math.abs(e.end - e.fireAt - J.fade_bars * 1.92) < 1e-6, `${e.id}: ramp length ${(e.end - e.fireAt).toFixed(3)} ≠ ${J.fade_bars} bar`);
  ok(e.fireAt - e.at >= 0.06 - 1e-9 && e.fireAt - e.at <= 1.92 + 0.06, `${e.id}: armed ${((e.fireAt - e.at) * 1000).toFixed(0)} ms ahead (want 60 ms .. one bar)`);
}
const firstT0 = Math.min(...layerSources().map((s) => s.startedAt)), batch = layerSources().filter((s) => s.startedAt === firstT0); // the run-start batch
ok(batch.length === 3, 'expected 3 layer sources at run start, got ' + batch.length);
ok(new Set(batch.map((s) => s.startedAt)).size === 1 && batch.every((s) => s.offset === 0), 'run-start sources did not share one t0 / offset 0: ' + JSON.stringify(batch.map((s) => [s.startedAt, s.offset])));
ok(new Set(batch.map((s) => s.buffer.duration)).size === 1, 'layer buffer durations differ: ' + batch.map((s) => s.buffer.duration));
ok(batch.every((s) => s.loop && s.loopStart === st.loopStart && s.loopEnd === st.loopEnd), 'loop points not set on every source');
st = audio.layerState();
ok(!st.live && st.sources === 0, 'stems still live after the boss WARNING: ' + JSON.stringify({ live: st.live, sources: st.sources }));
ok(layerSources().every((s) => s.stoppedAt != null && s.stoppedAt <= now()), 'a layer source was never stopped');
ok(stageEls().length === 0, 'row ON: the stage <audio> element played (' + stageEls().length + ')');
for (const k of Object.keys(J.sections.s7)) ok(Math.abs(st.gains[k] - J.sections.s7[k]) < 1e-3, `end gain ${k} = ${st.gains[k]} ≠ s7 ${J.sections.s7[k]}`);
ok(B.bossAt > 0, 'row ON run never reached the boss: state ' + B.g.state);
console.log(`B: frames ${B.g.frame}, boss at ${B.bossAt}, sources ${batch.length} @ t0 ${batch[0] && batch[0].startedAt.toFixed(3)} offset 0, dur ${batch[0] && batch[0].buffer.duration.toFixed(2)} s, after WARNING live=${st.live} sources=${st.sources}, end gains ${JSON.stringify(st.gains)}, stage element played ${stageEls().length}×`);

// ---------- C. practice start in S7 → immediate s7
audio.layerLog.length = 0;
const C = runStage(3700, 30);
const c0 = audio.layerLog[0];
ok(c0 && c0.id === 's7' && c0.immediate && audio.layerLog.filter((e) => !e.immediate).length === 0, 'practice S7 did not snap to s7 (no ramp): ' + JSON.stringify(audio.layerLog));
console.log('C: practice S7 →', JSON.stringify(c0), '· gains', JSON.stringify(audio.layerState().gains));
void C;

// ---------- D. pause / resume / burst / stop / volume / mute / duck
audio.stopMusic(0.1); advance(500); audio.layerLog.length = 0;
layerStart(0); audio.playMusic('stage'); advance(1000);
audio.setLayerSection('s2'); const armed = audio.layerLog.at(-1);
ok(armed && armed.id === 's2' && !armed.immediate, 'D: s2 did not arm: ' + JSON.stringify(armed));
audio.pauseMusic(true); const stPause = audio.layerState();
ok(!stPause.live && stPause.paused && stPause.sources === 0 && Math.abs(stPause.pos - 1.0) < 0.06, 'D: pause did not stop the sources / bookmark ~1.0 s: ' + JSON.stringify({ live: stPause.live, paused: stPause.paused, sources: stPause.sources, pos: stPause.pos }));
advance(4000);
ok(Math.abs(audio.layerState().gains.lead - J.sections.s1.lead) < 1e-3, 'D: armed ramp ran during the pause: lead=' + audio.layerState().gains.lead);
sources.length = 0; audio.pauseMusic(false); const stRes = audio.layerState(); const rearm = audio.layerLog.at(-1);
ok(stRes.live && stRes.sources === 3 && Math.abs(stRes.offset - stPause.pos) < 1e-9 && new Set(layerSources().map((s) => s.startedAt)).size === 1, 'D: resume did not restart 3 sources at the bookmark with one t0: ' + JSON.stringify({ live: stRes.live, sources: stRes.sources, offset: stRes.offset, pos: stPause.pos }));
ok(rearm !== armed && rearm.id === 's2' && onBar(gr, rearm.fireAt) < 0.005, 'D: resume did not re-arm s2 on a bar line: ' + JSON.stringify(rearm));
advance(5000);
ok(Math.abs(audio.layerState().gains.lead - J.sections.s2.lead) < 1e-3, 'D: re-armed ramp did not reach s2 lead: ' + audio.layerState().gains.lead);
audio.pauseMusic(true); const pos2 = audio.layerState().pos; sources.length = 0;
audio.musicBurst(1500); ok(audio.layerState().sources === 3 && Math.abs(audio.layerState().offset - pos2) < 1e-9, 'D: burst did not play from the bookmark');
advance(2000); const stBurst = audio.layerState();
ok(!stBurst.live && stBurst.paused && stBurst.sources === 0 && stBurst.pos === pos2, 'D: burst moved the bookmark or left sources: ' + JSON.stringify({ live: stBurst.live, sources: stBurst.sources, pos: stBurst.pos, pos2 }));
audio.pauseMusic(false); ok(Math.abs(audio.layerState().offset - pos2) < 1e-9, 'D: resume after burst did not use the bookmark');
audio.setMusicVolume(0.5); advance(200); ok(Math.abs(audio.layerState().master - 0.55 * 0.5) < 1e-3, 'D: slider did not reach the stems master: ' + audio.layerState().master);
audio.toggleMute(); advance(200); ok(audio.layerState().master < 1e-3, 'D: mute did not zero the stems master: ' + audio.layerState().master);
audio.toggleMute(); audio.setMusicVolume(1); advance(200); ok(Math.abs(audio.layerState().master - 0.55) < 1e-3, 'D: unmute/slider 1 did not restore 0.55: ' + audio.layerState().master);
audio.duckMusic(0.35, 0.05); advance(500);
const duckGain = gains.find((n) => gains.includes(n.dst) && gains.includes(n.dst.dst) && n.dst.dst.dst === masterNode()); // duck → fade → stems master → master (all gain nodes; the sfx chain goes through the compressor)
ok(duckGain && Math.abs(duckGain.gain.value - 0.35) < 0.01, 'D: duck did not reach 0.35: ' + (duckGain && duckGain.gain.value));
audio.duckMusic(1, 0.6); advance(3000);
audio.stopMusic(0.5); advance(700); const stStop = audio.layerState();
ok(!stStop.live && !stStop.paused && stStop.sources === 0 && layerSources().every((s) => s.stoppedAt != null), 'D: stop did not tear the sources down: ' + JSON.stringify({ live: stStop.live, paused: stStop.paused, sources: stStop.sources }));
// row back OFF → the next run is the element path again
audio.musicLayersOn(false); played.clear(); sources.length = 0; audio.layerLog.length = 0;
runStage(0, 120);
ok(stageEls().length === 1 && layerSources().length === 0 && audio.layerLog.length === 0, 'D: row off after on did not return to the element path: ' + JSON.stringify({ el: stageEls().length, src: layerSources().length, log: audio.layerLog.length }));
audio.stopMusic(0.1); advance(500);
console.log(`D: pause@${stPause.pos.toFixed(3)} held lead=${J.sections.s1.lead}, resume re-armed s2 → ${rearm.fireAt.toFixed(3)} (bar line), reached ${J.sections.s2.lead}; burst kept pos ${pos2.toFixed(3)}; slider 0.275 → mute 0 → 0.55; duck 0.35; stop → 0 sources; row off again → element path`);

// ---------- E. first run before the decode finished: element carries, stems hand off (fresh module)
const audio2 = await import(new URL('src/audio.js?fresh', ROOT));
played.clear(); sources.length = 0; fetches.length = 0;
audio2.musicLayersOn(true); // like `?lab=musicLayers:on`: the flag is set before the first gesture
audio2.unlock();            // → loadLayers() starts; nothing has resolved yet
layerStart(0, audio2); audio2.playMusic('stage');
ok(stageEls().length === 1 && layerSources().length === 0, 'E: element did not carry the run while decoding');
advance(500);
for (let i = 0; i < 2000 && !audio2.layerState().live; i++) await new Promise((r) => setImmediate(r));
const stE = audio2.layerState(), elE = stageEls()[0];
ok(stE.live && stE.sources === 3 && Math.abs(stE.offset - 0.5) < 0.02, 'E: hand-off did not start 3 sources at the element position (~0.5 s): ' + JSON.stringify({ live: stE.live, sources: stE.sources, offset: stE.offset }));
advance(1000);
ok(elE && elE.paused, 'E: the element kept playing after the hand-off');
ok(stE.section === 's1' && Math.abs(audio2.layerState().gains.lead - J.sections.s1.lead) < 1e-3, 'E: hand-off did not start in s1: ' + JSON.stringify(audio2.layerState().gains));
console.log(`E: element carried ${(stE.offset).toFixed(3)} s, then ${stE.sources} sources @ t0 ${stE.t0.toFixed(3)} offset ${stE.offset.toFixed(3)}, element paused=${elE && elE.paused}, gains ${JSON.stringify(audio2.layerState().gains)}`);
audio2.stopMusic(0.1); advance(500);

if (fails.length) { for (const f of fails) console.log('FAIL:', f); process.exit(1); }
console.log(`PASS: row off = today's element path (0 fetches, 0 music nodes); row on = 3 layers, one t0, sections once in order on bar lines (<5 ms), targets = json, WARNING cuts; practice snaps; pause/burst/stop/slider/mute/duck behave; hand-off works; PCM ${MB(st.bytes)} ≤ 80 MB`);
