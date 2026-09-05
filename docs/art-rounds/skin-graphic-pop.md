# Skin — graphic-pop (r60 art round)

Persona 5 / Jet Set Radio poster graphics. One file: `src/render/skins/graphic-pop.js`.
Peek sheet: `docs/img/r6x-skin-graphic-pop.png` (gallery 4x + four stage moments).
**Max-load draw: 1.65 ms** (budget 16.6 ms; `post` is two fills).

## What came from each sheet

- **`enemies.jpg`** — the whole enemy language: flat slate-grey bodies, ONE warm-red
  slot each, mustard ticks at wingtips/trim, and a hard black offset shadow behind
  every craft (drawn as a solid ink silhouette at +2/+3, never alpha — bible §2.5).
  Craft taken one-for-one off the lineup: dart → **fighter**, swept wedge → **diver**,
  thin lance → **crosser**, capsule with fin-pods → **riser**, twin outboard pods →
  **mid**, tank block → **turret**, gull-wing with mustard tips → **elite**,
  concentric-eye kite → **midboss**. The sheet's jagged black shards + halftone
  ground became the background's band and dot layers.
- **`boss.jpg`** — three forms, three silhouettes: **A** carrier (bone spine, swept
  wings, four detached red module pods, mustard wing bands), **B** wedge (grey face
  plate, fold lines, red modules at the shoulders and base, core hex), **C** blade
  cross (four white blades with red tips around a bare core). Burn-in on handoff
  restains hull + modules to ember.
- **`backgrounds.jpg`** — one landmark fortress per section, drawn as a flat
  silhouette with a cut-out and a single accent line: bunker deck, radar dish tower,
  gun keep, dam face, hangar, mast cluster, bridge span, reactor drums, gate. Each
  section also gets its own stain / dot / band / landmark / accent value set.
- **`ship-logo.jpg`** — violet-and-white cut-out delta: white hull spine, white
  chevrons on violet wings, violet canopy, white nose tip, hard offset shadow.
  28 px span, no dot (the renderer owns it).

## What I changed, and why

- **Gold stays value-only.** The sheet's boss core glows gold; here the core is
  mustard ring → red hot → white pip. Gold on a body would read as an item (bible §3).
- **Boss cores/parts.** Pink/cyan/gold appear only as the 4 px emitter pip on boss
  parts — base.js's sanctioned exception. Nothing else on any body is pink or cyan.
- **Red is an accent, not a fill.** First pass had a red turret skirt + red dome and
  a red midboss eye that ate half the sprite; both were cut back (skirt = a band on
  the tracks, eye = 4 px). Two saturated hues on enemies (warm red, mustard), violet
  on the player — under the S2 cap.
- **Shadows are drawn in screen space** (translate, then rotate) so the light stays
  top-left however a craft banks; they are skipped on the hit frame so the white
  flash silhouette stays clean.
- **Halftone via a cached 6/8 px tile pattern**, two `fillRect`s, instead of ~2000
  dot rects. `post` = one halftone plate at α 0.05 + one drifting diagonal band at
  α 0.045, both dark, so nothing on the bullet layer loses contrast.
- Background layers all darken relative to the stain (ink bands, ink halftone), so
  the field can never out-contrast a bullet even where a landmark is large.

## Deviations from the rules (explicit)

1. **Three "families", one palette.** `AIR` / `GROUND` / `HEAVY` keep their contract
   names but are the same slate ramp at three values — identity comes from
   silhouette + accent placement, not family hue. That is a departure from the
   bible's blue-grey / khaki / slate split, and is the point of this direction.
2. **The riser's exhaust plume reaches y = −15**, past the 1.2 × r guide, exactly as
   the base skin does (thin, visibly not body).
3. **`UI` is base's, retuned only in value** (text/score slightly cooler, HUD backing
   darker). HUD layout is the renderer's, not mine.

## Look at these first

- **Turret and midboss red budget** — they were the two that ran hot; say if the
  skirt/eye now read too timid at native scale.
- **The p2 stage moment shows the boss mid hit-flash** (harness catches `flash > 0`),
  so form B's modules aren't visible there — see the gallery/forms instead.
- **Popcorn variants under rotation**: fighter vs diver at 11.25° steps is the
  tightest read on the sheet.
- **Background warmth in s2 / s5** (olive stains) — in-band by value, but it is the
  warmest the field gets.
