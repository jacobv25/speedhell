# SPEEDHELL — Session Handoff (2026-08-26)

## State: r8-fx EXPLOSIONS BUILT, UNCOMMITTED — needs Jacob's commit/push call + referee recert

- 2026-08-26: Jacob played S1945II side by side and named the gap: **explosions**.
  Planned (`~/.claude/plans/magical-seeking-plum.md`) and built the "meaty
  explosions" round in one session. Jacob's verdict in the sandbox: "not bad, a lot
  better" after a "lean bigger" pass. **Not committed** (see State warnings).
- What shipped (all in `src/`, builder-only, no test/docs/evidence edits):
  - `src/core/game.js`: typed particles (`FX.SPARK/FIRE/SMOKE/DEBRIS/RING/CORE`),
    colour FAMILIES (`FAM.WHITE/ORANGE/CYAN/BURN` — `p.hue` is a family index now, not a
    hue), `explode(g,x,y,tier,fam,r)` with tiers `TIER.POP/MED/BIG/PHASE/PLAYER`
    (zako+sub-part / turret+mid / elite+midboss / boss phase / player death),
    core-side `delay` for staggered sub-bursts, enemy `flash` (S4-MUST hit-flash),
    3-spark + flame-lick hit spark, `setShake` + `shakeMax` (squared decay in draw),
    `hitstop`/`fxHitstop` (OFF by default; sandbox J toggles 3f — Jacob hasn't judged it).
  - `src/render/renderer.js`: `drawFx()` two-pass — smoke/debris source-over, then
    fire/core/ring/spark with `globalCompositeOperation='lighter'` (first additive use);
    still drawn BELOW bullets (S2). Every fill in `drawEnemy` routes through `F()` so a
    hit paints the whole silhouette white for 2 frames.
  - `src/core/stage.js`: boss handoff ember spray → small BURN-family flame licks.
  - `src/sandbox.js` (untracked WIP from an earlier session, still untracked): FX bench —
    keys 1-5 fire POP/MED/BIG/PHASE/PLAYER at the emitter mark, 6 parks a turret under
    it, J toggles hitstop.
  - `tools/fx-shots/` (new, untracked): headless frame-strip capture per tier →
    `out/*.png`. `node tools/fx-shots/fx-shots.mjs`. Reviewed strips live there.
- **The big finding — referee rng-stream fragility.** FX randomness now rolls on its
  own `g.fxRng` (seed ^ 0x5bd1e995) so effect tuning can never perturb gameplay. That
  changed the `g.rng` order ONCE, and 3/16 sim checks flipped: `s6_alignment`
  (score ratio 2.07 < 3), `s4_dynamic` (bullet ratio 1.55 < 1.6), `s7_robust` (seeds
  facade + ab12cd each took 1 boss timeout, still cleared). **Proven not the FX**: a
  control run of the ORIGINAL code with only the rng split failed the identical three
  with bit-identical gameplay metrics. Those laws were certified against the exact
  stream, not robust to it. Stress gate green (p99 0.108 ms / 16.6). `evidence/` is
  restored to HEAD; the shots harness replays MATCH only against a regenerated
  `metrics.json`. Memory: `speedhell-rng-stream-fragility`.

## Left to do (priority order)

1. **Commit r8-fx** (Jacob's call — he hasn't said commit). Suggested: one commit for
   `src/` + `tools/fx-shots/` + README sandbox section, and decide whether
   `sandbox.html`/`src/sandbox.js` (from an earlier session) go in the same commit.
2. **Referee recert** (separate referee commit, Jacob-authorized): rerun
   `node test/sim.mjs` + `node test/shots.mjs` to regenerate `evidence/`, then either
   (a) loosen the 3 stream-sensitive thresholds with a written rationale, or (b) tune
   so they pass on the new stream (s4_dynamic is 1.55 vs 1.6 — closest). Critics should
   know the laws were stream-fragile.
3. **Push** — 4 commits already unpushed (3 sound + handoff, ~7 MB of MP3) plus r8-fx.
   Pushing `main` updates the public build at jacobv25.github.io/speedhell.
4. Explosion polish candidates from the S1945II compare: SPEED popup sits exactly on
   the kill point and hides zako explosions — move kill popups ~20px up; smoke is
   darker/slower than Psikyo's; decide on hitstop; boss red-phase contrast check
   (orange fire on `BOSS_BG[1]`) — only checked headless, not in the stage.
5. Two fresh blind critics on S4 / S2 / S8 per gauntlet protocol.
6. Carry-overs: R7 stagecraft package, R8 receipt package, camp-governor review,
   bonus-wave caravan idea, title jingle.

## Gotchas (hard-won)

- **Any change to `g.rng` call count re-rolls every bot run.** Old `burst()` drew 3 rng
  values per particle AND early-returned on a full pool, so gameplay depended on
  particle counts. If S6/S4/S7 flip after an rng-count-only change, run the control
  experiment (stash, minimal rng patch, sim) before hunting a gameplay bug.
- Renderer determinism seam unchanged: `draw()` uses `g.rng` only for shake; particle
  motion/randomness is all core-side (`delay` field carries stagger). `test/shots.html`
  stubs `g.rng` around draws — keep it that way.
- `p.hue` values changed meaning (0/10/30/45/190/200 → family 0-3). Anything that
  reads particles must use `FAM`.
- macOS has no `timeout` binary; the shots harness takes ~1 s, the sim ~2-3 min.
- Serve locally for the sandbox: `python3 -m http.server 8765 --directory ~/Dev/speedhell`
  (stopped at close). S1945II: `open -a RetroArch --args -L "$HOME/Library/Application
  Support/RetroArch/cores/fbneo_libretro.dylib" "$HOME/ROMs/fbneo/s1945ii.zip"`.
- Previous gotchas still stand: Mac sleep kills agents (caffeinate); builders never
  touch test/ docs/ evidence/; referee commits land first and separately.

## State warnings

- **Dirty tree**: `M README.md src/core/game.js src/core/stage.js src/render/renderer.js`,
  untracked `sandbox.html src/sandbox.js tools/`. 4 commits unpushed.
- **Sim: 13/16 green** on the new stream (3 stream-fragile fails, see above). Shots
  harness: MATCH against regenerated metrics, DIVERGED against the committed
  `evidence/metrics.json` — expected until recert.
- No servers left running.

## Next first step

Ask Jacob: commit r8-fx? push everything? hitstop on or off? Then do the referee recert
(item 2) before any further core work, so the gauntlet is green again.
