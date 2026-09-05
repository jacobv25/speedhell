# SPEEDHELL — Art Bible

*The drawing rules every builder draws to and every critic grades against.
Companion to `DESIGN_PILLARS.md` (constitution), `CRITIC_RUBRIC.md` (S2 visibility,
S3b boss theatre, S4 enemy design — the referee's acceptance criteria) and
`DESIGN_WIKI.md`. Drafted 2026-09-04 from the visual-design brief; **status: Round 1 built (r57,
branch `art/round-1`, brief in `art-rounds/round-1.md`); Rounds 2–6 open.** Every number below is read from
`src/render/renderer.js` and `src/core/stage.js` as of r51/r52.*

**Scope guard.** Everything here is renderer-only. Hitboxes (`ENEMY_DEFS r`,
`PLAYER.hitR`), the core, `g.rng`, the timeline and the referee do not move.
Rounds that need a design change (Round 3, turrets mounted on landmarks) clear
against both corpora and update the wiki like any other design change.

---

## 0. Where the look is today (audit, r51/r52)

What already exists — do not rebuild these, build on them:

- **Native pixel canvas.** The canvas is `W×H = 320×427` and CSS-scaled with
  `image-rendering: pixelated` (`index.html:12`). The grid exists at the canvas
  level. What breaks it is *inside* the canvas: sprites translate to fractional
  `e.x, e.y`, polygons have non-integer vertices and arbitrary rotation, and
  `arc()` discs are anti-aliased. Edges blur at every scale.
- **Three enemy palette ramps** — `AIR` (blue-grey), `GROUND` (khaki), `HEAVY`
  (dark slate + rust stripe), each shade/base/hi (+ glass / plate)
  (`renderer.js:361–363`). Desaturated by design so bullets own saturation (S4).
- **Bullet contract is right.** Pink rounds: dark rim `#20060f` → pink ring →
  white core = the true 3 px hit circle. Cyan needles: dark rim `#031418` →
  cyan → white core, elongated along velocity. White = what kills (wiki §6.2,
  mirrored pixel-for-pixel in `src/howto.js`). Keep this exactly.
- **Boss has three forms** (P1 winged carrier, P2 flat hull, P3 bare diamond)
  with burn-in at handoffs and three part shapes (`drawEnemy` case 5/6). What
  is missing is *surface*: each form is one flat fill plus a coloured core, no
  shading, outline, panel or module detail — so P2 reads as "a white hexagon".
- **Place identity v1** — per-section `SEC_SLAB/STAR/LAND` tints, one landmark
  slab per section (an inset rectangle), boss arena restain per phase.
- **Hex sprawl.** ~50 distinct colour literals in the renderer, `#ffffff` used
  20 times, a further 11 tints/ramps in fx tables. Colours are not named, so
  every agent that touches the file invents new ones.
- **Animation:** prop flicker on planes (2-frame), heading rotation, item glint
  pulse, invuln blink. No player roll, no thruster, no enemy bank frames.

## 1. Principles (where each rule comes from)

- **Bullets are the top layer and the highest contrast on screen** — rubric
  S2-MUST 1–4; Pillar 6 (readable chaos). Every other rule bends to this one.
- **Hue is threat, value is identity** — ZeroRanger study (`research/zeroranger.md`
  §1). Danger owns whole hues (pink, cyan). Everything else is desaturated and
  differs by silhouette + value step.
- **Big things are slow and strong; small things are fast and weak** — DDP size
  ladder (HOMAGE L7 / `renderer.js:357`); SLYNYRD Pixelblog 31.
- **The place IS the wave** — HOMAGE L1. Backgrounds change identity every
  10–60 s and guns sit on landmarks.
- **Phase = form** — rubric S3b-MUST 2, HOMAGE L3. Silhouette, movement and
  bullet dialect change together.
- **If it harms the player, make it small; if it is the player, draw it big
  around a tiny core** — boghog WS01 (`renderer.js:521–527`).
- **One light, three tones, one rim** — the shmup pixel-art standard (SLYNYRD
  31/32/63): reference → block shapes → colour → light → detail → outline.

## 2. The pixel grid

1. **Snap sprite origins.** `ctx.translate(Math.round(e.x), Math.round(e.y))`
   for enemies, player, items, parts. Bullets too — at 60 Hz a snapped bullet
   does not stutter (arcade hardware never had sub-pixel sprites).
2. **Integer geometry.** Every `fillRect` and every polygon vertex is an
   integer. No `2.5`, no `-1.5`.
3. **Discs are pixel discs.** Replace `arc()` fills on sprites and items with
   pre-shaped integer-radius discs (a tiny table of row spans per radius, drawn
   as rects). Bullets keep `arc()` *only if* the peek shows the rim stays
   crisp; otherwise the same disc table.
4. **Quantised rotation.** `heading()` rotation stays (Booth flag: the nose
   must point where the craft flies) but snaps to 16 steps (22.5°) — Psikyo
   planes bank in fixed steps and the edges stay consistent frame to frame.
   Turret barrels: 16 steps as well.
5. **No anti-aliasing side effects.** No `globalAlpha` on sprite fills (fx
   halos are the exception, alpha-capped). No shadows via alpha offsets
   (the turret drop shadow becomes a solid darker plate colour).
6. **Text on integers**, sizes from the type ladder (§9).

## 3. Palette

One block of named constants at the top of `renderer.js`; **no hex literal
anywhere else in the renderer** (Round 1 replaces the ~50 literals). Values
below are the current ones where they exist — the pass names them first and
retunes second, so the peek can A/B each change.

| Family | Role | Swatches (dark → light) | Rule |
|---|---|---|---|
| `FIELD` | background wash | bg `#0a0c14`; per-section `SEC_SLAB/STAR/LAND` (9 each, r5) | every value ≤ `#2c` per channel; saturation ≤ 30 % — the washed band (S2-MUST-1) |
| `AIR` | popcorn, mid, crosser | out `#2a2f45` · shade `#5c6584` · base `#8d97b4` · hi `#c9d1e8` · glass `#eef1f8` | desaturated blue-grey |
| `GROUND` | turret, riser | out `#2a2816` · plate `#34321f` · shade `#5f5c3e` · base `#9a9678` · hi `#c6c2a2` | desaturated khaki |
| `HEAVY` | diver, elite, midboss, boss hull | out `#22242e` · shade `#474c60` · base `#7a8097` · hi `#aab1c8` · stripe `#8a5a52` | darker slate; rust stripe is the only warm note |
| `PLAYER` | ship, options, player shots | dark `#4a3f78` · shade `#6b5aa8` · edge `#c9bdf5` · hull `#f0ecff` · shot `#c3a8ff` + white | violet is player-only (r5 S2-MUST-3) |
| `ROUND` | pink bullets | rim `#20060f` · ring `#ff4fa3` · core `#ffe6f2` | boss/static/random; pink is bullet-only |
| `NEEDLE` | cyan bullets | rim `#031418` · body `#37d6e0` · core `#e8feff` | aimed; cyan is bullet-only |
| `ITEM` | gold, score popups, receipt values | rim `#0e0c04` · gold `#ffd24a` · glint `#fff6d0` | gold is value-only |
| `FX` | explosions (`FX_RAMP`, `CH_RAMP`, smoke, debris) | as tabled, r8/r52 | draws below bullets; alpha-capped |
| `UI` | HUD, popups, banners | text `#cdd3e8` · dim `#8a8fa8` · value gold · warning pink · white | never a fourth saturated hue |

**Exclusivity (hard rule):** pink and cyan appear only on bullets and boss
cores/parts that fire them; gold only on items/value; violet only on the
player. Enemy bodies never exceed ~25 % saturation. `#ffffff` is reserved for
bullet cores, hit-flash and the player's hull highlight.

**Value ladder (top → bottom):** bullet cores (white) > bullet bodies > player
hull > item gold > enemy `hi` > enemy `base` > enemy `shade` > outlines >
landmark > slabs > stars > field. Any new colour must slot into this ladder
without crossing a neighbour.

## 4. Light and rim

- **Light from top-left**, everywhere, including the boss and the landmarks.
  `hi` goes on top/left edges, `shade` on bottom/right and undersides.
- **Three tones + outline** per sprite: `shade`, `base`, `hi`, and a 1 px `out`
  rim (new per-family swatch above). Cheapest implementation: draw the
  silhouette in `out` at the four 1 px offsets, then the shaded sprite on top.
  Do it once into an offscreen canvas per (type, variant, heading step) and
  `drawImage` it — rims for free and fewer draw calls (S8 budget).
- **Player ship:** dark `out` rim plus a 1 px `hull` light rim on the top edge,
  because it must pop against its own violet shots.
- **Ground family** keeps a solid darker plate under the dome instead of the
  alpha drop shadow (§2.5).
- **Hit-flash** (all fills white for 2 frames) and armour shimmer are
  unchanged; the rim goes white too.

## 5. Bullets

Unchanged contract: dark rim → coloured body → **white = the 3 px hit circle**.
Any change to a bullet's pixels updates `src/howto.js drawBulletCard` in the
same commit (r35 note). Allowed upgrades, subject to the peek:

- Pink round: the existing 0.35 px pulse becomes a true **2-frame flash** of
  the ring (`#ff4fa3` ↔ `#ff8ec4`) — SLYNYRD "flashing improves visibility and
  reads as dangerous". Rim stays 1–2 px.
- Needle: keep the nose taper; add a 1 px bright tick at the tail so the
  travel direction reads from the sprite alone.
- Sizes do not change (graze area and hit circle are tuned, wiki §6.2).

## 6. Size ladder

Hit radii from `ENEMY_DEFS` (`stage.js:22–35`); sprites stay within ~1.2 × r
(renderer rule). Decorative extents (boss wing roots, elite wingspan) may exceed
1.2 × r only where the extra pixels are visibly *not* body (thin wing, strut).

| Role | hit r | sprite span today | target | reads as |
|---|---|---|---|---|
| zako / diver / crosser / riser | 10 | ~20 | 16–20 | fast, weak |
| turret | 12 | ~26 plate | 26 | fixed, aimed |
| mid | 14 | ~30 | 30–32 | bobbing twin-boom |
| elite | 20 | ~44 wing | 44 | slow space controller |
| midboss | 26 | ~60 | 60–64 | flying wing |
| boss | 30 | ~56 body, 84 with wings | 84–110 with modules | the biggest thing on screen |
| part | 7 | ~16 | 16 | speed-kill target |
| player | 3 (hit) | 28 span | 28, unchanged | big ship, tiny dot |

## 7. Background

Three layers already exist; the rules make them read as depth:

1. **Far — stars** (`bgScroll × 0.4–1.0`): 1–2 px, `SEC_STAR`. Stays.
2. **Mid — terrain slabs** (`× 0.25`): become *shapes* with a top-lit edge
   (1 px `hi` line on the top edge, `shade` on the bottom), not flat rects.
3. **Near — landmark** (`× 0.55`, one per section, `SEC_LANDGEO`): a structure
   with a silhouette (deck + towers, dam face, hangar) drawn in 3 tones from
   the `FIELD` band, not an inset rectangle. This is the surface Round 3
   mounts turrets on (design change; HOMAGE L1, R7).

**Washing rule** (S2-MUST-1, SLYNYRD 63's −20 sat / −15 contrast / +15
brightness on distant layers): every background swatch stays inside the
`FIELD` band above. A landmark may be *large*; it may never be *bright*.
Per-section hue (r5) and the boss restain (r6) stay.

## 8. Animation floor

| Thing | Today | Floor |
|---|---|---|
| player ship | static, invuln blink | 3 roll frames (centre / left / right by `vx` sign), 2-frame thruster; How-To card mirrors the centre frame (r35) |
| popcorn / mid / elite | 2-frame prop, heading rotate | keep; add bank = roll frame when heading step ≠ 0 |
| turret | barrel aims | keep; 2-frame muzzle blink on fire (renderer reads `g.sfx` ring or a `firedAt` if core exposes one — else skip) |
| items | glint pulse | keep |
| boss | burn-in on handoff | idle hover (`sin(frame)` ±1 px), 2-frame engine glow |
| explosions | Lab: classic / bloom / heavy / chunky | settle per Jacob's verdict (Round 5) |

All animation keys off `g.frame` or `g.fxRng` — never `g.rng` (r28 lesson).

## 9. Type ladder and screens

Monospace only (`bold 26` WARNING · `bold 21` banners · `bold 15` big popups ·
`bold 14` score · `11` HUD/popups · `9` footnotes). Gold = value, pink =
warning, `UI.text` for everything else. Title, receipt (HOMAGE L4) and
game-over are Round 6: same palette, same rim rules, the receipt is the
screenshot players post.

## 10. Boss as forms (Round 2 spec)

Keep the three forms and the burn-in. Each form is assembled from **modules**
drawn with §4 rules: hull (3 tones + rim + 1 px panel lines in `shade`),
two turret groups (GROUND dome recipe, smaller), engines (2-frame glow in the
form's core colour). Parts (type 6) inherit the module they sit on, so
destroying one visibly amputates it (S3b-MUST 4). P2 in particular needs
panel lines, a raised spine and engine nacelles so it stops reading as a
hexagon. Core colour per phase stays (pink / cyan / gold) — the only place
bullet hues appear on a body, because that body fires them.

## 11. Process

- **Peek before hand-off.** `tools/peek.mjs` + `tools/enemy-gallery.html`
  (every sprite, every variant, hit-flash, player, focus) and a stage peek at
  s2 / s4 / s8-P2 / max-load. Screenshots go in the round's brief, not in
  `evidence/` (referee-owned).
- **Gauntlet:** one builder per round, two blind critics grading against this
  file + S2 / S3b / S4. Max three rounds per surface; Jacob is the brake.
- **Mirror rule:** ship or bullet pixels change → `src/howto.js` same commit.
- **Perf gate:** S8 max-load stays ≤ 16.6 ms; offscreen sprite caches are the
  intended way to *add* rims without adding draw cost.
- **Bump `BUILD`** per round; wiki changelog line per round (renderer-only
  rounds say so explicitly).

## 12. Open questions (for the Round 1 builder and critics)

*Round 1 answers (r57, see `art-rounds/round-1.md` for the peeks):* (1) pixel
discs — the rim reads crisper at 3–6× and the exact r20 radii survive because
the span table takes fractional r; arc() is gone from every sprite. (2) 16
steps shipped in r57; Jacob's playtest (2026-09-04): "the small enemies do seem
a bit wobbly" — the popcorn's ±20° sine wobble snapped across 2–3 steps. r58
moved to **32 steps** (`STEPS` in `renderer.js`), the named fallback; pixel look
and the bullet flash were approved as-is.
(3) cache is lazy per key (type × phase × side × step × prop × hit × flick ×
extra); a full run populates a few hundred ≤100 px canvases, and max-load
draw fell 1.99 → 1.43 ms. (4) per-family `out`, as recommended.

1. Bullet discs: `arc()` vs pixel-disc table — does the crisp rim beat the
   smooth circle at 2–3× scale? Peek both.
2. 16-step rotation vs smooth: does the popcorn wobble (`sin(age)`) look
   worse quantised? Try 16 and 32.
3. Offscreen sprite cache: per (type, variant, step) is ~7 types × ≤4 variants
   × 16 steps — fine — but hit-flash needs a white variant (×2). Measure.
4. Outline colour: one `out` per family, or one global near-black? ZeroRanger
   uses per-ramp darkest step. Start per family.

## Rounds (from the brief, ranked by impact)

1. **Art bible + pixel grid + palette + rims** — this file's §2–5. Renderer-only.
   **Built: r57** (`art-rounds/round-1.md`).
2. **Boss forms** — §10. Renderer-only.
3. **Stagecraft** — §7 + turrets on landmarks. *Design change.*
4. **Motion** — §8. Renderer-only (+ How-To card).
5. **Explosions** — Lab verdict. Renderer-only.
6. **Screens** — §9. Shell + renderer.

## Changelog

- 2026-09-04 — Draft written from the visual-design brief (claude-visualizations
  `2026-09-04-143500-speedhell-visual-design-brief.html`). Audit corrects two
  claims in that brief: bullets *do* carry dark rims + white cores (the
  contract is right, the rims are just thin on a near-black field), and the
  boss *does* have three forms (the missing thing is surface, not silhouette).
- 2026-09-04 — r57: Round 1 built to §2–5 (renderer-only). Deviations noted in
  the brief: needles keep smooth rotation (§2.4 exception — aimed direction is
  the telegraph); boss hull keeps its r56 light-grey until Round 2 retunes it
  into the HEAVY ramp; the focus dot's pink rim stays (wiki §6.2 contract, a
  sanctioned non-bullet pink alongside WARNING).
- 2026-09-04 — r58: heading steps 16 → 32 after Jacob's playtest verdict on the
  popcorn wobble (§12 Q2). Pixel look and 2-frame bullet flash approved.
- 2026-09-05 — r60: skins. The renderer now delegates palette / background /
  painters to `src/render/skins/<id>.js`; §2–5 remain the rules every skin
  obeys (the renderer enforces the grid, rims and bullet contract for all of
  them). Four concept directions built in parallel; see
  `art-rounds/skins-brief.md`. Round 2 (boss forms) will be built INSIDE the
  winning skin.
