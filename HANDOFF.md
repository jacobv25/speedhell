# SPEEDHELL — Session Handoff (2026-08-09)

## Done this session (project created → 1CC'd)

- Built the full game: Psikyo-style vertical danmaku, one stage (8 sections →
  midboss → 3-phase boss), browser/Canvas2D, deterministic 60Hz DOM-free core.
- Method: **gauntlet-loop** — builder agents vs fresh blind critics vs the
  referee (`test/sim.mjs` + `docs/CRITIC_RUBRIC.md`). Rules distilled from
  `~/Dev/mark-msx-research` + `~/Dev/boghog-research`.
- **4 rounds, all twice-upheld:** r1 balance (unkillable-boss fix), r2
  point-blank economy + caravan pull, r3 difficulty restore (TTK spread felt),
  r4 field rescale to Cave proportions (320×427). Three rounds were driven by
  Jacob's playtest findings. Jacob 1CC'd it (180K, 76/99 speed-kills).
- Arcade stick (8BitDo) support: A/X fire, B/Y bomb, shoulders focus,
  select restart. Design doc + scale explainer in `~/Dev/claude-visualizations/`.

## State

- Repo clean at `2c91549`; all 13 referee checks green after last code change
  (banner fix touched renderer only — sim path unaffected, verified green at r4).
- **Dev server left running on purpose:** `http://localhost:8471`
  (python http.server, PID 25609 — kill: `kill 25609`). Needed because ES
  modules don't load over file://.
- No remote. **Open question for Jacob (workspace convention):** push to
  public GitHub (jacobv25) and/or add to portfolio-site? Game is working —
  ask before doing either.

## Left to do (priority order)

1. **The visual round (r5):** build a screenshot harness (headless Chrome/
   Playwright) so blind critics judge real pixels — S2 visibility, S3 pattern
   readability, S5 section distinctness (playtest 1: "sections maybe not
   distinct enough"), popup/HUD chunkiness post-rescale, boss x-discontinuity
   between phases.
2. Feel-check the r4 trade: hitboxes kept px size on the 2/3 field → collision-
   relative difficulty rose ~1.5x (expert bot now loses 1 life). If it tips
   cheap, levers are bullet radius or hitbox px — referee-supervised round only.
3. Later: sound (Web Audio synthesis, no assets), harder second loop,
   exact section-entry frame logging for the design doc's telemetry chart.

## Next first step

`cd ~/Dev/speedhell && node test/sim.mjs` (confirm green), then build the
screenshot harness as referee infrastructure BEFORE launching r5 builders.

## Gotchas (the hard-won stuff)

- **The referee is sacred:** builders never touch `test/sim.mjs`, `docs/`,
  `evidence/`. Referee changes are made directly (not by builders) and
  committed separately before rounds.
- **The tuning corridor is narrow:** s7_pressure 24.1 vs 24.0, s4 1.73 vs 1.6.
  Never hand-tweak balance without a full `node test/sim.mjs` — RNG-stream
  butterflies flipped checks repeatedly (r3/r4 reports document cases).
- Boss P1 has been exploit-prone three times (milking trap, rail-stall,
  camp-milk). Any P1 change needs the passive-bot "hp remaining at timeout"
  check, not just pass flags.
- All speeds/sizes are now screen-relative in the referee; rubric S1 was
  updated to match. Old absolute px figures in early gauntlet reports refer to
  the 480×640 era.
- Workflow pattern that works: 1 builder (coupled systems = single owner) →
  2 blind critics in parallel with different lenses, `git show <commit>:file`
  for before/after comparisons.
