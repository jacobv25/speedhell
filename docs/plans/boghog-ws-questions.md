# Plan — two boghog WORKSHOP questions: aim quantization (Q18) and the small-hitbox trade (Q19)

*Written 2026-09-08 for a builder agent who will create the experiments. Read
`CLAUDE.md` first (design-change rules, wiki, BUILD, referee files), then
`docs/BOGHOG_WORKSHOP.md` (WS01 hitboxes, WS03 aim), `docs/DESIGN_WIKI.md`
§6.2 (display contract), §6.3 (castes), §7 (referee), §8 Q15/Q18/Q19, §10
(Lab — and its rule that core knobs are Booth VARIANTS, not Lab rows),
`src/core/patterns.js` (`aimAt`, `leadAngle`, `fire`), `src/core/game.js`
(`g.tune`, collision block ~L525–548), `src/lab.js` + `src/main.js` `beginRun`
(the r70 `bossHp` run-start tune-knob precedent), `src/booth.js` (VARIANTS),
`test/bot.mjs`, `test/sim.mjs` (read-only), `src/render/renderer.js`
(`STEPS`, `drawPlayer`).*

Both questions are **core** changes: they move bullet trajectories or the
collision numbers, so every certified referee run diverges the moment they are
on. Therefore:

- They ship as **`g.tune` knobs that default to today's values**, read once
  at run start. Per the §10 r70 amendment a tune knob may live in the Lab when
  it is read at run start, never live, and stamped like every other row — so
  build them as **Lab rows in the `bossHp` pattern** (`lab.js` row with
  `apply: () => {}`; `main.js beginRun` copies `labGet(id)` into `g.tune`
  AFTER `startRun`, which rebuilds `g`). Add matching Booth VARIANT chips
  (`booth.js:91`) only if the Booth pass needs them; the Lab link is the
  shareable configuration.
- With every knob at default, `node test/sim.mjs` must reproduce
  `evidence/metrics.json` byte-for-byte. Run HEAD as the control first.
- **No verdict is taken in this pass.** Standing condition: boghog
  pass-cooldown — settle the current pass (design/ship-b, r69) in playtest
  before opening another. This plan builds the switches and the numbers;
  Jacob decides after. Scoring/collision rules are Jacob's decisions.
- Take the next free build number: check `src/version.js` and the wiki
  changelog before claiming it (r70 = boss hp Lab experiment, landed
  2026-09-08; design/ship-b holds r69; two sessions share the tree).

---

## Q18 — Quantized aim ("the enemy leads its shots")

### The question
WS03: in arcade games aimed fire is limited to the sprite's rotation frames
(8 frames → 8 directions), which makes aimed attacks feel less predictable
and reads as the enemy *leading* the player. SPEEDHELL aims with exact
`atan2` (`patterns.js:29`): every aimed shot is a perfect snapshot of the
player's position at fire time. Does snapping aim to N bins make stage-section
fire feel more alive without making it unfair or opaque?

### Corpus clearance (state this in the wiki entry)
- **Boghog** [WS03] is the source. [WS02] "keep it predictable — a bullet
  language" pushes back: the bins must be a *readable* rule (a needle still
  points where it flies — S2 SHOULD "elongated in travel direction" already
  holds because needles draw from their velocity, `renderer.js:201`).
- **Boghog** [T2] "deliberate anti-readability tools — use knowingly,
  sparingly": quantization is one of these. It belongs on the stage's no-lead
  grammar, not on top of the boss's led fire, or the boss gets two
  unpredictability layers at once.
- **Mark MSX**: skill expression and natural meta — bins give misdirection a
  *discrete* structure (you must cross a bin boundary to move a shot; a
  one-pixel shuffle no longer changes anything), which is a learnable
  technique, not noise. Pushback: anything that reads as random punishment is
  beginner-hostile *and* expert-hostile; with too few bins (8) the error at
  range is far larger than a hitbox and the fire stops being "aimed" at all —
  that is opaque, and Pillar 2 rejects opaque.
- **Wiki §6.3 / rubric S2 (r59)**: a needle means "a real gun has you". A
  quantized needle that visibly misses a stationary player breaks that
  promise. Hence the bin count must keep aimed fire lethal to a *standing*
  player at typical ranges (see numbers).
- **Wiki §5 / S3b**: led aim is boss-only dialect (`leadAngle`, `ledFan`,
  `lanceVolley` with `vLead`). Quantization must not touch `leadAngle`
  (option A) unless Jacob explicitly asks for option B.
- **Art bible / renderer**: `STEPS = 32` (`renderer.js:136`) — enemy sprite
  headings are already snapped to 32 steps (11.25°); r57 tried 16 and it read
  as jitter, r58 went to 32. Matching aim bins to `STEPS` is the literal
  arcade rule (fire directions = rotation frames) and makes the sprite an
  honest telegraph of the shot.

