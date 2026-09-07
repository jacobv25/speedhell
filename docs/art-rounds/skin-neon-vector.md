> **Retired r64 (2026-09-07).** Jacob picked cute-occult after playing the four r61 skins; this skin's code was removed from `src/render/skins/`. This brief and `docs/img/r6x-skin-neon-vector.png` remain as the record of what was built.

# Skin: **neon-vector** (r60 art round)

One file: `src/render/skins/neon-vector.js`. Peek sheet: `docs/img/r6x-skin-neon-vector.png`.
Nothing else in the repo changed.

## How the glow is built

No alpha is used anywhere on a sprite fill (bible §2.5). Every body is drawn twice:
the polygon filled in its type's **bright line hue**, then an `inset()` copy of the same
polygon filled in **near-black ink**. What survives between them is a 1–2 px wire stroke.
The renderer's `rimOf` rim — the same bright hue — lands 1 px outside that band, so the
silhouette edge reads as a 2–3 px glowing line. That is the brief's "the rim colour IS the
glow", done without a single translucent pixel. Interior structure is 1 px bright rects and
wedges over the ink. `inset()` returns rounded integers, so the whole thing stays on the grid.

## What came from each sheet

- **enemies.jpg** — the family read: glowing outline, dark interior, one hue per craft,
  black field. Specific lifts: the *long green dart* → the crosser; the *horned purple
  craft* → the diver's twin forward prongs; the *blue segmented three-column ship* → the
  mid's three-boom silhouette; the *orange stepped turret* → the turret, redrawn top-down as
  a neon emplacement ring with a barrel that reaches past it; the *yellow-green broad wing*
  → the midboss manta.
- **boss.jpg** — the three forms map straight onto the three phases: **P1** the winged
  carrier with two detached drop pods; **P2** the module fortress (five module octagons ringing
  one big core); **P3** the bare diamond with two raised arms. Modules are visible on all
  three, and the type-6 parts are literally pieces of the current form (pod / module octagon /
  arm-segment diamond).
- **backgrounds.jpg** — wireframe landmarks, structure-not-mass, deep in the wash. Nine of
  them, one per section: comms platform, twin towers, gate wall, hangar corridor, launch ring,
  bridge span, reactor, skyline blocks, citadel. Each is drawn as hollow frames/loops, never
  a solid slab.
- **ship-logo.jpg** — the violet delta: long nose, notched swept wings, bright spine, long
  wing spars running nose-to-tip. 28 px span; the renderer still owns the dot.

## What I changed, and why

- **One hue per enemy TYPE, not per variant.** The enemies sheet gives each popcorn variant
  its own colour; that would put 4–6 saturated hues on screen at once and break S2/rule 3.
  Popcorn is one lime family and the four variants separate by **silhouette only**: swept delta
  (fighter) / deep twin fork (diver) / long thin needle-wing dart (crosser) / squat wingless
  capsule (riser).
- **Elite is steel, not purple.** The sheet's elite is violet; bible §3 makes violet
  player-only. Steel `#a8bcdc` is desaturated on purpose, which also buys hue headroom: on a
  busy screen the saturated count is popcorn lime + turret amber + mid azure = 3.
- **Boss forms are ice → amber → hot steel**, not the sheet's violet, for the same reason.
  Boss cores keep the sanctioned emitter hues (pink / cyan / gold) — the one place those
  colours may touch a body.
- **Background is a perspective floor grid**, not the sheet's static room: depth rows on a
  geometric `q^k` ladder plus rays converging to a vanishing point above the field, scrolling
  toward the player. It keeps the vertical-scroll read that a tunnel/room would fight.
- **Turret redrawn top-down.** The sheet's ziggurat is a 3/4 view; from above it became
  concentric neon geometry. First attempt (two nested octagons, 2 px wire) read as a snail
  shell — now it is one open ring, four dim spokes, a small dome and a long thin aimed barrel.
- **Wire width tuned down.** 2 px wire + 1 px rim on a 20 px popcorn left almost no ink core.
  Small sprites are 1 px wire; only elite/midboss/boss bodies use 2 px.

## Deviations from the hard rules — stated explicitly

1. **Rule 3, hue count.** Normal play holds at three saturated hues (lime / amber / azure) plus
   the desaturated steel elite. When the **midboss** is on screen its chartreuse is a fourth
   saturated hue for that fight. I judged giving the midboss its own presence worth it; if
   critics disagree the cheapest fix is folding the midboss into the elite's steel.
2. **`HEAVY.stripe` (`#ff8a4a`)** paints two tiny chevrons on the elite and recolours the
   angry turret's dome — bible §3's "rust stripe is the only warm note", carried over from base.
3. **Rule 4, decorative extent.** Elite wing (±23) and boss P1 wings (±44) exceed 1.2 × hit r,
   as base does; bible §6 allows it for thin wing/strut pixels.
4. Everything else is inside the rules: no core/renderer/bullet/dot/test/evidence change, no
   `globalAlpha` on a sprite fill, `K.disc` for every disc, integer geometry, `g.frame`-only
   animation, hit ⇒ every fill white, flick ⇒ one dim flat wire set, span table unchanged.

## Perf

Peek sheet (headless Chrome, 60-frame mean of `draw()`):

| scene | draw |
|---|---|
| s2 turret alley | 0.53 ms |
| s4 midboss | 0.34 ms |
| boss P2 | 0.02 ms |
| **max-load (b=1026)** | **1.70 ms** |

Gate is ≤ 16.6 ms. `post` is a single cached radial-gradient vignette (capped at
`rgba(0,0,0,0.32)`) — one fill per frame, well inside the ~2 ms post budget. Sprites are all
cached by the renderer, so the two-fill wire construction costs nothing per frame.

## What critics should look at first

1. **Popcorn variant read at native scale** (s2 / s4 panels, not the 4× gallery). Fighter vs
   diver is the tightest pair — is the fork enough at 20 px, in motion, rotated?
2. **The midboss's chartreuse** — deviation 1. Too loud next to lime popcorn?
3. **Bullets still brightest** in the max-load panel. I believe yes (white cores over dark
   ink bodies), but this is the S2 call that matters most.
4. **Boss P3's arms.** They are thin by design (bare, stripped-down final form); check they
   don't read as antennae rather than weapon arms. Note the peek's P2 panel catches the boss
   mid hit-flash (all white) — that is a harness timing artifact, not the skin; the three
   forms were verified separately in a throwaway gallery.
5. **Landmark visibility.** They are deliberately deep in the wash (`≤ 0x2e` per channel) and
   may read as too faint on a bright monitor.
