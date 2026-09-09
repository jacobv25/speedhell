# Plan — Shot look: a bolt, not a rectangle (Lab `shotLook`)

## Verdict r77

**Jacob (2026-09-09): "heavy is obviously the best."** Shipped as THE shot in
r77 — `heavy` became the constant (`renderer.js` `drawShots`), `current` and
`bolt` were deleted with the Lab row, the impact blob + up-sparks are
unconditional in the hit block (`fxRng` only), the hit click is always on, and
the HOW TO card shows the bolt (`drawShot`). Record: wiki §10 r77, Q22 DECIDED,
changelog 2026-09-09. Peeks `docs/img/r77-shot.png`, `docs/img/r77-howto-card.png`.
The sections below are the plan as it was built (r75, r76).

*Written 2026-09-09 for a builder agent. Branch: new `feat/shot-look` from
`main` (r73). Jacob: "the shot feels like a pea shooter. Not so much the DPS
but visually, it looks like a simple rectangle being fired." Read `CLAUDE.md`,
`docs/ART_BIBLE.md` (§2 pixel grid, §3 palette/value ladder, §5 bullets,
§6 size ladder), `docs/DESIGN_WIKI.md` §6.2 (display contract) + §8 Q22 + §10
+ changelog tail, `docs/BOGHOG_WORKSHOP.md` "Player shots" + follow-through,
`docs/research/explosion-and-weapon-feel-2026-09-04.md` (§ "every hit is
answered", option 2), `src/render/renderer.js` (the pBullets loop ~185, the
r35/r57 ART-CHANGE NOTE about `src/howto.js`), `src/core/game.js` (player
fire ~442, the hit block ~485–500 with its fx spawns on `g.fxRng`, the r52/r53
`g.fxStyle`/`g.fxMeta` mirror pattern — now `g.fxMeta` only), `src/main.js`
(the `renderPrefs` mirror line), `src/lab.js`, `src/audio.js` (`SFX.SHOT`).*

## Exact result

