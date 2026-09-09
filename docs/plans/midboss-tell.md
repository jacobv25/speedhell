# Plan — Midboss "tell" (a one-second sting + flash, no gate)

*Written 2026-09-08 for a builder agent, from the boss discussion (Jacob:
"thoughts on a WARNING before the midboss. and then much BIGGER WARNING before
the boss?"). Small. Branch: new `feat/midboss-tell` from `main`. Read
`CLAUDE.md`, `docs/DESIGN_WIKI.md` §4 (midboss) + §10 (Lab) + changelog tail,
`docs/HOMAGE_STUDY.md` (WARNING is the boss's), `docs/BOGHOG_CRAFT.md` [T2]
("no breather after it dies"; "the ritual is a beat, not dead air"),
`src/core/stage.js` (timeline: `at(2400, …)` spawns the midboss; the boss
WARNING at 3830 is the thing NOT to copy), `src/audio.js` (`SFX` handlers),
`src/render/renderer.js` (the WARNING band, `g.warn`), `src/lab.js`.*

## Corpus clearance (state it in the wiki entry)

- **HOMAGE / rubric S3b:** the WARNING banner + siren + sweep is the BOSS's
  arrival ritual (DDP #5). The midboss gets a *tell*, not a WARNING: different
  sound, different picture, no gate, no sweep — the hierarchy stays readable.
- **boghog [T2]:** the stage does not wait; no breather around the midboss.
  The tell overlaps live play (popcorn from `zakoGroup(2100)` may still be on
  screen); nothing pauses, nothing is cancelled.
- **MSX:** telegraphs are readability, not hand-holding; one second is a
  read, not a rest. Skilled players use it to pre-position — that is the
  point (routing).
- **Pillar / S2:** the flash must not mask bullets: draw it in the top band
  only (y < 30), under bullets, washed value.

## Exact result

At stageT **2340** (60 f = 1 s before the midboss's `at(2400)` entry) the
core emits `SFX.MIDBOSS_TELL` (a new sound id, no gameplay, no rng). The shell
answers with (a) a two-note rising sting, short and dry, distinct from the
boss siren; (b) a one-second top-band flash centred on the midboss's entry
column (x = W/2): a thin bracket that widens to the midboss's silhouette
width (r 26 → 52 px) over the second and fades, drawn under bullets. With
`musicLayers` on (`feat/stem-layers`, if merged) the midboss section's lead
lift already lands at 2400 on the next downbeat — the tell is the eye's
version of the same beat; do NOT add a music change here.

Lab row `midbossTell` (`off` default / `on`). Off: the sfx id is dropped by
`audio.js` (handler is a no-op) and the renderer draws nothing — so the core
may emit the event unconditionally (deterministic, identical stream; the sfx
ring is not part of the referee's rng). That keeps the core change to one
timeline line.

## Implementation

1. `src/core/game.js`: `SFX.MIDBOSS_TELL: 17` (append; never renumber).
   `src/core/stage.js`: `at(2340, (g) => sfx(g, SFX.MIDBOSS_TELL));` next to
   the midboss event, with a comment. No other core change; `g.rng` untouched.
2. `src/audio.js`: `[SFX.MIDBOSS_TELL]: () => { if (!tellOn) return; osc('square',
   330, 330, 0.09, 0.22); osc('square', 495, 495, 0.14, 0.22, { t0: 0.1 }); }`
   (rising fifth, ~0.25 s; nothing like the 440/330 siren triplet).
   `export function setMidbossTell(v)`.
3. `src/render/renderer.js`: `prefs.midbossTell` (false); `main.js` sets
   `renderPrefs.tellAt = g.frame` when it drains `SFX.MIDBOSS_TELL` (shell
   side, from the ring); renderer draws the bracket for 60 f after `tellAt`
   when the pref is on, in the top band, before bullets. Integer geometry,
   washed colour from the skin's FIELD band (bible §3).
4. `src/lab.js`: row `midbossTell` → `audio.setMidbossTell(v === 'on'); prefs.midbossTell = v === 'on'`.
5. `src/version.js` BUILD bump; wiki §4.1 one line ("tell at 2340, Lab r?"),
   §10 entry, changelog with the clearance above.

## Tests / acceptance

- `node test/sim.mjs` control (then `git checkout -- evidence/`): every bot
  outcome, frame count and the S8 determinism string identical to HEAD — the
  event is sfx-only.
- `node test/shell.mjs` PASS; row only with `?lab`.
- Headless: with the row on, `SFX.MIDBOSS_TELL` drains once per run at frame
  ≈ 2340 stageT (practice at S4 starts after it — fine, no tell); with the row
  off, no bracket pixels in the top band across the same frames (screenshot
  diff on `test/shots.html`-style capture or a canvas pixel probe).
- `git diff --stat src/core` shows exactly the two lines above.

## Out of scope

The BIGGER boss WARNING (= the boss-track intro, `docs/plans/boss-ritual.md`).
Any midboss behaviour change. Difficulty modes (the tell is on in both).

## Recap format for Jacob

Files touched (core diff pasted verbatim); sting description; the bracket's
size/colour; BUILD rN; wiki sections changed; control-sim identity line.
