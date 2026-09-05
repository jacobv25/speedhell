# Art skins — builder brief (r60)

*Jacob, 2026-09-05: "i want to see all four implemented … four agents implementing
the art in those styles. and then ill play through them and see how they feel."*
Four builders, one skin each, in parallel, on branches `art/skin-<id>` off
`art/skins`. Merge → one playtest build with a Lab row (`?lab=skin:<id>`).

## The contract

Your skin is ONE file: `src/render/skins/<id>.js`. Read `skins/base.js` first —
its header is the interface, its body is the reference implementation (the r58
look). Export the same shape: `{ id, name, pal, span, rimOf, drawBackground,
paintEnemy, paintShip, paintItem, post }`. The renderer (`src/render/renderer.js`)
caches, alpha-thresholds, rims and places every sprite; you only paint.

Reference sheets: `docs/concepts/2026-09-04-<id>/` (enemies, boss, backgrounds,
ship-logo). They are inspiration, not assets — nothing from that folder may load
in the game. Read the images; translate them into code-drawn shapes.

## Hard rules (a violation fails the round)

1. **Only your skin file changes.** No core, no renderer, no bullets, no hit dot,
   no hitboxes, no `test/`, no `evidence/`, no rubric. The registry already has
   your entry.
2. **Bullets and the dot are not yours.** Pink rounds / cyan needles / the 6px
   white dot are the display contract (wiki §6.2). Hot pink and cyan therefore
   stay OFF enemy bodies and backgrounds; gold is value only.
3. **Readability first** (rubric S2, Pillar 6): the background stays in the washed
   band (dark, low contrast — a landmark may be large, never bright); enemy bodies
   read below bullet contrast; ≤ 3 saturated hues on screen besides the bullets.
4. **Size ladder** (bible §6): sprites within ~1.2 × hit radius — zako 10, mid 14,
   turret 12, elite 20, midboss 26, boss 30, part 7; ship ~28px span. Every enemy
   TYPE and popcorn VARIANT (fighter / diver / crosser / riser) must be distinct
   in silhouette at native scale (320×427 field). Boss: three forms, three
   silhouettes, visible modules; parts (type 6) look like pieces of it.
5. **Hit-flash** (`hit`) ⇒ every fill white. Armor shimmer (`flick`) ⇒ a dim flat
   fill. Keep both.
6. **Pixel grid** (bible §2): integer geometry; no `globalAlpha` on sprite fills;
   discs via `K.disc`. Rotation for flying types is `ctx.rotate(step * K.STEP)`.
7. **Perf**: the `post` pass, if any, is alpha-capped overlays only and the
   max-load draw must stay ≤ 16.6 ms. The orchestrator measures it on the peek
   sheet (`tools/artpeek.html?skin=<id>`); budget ≈ 2 ms for post.
8. **Determinism**: never touch `g.rng`. Animate off `g.frame` only.

## Deliverables

- `src/render/skins/<id>.js`, complete, `node --check` clean.
- `docs/art-rounds/skin-<id>.md`: what you took from each sheet, what you
  changed and why, deviations from the rules stated explicitly, and anything you
  want the critics to look at first. Keep it under a page.
- Do NOT commit; the orchestrator reviews the peek sheet, runs the gate, and commits.

## Style notes per direction

- **cute-occult** — skull faces, candle spikes, moth wings, sigils; bone-white on
  deep purple with dried-red accents; candle gold is fine on enemies as a warm
  note (it is not value gold: keep it duller than `ITEM.gold`). Boss = the eye
  reliquary in three forms. Background: candles, hanging chains, sigil circles —
  all in the washed band.
- **neon-vector** — glowing wireframe on near-black. Draw shapes as 1–2px bright
  outlines with darker translucent-looking fills (use solid dark fills, no alpha);
  one hue per enemy TYPE; the rim colour IS the glow. `post` may add a subtle
  additive bloom by re-drawing nothing heavier than a capped-alpha vignette/grid.
  Background: perspective grid + faint wireframe landmarks.
- **synthwave** — world palette indigo / violet / burnt orange / sunset gold.
  Background: gradient sky band, sun, grid floor, palm/skyline silhouettes,
  landmarks as chrome-lit blocks; scanlines in `post` at ≤ 0.12 alpha. Enemies:
  chrome military craft with warm engine glow; ship violet/white stays.
- **graphic-pop** — flat graphic shapes, hard black shadow offsets, one warm-red
  accent per enemy, mustard details; halftone/diagonal bands in the background
  and `post` (alpha-capped). Enemies slate grey; the boss reads as a poster
  silhouette with red modules.
