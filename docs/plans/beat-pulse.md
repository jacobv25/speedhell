# Plan — Idea 2: cosmetic beat pulses (the crypt breathes)

*Written 2026-09-07 for a builder agent. Branch: start from `art/skins` (r62+).
Read `CLAUDE.md`, `docs/ART_BIBLE.md` §2–§7, `src/render/renderer.js`,
`src/render/skins/base.js` (the skin contract) and
`src/render/skins/cute-occult.js` before touching anything.*

## Goal and exact result

The background of the cute-occult skin moves with the music's beat: candle
flames flick taller on the downbeat, the ritual sigils step one notch per
beat instead of drifting, the vignette breathes ~2 % per bar. Nothing that
matters for dodging changes: bullets, enemy silhouettes, the ship and the hit
dot are untouched. When Idea 1 (music cues) jumps the song, the pulses pick up
the new section automatically because they follow the audio clock.

## Non-negotiable constraints

1. **Renderer only.** The ONLY safe place for beat-sync (wiki: the r28 lesson —
   renderer randomness/timing must never touch `g.rng` or the core). No core
   change; `git diff --stat src/core` must be empty.
2. **Headless-identical when off / without audio.** `test/shots.html`,
   `tools/artpeek.html`, `tools/enemy-gallery.html` and the referee never play
   audio: the beat phase they see must be a constant that reproduces today's
   pixels exactly. Acceptance below checks this with a pixel diff.
3. **S2 readability.** Pulses only on FIELD-band elements (bible §3 value
   ladder: landmark / slabs / stars / field / candles / sigils). Every pulsed
   value stays inside the washed band (≤ `#2e` per channel for far layers —
   see the skin's `FIELD` comment). Never pulse bullets, enemies, the ship,
   the dot, the HUD text, or anything drawn above enemies.
4. **Amplitude caps:** flame height +0..2 px; sigil step ≤ 1 notch/beat;
   vignette alpha ±0.02 around its 0.30; landmark brightness unchanged.
5. **Lab lifecycle (wiki §10):** Lab row `beatPulse`, `off` (default) / `on`.
6. **Builders never edit** `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`.
7. **Bump `BUILD`**; wiki §10 entry + changelog; say whether other wiki
   sections changed.

## How the beat reaches the renderer

- `src/audio.js`: `export function beatPhase()` → `{ phase, bar, on }` for the
  CURRENT track: `phase` = fractional beat position 0..1 from
  `(el.currentTime − grid.firstBeat) / grid.beat` (grid from the analysis
  JSON: Skyline Breaker 123 BPM, first beat 3.692, beat 0.4876; Insert Coin
  Skies 172 BPM, first beat 0.975, beat 0.3483 — add `grid` to `MUSIC[k]` if
  Idea 1 has not already). `bar` = 0..3 within a 4/4 bar, `on` = phase < 0.12.
  Returns `null` when no music (title, muted still counts as playing).
- `src/main.js`: each frame before `draw()`, `renderPrefs.beat =
  labOn ? audio.beatPhase() : null`.
- `src/render/renderer.js`: `prefs.beat = null` default (so every headless
  harness gets null). Pass it to the skin through the KIT: `KIT.beat = prefs.beat`
  right before `skin.drawBackground(...)` and `skin.post(...)` (KIT is a
  module-level object — set the field per frame; do not rebuild the object).
- `src/render/skins/cute-occult.js`: read `K.beat`; when `null`, draw exactly
  what r62 draws. When present:
  - **candles** (background flames in `drawBackground`): height +2 px on
    `on` beats (`bar === 0` may also widen by 1 px), decays over the beat via
    `phase`. Integer geometry only (bible §2) — round the offsets.
  - **sigils** (the scrolling ritual circles): rotation index = floor(beat
    count) instead of a `g.frame`-driven drift; i.e. they *tick* on the beat.
    Keep the precomputed integer marks; just choose which frame of the ring.
  - **vignette** in `post`: alpha 0.30 ± 0.02·cos(2π·phase) on bar 0 only —
    it must remain darkening-only (never lower bullet contrast).
  - Nothing else. If tempted to pulse the landmark, don't (Round 3's job).
- Boss idle hover on the bar is Round 4's (bible §8); leave a comment hook,
  no implementation.

## Implementation steps

1. `audio.js` grid + `beatPhase()` (10 lines). Handle the boss track's
   `loopTo` (phase keeps counting from the grid; no discontinuity because the
   loop target is on the grid).
2. `renderer.js`: `prefs.beat`, KIT plumbing (3 lines).
3. `main.js`: one line per frame.
4. `lab.js`: row `beatPulse`.
5. `cute-occult.js`: the three effects, each behind `if (K.beat)`.
6. `tools/artpeek.html`: add `?beat=0.0` support that sets `prefs.beat =
   { phase, bar: 0, on: phase < 0.12 }` so the peek sheet can show the on-beat
   and off-beat frames side by side (two extra gallery-less stage panels are
   fine; keep the default sheet unchanged).
7. BUILD bump, wiki §10 entry + changelog line.

## Tests / acceptance

- **Pixel identity when off:** `node tools/peek.mjs tools/artpeek.html a.png
  1920x1400` before and after your change must be identical outside the
  timing-label bands (the orchestrator's BMP diff script in the session
  scratchpad does this; or compare with any pixel-diff tool). Zero pixels.
- **On-beat vs off-beat peeks** (`?beat=0.0` and `?beat=0.5`): candles +2 px
  on the downbeat only; sigils differ by one notch; vignette within ±0.02.
  Include both PNGs in `docs/img/` and reference them in the wiki §10 entry.
- **Draw-time gate:** max-load draw stays ≤ 16.6 ms; report the number
  (cute-occult is 1.76 ms at r61 — the pulses must not add more than ~0.1 ms;
  the sigil tick must not re-precompute marks per frame).
- `node test/shell.mjs` passes; the Lab row shows only with `?lab`.
- `git diff --stat src/core` empty; no `g.rng` anywhere in the diff.

## Out of scope

Idea 1 (cue map / bar-snapped jumps) — separate plan `docs/plans/music-cues.md`;
this plan works with or without it. Pulses on enemies, bullets, boss, HUD.
Beat-driven gameplay of any kind.

## Recap format for Jacob

Files touched; the three amplitudes you settled on; the two peek PNGs; draw
time; BUILD rN; wiki sections changed (or "none beyond §10 + changelog").
