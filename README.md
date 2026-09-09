# SPEEDHELL

A Japanese-style vertical bullet-hell shmup in the Psikyo "speed hell" lineage —
fast bullets, aimed-heavy patterns, speed-kill scoring. Browser, zero dependencies.

Built with the **gauntlet-loop** method: builders and fresh-context blind critics judge
every surface against `docs/CRITIC_RUBRIC.md`, whose rules are distilled from the
`~/Dev/mark-msx-research` (critic theory) and `~/Dev/boghog-research` (developer craft)
corpora. Design constitution: `docs/DESIGN_PILLARS.md`, craft notes: `docs/BOGHOG_CRAFT.md` + `docs/BOGHOG_WORKSHOP.md`,
systems explainer (scoring, boss movement, open questions): `docs/DESIGN_WIKI.md`.
Drawing rules (palette, pixel grid, rims, size ladder): `docs/ART_BIBLE.md` — renderer
rounds build to it and critics grade against it alongside rubric S2/S3b/S4.

## Play

Open `index.html` in a browser (no build, no server needed — ES modules require
`file://` module support; if blocked, `python3 -m http.server` in this dir).

Arrows/WASD move · Z/space shot · Shift focus · X bomb · R restart · P pause · M mute. Gamepad supported.

## Sandbox (dev testing)

Open `sandbox.html` (same `http.server` caveat). It runs the **same core and renderer**
with an empty timeline: click to spawn any enemy preset (zako/shooter/diver, mid, turret,
elite at any rep, midboss, boss at P1/P2/P3), fire any emitter from `patterns.js` with live
parameters (optionally on a repeat clock), tune the ship table live (with a few sketch
presets), toggle god/∞ lives/∞ bombs, hand the stick to a referee bot, pause/frame-step/
time-scale, overlay hitboxes + per-enemy hp/speed-kill-window labels, or jump the real
timeline to any section. Every spawn/fire is logged as the core call that produced it
(copy-paste repro for a builder brief). `window.__sandbox` exposes it all to devtools.
The sandbox never touches `src/core/` — it is not part of the game or the referee.

## Verify (the referee)

```
node test/sim.mjs    # bots + stress + determinism → evidence/metrics.json
node test/shell.mjs  # headless Chrome: overlays really hide; the ?lab experiment rows appear only with the flag
```

`test/sim.mjs` and `docs/CRITIC_RUBRIC.md` are the referee: **builder agents must
never edit them** — that's grading your own homework.

## Architecture

- `src/core/` — DOM-free deterministic game logic (fixed 60Hz, seeded RNG, object
  pools, hard caps). Imports cleanly into Node for the sim harness.
- `src/render/` — Canvas2D layer, rubric S2 visibility rules.
- `src/audio.js` — browser-only sound: procedural Web Audio SFX (no sample files) driven by
  the core's per-frame sound-event ring (`g.sfx`), plus music in `assets/music/`
  (Skyline Breaker = stage, Insert Coin Skies = boss; crossfade at the boss gate).
- `test/sim.mjs` — scripted bots (expert/aggressive/passive/blind), S8 stress gate,
  determinism check, rubric metric checks.
- `test/shell.mjs` — browser check of the DOM shell (overlays hide for real). Run it
  after any index.html / overlay change — a JS-only test can't see a missing CSS rule.
- `src/lab.js` — playtest experiment switches (wiki §10). Open the game with `?lab`
  to get the rows in OPTIONS; `?lab=speedPopup:num,fxSize:2` is a shareable configuration.
- `tools/peek.mjs` + `test/fxpeek.html` — headless screenshot of a harness page (the
  explosion looks side by side; `?strip=chunky` = one burst across 12 frames); eyeball
  presentation experiments before handing them off.
- `tools/music/` — music lab: Demucs stems + beat grid (`analyze.py`) and a browser
  marker app (`lab.html`, served by the Booth server) that writes `docs/music/<track>.cues.json`,
  the song-timeline cue list the boss will read. See `tools/music/README.md`.
- `evidence/` — metrics + screenshots consumed by gauntlet critics.