### Mechanism
1. `g.tune.aimBins = 0` (0 = exact, shipped). Add to the `tune` literal
   (`game.js:72`) with a comment citing Q18.
2. In `aimAt` only: if `g.tune.aimBins`, return
   `Math.round(a / step) * step` with `step = 2π / bins`. Deterministic, no rng.
   `leadAngle` untouched (option A). Note `ledFan` mixes `aimAt` (even
   needles) with `leadAngle` (odd) — under option A the boss's *direct* half
   snaps; record that in the wiki entry, or exempt boss emitters via
   `g.emitter` (the r59 needle-tier pattern at `patterns.js:24`) if Jacob
   wants the boss fully exact. Default to exempting the boss: stage grammar
   only.
3. Lab row `aimBins` (label "enemy aim (next run)", ref "wiki §6.3 / open
   Q18"): `exact (current)` · `32 steps (= sprite)` · `16 steps` · `8 steps
   (arcade)`. `main.js beginRun`: `g.tune.aimBins = +(labGet('aimBins') || 0)`.
4. Stamp: Lab rows stamp receipts and hi-score rows automatically; the Booth
   sends `tune: g.tune` with recordings (`booth.js:64`) — verify `aimBins`
   shows in one recording.

### Numbers to start from
Lateral miss of a snapped shot at distance d is up to `d · tan(step/2)`:

| bins | step | max lateral error at 150 px | at 300 px | reads as |
|---|---|---|---|---|
| exact | 0° | 0 | 0 | snapshot (today) |
| 32 | 11.25° | 14.8 px | 29.5 px | slight lead; = `STEPS` |
| 16 | 22.5° | 29.8 px | 59.7 px | visible lead; r57 art verdict was "jitter" |
| 8 | 45° | 62 px | 124 px | Space-Invaders era; needle promise broken |

Kill dot is r 6 (3 + 3). 32 keeps a standing player inside the aimed fan
(fans spread ±0.3 rad ≈ ±17° anyway, `aimedFan` callers); 8 does not.
Recommend the probe runs 32 and 16; 8 exists to show the cliff.

### Probe (new file `test/probe-ws.mjs`; never edit `test/sim.mjs`)
Import `makeGame/startRun/update` and `makeBot` like `sim.mjs` does; run the
expert bot and the 1-frame-late bot over seeds 1–8 for each `aimBins`
setting, and report per setting:
- outcome, deaths and death frames (do deaths move to new sections?),
- speed-kill rate and score (does snapping change routing?),
- **aim-error histogram**: for every aimed `fire()`, angle between the exact
  `atan2` and the fired angle, in degrees, plus lateral miss at the player's
  distance — the "how much lead does it feel like" number,
- **standing-player lethality**: a scripted bot that holds bottom-centre
  through the first popcorn and turret sections; count aimed needles that
  pass within 6 px vs miss. Exact aim ≈ 100 %; report the % at 32 and 16.
Run HEAD first as control (all knobs 0) and confirm metrics.json matches.

### Decision material for Jacob
- The table above filled with measured values, per bin count.
- Three Lab links for a playtest pass: `?lab` (exact), `?lab=aimBins:32`,
  `?lab=aimBins:16`.
- Wiki: new §6.3 paragraph "aim quantization (Q18, experiment)", §8 Q18
  updated with numbers, changelog line with the clearance above. `BUILD`
  bump. Say which sections changed.

---

## Q19 — The small-hitbox trade (keep r 3, or shrink to 2?)

### The question
Wiki §6.2 parks "shrink bullet hit radius 3 → ~2 (leniency)" and §8 Q15
notes the radii are not actually uniform: needles r 2.6, rounds r 3.2
(`patterns.js:25`) against `PLAYER.hitR = 3` (`game.js:22`), while the display
contract draws one dot at r 6. WS01 supplies the missing argument: **small
hitboxes enlarge the play area, so difficulty has to come from more or bigger
bullets (clutter, readability loss), and they permit lucky accidental dodges
that make tight, restrictive challenges impossible.** Three options exist:

- **(a) Unify at 3.0 / 3.0** (both castes move ±0.2–0.4; dot stays 6; Q15
  resolved as "unify"). Renderer today draws the dot at `hitR + 3`
  (`renderer.js:410–422`), i.e. it already assumes (a).
- **(b) Document the split** (2.6 / 3.2 stays; dot 6 is generous by 0.4 for
  needles, *lies by 0.2* for rounds — a display-contract violation in the
  cheating direction, `research/hitbox-display.md` rule).
- **(c) Shrink to 2.0 uniform** (the parked leniency; dot 5).

### Corpus clearance
- **Boghog** [WS01] drawbacks of small hitboxes → argues against (c) unless
  density is raised to compensate, which then costs readability [WS02]. [WS01]
  "if it harms the player make it small" argues the *current* size is already
  the genre norm (Touhou r 2–3, `research/hitbox-display.md`). [T1] "small
  hitboxes are theatre; gaps are huge but it looks like grazing" — the theatre
  already works at 3.
- **Mark MSX**: leniency that makes every dodge easier without adding
  decisions is beginner bias; he wants difficulty tuned by arrangement, not by
  shaving the collision. Pushback in favour of (a): a *lying* marker (rounds
  hit 0.2 px outside the dot) is exactly the opaque, unfair-feeling detail he
  attacks; fixing the promise is not leniency.
- **Wiki §6.2 display contract (r20)**: every visual statement errs in the
  player's favour, never against. (b) fails this for rounds today. (a) and
  (c) both satisfy it if the dot follows the knob.
- **Standing conditions**: no hp-inflation fixes (irrelevant here); referee
  recert is a separate Jacob-authorized commit — any option changes every
  collision in the certified run.
- **Recommendation to carry into the plan**: (a) is the one both lenses
  support; (c) is the one WS01 argues against. Build the knob so all three
  can be *felt*, but present (a) as the default answer.

### Mechanism
1. `g.tune.bulletR = 0` (0 = shipped 2.6/3.2). In `fire()`: if set, `b.r =
   g.tune.bulletR` for both castes.
2. **The dot must follow the truth**: `drawPlayer` derives the marker radius
   from `PLAYER.hitR + bullet r`. Make it read the *max* live bullet radius for
   the run (`hitR + max(needle r, round r)` = 6.2 today, 6 under (a), 5 under
   (c)) so the marker is never smaller than the truth. The HOW TO card
   mirrors the ship art (r35 sync rule, `src/howto.js`) — check whether it
   hard-codes the dot size; if so, the experiment must not break it: leave the
   card at the shipped value and note it.
3. Lab row `bulletR` (label "bullet hitbox (next run)", ref "wiki §6.2 /
   open Q19"): `2.6 / 3.2 (current)` · `3.0 unified` · `2.0 lenient`.
   `main.js beginRun` copies it into `g.tune.bulletR` (0 = shipped).
4. The hitbox tester (`tools/hitbox-tester.html`, wiki §6.2) draws truth
   circles from `b.r`; confirm it reads the live value, not a constant.

### Probe (same `test/probe-ws.mjs`)
For HEAD control, (a) and (c), over seeds 1–8, expert bot and 1-frame-late
bot:
- deaths, death frames, outcome, score, speed-kill rate;
- **closest-approach histogram**: for every enemy bullet that passes the
  player, log the minimum centre distance in 0.5 px bins from 0 to 10 px.
  The mass in the **5.0–6.2 px shell** is exactly the set of hits (c) would
  forgive and the near-misses (a) would newly convert — the "lucky dodge"
  count WS01 warns about, measured directly, per section;
- **clutter cost**: how many more bullets on screen (percent, from the
  bullet curve) would equalize 1-frame-late-bot deaths under (c) vs control?
  Estimate by scaling the bot's late-frame count until deaths match, or
  simply report both curves and let Jacob read it.

### Decision material for Jacob
- The shell histogram per section (a picture: this is the argument).
- Death-frame diff control vs (a) — expected near-zero; if (a) moves a
  referee death, say where.
- Lab links for the playtest pass: shipped, `?lab=bulletR:3`, `?lab=bulletR:2`.
- Wiki: §6.2 "the collision numbers" paragraph gains the WS01 argument and
  the three options with measured values; §8 Q15 and Q19 cross-linked;
  changelog line with the clearance. `BUILD` bump. Say which sections changed.

---

## Order of work
1. HEAD control: `node test/sim.mjs` matches `evidence/metrics.json`. Record
   the hash/summary in your recap.
2. Q19 knob + dot-follows-truth (smaller diff, tests the tune plumbing).
3. Q18 knob (aim only; boss exempt by default).
4. `test/probe-ws.mjs` with both probes; run; table the numbers.
5. Lab rows (+ Booth chips if wanted), stamps verified on a receipt and a
   Booth recording. Cap is ~5 live experiments (§10): r70 has four
   (skin, speedPopup, bossHp, speedDress) — adding two makes six, so flag
   that in the recap; Jacob may retire one first.
6. Re-run step 1 with all knobs at default — must still match.
7. Wiki + BUILD + changelog. One commit per question is fine; do not merge
   into `design/needle-tier` without Jacob — branch `design/boghog-ws`.

## Non-negotiables
- `src/core` stays DOM-free and deterministic; no new `g.rng` draws on the
  default path; `g.fxRng` for anything visual.
- Never edit `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`.
- No verdicts, no default changes, no scoring changes. Options with numbers.
