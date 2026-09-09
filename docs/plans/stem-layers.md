# Plan — Stem layers: the stage track breathes with the stage (no jumps)

*Written 2026-09-08 for a builder agent. Branch: new `feat/stem-layers` from
`main` (r73). Replaces the parked `feat/music-cues` (r66) approach — Jacob on
bar-snapped section jumps: "felt too much like a scissor cut. too harsh and
didn't flow." Read `CLAUDE.md`, then `src/audio.js` (the r30 rule and
`MUSIC`), `src/main.js` (the frame loop; `SEC_T`/`SECTIONS` mirror), `src/lab.js`,
`docs/DESIGN_WIKI.md` §10 + changelog tail, `tools/music/README.md`, and the
parked branch's `src/audio.js` (`git show feat/music-cues:src/audio.js`) for
its grid/cues-JSON loader, which you may copy.*

## Goal and exact result

The stage track never jumps. Instead its Demucs stems (drums, bass, other,
vocals — `tools/music/analyze.py` makes them) play in sample-locked sync from
0:00, and stage moments **fade layers in and out on the next downbeat**: a
popcorn opener with the lead held back, the midboss bringing the lead in as a
lift, the rush with everything, the release dropping the drums to a hush, the
boss WARNING cutting it all as today. Same song position at every moment, so
nothing can cut. Behind a Lab row `musicLayers` (`off` default / `on`);
off = today's single `<audio>` path, byte-for-byte.

## Non-negotiable constraints

1. **Presentation only. `src/core/` byte-identical**; the core never reads the
   audio clock. Everything lives in `src/audio.js`, `src/main.js`, `src/lab.js`,
   data JSON, and a probe under `tools/probes/`. No `g.rng`.
2. **Off = today.** With the row off: no stems fetched, no Web Audio music nodes
   created, `playMusic('stage')` unchanged. Prove it in the probe.
3. **Pure Web Audio for the stems** (`AudioBufferSourceNode` + `GainNode` per
   layer under one music `GainNode`). The r30 Safari rule forbids
   `MediaElementSource`; buffers are fine. **Memory budget ≤ 80 MB of decoded
   PCM**: decode each stem then resample to mono 22,050 Hz through an
   `OfflineAudioContext` (3:08 → ~16.6 MB per stem), or merge stems into ≤ 3
   layer buffers (e.g. rhythm = drums + bass; lead = other; voice = vocals).
   Report the final footprint.
4. **Sample-locked start**: every layer source starts at the same
   `ac.currentTime + 0.05`; layer changes are gain ramps only
   (`setTargetAtTime`/`linearRampToValueAtTime` over one bar), never seeks.
   Boss handoff unchanged: `SFX.WARNING` stops the stems exactly like it cuts
   the element today; `playMusic('boss')` stays the element path.
5. Pause/resume (`pauseMusic`), `stopMusic`, `duckMusic`, the volume slider
   (`setMusicVolume`) and mute must all work on the stems path — ducks and the
   slider scale the master music gain; mute = 0.
6. Lab lifecycle: `musicLayers` row, wiki §10 entry + changelog, BUILD r74.
7. Builders never edit `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`.

## Data (the layer map is data, not code)

Grid: Skyline Breaker is **125 BPM, beat 0.480 s, first beat 0.004 s, bar phase
0** (fitted against the drum stem on `feat/music-cues`; the old 123 BPM / 3.692
in `docs/music/skyline-breaker.mp3.json` is wrong). Run
`/Users/jacobvalenzuela/Dev/speedhell/tools/music/.venv/bin/python
tools/music/analyze.py assets/music/skyline-breaker.mp3 --bpm 125` from your
worktree: stems land in `assets/music/stems/skyline-breaker/` (gitignored,
`.m4a` for the browser), analysis JSON in `docs/music/` (commit it).