Lab row `shotLook`: `current` (default; today's 4×20 rect + 2×18 white core)
/ `bolt`. With `bolt`:
1. **The bolt.** Same footprint (fast, tall — rubric S1), same colour family
   (the skin's `SHIP.shot` edge + white — S2: never an enemy hue), but drawn
   as a pixel bolt: a bright 3-px head, a 1-px darker rim, the body tapering
   to a 2-px tail, plus a 6–8 px fading trail behind it (two ghost frames at
   the bolt's previous positions, alpha stepped, integer-snapped; bible §2).
   Boghog: "thick, detailed, juicy… always check in motion".
2. **Muzzle flash.** 2 frames on the ship's nose per volley: a 5×3 white
   flash frame 1, 3×2 frame 2. Shell-side: `main.js` sets
   `renderPrefs.muzzleAt = g.frame` when it drains `SFX.SHOT`; the renderer
   draws from that. No core change for this.
3. **Impact blob** ("every hit is answered", research option 2): an opaque
   flare at the contact point, 3 frames, sized by shots landing on that enemy
   this frame (1 hit → 4 px, 2 → 6 px, 3+ → 8 px — point-blank reads as a
   beam). This is a core fx spawn on `g.fxRng` (a new `FX.BLOB`-style kind or
   reuse FX.CORE with a short life), gated by a mirrored flag `g.fxShot`
   exactly like `g.fxMeta` (main.js mirrors the pref each frame; default 0 →
   byte-identical spawns). Never on `g.rng`.
4. Ship-shot alignment: nothing moves; hitboxes, speed, cap, damage untouched.

## Non-negotiable constraints

- `git diff --stat src/core` may contain ONLY the gated fx spawn in the hit
  block + the `g.fxShot` field (+ its comment). No `g.rng`. Control sim
  (`node test/sim.mjs` then `git checkout -- evidence/`): every bot outcome,
  score, frame count and the determinism string identical to HEAD.
- Never edit `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`.
- S2 display contract: the bolt never masks a bullet core; draw order
  unchanged (player shots below enemy bullets as today); value contrast per
  bible §3 (check with the B&W screenshot test the research names —
  `tools/peek.mjs` a stage panel, desaturate, the bolt must still read).
- `src/howto.js` bullet card stays as is while this is a Lab row (note it in
  the wiki; the card follows the winner when Jacob decides).
- Row off = pixel-identical to today: prove it with a `tools/artpeek.html`
  peek before/after (the beat-pulse branch's diff approach: zero pixels
  outside timing labels).
- BUILD **r75** (r74 = feat/stem-layers); wiki §10 entry + changelog citing
  WS05 player shots, follow-through, DOJ "weapons visually huge / every hit
  answered", S1/S2; open Q22 gets a "built r75, Lab" line.

## Tests / acceptance

- Control sim identity (above). `node test/shell.mjs` PASS; row only with `?lab`.
- Peek sheets: `docs/img/r75-shot-current.png` and `r75-shot-bolt.png` from
  a stage panel mid-volley (artpeek or fxpeek with `?shot=bolt` support), plus
  a 4× crop of one bolt + trail + muzzle + impact blob.
- Draw time at max load unchanged within 0.1 ms (report both).

## Recap format for Jacob

Files touched (core diff pasted verbatim); the two PNGs; draw time; BUILD;
wiki sections changed; what only eyes in motion can judge.

## r76 heavy (built 2026-09-09, same branch)

Jacob on r75: "better but still a pea shooter." Third choice `heavy` on the
same Lab row = `bolt` + the six recipes of
`docs/research/player-shot-juice-2026-09-09.md` in the frame study's revised
order (§8). `current` and `bolt` untouched (0 differing pixels, shotpeek
before/after). Values as shipped (starting points for Jacob's play, not
verdicts):

1. **Muzzle** (`drawBoltsHeavy`, `FLARE_ROWS`, `flareSprite`): a flame per
   barrel, 10×12 px with its rim — rows tip→base 2/4/4/6/6/8/8/8/6/4 wide,
   white core inside a `SHIP.shot` edge inside a `SHIP.shade` rim — base on the
   barrel mouth (x±7, y−12); 4 frames: 10×12 → 10×12 licked (fatter base) →
   8×8 → 4×5. Alternates barrels per volley: `main.js` stamps
   `prefs.muzzlePrev` and toggles `prefs.muzzleSide` on `SFX.SHOT`; the
   previous volley's flare finishes on the other barrel. Follows the invuln
   blink; play state only. Drawn last of the shot pass, still under enemy bullets.
2. **Bolt + echo + trail** (`HEAVY_ROWS`, `heavySprite`): 6×28 — 2-row rim
   tip, 4-row 4 px white head in a 1 px `SHIP.shade` rim, 12-row body (violet +
   white spine), 4 rows narrowing, 2 rows of 2 px body, 4-row 2 px tail; drawn
   at dy −10…17 so the head sits where the r75 head sat. Echo: the same sprite
   at y+32 (4 px behind the tail), alpha 0.5. Trail: four 3×4 ghosts at y+50,
   +54, +58, +62, alpha 0.6 / 0.4 / 0.25 / 0.12. Bolt, echo and ghosts are
   clipped above the barrel line (py − 12). Width 6 (the study says width is
   optional; the 4 px head asked for it).
3. **Messier stream**: ±1 px x-jitter per bolt from a hash of the frame it was
   first seen + its barrel (`BOLT_STATE` WeakMap on the pooled object — a new
   bolt is recognised by `b.y === p.y − 10 − 9` or by y jumping down on slot
   reuse); the right rail is drawn 9 px (one frame) behind the left. Draw only;
   `b.x`/`b.y` untouched.
4. **Layered impact**: core — inside the existing `if (g.fxShot)` gate, life
   `heavy ? 7 : 3` (seven = six drawn frames) and two `FX.SPARK` kicked up
   (angle 3.6–5.8 rad, speed 1–2.5, life 6–12, `FAM.WHITE`), all `g.fxRng`;
   renderer pass 3 — diameters `[8, 6, 4, 3, 2, 1]` by drawn frame at the 3-hit
   size, scaled by hits (`round(d · size / 4)`, min 1), odd sizes as centred
   squares, 1 px `FX_RAMP[0][3]` rim; a 1 px `SHIP.dark` scorch dot at the
   contact offset riding the enemy for 10 frames (`SCORCH` list, ≤ 64,
   dropped when the enemy is gone or its pool slot reused; drawn from
   `drawScorch` at the top of `drawFx`, under every fx). Hit-flash: core field
   `e.flash`, already 2 frames — left as is.
5. **Hit-sound weight** (`audio.js`): `setHitWeight(on)` from the Lab row;
   `SFX.HIT` keeps the 300→120 Hz triangle tick (0.04 s, 0.18) and adds a
   25 ms 150 Hz sine at 0.09 (−6 dB) once per `drain()` call (one per frame).
6. **Shimmer**: two cached sprites (`heavy0` 1 px spine, `heavy1` 2 px), chosen
   by `g.frame & 1`.

Core diff vs r75: the gated block only. Control sim identical to HEAD
(determinism `7022:81960:144:0:-1`, evidence/ untouched). Draw time (artpeek
max-load, three runs): current 1.66–1.70 ms, bolt 1.74, heavy 1.78–1.79.
Sheets: `docs/img/r76-shot-heavy.png`, `docs/img/r76-shot-three.png`
(`tools/shotpeek.html?shot=three` — three games in lockstep, one frame),
`docs/img/r76-shot-heavy-bw.png` (`&bw=1`, the black-and-white check). BUILD
r76. `src/howto.js` untouched.
