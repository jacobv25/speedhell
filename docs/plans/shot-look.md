# Plan — Shot look: a bolt, not a rectangle (Lab `shotLook`)

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