`docs/music/skyline-breaker.layers.json` (new, commit):
```json
{ "track": "skyline-breaker.mp3", "bpm": 125, "beat_period": 0.48, "first_beat": 0.004, "bar_phase": 0,
  "layers": { "rhythm": ["drums", "bass"], "lead": ["other"], "voice": ["vocals"] },
  "sections": {
    "s1": { "rhythm": 1.0, "lead": 0.35, "voice": 0.0 },
    "s2": { "rhythm": 1.0, "lead": 0.6,  "voice": 0.0 },
    "s3": { "rhythm": 1.0, "lead": 1.0,  "voice": 0.6 },
    "midboss": { "rhythm": 1.0, "lead": 1.0, "voice": 1.0 },
    "s5": { "rhythm": 1.0, "lead": 1.0,  "voice": 1.0 },
    "s6": { "rhythm": 1.0, "lead": 1.0,  "voice": 1.0 },
    "s7": { "rhythm": 0.25, "lead": 0.7, "voice": 1.0 }
  },
  "fade_bars": 1 }
```
Those gains are the builder's starting guess (Jacob retunes by ear); the shape
is the spec. `midboss` = the first frame an enemy with `type === 4` exists;
`sN` = `g.stageT` crossing `SEC_T[N]` (the `SECTIONS` mirror in main.js — import
or copy with a comment, never retype). Practice start mid-stage applies the
section's gains immediately (no fade).

## Implementation

1. `src/audio.js`: `MUSIC.stage.grid` + `layers` (from the JSON, fetched at
   unlock, 404-tolerant); `startLayers()` (decode/resample/merge once, cached;
   start all sources together; loop with `loopStart/loopEnd` on the grid so the
   loop lands on a bar); `setLayerSection(id, immediate)`: compute the next bar
   line ≥ now + 60 ms and ramp each layer gain to the section's target over
   `fade_bars` bars from that line; `export function musicLayersOn(v)`.
   `playMusic('stage')` branches on the flag: stems path when on. The element
   path is untouched when off.
2. `src/main.js`: after `update(g)` in the frame loop (next to `audio.drain`),
   detect section crossings + first midboss → `audio.setLayerSection(id)`;
   reset the fired set on run start; practice start → immediate.
3. `src/lab.js`: row `{ id: 'musicLayers', label: 'music layers', def: 'off',
   choices: [['off','current'],['on','stems fade with the stage']] }` →
   `audio.musicLayersOn(v === 'on')`.
4. BUILD r74; wiki §10 entry (with the layer table as shipped and the memory
   footprint) + changelog (cite: boghog [T1] "musical layering: base layer
   carries the player; add instruments; crescendo → relax" — this plan IS that
   line; MSX — presentation, no scoring surface; the r66 verdict).

## Tests / acceptance

- Probe `tools/probes/stem-layers-probe.mjs` with a fake audio context (stub
  `AudioContext`/`OfflineAudioContext`/`fetch` in Node): row off → zero
  layer nodes, zero fetches, `playMusic` path unchanged; row on → each section
  fires once in order, every ramp start lands on a bar line (< 5 ms off the
  125 BPM grid), gains reach the JSON targets, practice-start is immediate,
  pause/stop tear down cleanly.
- `node test/shell.mjs` PASS; the row appears only with `?lab`.
- Real-browser check via headless Chrome (playwright cache): load
  `index.html?lab=musicLayers:on`, start a run, and confirm decoded-buffer
  memory (report the number) and that four/three sources are playing in sync
  (`source.buffer.duration` equal, all started at one `t0`).
- `git diff --stat <start>..HEAD -- src/core` empty.

## Out of scope

Boss-track layering (the boss follows "the player wins", see
`docs/plans/boss-ritual.md`). Any change to when sections happen. Beat pulses
(`feat/beat-pulse`, parked — may later read the same grid).

## Recap format for Jacob

Files touched; the layer table as shipped; memory footprint; the probe output;
BUILD r74; wiki sections changed; what only ears can judge (the per-section
gains, the fade length); commit hashes on feat/stem-layers.
