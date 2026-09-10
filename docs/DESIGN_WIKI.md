# SPEEDHELL — Design Wiki

*How the game's systems actually work and why they were built that way. Written for
three readers: Jacob coming back after a break, a future Claude session, and outside
eyes (Mark MSX, boghog). Every number here is read from the code, not remembered;
file:line pointers are to `src/core/`. Where a decision is contested or unresolved,
it says so — the "Open questions" section is the part to send to a critic.*

*Companion docs: `DESIGN_PILLARS.md` (the constitution), `HOMAGE_STUDY.md` (the
lineage laws), `BOGHOG_CRAFT.md` (interview craft notes), `BOGHOG_WORKSHOP.md`
(the SHMUP WORKSHOP digest — vocabulary, techniques, numbers the rubric can't
hold; cite [WS0N]), `CRITIC_RUBRIC.md` (the referee's
acceptance criteria), `ART_BIBLE.md` (drawing rules, draft 2026-09-04), and `research/` (the deep-research corpus: canon fire-
gating/density/ground-layer, hitbox display, playtest interviewing, ZeroRanger —
see `research/README.md` for the roadmap state). This wiki is the explainer
that sits underneath them.*

Last updated: 2026-09-09 (r80: STAGE 2 — THE BONE RAIL, core pass — the ground layer (rail tanks, bone walls, the hull with its turret deck), THE HEARSE (chained anchor on a pendulum), THE BELL (three forms; pendulum arcs), `STAGES = [s1, s2]` so the r78 seam / stage select are LIVE, base-skin drawing, `tools/probes/stage2-probe.mjs` — new §13; stage 1 byte-identical; r79: extend A1 + one-bomb refill; r78: CAMPAIGN INFRASTRUCTURE — stage modules (`src/core/stages/`), `g.level`, `startRun(g, atT, level)`, `nextStage`, a dormant clear → receipt → briefing → next-stage flow, stage select on the PRACTICE row only once a second stage exists; stage 1 byte-identical to HEAD (sim, shots replay, Booth replay); Jacob's override to start the stages 2–5 route — new §12; r77: SHOT LOOK DECIDED — `heavy` shipped as THE player shot (Jacob: "heavy is obviously the best"), the `shotLook` row + the rect and r75 bolt paths deleted, HOW TO card shows the bolt, Q22 decided; r76 EXPERIMENT: shotLook gains `heavy` — flame muzzle, 28 px bolt + echo + trail, messy stream, layered impact, hit click, shimmer (open Q22); r75 EXPERIMENT: the player shot as a BOLT — pixel bolt + trail + muzzle strobe + impact blob in the Lab (open Q22); r73 EXPERIMENT: boss parts bite back — clock / inherit / burst in the Lab (open Q17); r72: boss phase timeout 24s → 35s; §5.2b escalation clock written for the playtests; r71: boss hp 3× shipped — Jacob's verdict, Q16 decided; r70 EXPERIMENT: boss hp 1×–3× in the Lab; r67: Lab catch-up — 2× chunky explosions + heavy kill sound shipped, rows deleted; referee bot fix + recert at r65 — 16 green / 1 red; r65: midboss timeout 23s → 35s (design change, Jacob); referee recert at r64; r64: neon-vector + graphic-pop skins retired; r63: r59 needle caste merged into the skins line; r62: cute-occult is the game's look — Jacob's verdict; r61: four art skins merged for Jacob's playtest; r60: art SKINS — renderer split into skins/*.js, four concept directions built in parallel; r59: bullet caste by source — needles = special tier's aimed fire (design change, Jacob); r58: heading steps 16 → 32 after playtest; r57: ART_BIBLE Round 1 — pixel grid, named palette, family rims, pixel-disc bullets (renderer-only); r56: sound test z-order fix; r55: SOUND TEST card in OPTIONS; r54: kill sound weight in the Lab (open Q14); r53: speed-kill reward dressing (open Q13); Pillar 3 amended: modes, not a slider — §11 mode roadmap; r52: chunky explosion look in the Lab (open Q12). Reds = midboss bot-priority question only).

---

## 1. The game in one paragraph

Two stages (r80; the campaign is five — Pillars, plan `docs/plans/campaign-five-stages.md`),
each ~1.5–2.25 minutes for an expert, ~4–5 for a practiced human. A 320×427
field, fixed 60Hz, seeded deterministic logic (the same seed and inputs always
produce the same run — this is what makes the bot referee possible). Stage 1,
THE CRYPT, is eight sections: popcorn intro → turret alley → mid gauntlet →
midboss → rush → elite pair → release → 3-phase boss (§3–§5). Stage 2, THE
BONE RAIL (§13), adds the ground layer: tank column → bone-wall breach → hull
turret deck → the Hearse → rail rush → release → the Bell. You have 3 lives
and 2 bombs; a death restores one bomb (r79); lives, bombs and score carry
across the seam (§12). Score is the only progression. There is no rank, no
difficulty slider, no unlocks. Today there is one mode (arcade); the mode
roadmap is §11.

## 2. Scoring — "stopwatches, not run time"

### 2.1 The one rule

Every enemy starts a private stopwatch the moment it becomes **vulnerable**
(on-screen past y=16, 30 frames old, and past any spawn armor — `game.js:372`).
Kill it before its window expires and it pays **double** and adds one to the
chain. Miss the window by a frame and it pays base and the chain resets to 0.
That is the entire core. There is no multiplier, no rank, no combo bonus
stacked on top. (`killEnemy`, `game.js:220`)

Why binary: Pillar 2 and boghog WS06 — a quick-kill bonus must be a *visible
state* (SPEED or not), never opaque frame math the player can't perceive.

### 2.2 The table (`stage.js:21`, `ENEMY_DEFS`)

| Enemy | Count/stage | HP | Base | Speed-kill | Window |
|---|---|---|---|---|---|
| Zako (popcorn) | 80 + 32 traffic (r19 crossers/risers) + ~6 midboss escort | 2 | 200 | 400 | 75f · 1.25s |
| Turret | 12 | 24 | 500 | 1,000 | 150f · 2.5s |
| Mid | 4 | 44 | 800 | 1,600 | 210f · 3.5s |
| Elite | 2 | 134 | 3,000 | 6,000 | 380f · 6.3s |
| Midboss | 1 | 130 | 8,000 | 16,000 | 700f · 11.7s |
| Boss sub-part | 5 across 3 phases | 24 (P2 node: 56) | 1,000 | 2,000 | 300f · 5s |
| **Boss phase** | 3 | 110 / 134 / 135 | 12,000 | **24,000** | 600f · 10s |

Windows are sized from vulnerability, which begins during entry — a mid or elite
spends ~90–110 frames descending *inside* its window. Generous on popcorn, tight
on elites relative to their ~19s on-screen life.

Full-stage budget if every stopwatch is beaten: roughly **150k**. The boss alone
is ~72k of that — **half the game lives in three 10-second windows.**

### 2.3 Boss phase clocks are independent

Each phase has its own 10s clock starting when that phase's armor drops
(`scoreBossPhase`, `game.js:257`; `advanceBossPhase` resets `vulnAt`, gives a
60f armor beat while the next form telegraphs). Blowing P1's window does not
touch P2 or P3. A 12s/9s/9s boss still earns two of three.

Late-kill decay (r6, Psikyo-style "gold by kill time"): a phase pays full base
through 1,200f (20s), then fades linearly to ~0 at the 1,450f (24.2s) timeout
(`game.js:265`). Grinding a phase down at the buzzer pays like the timeout it
almost was. A timed-out phase pays nothing, cancels nothing, and leaves its
bullets on screen. The item shower on a phase kill shrinks with the same fade.

### 2.4 Garnish (deliberately subordinate to the core — "S6")

- **Chain** — HUD `CHAIN n` counts consecutive speed kills. It is *not* a
  multiplier. Every 5th speed kill spawns a "rush shower": 6 items worth
  `chain × 20` each (chain 20 → 2,400). Resets to 0 on any non-speed kill or death.
- **Items** — midboss kill: 8 × 800 (6,400). Boss phase kill: up to 10 × 1,000.
  S7 release: 14 × 150 (routing signage, not a payday). Items fall and are lost
  off the bottom; magnet radius 53px, collect radius 12px (`game.js` item loop).
  Rendered Blue Revolver-sized (r16): radius scales with value —
  `min(12, 7 + val/150)` px, so a 150 release coin draws at 8 and an 800/1000
  coin caps at 12 (old flat size was 6) — plus a slow deterministic glint pulse
  (`renderer.js` items block; phase seeded per-coin in `spawnItem`, no rng).
  Size-communicates-value, Psikyo small/large-coin style; safe to grow because
  items render below enemies/fx/bullets so gold can never mask a threat (S2).
  Collect radius intentionally NOT grown yet — open question below.
- **Bullet cancels** — bullets convert to points at a per-bullet rate: 30 on an
  elite kill (LOCAL, 90px radius — r11), bombs, and the S7 wall; 100 on a midboss
  **speed** kill (30 if late — r9, see §4.3); 100 full-screen on a boss phase
  kill. Mids cancel nothing (r11; they did full wipes before). The authored
  full-screen release moments are midboss, boss phases, S7, and bombs — only.
- **Bombs** — cancel at 30/bullet, 180f invulnerability, 90f cooldown. The panic
  button has a price: each unused bomb is 500 at the clear tally.
- **Clear tally** — `lives × 1,000 + bombs × 500` (`game.js:481`).

### 2.5 Caravan pull (`game.js:323`)

If the screen is empty, no gate is holding, and the next timeline event is >30
frames away, the stage clock runs 4×. Speed-killing a wave pulls the next one in
sooner (WS06 lineage). Never fast-forwards through the WARNING ritual.

### 2.6 Speed-kill popup shows its value (EXPERIMENT — lab, open Q4)

Until r48 speed-kill popups said `SPEED` while slow kills said `+800` — the
biggest scoring lever was the one the player never saw a number for. r49
showed `SPEED +1600`; r50 moved the choice into the Lab (§10) so testers pick:
`SPEED +1600` (default) · `+1600` · `SPEED` (old) · none. Core carries the
paid value on the popup (`addPopup(…, val)`, `killEnemy` + `scoreBossPhase`)
and never formats it; `renderer.js` formats per `prefs.speedPopup`. Text
only: no rng, no score change; popup stays gold/15px/big with the word first
so the binary state (Pillar 2, BH WS06) still reads before the number.
**Jacob: experimental — may be dropped or replaced.** Watch for: popup width
~2× (S2 readable-chaos), edge clipping at x<50 (addPopup clamps at 40).

## 3. Enemy lifecycles — "dynamic lifecycle" (S4)

The house rule: a speed-killed enemy shows only its polite opening; an ignored
one escalates and owns the screen. Escalation is on a *behavior* clock separate
from the *scoring* window, so the two knobs can be tuned independently.

**Fire gating (r18, `stage.js` `mayFire`).** Three gates, and only three: an
enemy fires if it is (1) on-screen and vulnerable (y > 20, past spawn armor),
(2) not in the **bottom screen band** (y > H−60 — enemies past the player's band
go quiet: "the player typically can't shoot backwards", boghog WS04), and
(3) not **sealed** — no shot from inside 48px of the player (48px at needle
speed 3.3 ≈ 15f ≈ 240ms, above the rubric's 120ms reaction floor). The **boss
is never sealed** and ignores the bottom band. Before r18 the rule was "the
enemy must be 40px ABOVE the player", which no classic game has: it muted every
fire site — boss included — for a player parked at the top (Jacob's friend,
playtest 2026-08-29; referee: the old rule let a mortal top-parker clear the
boss arena with three timeouts, 0 bullet deaths, 8 bullets fired). Canon
sources: Yuge (Toaplan) on ground-enemy sealing; Toaplan's aim-anywhere vector
tests; Ikeda hunting safe spots; Psikyo bosses ridden at point-blank and still
firing. Point-blank on a turret is quiet (its reward) — nothing else is.

- **Zako** (`stage.js:72`) — one-volley popcorn. Every 3rd in a group is a
  shooter (one aimed prong on the way down); the diver variant homes briefly
  at 40–70f then commits with a short aimed fan. Soft walls steer them back
  inside the field so wall-hugging can't drag them off-screen. **r19 traffic
  variants** (`phase` 2/3): **crossers** enter from a side at the top band's
  height (y 38–58, x = 16 so the edge detector never trips), cross at 1.7px/f
  through the lanes where a top-parker or point-blanker stands, and dive at the
  far edge; a shooter fires one prong mid-crossing. **Risers** enter from the
  bottom on the rails (x 40 / W−40), climb slowly for 40f (a corner-hugger keeps
  ~16f before contact — S7), then fast to y 95, hang ~30f (the kill window —
  they can't be shot until they're above you), and fall back as popcorn; a
  shooter fires once from the apex. Placement: crossers in turret alley (both
  reps, opposite the popcorn side) and the mid gauntlet; risers in the rush (×2)
  and elite rep 2. Canon: boghog WS05 Top Line ("spawn enemies on opposite
  sides… keep the player mobile"); Garegga st.5/6 side entries, st.4 "ambush
  from below"; Gunvein's ships from the bottom. No rng.
- **Turret** (`stage.js:133`) — scrolls down at 0.47px/f from y −16/−40; goes
  "angry" at 4s on-screen (more fire, same scroll speed, so a lingering angry
  turret still clears on schedule). **r17 arrival shot:** its polite 3-needle fan
  (3/0.4/2.3 — the same sentence) now fires the frame it becomes vulnerable
  (y≈17), bypassing the top-edge gate; latched on `e.phase`. Since r18 it honours
  the 48px seal like every other shot — a point-blank arrival kill is quiet by
  canon, but the top is no longer silent (popcorn, mids, elites and the boss all
  fire at a top-parker now).
  Before r17 the first fan the mute allowed landed at age ~115 while a point-blank
  kill took 12f from vulnerability at age ~68 — and turrets that scrolled past
  *below* a top-camper could never fire at all. Probe (top camper at y 40–60,
  on-column): **zero enemy bullets in the whole alley, 4/4 speed kills at 7–9f,
  no deaths** → with r17: a non-dodging camper loses 2–4 lives; a sidestepping
  one keeps its speed kills (10–15f) and survives — the fast kill now costs a
  sidestep. S7 "no unavoidable deaths": the only spawn-adjacent spot with no path
  (on-column, y<35) is already a contact death when the turret passes.
- **Mid** (`stage.js:97`) — descends at 1.5px/f (mute for ~88–110f), fires one
  aimed 5-needle fan at age 65 (y≈86) on the way down (r10, see below), then holds
  deep (y 120–153), aimed fans every 80f, a spray at 230f; past 300f it parks and
  hoses. Exits (committed, never
  re-descends) at fireT > 560. *Note: the comment says it "exits before the
  midboss arrives"; mid #4 spawns at 2060 and exits around stage-frame 2710,
  after the midboss lands at ~2489. See §4.3 for why that matters.*
  **r10 entry shot (2026-08-27).** Playtest: the mute descent plus a 0.37s
  point-blank / 0.76s range kill meant a positioned human killed every mid in
  the silence — four free 800-point pinatas, and range play was already a safe
  kill (Pillar 2 inverted: no reason to close). Fix: one aimed fan at age 65,
  timed between a close kill (~age 55, earns the quiet) and a range kill
  (~age 77, eats the fan first). Same hp, same windows — a race, not a slog.
  Rejected: more hp (a grind). Dials in reserve: faster descent, overlapping
  mids. Caveat: the bots never killed mids in the silence anyway (expert: ages
  202–585), so the felt problem is human-only and the bot referee can't
  confirm the fix — Jacob's playtest is the test.
  **r11 (2026-08-29): mids no longer cancel on death.** Playtest: killing a mid
  full-wiped the screen — four wipes per gauntlet erased each next mid's entry
  fan and flattened tension into all-release. A one-column mid is not a
  space-controller; its fans now persist and stack (measured: mid-section avg
  bullets 59, max 127 for the reaction-delayed aggressive bot).
- **Elite** (`stage.js:138`) — descends 2.3s (mute until r11's entry signature:
  its laned arc wall now fires on the way down at age 70, so the pattern is FELT
  inside the speed-kill window — before, the rewarded fast kill skipped every
  pattern it had), parks deep (y 150), patrols the full width on the house tanh
  sweep, area-denial cycles escalating per 210f rep: rep 0 grindable, ring at
  rep 1, hose at rep 2, overstay tax at rep 3+. Killing an elite fires a LOCAL
  30/bullet cancel (90px, r11 — was full-screen): its denial field dies with it,
  the rest of the field's pressure stands. "Speed-kill = safety," locally."

## 4. The midboss

### 4.1 Fight (`stage.js:172`)

Descends to y=73, then sweeps rail-to-rail on the house tanh curve. Phase A
(hp > 45%): twin aimed fans every 70f, bendy streams every 130f; a leave-alive
hose starts at 780f. Phase B: rings every 130f + bounded spray; a desperation
layer past 950f. Times out at 2,100f (35s; r65 — was 1,400f/23.3s) — flees, no
score, no cancel wall, gate opens. "No milking" (S6): the timeout is what caps
the post-bloom crosser pulse (a popcorn pair every 150f while it lives).

### 4.2 The design question that came up (2026-08-27)

Playtest feel: a kill that detonates a full screen is a better moment than a kill
that pops an empty one. But with cancels at 100/bullet, the way to get a full
screen was to *wait* — which contradicts Pillar 2 (speed is the natural meta) and,
measured, was a trap anyway: farm-kill at ~20s ≈ 16,500 vs speed kill ≈ 19,500,
with a 0-point cliff at 23.3s. Worst of both: it read as a choice and wasn't.

Measured with the aggressive bot: bullets carried in from the previous wave are
gone within ~1s of the midboss going vulnerable (58 → 10 → 5 on one seed), so
"carry density in" doesn't happen naturally; the fight's own opening fire gave
the bot ~22–41 bullets to cancel at its ~5s kill.

### 4.3 Decision (r9): density comes from aggression

**r19 (overlap pass).** Two changes. (1) The midboss is **never sealed** — r18's
48px seal let a hugger mute the whole fight, bloom included; bosses don't seal
in the canon ("sealing only works on the weak"). Alone, this costs the expert
bot 448→653f on its midboss kill — still a speed kill. (2) **Escort:** the gate
freezes the timeline, so the fight was in a vacuum (Jacob: "way too easy to
speedkill… doesn't even feel like a challenging section"). After the bloom (it
still needs the clean screen), a crosser pair enters the top band every 150f
(alternating sides, y 36/52, one shooter) — Psikyo bosses spawn popcorn;
boghog: "one enemy that controls space + popcorn flying in". Measured (seed 1):
enemies on screen during the fight 1.3 → 2.5–3.0; the bots kill ~9 popcorn per
fight — and chase them: expert 653 → 912f, aggressive-human 743 → 1365f, both
outside the 700f window. Isolation shows the escort, not the unseal, does that;
the bot picks the nearest target above it, a human stays on the midboss. Bot
artifact or real cost — Jacob's playtest decides (§8.10).

1. **Arrival bloom** (`stage.js:180`) — once the screen holds only the midboss,
   it fires three slow, laned arc walls (13 bullets each at 1.0/1.25/1.5 px/f,
   center lane open, ~4.5s to drift off the field). A point-blank kill inside
   the bloom detonates it (measured: 30 → 40 → 55 bullets on screen through the
   bot's ~5s kill). A 10s kill sees it long gone. boghog line 29: "bullet cancels
   license near-unfair patterns (jump-scare → relief)." No rng in the bloom, so
   the referee's stream order is untouched. Waits for a clean screen because a
   straggler mid killed one frame after the bloom fired would cancel it for free
   (measured: 44 → 0 on seed C0FFEE) — the mid-exit timing note in §3 is why.
2. **Speed-gated cancel** (`game.js:245`) — the midboss's 100/bullet rate is a
   SPEED-kill property; a late kill cancels at 30 like every other wall. The
   milk route is dead by construction and the big `CANCEL +N` popup becomes a
   visible property of beating the clock.

Open feel check: three layered slow walls with a lane is the canonical readable
wall, but readability is a human judgment. Two walls (1.0/1.4) is the fallback.

## 5. The boss

### 5.1 Ritual (HOMAGE L3)

Scoreless sweep of stragglers + full scoreless cancel → ≥1s WARNING over an
empty field → 90f entrance with armor (wing pods deploy on the last beat) →
three forms, each a phase with its own silhouette, movement style, and bullet
dialect → clear tally 150f after the last phase.

### 5.2 Forms and dialects

- **P1 — winged form.** Rail hopper (see §5.4). Led/direct needle fans every 46f,
  accelerating lance volleys (the P1-only dialect, also carried by the two wing
  pods), laned arc walls at t=110 and t=200 whose lane is biased *toward* the
  boss's column — riding the lane is pursuit.
- **P2 — shed-armor form.** Flat full-width sweep. Pure twin spirals; the
  *only* aimed/led emitter is the single armor-node sub-part (56 hp), so killing
  the node strips P2 to spirals alone ("structure changes as you win," DDP).
- **P3 — bare core.** Same sweep, slower, plus a vertical breathing bob (±22px,
  ~8s). Desperation medley recombining only earlier signatures: P1's lances
  mirrored from both flanks (left direct, right led), P2's spirals, plus a
  radial ring beat. Two relay sub-parts fire aimed lances.

Escalation per 240f rep is super-linear past rep 3 — see §5.2b. Until r71
killers resolved phases by rep 2–4 and never met it; at 3× hp (r71: 390 /
402 / 405, Jacob's verdict) the escalation is the boss's density, not a
stalling tax.

### 5.2b The escalation clock — the longer a phase lives, the harder it hits

*(Written 2026-09-08 for Mark and boghog's playtests; `stage.js updateBoss`,
the `rep` / `k` lines at the top.)* Every phase runs the same clock and
every phase's attacks read it. The clock **restarts at zero when a phase
begins**, so a fresh phase always opens at 1.0× however long the last one
dragged. One **rep** = 240 f = 4 s alive in the phase.

| time alive in the phase | rep | bullet-speed multiplier `k` |
|---|---|---|
| 0–4 s | 0 | 1.00 |
| 4–8 s | 1 | 1.08 |
| 8–12 s | 2 | 1.16 |
| 12–16 s | 3 | 1.24 |
| 16–20 s | 4 | 1.54 |
| 20–24 s | 5 | 1.84 |
| 24 s+ | 6+ | 2.14 → capped 2.2 |

`k = min(1 + rep·0.08 + max(0, rep − 3)·0.22, 2.2)`: +8 % per rep, and an
extra +22 % per rep past the third — the jump at 16 s is the one players
feel. Lances are the exception, capped at 1.5× so they stay readable.

What each phase does with the clock (speed × `k` unless noted):
- **P1 (winged, rail hop):** led/direct needle fans every 46 f grow 4 → 8
  bullets (+1 per rep); laned arc walls at t=110 and t=200 gain a bullet per
  rep; lance volleys +1 per rep to 7 (speed cap 1.5×); a **third wall at
  t=155 unlocks at rep 4**.
- **P2 (shed armor, sweep):** twin spirals speed up, grow an extra arm at
  rep 3 and again at rep 4; a **counter-spiral spinning the other way
  unlocks at rep 3**. The armor-node part is the phase's only aimed emitter.
- **P3 (bare core, sweep + bob):** the ring beat grows 14 → 22 bullets
  (+2 per rep to rep 4) and speeds up; the flank lances add a bullet per rep
  to 8 (speed cap 1.5×); spirals as P2.

**Timeout (`BOSS_PHASE_TIMEOUT` 2100 f = 35 s from vulnerable; r72 — was 1450 f / 24 s):** the boss
announces a flee (popup + departure fx, r22), the phase ends paying nothing
and cancelling nothing, and the next phase begins on a fresh clock. **Parts
are per phase:** each phase spawns its own and a dead part has no effect on
the next phase (the piece that changes when parts bite back — Jacob's next
item).

Measured at r71 (3× hp, 24 s timeout), the referee's expert bot, phases it
finished: P1 14–26 s (timed out on 2 of 7 seeds — the reason for r72's 35 s),
P2 ~10 s, P3 ~10 s; it survives the
whole boss on 2 of 7 seeds with 0 lives. Jacob's target player is above the
bot (§8 Q16). Watch the certified run live: `sandbox.html?stage=0&seed=
12648430&bot=referee&god=0&lives=0&speed=4&slowAt=4680` (4× to the boss,
then 1×; P pause, `.` step, `[` `]` speed).

### 5.3 Sub-parts (`stage.js:42`, `stage.js:201`)

Ride the hull at ±36–38px horizontally (outside its r=30 collision circle, so
they're hittable from below). Each hosts one of the phase's emitters — killing a
part *reduces the phase's output*, which is safety as well as score. They die
scorelessly when their phase ends, with no feedback. P1: 2 pods. P2: 1 node.
P3: 2 relays.

Priority rule: the doubled core (24k vs 12k) always beats a 2k part. Parts are
cheap (0.2–0.5s of point-blank fire) against a 10s phase window whose core kill
is ~1.1s of contact, so there is normally slack — but past ~7s into a phase
with the core up, abandon the remaining part.

Open: whether P3's 5s part window is honestly reachable against the sweep for
a human, or only for the bot. Unmeasured. A `LOST 1000` popup when a part
expires would at least make the side-bet visible (Pillar 2: the meta must be
authored *visibly*).

### 5.4 Movement, layer 1 — authored (per phase)

- **P1 rail hop.** Dwells on a rail 100px off center for 210f, then hops at
  4.2px/f (faster than the ship) to the rail on the **far side of the player**,
  never dwelling twice on the same rail. Reactive, not random. Damage happens
  in dwells; dwells demand pursuit. "Anti-camp from physics, not stats."
- **P2/P3 sweep.** `x = W/2 + tanh(3.5·sin(age·ω)) / tanh(3.5) · 100` — lingers
  at the rails, crosses the middle fast. ω = 0.006 (P2, ~17s period) / 0.005
  (P3, ~21s). Continuity governor caps motion at 4.4px/f. Parts ride the hull,
  so on P3 a relay traces the sweep plus the bob.

Lineage: the edge-dwell strafe is Psikyo (S1945II M7 walker, `study-s1945ii.md:111`)
and Raizing house style. The far-side hop has no direct precedent — it is a
house anti-camp idea.

### 5.5 Movement, layer 2 — the camp governor (`stage.js:378–460`)

Added r6.3 to defeat the *referee's* scripted probes (pinned campers, 2-spot
shufflers, machine crawlers, in-fire grinders) after they farmed the boss from
stillness. It is not from any shmup; every constant was tuned against bots.

Mechanism, in plain terms:
- A per-boss meter `campT` fills while the player is **still** (|Δx| < 0.7px/f)
  under the boss (gap < 48px) at 0.6/f; while parked waiting for delivery at
  1.5/f; while machine-crawling under it or shooting from inside its fire at
  1.5/f. It drains at 3/f while dodging (never for a flagged crawler).
- Over budget → the player's current x is **banned**: the boss treats a ±55px
  band around it as a wall and stays on the far side. Budgets ratchet
  55 → 25 → 12 → 6 → 2 per trip within a phase.
- Bans lift after ~50f of demonstrated *tracking* (near, moving, not in fire,
  not mid-transit); each refund in a phase costs 25 more credit. Damage dealt
  from inside fire ("grind hp" > 25) voids refunds for the phase.
- First trip from a cold start: ~1.5s of holding still under the boss.

Consequence for humans: parking in a part's column to line up a shot — the
natural thing a non-expert does — trips the governor, the boss slides away, and
the part goes with it. The player experiences "the boss moves randomly."

### 5.6 The contradiction worth a critic's eye

`HOMAGE_STUDY.md` L7 and `study-s1945ii.md:153, 215` say the optimal play against
the lineage's bosses is to **park point-blank underneath** ("max DPS beats max
safety"). The governor punishes that posture after 1.5s. Pillars 2 and 6 say the
game's rules must be legible; the governor is invisible state. The arcade answer
to camping was the bullets — aimed fire makes stillness lethal — and the P1 hop
plus led-aim volleys already do that here. Whether a meter tuned to beat bots
should be allowed to shape the boss at all is the open question (§8).

## 6. The player and the pipeline

`PLAYER` (`game.js:21`): speed 3.7, focus 2.3 (instant transition — twitchy,
speed-hell; boghog: "halving feels bad," ratio ~1.6), hit radius 3. Shots: 6 on
screen max, one every 3f, 3 dmg — ~57.6 dps at range, **120 dps point-blank**
because the cap only binds at range. This is the game's real risk/reward: range
play is a grind (elite ~2.3s), point-blank is the snappy kill (~1.1s). "The gap
is the felt content, not a stat multiplier" (S1).

### 6.2 Hitboxes and the display contract (r20)

*Written for outside eyes (Mark MSX, boghog): this is the collision model and
the exact promises the visuals make about it. Found and fixed across two Booth
playtest sessions, 2026-08-30. Full research: `~/Dev/claude-visualizations/
hitbox-display-report.md` (Touhou/CAVE/indie marker conventions, all cited).*

**The model.** Circle vs circle. Player hurtbox r = 3px at the ship's origin
(`PLAYER.hitR`); every enemy bullet carries r = 3px (uniform across rounds and
needles). A hit = centre distance < 6px. Same structure as modern Touhou
(player r 2–3 vs per-bullet circles).

**The display contract** — after r20, every visual statement about collision is
either exactly true or errs in the player's favour, never against:

![display contract](img/r20-display-contract.png)

> **Sync rule (r35):** the HOW TO card (`src/howto.js`) hand-mirrors the ship
> and bullet art to teach this contract. Any player-ship or bullet redesign
> must update the card in the same commit — matching ⚠ notes sit on both
> renderer art blocks. (Jacob, 2026-09-02: visual redesigns expected before
> release.)
> **r57 update:** the card no longer hand-copies pixels — it calls the renderer's
> own `drawShip` / `drawRoundBullet` / `drawNeedle` (`src/render/renderer.js`), so it
> mirrors the live art by construction. The rule now reads: keep the ship + dot
> inside `drawShip` and the bullets inside those two functions.
> **r77 update:** the bullet row also shows YOUR shot — the card calls the
> renderer's `drawShot` (the shipped 6×28 bolt sprite, `shotRows` /
> `shotSprite`; no muzzle or trail on the card), so the player family sits
> next to the two enemy castes (S2: never a needle's hue). The contract itself
> is untouched by r77: the 6 px kill dot and the 3 px white cores are drawn
> exactly as before; the shot's larger drawn footprint (bolt + echo + 16 px
> trail + 10×12 muzzle flame + impact blob + scorch) is player-family, sits
> under enemy bullets, and marks no hitbox — the shot's collision reach
> (`e.r + 6`) is unchanged and was never drawn.

- **The ship's dot is drawn at 6px — the full effective kill radius** (your 3 +
  the bullet's 3, foldable because bullet radius is uniform). Rule: *a bullet's
  centre touching your dot is a hit.* No smaller mark exists inside it. This
  follows the genre's one unanimous convention: the marker is never smaller
  than the truth — Touhou draws a 10×10 dot over a 3.3–7px hitbox, Mushihimesama
  a circle over "a few pixels" (research doc, verified). Before r20 the ship
  showed a growing pink centre SMALLER than the truth — the cheating direction,
  and the thing playtests called "hit when it feels like you should not have".
- **A bullet's WHITE part is the part that counts.** The white core of a round
  and the white centre of a needle are drawn at exactly the 3px hit circle;
  ring, rim, nose and tail are free graze area (Touhou's "the non-white border
  does not count", made literal). Jacob caught the pre-fix mismatch himself:

  ![bullet core before the fix — the red truth circle sat outside the white core](img/r20-bullet-core-before.png)

- **Focus feedback is a shape, not a colour** (WS02: colour-only changes die in
  peripheral vision — and in greyscale, which is the same test): focus whitens
  the dot and adds a pink rim. The old 6px dashed ring was information at an
  unreadable scale and is gone.
- **Sprites overstate enemies, never understate:** enemy sprites stay within
  ~1.2× their core hitbox; the ship sprite grew 18 → 28px around its unchanged
  3px core (was 3:1, now ≈4.7:1; Cave runs 8–10:1) so wing-clips read as the
  theatre they are.

**Verification tooling** (dev-only, served by the booth server):
`tools/hitbox-tester.html` — greyscale field where the ONLY colour is the two
red truth circles, with a 6× magnifier, adjustable bullet gates, slow motion,
and a 1px-nudge precision mode with live centre-distance readout; and
`tools/enemy-gallery.html` — every sprite at 4×.

![hitbox tester](img/r20-hitbox-tester.png)

![enemy families and the player marker](img/r20-enemy-gallery.png)

**Deliberately NOT changed:** the collision numbers themselves. Shrinking the
bullet hit radius to the old visual core (3 → ~2) would make every dodge in
the game easier — a balance decision (and a full referee re-roll), parked
unless playtests ask for a more lenient game.


### 6.3 Bullet castes by source (r59)

*Jacob, 2026-09-04: "the cyan needles should be more special … the pink bullets
should be the normal bullets the enemies use. only special enemies use the
needles."*

**Rule.** Pink round = the common bullet: any enemy, any pattern type,
including a popcorn's or turret's aimed prong. Cyan needle = aimed fire from
the special tier only — mid, elite, midboss, boss and its parts
(`game.js NEEDLE_TIER`). The needle keeps both cues: it is aimed (dodge by
moving) *and* it tells you a real gun is on you. Boss fights keep both castes,
so layered boss patterns still separate by colour (boghog: bullets that move
together share a look).

**Mechanism.** `patterns.js fire()` downgrades a needle to a round when the
emitter (`g.emitter`, set at the top of `updateEnemy`/`updateBoss`) is outside
the tier. Same angle, speed and rng consumption; only `kind` and its `r`
change (needle 2.6 / round 3.2 — the downgraded prong keeps the round's
radius so same look = same hitbox; see the open question on radii in §8).

**Measured** (seed C0FFEE, headless): needle share of all enemy fire

| tier | expert | passive-human | first needle |
|---|---|---|---|
| r58 (needle = any aimed shot) | 45% | 42% | s1 |
| **B (shipped): mid + elite + midboss + boss** | 22% | 23% | s3 mids |
| A: elite + midboss + boss | 18% | 15% | s4 midboss |
| C: B + turrets | 37% | 39% | s2 (turret alley ~90%) |

Outcomes moved (expert clears faster and scores higher; passive-human clears
on its last life instead of one spare), so the certified run is stale —
referee recert was pending after Jacob's playtest — **recerted 2026-09-07 at
r64** (Jacob-authorized; certified numbers in §7 and the changelog).

**Why this and not "needle = any aimed shot" (r5–r58).** Jacob pushed back on
the old rule as genre law; research agreed: Touhou uses rice bullets in rings
and aimed fans alike, Sparen treats aimed/fixed/random as angle types
independent of sprite, Ketsui's pink/blue marks the loop, Psikyo/Raiden
differentiate by *source* (HOMAGE L6). What the genre does keep: elongated
bullets travel along their long axis, bullets that move together look alike,
≤3 families, white core = hitbox — all retained. Rubric S2-MUST line
rewritten under Jacob's authorization; HOMAGE L6 amended.

**r80 (stage 2).** The tier gains the hull core (type 9, elite class):
`NEEDLE_TIER = { 1, 3, 4, 5, 6, 9 }`. Tanks (7) and bone walls (8) are turret
class and fire pink; the Hearse (type 4) and the Bell (5) with its parts (6)
are in the tier by type. No new bullet shape: the Bell's pendulum arcs are
pink rounds from a moving emitter (§13.5) — a dialect of *motion*, so the r20
display contract is untouched.
## 7. The referee (how "balanced" is decided)

`test/sim.mjs` runs the real core headlessly with scripted bots (expert,
aggressive, passive, blind, plus camp/stutter/tracker probes) and writes
`evidence/metrics.json`: an aggressive bot must outscore a passive one ≥3× and
see fewer bullets; passive play must face ≥1.6× the bullets; expert clears by
kills on six "robust" seeds with zero timeouts; camp probes must get zero boss
kills; frame time at max load ≤ 16.6ms; determinism byte-identical.

Two things a reader should know:
- **Referee metrics are sensitive to the rng stream.** Any change that alters
  when a bot fires or dodges changes which random numbers later sprays draw,
  and downstream seeds can flip. A red check is not automatically a regression —
  run HEAD as a control first (memory: `speedhell-rng-stream-fragility`).
- **Certified 2026-09-07 at r65** (Jacob-authorized recert after the r65
  playtest, with the referee bot fix in the same session: the aggressive bot
  now closes in on the midboss/boss instead of shooting from the bottom, and
  the p2 shot keys on the phase latch). `evidence/metrics.json` +
  `evidence/shots/` (26 shots, midboss-p2 back) regenerated together. 16
  checks green — zero timeouts on every seed, `s6_alignment` 3.15 (≥3),
  `s4_dynamic` 1.97 (≥1.6), `s7_clearable` green (expert clears, 1 life). One
  RED, recorded not hidden: `s7_robust` — all six seeds clear by kills with no
  timeouts, but bada55 / 1234567 / ab12cd finish at 0 lives (bar: ≥1). Closing
  in is what costs the lives; the bot's dodge is a greedy 14-frame lookahead.
  Whether "≥1 life on every seed" is the right bar for a bot is §8.1's kind of
  question and Jacob's call; builders never edit `test/` or `CRITIC_RUBRIC.md`.

The bots define what "expert" means here. Jacob is not a 1CC-level player;
"the bot can do it" is evidence about the bot.

## 8. Open questions (send these)

1. **Is s4_dynamic's 1.6× bar still right?** It encodes the wipe-heavy world;
   r11 deliberately lets aggressive play coexist with more on-screen bullets.
   Referee recert decision.
2. **Camp governor vs point-blank lineage.** Should a behavioral meter tuned
   against bots shape boss movement, or should anti-camp live only in the
   bullets and the hop? If it stays, should it be *visible* (a meter, a tell)?
3. **P3 parts reach.** Is the 5s part window honest for a human against the
   sweep + bob, or a bot-only side-bet? Measure before tuning.
4. **SPEED popups hide the number.** r49 experiment shows `SPEED +1600` (§2.6); verdict pending Jacob's playtest.
5. **Midboss bloom readability.** Three slow laned walls at arrival — fair, or
   a jump-scare that needs to be two?
6. **Mid #4 exit timing** overlaps the midboss gate, contradicting its own
   comment. Fix the timing or accept the overlap as content?
12. **Explosion size / look** — DECIDED 2026-09-07 (r67): 2× + chunky (Lazy
    Devs / CAVE recipe, r52) shipped as constants; classic, bloom, heavy and the
    1×/1.5× sizes deleted with the Lab rows. Jacob's verdict after the r51–r66
    playtests. Bullet reading on the boss was the S2 worry — chunky draws opaque
    below bullets, budgets ≤ classic (§10 r52), so the display contract holds.
14. **Kill sound weight** — DECIDED 2026-09-07 (r67): heavy shipped (sub-bass
    thump under every kill, pitched by tier); the `killAudio` row and the
    'current' (no thump) path deleted. Jacob: "kill sound should be heavy".
13. **Speed-kill reward dressing** (r53 lab `speedDress`): should the natural
    meta's payday LOOK like a payday — tier-up explosion, rush chain, per-bullet
    cancel pops? MSX "you want the player to feel powerful" vs S2 readable
    chaos on a 200-bullet wall. Does a bigger boom on a speed kill teach the
    window faster than the popup does?
7. **Chain as a scoreboard.** The HUD's most prominent number is the least
   valuable one. Keep it (it's the *speed-kill streak*, which is the identity)
   or demote it?
8. **The suicide-for-bombs meta — DECIDED 2026-09-09 (r79): keep the move, fix
   the price. Death refills ONE bomb (was two); stock value untouched.** Jacob:
   "fix the bomb price". History (accidental Garegga):** Discovered by Jacob in
   play (2026-08-29): bombs deal 30 dmg field-wide, so one bomb kills both boss
   side parts (24 hp) inside their window; bomb kills credit as speed kills
   (killEnemy is damage-source-agnostic), so bombs also insure the chain; death
   refills bombs to 2. The math: suiciding before the boss costs ~1,000 (one
   stock life, chain reset in empty air) and buys up to ~33,500 (parts 2,000×4
   + phase conversions 12,000×2 + cancel garnish) — optimal by 10–30×.
   **MSX verdict: keep as-is** — natural meta ("can you do it in the game?"),
   lives as convertible currency = Pillar 4 taken seriously, and it's Garegga's
   celebrated depth *without* Garegga's hidden-rank opacity (the trade is fully
   visible). **Boghog verdict: keep the move, fix the price** — the economy fell
   out of three unrelated decisions (mercy refill, garnish stock, bomb dmg
   tuning), and "balance = counters, not numbers": at 30× it's a dominant strat,
   not a decision. Candidate reprices: stock life 1,000→~5,000 (still ~3% of
   budget, S6 holds) or death refills 1 bomb, not 2. Both lenses bless the
   sub-mechanic (bomb kills = speed kills): bombs are scarce and priced; they
   patch a chain, they can't be one (102/104 still took ~100 honest speed
   kills). Tension with Pillar 2 (deliberate death becomes correct play) is the
   question to put to Mark directly. Decision: unresolved, unchanged in code —
   Jacob's call (leaning keep-as-discovered).
9. **The top of the screen is a silence zone (playtest, Jacob's friend,
   2026-08-29). PARTLY RESOLVED r18** — recommendations (1) and (2) shipped as
   the `mayFire` rewrite (§3 fire gating) and the boss exemption; (4) shipped as
   the `s6_topband` referee probe (four parks incl. the boss arena). Still open:
   (3) side/rear entries into the top band, and the boss top-lane swoop. Original
   text follows.** `mayFire` (`stage.js:66`) lets an enemy fire only when it is
   40px ABOVE the player, so a player parked at y≈16 mutes all 17 fire sites —
   including the boss (holds y≈92, r 30: no fire, no contact, and player shots
   can't reach below, so three timeouts clear the stage at ~0 boss score). r17
   patched the turret symptom; this is the disease. The referee is blind: every
   S6 camp probe fires from the bottom band. Corpora: MSX **entropy** ("you can
   set the controller down and break the game's logic" — explicitly opposed);
   boghog "checkmate from physical properties, not stats" [T3], "aimed forces
   movement" [T3], "ships from the bottom later" [T2]; Pillar 5 (top must be
   risky, not forbidden), Pillar 6 (fire from below in the existing needle
   language). **Four recommendations, logged for Jacob's decision, in order:**
   (1) replace the "40px above" rule with a distance floor (~48px, any
   direction; 48px at needle speed 3.3 ≈ 15f ≈ 240ms, above the S7 120ms
   floor) — un-mutes everything from the top; biggest referee event yet, and
   `bot.mjs` targeting uses the same skip (referee edit); (2) exempt the boss
   from any mute — it always fires, the camp governor owns position; (3) make
   the top band physically alive: side-entering popcorn crossing y 30–60 per
   section, later a bottom-entering diver group (Strikers / Star Soldier side
   and rear entries) — timeline-only, no stats; (4) add a top-band camp probe
   to the S6 referee set. Sequence: 1+2, playtest, then 3 (boghog
   pass-cooldown). Jacob has his own ideas from Strikers 1945 II, Star Soldier
   and DoDonPachi — not yet stated. Deep research on classic/Japanese
   bullet-hell targeting rules, enemy density and destructible environment
   commissioned the same day (Jacob: the original research "was insufficient
   — this should have been an obvious hole").
10. **The midboss is fought in a vacuum (Jacob, r18 playtest). SHIPPED r19 (escort + unseal, §4.3), playtest pending.** "Way too easy
    to speedkill… doesn't even feel like a challenging section." Nothing else is
    on screen during the fight, so the point-blank speed kill costs nothing.
    Options (no hp, per standing rule): (a) a popcorn stream that enters from
    the sides/bottom during the fight — Psikyo bosses spawn popcorn, boghog's
    "space controller + popcorn flying in"; the r9 bloom's clean-screen wait
    would need to tolerate popcorn; (b) let mid #4's exit overlap the arrival
    (the wiki §3 note already flags that timing) so the gate opens under fire;
    (c) both, sequenced. Referee: s7_pressure/s6 walls will move; the midboss
    speed-kill window (11.7s) stays. First target of the S3/D pass.
11. **Enemy visual identity (Booth session 1, 2026-08-30). FIRST PASS r20; SECOND PASS r62 — the cute-occult skin gives every type and popcorn variant its own creature (see §10 art skins / changelog r62). SHIPPED r20 (renderer-only), Booth playtest pending.** "All the enemies
    are grey geometrical shapes of similar sizes… everything just looks like
    grey, boring, geometric shapes." The r19 overlap works mechanically (replay:
    a clean speed-kill sweep of turret alley rep 1) but doesn't read as an
    encounter because nothing distinguishes popcorn, crossers and turrets. The
    S4 "desaturated silhouettes" rule exists so bullets keep top contrast
    (Pillar 6) — identity must come from shape, size hierarchy, motion and
    ground/air layering, not colour. Art pass; pairs with the G-pass scenery.
    Also from the session: the S1→S2 seam is a 2.5–3 s empty screen (flag 1)
    and the crossers' top-side entry "doesn't feel right" (flag 3). Debrief:
    `playtest/sessions/2026-08-30-booth-1.md`.
15. **Bullet hit radii are not uniform.** `patterns.js fire()` gives needles r 2.6
   and rounds r 3.2 while §6.2 says every bullet is 3 (dot = 6 = 3 + 3). Truth is
   5.6 / 6.2 to the dot. Unify at 3.0 (both castes move; recert) or document the
   split? Surfaced by r59.
16. **Boss phase hp** — DECIDED 2026-09-08 (r71): 3× (390 / 402 / 405). Jacob:
    "3 felt the best. I think it's best we design for difficulty and
    challenge. If it's difficult for me, it's likely normal/easy for expert
    shmup players." Row deleted; `g.tune.bossHp` stays as a Booth/sandbox
    knob. Open follow-ups: boss phase timeouts (24 s; P1 now runs ~20 s for
    the bot) and the referee's expert bot, which clears 1/7 seeds at 3×.
    Original question (r70 lab `bossHp` 1×–3×). The boss dies in 5–7 s per
    phase against the midboss's 10–29 s; its escalation never fires for a
    killer. Which multiplier makes the boss the exam and not the quiz, without
    turning it into sponge? Playtest decides; measured table in §10 r70. Tied
    to the coming decisions: parts that bite back (DDP/Blue Revolver) and
    difficulty modes (Normal = solo midboss, Hard = with traffic).
17. (`beatPulse`, parked branch — see §10.)
18. **Quantized aim — should stage-section aimed fire snap to sprite steps?**
    (boghog [WS03]: arcade aim is limited to the sprite's rotation frames, which
    reads as the enemy *leading* its shots.) Ours is exact `atan2`
    (`patterns.js:29`); the renderer already snaps enemy headings to 32 steps
    (`renderer.js:136`, r58). Candidates: 32 (11.25°, ≤15 px lateral error at
    150 px — a standing player stays inside the fan) · 16 (r57's art verdict
    was "jitter") · 8 (breaks the r59 needle promise). Boss led fire (S3b) stays
    exact. Plan + probe + Lab row `aimBins`: `docs/plans/boghog-ws-questions.md`.
    Pass-cooldown: verdict after the ship-b/boss-hp pass settles.
19. **The small-hitbox trade (Q15's missing argument).** boghog [WS01]: small
    hitboxes enlarge the play area, so difficulty must come from more/bigger
    bullets (clutter, [WS02] readability loss) and they permit lucky dodges
    that make strict challenges impossible. That argues against the parked
    "3 → 2" leniency (§6.2) and for resolving Q15 as *unify at 3.0* — which
    the dot already assumes (`renderer.js:410`; rounds at 3.2 make it lie by
    0.2 px, a display-contract violation). MSX: shaving collision is beginner
    bias; fixing a lying marker is not. Plan + probe (closest-approach
    histogram: the 5.0–6.2 px shell IS the lucky-dodge count) + Lab row
    `bulletR` (2.6/3.2 · 3.0 · 2.0): `docs/plans/boghog-ws-questions.md`.
17. **Parts that bite back** (r73 lab `bossParts`: current / clock / inherit /
    burst). Which way should a dead part make the boss harder — a faster
    clock, the core inheriting the attack, or a retaliation burst on top?
    Measured table in §10 r73. Jacob's playtest decides; then the §5.3
    priority rule ("a part is cheap slack") is rewritten around the cost.
    Jacob (2026-09-08): "these variations are extremely difficult for me…
    maybe these are good variations for expert shmup players. I will
    definitely need to consult Mark and Boghog." Both lenses, run on the
    measured table: **MSX** — the decision is the depth (natural meta: a
    route the game itself recognises, no external rule); a part that only
    relieves is a "perfect tool"; inherit is the DDP/Garegga shape (the
    structure changes, not in your favour); the designer's own comfort is
    the beginner-bias trap — "difficulty clarifies design"; read your own
    difficulty as data, not as the bar; novice modes keep the skeleton, so a
    Normal that deletes the risk decision is orange juice into water.
    **boghog** — [T2] "I balance it so that I never feel comfortable dodging
    it myself" (the designer's discomfort IS the bar); WS inverted
    risk/reward: riskier moves pay LESS, so parts staying at 1,000/2,000 while
    making the fight harder is the correct inversion — do not raise their
    value; WS roles: inherit turns the part from *pressure* into *direct
    challenge* from a moving emitter; [T2] post-death scare attack "looks
    scarier than it is" — burst's ring must read that way or it's a cheap
    death; [T2] phases bleed — the inherited emitter must not double-fire
    across the flip. Both lean **inherit**; burst only if its ring is
    telegraphed (a 12-frame flash on the core before it fires); clock is the
    least legible (nothing on screen says why it got faster). Playtest by
    expert hands before the verdict; Jacob's difficulty is one data point.
21. **Flow: stage 1 overlaps strong enemies** (Jacob, 2026-09-09, from boghog
    WS05 "never two strong enemies at once — paralysis"; rubric S5 MUST says
    never 2+ elites simultaneously). Measured at r73, 7 seeds: **S6 — two
    elites on screen together for ~7.4 s (442 f) on nearly every run**, all
    three bots (elite #2 at stageT 3260 arrives 360 f after #1 at 2900, inside
    #1's 380 f window; only a speed-killer avoids it — the timeline treats it
    as speed-kill enforcement); **S3 — all four mids on screen at once** (they
    hold deep for 120–153 f while spawning 110 f apart; the timeline comment
    says "never simultaneous" but means spawn frames, not presence). Popcorn
    and turret pairs on opposite sides are what WS05 prescribes (Top Line);
    the midboss crosser pulse is pressure/clutter, not a second strong enemy.
    Q: is the S6 overlap a designed speed-kill tax (keep on Hard, sequence on
    Normal — a modes lever) or an S5 MUST breach (sequence everywhere)? No
    referee check covers simultaneous elites today. Q18–Q20 are taken on
    branches / plans, hence 21.
    **Addendum (Jacob, same day) — far-side popcorn at the same time:** "I love
    popcorn enemies, they make the player feel powerful, but them coming in at
    the same time at the far sides of the screen doesn't feel good." Where:
    `risers(t, 4)` — four popcorn from the bottom alternating x = 40 / W−40
    every 18 f, used at 2470 and 2660 (S5 rush) and 3290 (S6, the elite's
    lane attacked from behind); `zakoGroup(420, −1)` + `zakoGroup(420, +1)`
    (S1 rep 2, both sides at once); the crossers are one side at a time.
    WS05: "nothing too near the edges (trap)"; spawn on opposite sides OR
    leave a lane gap — both far edges at once is the trap reading, not the
    mobility reading. Fix shape (Jacob's call): stagger the two sides (one
    side first, the other a beat later), or bring risers in at the lane
    edges (x ≈ 60 / W−60) rather than the screen edges. Modes lever too.
22. **The player shot looks like a pea shooter** — DECIDED 2026-09-09 (r77):
    `heavy` shipped as THE shot. Jacob, after playing the r76 three-way row:
    **"heavy is obviously the best."** Per the §10 lifecycle rule the row went
    with the verdict: the r57 4×20 rect and the r75 5×20 bolt paths were
    deleted, the r76 recipe (flame muzzle alternating barrels, 6×28 bolt +
    echo + 16 px trail, ±1 px jitter + rail lag, six-frame impact blob +
    up-sparks + scorch, hit click, spine shimmer) is now `drawShots` in
    `renderer.js`, the impact fx spawn unconditionally in the hit block
    (`fxRng` only), and the HOW TO card shows the bolt (`drawShot`). Details
    §10 r77. The history below is the record. — The question as it was
    opened (Jacob, 2026-09-09: "Not so much the DPS but visually, it looks
    like a simple rectangle being fired"):
    Then (`renderer.js` ~185, ≤ r76): a 4×20 rect in the skin's edge colour with a
    2×18 white core, no muzzle, no trail, and a hit answered by 3 sparks + one
    fire puff (`game.js` ~491). Corpus: boghog WS05 player shots — fast ✅,
    tall ✅, **"thick, detailed, juicy splash with good value contrast; always
    check in motion"** ◐ (rubric S1 says fast/tall only); WS follow-through —
    "fast, dense player shots also smooth motion because players read ship
    position off them" (no options in the game, so the shot stream carries the
    load); research `explosion-and-weapon-feel-2026-09-04.md` — DOJ "weapons
    are visually huge relative to their numbers", "every hit is answered"
    (option 2, the hit impact blob, is still unbuilt). Renderer-only; art
    bible §5/§6 task (pixel bolt with a bright head, a 2-frame muzzle flash on
    the ship, a short fading tail, an impact blob sized by shots landing per
    frame). Lab row `shotLook` (current / bolt) per Jacob's "add it to the
    Lab" rule, even though no gameplay changes; Ship B's angled bolts get the
    same sprite rotated. Not DPS, not cap, not colour family (S2).
    **Built r75, Lab row `shotLook` (current / bolt), 2026-09-09** — §10 r75
    paragraph has the pixels, the peeks (`img/r75-shot-current.png` /
    `img/r75-shot-bolt.png`) and the corpus reading; verdict pending Jacob's
    play. The HOW TO card is untouched until the row is decided.
    **`heavy` built r76, same row (current / bolt / heavy), 2026-09-09** —
    Jacob on r75: "better but still a pea shooter". `heavy` = the bolt plus the
    six recipes of `research/player-shot-juice-2026-09-09.md` in the frame
    study's revised order (§8: the muzzle is the biggest gap, width is not).
    §10 r76 paragraph has the numbers; peeks `img/r76-shot-heavy.png`,
    `img/r76-shot-three.png` (the three looks on one frame), and the
    black-and-white readability check `img/r76-shot-heavy-bw.png`. Verdict
    pending Jacob's play; the row's three steps are there so each jump can be
    felt.
23. **Remove the shot limit?** (Jacob, 2026-09-09: "part of me wants to remove
    the shot limit. Zero Ranger doesn't have one. but part of me also feels
    like it incentivises point blanking… for sure Ship B feels limited by
    the shot limit"). Measured: referee with `shotLimit` 6 → 999, Ship A —
    passive-human score 56,880 → 120,820 (its speed-kill rate 46 % → 56 %),
    aggressive-vs-passive score ratio 3.15 → 1.79 (bar 3), and SIX checks go
    red (s1_pointblank, s1_ttk_felt, s7_pressure, s5_deadair, s6_alignment,
    s6_nocamp): with no cap the bottom of the screen deals full DPS, so
    point-blank stops paying, enemies die before they arrive (dead air) and
    camping works. The cap IS the mechanism behind §2's point-blank
    invitation (57.6 dps at range vs 120 close). Corpus: BH101 "Shot limit":
    "closer = faster fire = more DPS — the natural proximity dynamic", high
    rate + low count → aggressive games; MSX imperfect tools / natural meta.
    Ship B's complaint is a different fault: missed side bolts hold cap
    slots (range DPS a fifth of A's) — a B-specific lever (side-bolt
    lifetime, an angle that lands, or slots that don't count off-screen
    bolts), not the cap rule. If a ZeroRanger-like "no cap" feel is wanted,
    the honest alternative is a higher cap + damage falloff with distance,
    which keeps the invitation; a question for Mark/boghog, not decided.
24. **The Bell at 3× vs the Psikyo clock** (r80, §13.7). Plan §4 rule 1: a
    boss at 3× must fit 30–50 % of a ≤ 2:15 expert clock or run at a lower
    multiplier. Measured with the lives-pinned expert: the Bell takes 55–74 s
    of a 1:53–2:14 clock = 48–55 %, one P2 timeout on one of seven seeds.
    Options: leave it (the bot dies 4–8× in the fight — a human who does not
    finishes faster), a 2.5× multiplier for the Bell alone (`tune.bossHp` is
    the knob), or shorten the walker's dwell. Hp is Jacob's; not decided.
25. **Deck-turret and hull windows** (r80, §13.3). The expert speed-kills
    0/4 deck turrets and 0/1 hull cores on every seed: the turrets' 150 f
    clocks start while the barge is still descending (vulnerable at y 16, the
    deck parks at y 120 ~100 f later), and the core's 380 f clock starts the
    frame the deck falls — the bot is still on the last turret. Are those the
    honest windows for a human (the r10 mid grammar: a race, not a slog), or
    should the deck's clocks start at park? Playtest question; no change.
26. **Ground = no contact** (r80, §13.2). Tanks and the hull have no contact
    collision (the ship flies over Toaplan's tanks), the bone wall DOES (it is
    the stage's physical barrier — T3). Two ground rules on one layer; the
    alternative is walls as air-level obstacles drawn as such. Readability
    (Pillar 6) decides in the Booth.
27. **Does the tank column teach sealing?** (r81, §13.9; Lab `s2tanks`.)
    Jacob, first play: "im not even noticing the tank sealing. they all
    approach from the top and they are very easy to kill. i expect having
    many more tanks, approaching from the sides with lower HP may cause
    sealing to happen more often." `swarm` builds that shape (2× tanks in
    flank pairs at mid-height, alternating sides, hp 12, prong every 55 f)
    as a lower tier, not inflation. The bot cannot answer the question (0 →
    1.3 sealed kills of 30.7 — it never goes to a gun); the sealed tell
    (r81) now SHOWS a muted gun, so a human can see the choice paying. For
    the Booth: with `swarm`, does going to the gun read as the quiet option,
    and does the bottom read as "more, faster fire"? Is hp 12 too cheap to
    bother sealing (then the lever is fire, not hp — CLAUDE.md), and is the
    rep-2 half-track tail (six low, creeping, soon-angry tanks into the
    wall's arrival) a curtain or the sentence [T2]? Jacob's call.
28. **The Bell walker: hard to catch, or the governor?** (r81, §13.9; Lab
    `bellWalker`.) Jacob: "i am always dying at the boss's phase 2. the boss
    keeps running around extremely fast and is hard to catch. feels
    frustrating and annoying but maybe i just suck." `calm` (walk 3.4 <
    the ship's 3.7, dwell 240, sprays every 70 f, stomp every second
    landing) is the direct remedy, and it helps a little (P2 deaths 1.6 →
    1.3 mortal, 3.4 → 2.6 pinned; P3 reached 0/7 → 2/7; damage landed on a
    walking boss up 30 %) — but the walker's transit share is unchanged
    (38 → 40 %) because it follows the **camp governor's latch**, not the
    walk speed: a player who holds the bottom gets banned and the walker
    re-targets the far safe rail every frame (§5.5; boss 1's P1 rail hop
    behaves the same). So the question is two: (a) does `calm` make P2 feel
    catchable for Jacob (the Lab answers it), and (b) is the governor's
    pursuit — which reads as "running around" to a bottom-holder — the
    intended pressure (MSX: difficulty is content; the safe spot under it
    must stay legible) or the frustration (boghog: hard, never unfair)?
    The governor is shared with stage 1 and is not touched here; Jacob's.
29. **Is the density peak allowed to fail the novice test?** (r82, §14.8.)
    Boghog's test [T1]: after routes burn in, waiting ~1 s after a formation
    spawns before moving must still be survivable. Measured on seven seeds:
    **49 of 49 isolated file windows (S1–S3) survive; the SWARM RUSH kills
    exactly 2 of the 6 windows inside it, on every seed** — never one file's
    doing, always three or four overlapping. So the *file* passes and the
    *section* does not. Two honest readings: (a) it is the campaign's
    set-piece climax and the plan calls it the density peak — a second of
    standing still there SHOULD cost you [MSX: difficulty is the content];
    (b) [WS05] tension-release says a peak needs air, and one beat of gap
    between the rush's third and fourth files would give it back without
    touching hp. The lever is the file cadence (90 f today) in
    `s3.js buildTimeline` S5, not any stat. Jacob's.
30. **Does the leader READ?** (r82, §14.2.) The whole niche assumes you can
    pick one crested body out of a seven-ship V inside its 150 f window. In
    code it is a bigger silhouette (r 12 vs 10), a swept delta and a bright
    crest that turns wine-red when the window expires (`skins/base.js:236`),
    and the file's motion announces the miss. The referee bot is no witness —
    it homes on `type >= 4` and beelines to leaders (§14.2). A human playtest
    is the only test: in the drill (S1, one file, nothing else on screen), can
    you find and kill the leader without thinking about it? If not, the fix is
    art (a bolder crest, a wingman gap) before it is anything else.
31. **Does anyone ever spend the just-in-time cancel?** (r82, §14.2 / §14.4.)
    S3 puts two carriers near the shrine so that one kept alive is the button
    that turns the Moths' 8-s curtain into gold; the speed kill buys reach
    (r 130 vs 70) at the same garnish rate. No bot in the suite ever uses it —
    bots kill on sight — so the conflict of goals [WS06] is untested. If a
    human also never saves one, the theme is decoration: the remedy is to make
    the curtain *more* worth cancelling (a longer accent) rather than to price
    the cancel higher, because pricing it higher is scoring math and that is
    Jacob's call and Pillar 2's line.
32. **The Twin Moths and the r18 seal.** (r82, §14.4.) A Moth is elite class,
    so `mayFire`'s proximity seal applies: hugging one MUTES it while its
    mirror covers the spot you must stand in. Built on purpose — you can
    silence one at a time, never both, and that is the pair's whole geometry.
    But types 4 and 5 are seal-exempt *because they are bosses* (r19), and the
    Moths occupy the midboss slot. Keep the seal (a pair that can be half-muted
    is a positional puzzle) or exempt them (a midboss is never quiet)? No
    corpus line settles it; r19's own reasoning cuts toward exempting them.
    Jacob's.
33. **Is 30 f enough egg?** (r82, §14.5.) The Queen's dialect is a pink round
    that bursts into a 6-round ring; its only telegraph is six motes closing in
    over the last 30 f (0.5 s — four times the S7 reaction floor), and until
    then it looks like any other bullet. That is the point ("the pattern you
    dodge is not the one that was fired") and it is also the risk: at P3, eggs
    ride a medley and a player may read a hatch as an unfair spawn. Options if
    it reads badly: a longer fuse tell (45 f), or an egg that is visibly an egg
    from birth (a slow pulse for its whole life) — the second costs a look, not
    a colour, so it stays inside S2's three families either way.

34. **The mirror times out — is that hp, or the bot?** (r83, §16.3/§16.5.) THE
    IDOL's form 3 moves at the ship's exact speed (3.7 px/f) to the mirror of
    the player's column, and the expert bot **never kills it**: 36.0 s, timed
    out on 7 of 7 seeds, with 23–230 hp still standing, so form 4 is never
    reached honestly. Measured cause: 11 hp/s against 34–38 on forms 1–2 — the
    form is a third as damageable *because of how it moves*, and the camp
    governor bans the centre line, which is the mirror's fixed point and the one
    spot that solves it. Not patched with hp (standing rule). Three measured
    options in §16.3: **A** as shipped (220/220/402/405 — 3 forms reached, 49–52 s);
    **B** a finale-own multiplier (258/266/268/268 — 4 forms on 5 of 7, 49–59 s,
    but four NEW hp numbers, which needs Jacob's override); **C** the mirror on
    the elite tier (220/220/**220**/405 — 4 forms on 6 of 7, 47–71 s, **no new
    numbers**). A fourth answer that is not hp at all: give the mirror a
    re-target BEAT (a dwell, as every other strafing form in the game has), so a
    pursuer gets a window — behaviour, not stats [T3]. Jacob's.
35. **Does the mirror READ as the ship?** (r83, §16.4.) Form 3 is the campaign's
    only story beat and it is a pattern, not text — which only works if the
    player recognises their own silhouette. It is drawn with the ship's SHAPE,
    the boss's PALETTE (no violet — §3 exclusivity) and at BOSS SCALE (~86 px vs
    28), a declared art-bible deviation. If it reads as "a big grey wedge"
    instead of "that's *me*", the beat is not told and the form is just another
    boss. Eye, not metric: `img/r83-s5-idol.png`, or `index.html?boss=idol`.
36. **Can the medley be read?** (r83, §16.1.) Rubric S3 MUST caps a pattern at
    2 focal points without warning. Form 4 recombines five layers — ring, lance,
    censer arcs, eggs, three-way spread — on one 240 f cycle. They sit on
    distinct beats, but `t%34` (arcs) and `t%62` (eggs) collide periodically. Is
    the finale legible chaos (Pillar 6) or the wall HOMAGE's guardrail forbids
    ("density low, lethality positional; 3–8-bullet clusters, not walls")?
    Measured density is low (max 221 bullets, 0.12 ms draw) — the question is
    the eye's, not the profiler's.
37. **Short forms vs the 15–25 s guardrail.** (r83, §16.3.) HOMAGE says "boss
    phases 15–25 s"; the Idol's forms 1 and 2 measure 5–7 s. Psikyo's own
    four-form finale — the thing being homaged — runs 10 / 10 / 14 / 12 s
    (`homage/study-s1945ii.md:121–126`), so the film supports short opening
    forms and the guardrail does not. MSX pushes back the other way: a form
    diluted below the length its dialect needs is "orange juice into water" — a
    cutscene with a health bar. The r83 mitigation is [T1]'s intro-speed trick
    (each short form's quoted dialect fires at t 24, front of the cycle, so the
    sentence lands before the form can die). Amend the guardrail, or lengthen
    the forms? Jacob's — plan §4 rule 1 already names the override path.
38. **Four forms × 35 s = 140 s.** (r83, §16.3.) Every form carries the existing
    `BOSS_PHASE_TIMEOUT` (35 s, r72 — no new number), so the finale's worst case
    is 140 s against a ≤ 65 s target and a ≤ 2:15 stage cap; the passive bot
    demonstrates it at 91–110 s on three or four timeouts. A shorter timeout for
    the short forms is the obvious answer and would be the first per-form
    timeout in the game. Jacob's.
39. **Does the finale's box-trap quote spend stage 4's "used once"?** (r83,
    §16.2.) Plan §3 gives THE GATE the box trap with the words "Touhou's
    favourite, **used once, here**", and [T1] forbids repeating an encounter
    more than twice. Form 4's `quoteS4` hook exists precisely to quote it — a
    medley quotes, it does not re-run the set piece — but the plan's wording
    does not grant that. Decide before stage 4 is built, since the answer
    changes how distinctive the Gate's dialect has to be. Jacob's.
40. **A four-form boss pays 48 k.** (r83, §16.3.) `scoreBossPhase` pays
    `ENEMY_DEFS[5].value` (12,000) per form, so the finale pays 48,000 where
    every other boss pays 36,000. No scoring math changed — the same rule
    applied one more time — but a 33 % finale premium is a decision nobody has
    made, and Pillar 2 says the meta must be authored visibly. Leave it, or pay
    the finale like every other boss? Jacob's.

## 9. Practice notes (for humans)

- `sandbox.html`: presets spawn any enemy or the boss at P1/P2/P3 (P1 via preset
  has no pods — jump the timeline to 3900 for the real entrance). God mode and
  ∞ lives are on by default; `H` hitboxes, `L` labels (hp + remaining speed-kill
  window per enemy), time-scale, pause/frame-step.
- Never stop moving under the boss. Micro-dodge in its column; the governor
  counts that as engagement.
- Think stopwatches, not run time. Engage the instant something appears.
- Never leave items. Don't die, don't bomb unless it saves a life.

## 10. The Lab (playtest experiment switches, r50)

`src/lab.js` is ONE registry of presentation experiments for Mark, boghog and
playtesters — the answer to "how do we offer options, then delete them"
(Jacob, 2026-09-04). It exists only until decisions land; at release the file
and the `#lab` panel go.

- **Reach:** hidden unless the URL carries `?lab`. Then an extra block appears
  at the bottom of the OPTIONS menu (Esc/Enter/START), one ◀▶ row per
  experiment, pad-navigable like every other row. Ordinary players never see
  it; `test/shell.mjs` asserts no lab rows exist without the flag.
- **Links are configurations:** `?lab=speedPopup:num` opens the game with that
  choice; every change rewrites the address bar, and "copy link with these
  settings" copies it. Send a tester three links, get back "the second one".
- **Stamped:** the receipt shows `lab: SPEED popup = +1600` when anything is
  off-default; hi-score rows carry the stamp (⚗ marker + tooltip). Practice
  exclusion and scoring are untouched — presentation knobs cannot move a score.
- **Live:** presentation knobs write renderer `prefs` and switch mid-run, so a
  tester can flip looks while dodging the same pattern. They never touch
  `g.rng`, the referee (the sim runs defaults; the renderer is not imported
  by sim.mjs) or replays.
- **Kinds:** presentation (renderer/fx prefs, live) vs tune (core knobs, run
  start — the Booth VARIANTS chips). r70 amendment (Jacob): a tune knob MAY
  live here when it is read once at run start, never live, and stamped like
  every other row (first: `bossHp`).
- **Lifecycle rule:** each experiment cites its wiki open-question number.
  When Jacob decides: winner → constant, losers deleted in the same commit,
  verdict + tester quotes in this changelog. Cap ~5 live experiments.
- **Corpus constraints for the queued experiments:** explosions (bigger/
  better) must keep rendering below bullets and never mask the 3px cores /
  6px kill dot (§6.2 display contract, S2); ship/boss art changes must update
  the HOW TO card (`src/howto.js` mirrors the art); fx particle counts stay on
  `g.fxRng`.

Live experiments (r81): **skin** (§11, r60) · **speedPopup** (§2.6, open Q4) ·
**bossParts** (parts bite back: current / clock / inherit / burst, open Q17,
r73, run-start tune knob) · **speedDress** (speed-kill reward dressing, open
Q13, r53) · **s2tanks** (stage 2 tank column: current / swarm, open Q27, r81,
run-start tune knob) · **bellWalker** (the Bell's P2: current / calm, open
Q28, r81, run-start tune knob). Six rows — over the ~5 cap; bossParts and
speedDress are the ones due a verdict. Decided r77: shotLook → heavy (Q22; the r75 / r76 paragraphs below
are the record of what was tried). Decided r71: bossHp
→ 3× (Q16; the r70 paragraph below is the record). Decided and
removed in r67: fxSize → 2×, fxStyle → chunky (Q12), killAudio → heavy (Q14) —
the r51/r52/r54 paragraphs below stay as the record of what was tried. Parked on
branches, unmerged (2026-09-07, Jacob): `feat/music-cues` — **musicCues** (r66,
open Q16; bar-snapped section jumps read as "a scissor cut"; keep its corrected
125 BPM stage grid + cues-JSON loader for the stem-layering approach) and
`feat/beat-pulse` — **beatPulse** (r68, open Q17; pixel-identical when off,
but the bible-capped amplitudes are imperceptible in play — "not a terrible
idea and we will likely come back to it"; next step would be a bold setting
to A/B). In progress on `design/ship-b` (r69, unmerged): Ship B
"PRIESTESS" — core + probe + title-menu select built; Jacob's first play:
"i really enjoy the difficulty. it is much more difficult than ship A" — kept at
the plan's starting numbers, popcorn-rate red + 2/6 robust clears recorded not
fixed, art (step 4) and recert pending; details in that branch's wiki §6.4. Queued: destruction
sequence (after the art overhaul), sprite-shaped debris (the hit impact blob
landed in r75 as part of `shotLook`).

**r81 stage-2 tune knobs (core `g.tune.s2tanks` / `g.tune.bellWalker`, lab
`s2tanks` / `bellWalker`, run start).** Jacob's first play of stage 2 (§13.9,
Q27 / Q28): the tank column does not teach sealing ("they all approach from
the top and they are very easy to kill"), and P2 of the Bell kills him every
time ("keeps running around extremely fast and is hard to catch"). Two knobs
on the r70 / r73 pattern, defaults byte-identical to r80: **s2tanks = swarm**
(2× tanks entering in flank pairs at mid-height, sides alternating, hp 12,
prong every 55 f — one lower tier on the tank, `kit.js tankFile` + `stage.js`
case 7) and **bellWalker = calm** (walk 3.4, dwell 240, sprays every 70 f,
stomp every second landing — `s2.js` P2). Measured table in §13.9: swarm
kills 3.7× as many tanks at +30 % bullets and the bot still never seals
(1.3 of 30.7); calm trims P2 deaths (3.4 → 2.6 pinned) and lets 2/7 mortal
runs reach P3, but the transit share is the camp governor's, not the walk
speed's. Shipped alongside (not a knob): the sealed tell.

**r77 "shot look" DECIDED — heavy shipped (renderer `drawShots` + `drawScorch`
+ fx pass 3 + `drawShot` for the card, core hit block, audio hit click; row
deleted).** Jacob (2026-09-09), after the r76 three-way row: "heavy is
obviously the best." Lifecycle rule applied in one commit: the r76 `heavy`
recipe became the constant — `drawBoltsHeavy` → `drawShots`, `heavySprite` →
`shotSprite` (`SHOT_ROWS`), `HEAVY_BLOB` → `IMPACT_D`; `prefs.shotLook` gone
(`muzzleAt` / `muzzlePrev` / `muzzleSide` stay: they are the flame's data path,
stamped by `main.js` off `SFX.SHOT`); the r57 rect loop and the r75 `drawBolts`
+ `BOLT_ROWS` + 2-frame strobe + 3-frame blob painter deleted; `drawScorch` and
pass 3 unconditional. Core: the `g.fxShot` field and the `if (g.fxShot)` gate
are gone — the impact blob (life 7, six drawn frames) + the two up-sparks spawn
on every player-shot hit, `g.fxRng` only, `g.rng` untouched. `main.js` no
longer mirrors `fxShot`. `audio.js`: `setHitWeight` gone, the once-per-frame
150 Hz click is always on under the hit tick. `lab.js`: row deleted (rows left:
skin, speedPopup, bossParts, speedDress; `test/shell.mjs` PASS prints exactly
those). HOW TO card (`src/howto.js`): the bullet row now draws round · needle ·
YOUR shot via the new renderer export `drawShot` (the 6×28 sprite, no muzzle /
trail) — §6.2 r77 update; `img/r77-howto-card.png`. Tools: `shotpeek.html` and
`artpeek.html` lost `?shot=` (one recipe; artpeek's max-load scene always fires
now, so its draw time includes the shot). Control sim vs r76 HEAD: every bot
line, the six robust seeds, every check and the determinism string
`7022:81960:144:0:-1` identical; the only moving line is S8 stress — p50 0.017 →
0.017, p99 0.143 → 0.114, max 0.595 → 0.574 ms (timing noise), heapDeltaKB 2775
→ 3203 (the blob + two sparks per hit that the default sim never spawned
before); `evidence/` untouched. Draw time (artpeek max-load, b = 1026, six
shots in flight) 1.77 ms — the r76 heavy number (1.78 / 1.79); shotpeek frame
f = 4587 draws in 0.35 ms. Peek: `img/r77-shot.png` (2× + 4× crop, same seed
and frame as the r75/r76 sheets). **Left as is:** a bolt leaving the top drags
its echo + ghosts for ~5 frames until core culls it at y < −20, then they
vanish together — a comet tail following its head off the field; fading the
tail would need per-bolt state, not a one-liner (renderer comment records it).
**Corpus:** research `player-shot-juice-2026-09-09.md` §8 frame study (the
muzzle is the biggest gap, alternating at a third of the ship; width is not;
3–4 volleys on screen; Psikyo's pair); boghog 101 Shooting ("length will create
the illusion of motion", "huge messy streams… Chaos feels good!", "the player
needs to feel it when they're doing damage"); Vlambeer (muzzle flash, bigger
bullets, lower accuracy, impact, permanence); WS05 player shots ("thick,
detailed, juicy — always check in motion" — Jacob's verdict came from motion,
not the sheets); rubric S1 (fast, tall, economy untouched — no DPS / cap /
speed / hitbox change) and S2 (player family only, drawn under enemy bullets,
no core masked). Pushback carried over from r76 (WS02 more white while firing,
bible §2.5 alpha on echo + ghosts, bible §3 white exclusivity) stands as the
accepted cost of the verdict.

**r75 "shot look" (renderer `drawBolts` + fx pass 3, core `g.fxShot`, lab
`shotLook`, live).** Jacob (2026-09-09): "the shot feels like a pea shooter.
Not so much the DPS but visually, it looks like a simple rectangle being fired"
(open Q22; plan `docs/plans/shot-look.md`). `current` is the r57 4×20 rect in
the skin's `SHIP.shot` with a 2×18 white core — untouched, pixel-identical
(artpeek before/after: 0 differing pixels outside the timing labels). `bolt`
is four things, all presentation: **(1) the bolt** — one cached 5×20 pixel
sprite (`BOLT_ROWS`, bible §2 grid): a 1 px rim tip, a 3 px WHITE head inside
a 1 px darker rim (`SHIP.shade`), a violet body (`SHIP.shot`) with a 1 px white
spine narrowing at row 12, a 2 px violet tail — same 20 px height, same
9 px/frame, same x±7 barrels; **(2) the trail** — two stepped ghosts of the
tail below it (2×4 at alpha 0.5, 2×4 at alpha 0.25 — the bible's fx-halo
exception, capped), 8 px, integer-snapped, drawn before the bolts so every
bolt covers its own; **(3) the muzzle strobe** — `main.js` stamps
`prefs.muzzleAt = g.frame` whenever the sound ring carries `SFX.SHOT` (read
before `audio.drain` empties it), the renderer draws a 5×3 white flash on each
barrel mouth (x±7, y−12) that frame and a 3×2 ember the next; follows the
invuln blink, play state only, no core change; **(4) the impact blob** — the
research's option 2, "every hit is answered": in the hit block, `if
(g.fxShot)` spawns an `FX.CORE` particle with `ck = 2` at the contact point,
3 frames, radius 2 / 3 / 4 (4 / 6 / 8 px) by shots landing on *that enemy
this frame* (a local `hits` counter next to the loop; point-blank pairs read
as a beam); the renderer draws it in its own final fx pass as an opaque white
pixel disc inside a 1 px dark-violet rim (`FX_RAMP[0][3]`) — on top of the
r8 sparks + fire puff, still under player shots and enemy bullets. `g.fxShot`
is mirrored from the pref each frame exactly like `g.fxMeta`; default 0 =
not one spawn, not one `fxRng` pull; the spawn's 1 px x-jitter is `g.fxRng`.
Control sim identical to r73 (every outcome, score, frame count, determinism
`7022:81960:144:0:-1`). Draw time, max-load scene with 6 shots + blobs in
flight: current 1.64 / 1.65 ms, bolt 1.71 / 1.72 ms (+0.07; boss P2 panel
0.33 → 0.46). Peeks: `img/r75-shot-current.png` / `img/r75-shot-bolt.png`
(`tools/shotpeek.html?shot=…`, the same s8 boss-arrival frame, 2× + a 4×
crop). **Corpus:** boghog WS05 player shots — fast ✅ tall ✅ (unchanged) and
now "thick, detailed, juicy splash with good value contrast" (the white head
+ dark rim is the value contrast; the rect had none); WS follow-through —
"fast, dense player shots smooth motion because players read ship position
off them": the trail is the follow-through the ship has no options to carry;
DOJ (research §2) "weapons are visually huge relative to their numbers" and
"every hit is answered — a bright flare at the contact point"; rubric S1
(fast, tall, the shot cap and point-blank economy untouched — no DPS, cap or
hitbox change) and S2 (colour family unchanged: violet + white, player-only;
draw order unchanged, bolt and blob below every enemy bullet; the blob is
opaque so the additive fire puff never blows it to a white disc). **Pushback
recorded:** WS02 "reduce value contrast of player shots" — the bolt has LESS
white than the rect (9 px head + spine vs a 2×18 core), but the muzzle strobe
adds two white blocks 2 of every 3 frames while firing; the peek can't say
whether that reads as life or as noise — only motion can. Bible §2.5 "no
globalAlpha on sprite fills": the trail uses it (the fx-halo exception) —
if it reads soft, the fallback is two solid `SHIP.shade` ghosts. Bible §5's
same-commit HOW TO rule: `src/howto.js` stays on the rect until the row is
decided (it never drew the player shot; the card follows the winner).
**What only eyes in motion can judge:** whether the 5×20 bolt reads "thick"
at 9 px/frame; whether the strobe + 8 px trail make the stream feel like a
weapon or a flicker; whether the blob answers "is my damage landing" on a
white-flashing hull. Verdict → constant, row deleted (lifecycle rule).

**r76 "shot look: heavy" (renderer `drawBoltsHeavy` + `drawScorch` + fx pass 3,
core `g.fxShot = 2`, audio `setHitWeight`, lab `shotLook` third choice, live).**
Jacob on r75 (2026-09-09): "they all are improvements… but even though better
than before still looks like a pea shooter." Research
`docs/research/player-shot-juice-2026-09-09.md` ranked six recipes (§6) and
then its frame study (§8 — DaiOuJou / Strikers 1945 II / Garegga / Ketsui at
native pixels) re-ordered them: the MUZZLE is the biggest gap (DOJ's option-pod
flare is half the ship's width, flickering side to side; Garegga/Ketsui flare
the nose at 12–14 px), bolt WIDTH is not (three of four fire 2–3 px needles;
Garegga's is long, not wide), the arcade games keep 3–4 volleys on screen and
Psikyo fires stacked pairs. `heavy` is `bolt` plus the six, in that order;
`current` and `bolt` are untouched (0 differing pixels each, shotpeek
before/after). Everything is drawn, not simulated — hitboxes, speed, cap,
damage, `b.x`/`b.y` unchanged, player family only, all of it under enemy
bullets. **(1) Muzzle at flame size, alternating barrels** — a flame per
barrel, 10×12 with its rim (a third of the 28 px ship): rows tip→base
2/4/4/6/6/8/8/8/6/4 wide with a white core inside a `SHIP.shot` edge inside a
`SHIP.shade` rim, 4 frames (10×12 → 10×12 licked → 8×8 → 4×5), base on the
barrel mouth (x±7, y−12). `main.js` now stamps `prefs.muzzlePrev` and toggles
`prefs.muzzleSide` per `SFX.SHOT`; the flare lands on this volley's barrel and
the previous volley's flare finishes on the other, so at the 3-frame cadence it
flickers side to side. **(2) Bolt + echo + trail** — 6×28 (`HEAVY_ROWS`: a 4 px
white head in a 1 px rim, 12-row body, narrowing at row 18, 4 px tail; the head
sits where the r75 head sat so a hit still lands at the nose), an ECHO = the
same sprite 4 px behind the tail at alpha 0.5 (the Psikyo pair, no hitbox, no
cap change), then a 16 px trail of four 3×4 ghosts at alpha 0.6/0.4/0.25/0.12.
A lone volley is a 76 px streak; a full column shows three bright + one dim +
smear — the "fourth volley" the frame study asked for. Bolt, echo and ghosts
are clipped above the barrel line so the 28 px bolt emerges from the flame
instead of lying across the figurehead. **(3) Messier stream** — ±1 px x-jitter
per bolt, seeded on the frame the bolt is first seen (a `WeakMap` on the pooled
object; stable, not sparkle), and the right rail drawn one frame (9 px) behind
the left. Draw offsets only. **(4) Layered impact** — the blob lives six drawn
frames (core life 7; `updateFx` ticks it once before its first draw) collapsing
8/6/4/3/2/1 px at the 3-hit size (1 hit starts at 4 px, 2 at 6; odd sizes are
centred squares), two SPARKS kick UP off the contact (core, inside the same
`if (g.fxShot)` gate, `fxRng` only, `FAM.WHITE` = the player's white→violet
ramp), and a 1 px `SHIP.dark` SCORCH dot rides the hull for 10 frames
(renderer list keyed to the enemy, drawn under the fx; sprite cache untouched).
The popcorn hit-flash is the core field `e.flash` and is already 2 frames —
not touched. **(5) Hit-sound weight** — `audio.js setHitWeight(on)`: every hit
keeps its 300→120 Hz tick and the first hit of each drained frame adds a 25 ms
150 Hz sine at −6 dB (0.09 vs 0.18) — the Lazy Devs cart's once-per-frame rule,
so point-blank buzzes instead of clipping. **(6) Shimmer** — two cached bolt
sprites, spine 1 px / 2 px, chosen by `g.frame & 1`. Core diff vs r75: the
gated block only (`heavy ? 7 : 3` life + the two sparks); `fxShot = 1` pulls
exactly the r75 rng. Control sim identical to HEAD (every bot outcome, score,
frame count; determinism `7022:81960:144:0:-1`). Draw time, artpeek max-load
scene, three runs: current 1.66 / 1.68 / 1.70 ms, bolt 1.74 / 1.74 / 1.74,
heavy 1.78 / 1.79 / 1.78 (+0.05 over bolt; s4 midboss panel 0.40 vs 0.41).
Peeks: `img/r76-shot-heavy.png` (2× + 4× crop), `img/r76-shot-three.png`
(current / bolt / heavy, one frame, three games in lockstep),
`img/r76-shot-heavy-bw.png` (desaturated: bolt heads, flare, echo and blob all
read as greys distinct from the round and needle bullets; nothing sits over a
core). **Corpus:** boghog 101 Shooting — "length will create the illusion of
motion… can be taken to ridiculous extremes" (the 28 px bolt + 76 px streak),
"big, fat projectiles, huge messy streams… Chaos feels good!" (jitter, rail
lag, echo), "the player needs to feel it when they're doing damage" (six-frame
blob, up-sparks, scorch, the low click); the frame study §8 (muzzle first, at
a third of the ship, alternating); Vlambeer's list — muzzle flash, bigger
bullets, lower accuracy for dynamics, impact, permanence (the scorch dot);
Lazy Devs cart — 5-frame muzzle, 5-frame splash, one hit sfx per frame;
rubric S1 (fast, tall, economy untouched) and S2 (family and draw order
unchanged); Pillar 5 (no DPS/cap/speed change — power from width, length,
detail, sound). **Pushback recorded:** WS02 value contrast of player shots —
heavy adds MORE white (a 4 px head, a white flare core 4 of every 3 frames
while firing); bible §2.5 alpha — echo + ghosts use the fx-halo exception at
up to 0.6; bible §3 "#ffffff reserved for bullet cores, hit-flash, hull
highlight" — the flare core and bolt head lean on the r75 precedent; screen
top: a bolt leaving the field drags its echo + ghosts for ~5 frames (drawn
only). Skipped: none of the six; the hit-flash extension was a core field, so
left as is. **What only eyes in motion can judge:** whether the alternating
flare reads as a gun or as a strobe; whether the 76 px streak at 9 px/frame is
smear or clutter; whether the 9 px rail lag and ±1 px jitter read as "messy
stream" or as a bug; whether the click adds weight or mud under the music.
Verdict → constant, losers deleted (lifecycle rule).

**r73 "boss parts" (core `g.tune.partBite`, lab `bossParts`, run start).** Jacob
(2026-09-08): "I don't think killing the parts should make the boss easier. In
DoDonPachi and in Blue Revolver, destroying the parts often makes the fight
harder! You get more points but at the risk of dying because you made the boss
more difficult." Today a dead part takes its emitter with it (§5.3: "structure
changes as you win" — the DDP line read as relief). Three variants, values
(1,000 / 2,000 speed) and windows untouched: **clock** — each dead part
advances the phase's escalation clock one rep (`fireT += 240`: same beat
position, faster + denser for the rest of the phase); **inherit** — the core
takes over the dead part's emitter, denser (P1 pod lance → core lance ×5 at
the pod's cadence; P2 node spray → core spray, wider, 10; P3 relay lance →
core aimed lance ×5); **burst** — a 16-bullet retaliation ring on the kill,
then clock + inherit. Corpus: DDP / Blue Revolver / Garegga (parts change
the pattern, often for the worse — HOMAGE lineage); MSX natural meta — a
route with a cost, chosen by skilled players, no scoring math touched;
boghog — parts as a routing layer [T#], hp untouched (T1). Pushback: S2 —
the retaliation ring must read as one group (it is: one `ring`, 1.6 speed,
under `mayFire`); the referee's rng stream shifts only when the knob is on.
Measured, 7 seeds, invulnerable expert bot (phase length · avg/max bullets):
current P1 31.5 s · 25/53, P2 12.5 s · 48/94, P3 10.6 s · 38/90; clock 28.0 ·
26/58, 13.3 · 55/121, 10.1 · 39/90; inherit 29.9 · 30/59, 14.5 · 61/152, 9.7 ·
35/70; burst 28.8 · 32/69, 13.0 · 61/133, 11.1 · 48/117. Mortal expert deaths
in P1: current 1.1, clock 1.9, inherit 1.0, burst 2.1 (it kills both pods on
every seed). The bot clears 0–1 of 7 at 3× hp under every variant — bot
ceiling, not a verdict. Jacob plays all four; verdict → constant, row deleted.

**r70 "boss hp" (core `g.tune.bossHp`, lab `bossHp`, run start).** Multiplier on
the boss's spawn hp (130) and `BOSS_PHASE_HP` (134/135); 0/1 = shipped. Jacob
(2026-09-08): "the boss dies so quickly. Much more quickly than the midboss which
feels strange… That's why we playtest!" — the standing no-hp-inflation condition
guards against fixing balance complaints with sponge; this is boghog T1 (hp =
pattern-duration knob) applied so the phases exist, the r25 midboss argument
again. Measured, 7 seeds × expert bot (phase length P1/P2/P3 · avg bullets ·
clears): 1× 6.9/5.2/4.4 s · 20/24/21 · 7/7; 1.5× 9.8/8.7/5.5 · 21/32/23 · 7/7;
2× 12.5/10.9/6.6 · 21/33/29 · 6/7; 2.5× 15.9/7.7/6.5 · 21/28/29 · 4/7; 3×
20.3/10.3/4.4 · 21/36/31 · 1/7. The escalation (rep ≥ 3) only exists from 2×
up; no phase reaches the 24 s timeout even at 3×; the bot losses past 2× are
the bot dying, not timeouts. Recommendation 2×; Jacob tests all five. Verdict
→ constant, row deleted (lifecycle rule). Sim runs defaults (multiplier 0).

**r54 "kill sound" (`audio.js` `thump`, lab `killAudio`).** 'heavy' layers a
sub-bass sine under every explosion — 100 Hz (popcorn) / 80 Hz (elite,
midboss, rush) / 60 Hz (boss phase) sliding to ~22 Hz over 0.3–0.5 s — plus a
60 ms low-passed transient for attack. Browser-only, no core, no rng. The sfx
bus already runs through the compressor, so the thump ducks itself against
the music rather than clipping. Pairs with r53: a rush now fires KILL_BIG,
so it thumps at the elite weight.

**r53 "speed-kill reward" (core, `killEnemy` + `cancelPop`, flag `g.fxMeta`
mirrored from the lab like `fxStyle`).** Research note
`research/explosion-and-weapon-feel-2026-09-04.md` §5 option 4: dress the
natural meta, not the gun. With it on: a speed kill explodes one tier up
(POP→MED→BIG→PHASE), a rush (every 5th speed kill) fires the PHASE-tier hull
chain and the KILL_BIG sound, and every cancelled bullet pops (a small opaque
white→cyan blob shrinking over 10 f, capped at 120 then every other so a
200-bullet midboss wall can't drain the pool) instead of one spark per four.
Scoring, windows, chain, DPS and the shot cap are untouched (Pillar 5 holds);
this is the presentation of what the stopwatch already pays. Headless check:
speed kill 35→42 particles, rush 35→97 + KILL_BIG, 150-bullet wall 38→135
particles at identical score.

**r52 "chunky" (core spawn recipe + renderer, Lazy Devs / CAVE).** Jacob:
"it's not necessarily the size that makes them feel better"; four Lazy Devs
episodes (Better Explosions, Shockwaves, Explosions, Blob Grapes) distilled and
compared against `explode()`: ours had every PART (flash, ring, staggered fire,
smoke, debris, sparks) but not the MOTION or MATERIAL. `explodeChunky`
(`game.js`, branch on `g.fxStyle` — main.js mirrors the lab pref into `g`
each frame, core stays DOM-free, everything on `g.fxRng`): (1) matter thrown
outward that STALLS — blobs launch at ~0.05–0.08·R px/f with 0.86 friction so
they settle ~0.6R out (a raspberry, not a fidget spinner), sparks launch hard
with 0.82 friction; (2) ONE blob per spoke that cools white → yellow → orange
→ dark red → grey smoke on its own clock (stage thresholds 3/9/15/22 frames,
random 0–2 start offset so nothing changes in lockstep) and dies by shrinking
to zero across its last 35 % — no separate smoke kind; (3) shaded OPAQUE
spheres — renderer draws each blob as three offset circles, dark rim → mid →
off-centre highlight, source-over, centre blob of each grape spawned last so
it draws on top (additive was why r51 heavy/2× blew out to a white disc);
(4) structured grape — 6 spokes on a ring at a random start angle + a centre
blob; tiers stack 1/2/3/4/2 grapes 5 frames apart so new puffs emerge as
earlier ones collapse (billow); (5) static 2-frame oversized flash (S4 ≤2
startup frames), constant-width white shockwave expanding linearly to 2.4R
and culled at target, drawn UNDER the particles; (6) blob positions
pixel-snapped. Budgets ≤ classic (POP ≈ 28, PHASE ≈ 74 vs 93). Classic path
byte-identical (sim = r49 control). Frame strip: `tools/peek.mjs
"test/fxpeek.html?strip=chunky"`. Lab: fxStyle = chunky.

**r51 explosions (renderer-only, `drawFx`).** `fxSize` 1× / 1.5× / 2×
multiplies every particle's draw size (fire, core, ring, smoke, debris,
spark); `fxStyle` classic / bloom / heavy: bloom = low-alpha warm halo behind
each fireball (0.12 — nine stack additively on a boss phase, so it must stay
low), a dim halo around the white core flash, sparks drawn as streaks along
their velocity; heavy = bloom + a second wider fainter shockwave + darker,
longer-lived smoke + 1.3× debris. Particle counts, positions, lifetimes and
`g.fxRng` are untouched (the r8-fx budgets 31/38/55/~93/~63 still hold), so
S8 stays measured by the same sim. Everything still draws below bullets.
Pushback to watch (S2, BH WS02): at 2× a boss-phase burst covers most of the
field; bullets stay on top but white cores over a white-yellow fireball lose
contrast — the dark rims are doing the work. Peek: `test/fxpeek.html` via
`tools/peek.mjs` renders the three looks at three frames side by side.

## 11. Modes (roadmap, decided 2026-09-04 — nothing built)

Pillar 3 originally read "one honest difficulty." Jacob's pushback: Blue Revolver
ships three difficulties plus a challenge mode, ZeroRanger ships two modes (Green
Orange / White Vanilla), CAVE ships arranges of varying difficulty. Checked against
both corpora, the pillar was forbidding more than either lens does:

- **MSX** opposes *easy modes that remove difficulty* but explicitly blesses
  *novice modes that preserve the design skeleton* (Crimzon Clover, Gun-Vein,
  Touhou scaling) and reveres CAVE's arranges as distinct designs. His accessibility
  definition is "tools to engage the difficulty" — practice mode, stage select.
- **Boghog** [T3]: "practice tools are the real accessibility fix (stage/section
  select, save states) — not mode bloat"; [T1] "start hard, scale back"; later
  regrets not making Expert harder and rejects easy-mode proliferation.
- **ZeroRanger** research: one difficulty at launch was its recurring critical
  complaint; White Vanilla *began as an easy mode and was reworked into a mode*.
- **HOMAGE L8**: loop 2 = revenge-dot bullet-diff, the cheapest second difficulty.

Rule that survives all four: **every mode is an honest design with its own scoring
identity, never a number scaled down.** The 2026-08-29 "toggle → loop 2" ruling
stands for what it ruled on (a slider); it no longer forbids modes.

Build order (boghog: hard first, then scale back; nothing before arcade is finished):

1. **Arcade** — as it stands; still the vertical slice everything is judged by.
2. **Loop 2 / EX** — revenge-dot bullet-diff (L8, changelog 2026-08-29). Same
   layouts; the mastered habit (speed-kill everything) fills the screen.
3. **Challenge** — Blue Revolver's shape: boss / section practice with a grade per
   attempt. Deterministic core + the Booth replay make it nearly free. This is what
   both corpora mean by accessibility.
4. **Caravan** — 2-minute fixed-seed time attack (Hudson lineage; §2.5 caravan pull
   already exists as a mechanic).
5. **Novice** — last, derived from the same skeleton: fewer bullets per spray,
   slower needles, **identical speed-kill windows** (Touhou-scaling shape). Not an
   hp change (standing rule).

Referee cost: each mode is its own rng stream, so each needs its own bot suite and
its own control run — a referee recert per mode, Jacob-authorized. Modes are named
designs, not options rows: they live in a mode select, not the Lab (§10).

Story placement (same session, cheap-liberties list in `research/undertale-free-
release.md`): the pillar's "no story beats mid-stage" holds; text lives in a pre-run
card, boss barks during the fight (wired to camp-governor / death signals), the
receipt, and an interstitial between loops. Writing is async (agents); the constraint
is placement, not authoring time. Not scheduled.

**Campaign (stages 2–5):** the five-stage plan is `docs/plans/campaign-five-stages.md`;
its infrastructure pass (§7 step 1) shipped at r78 — see §12. The mode order above
is unchanged; the campaign grows *Arcade*, it is not a mode.

## 12. Campaign (infrastructure r78 — LIVE at r80; `STAGES = [s1, s2, s3]` since r82)

**r83 status — `STAGES` is UNCHANGED at `[s1, s2, s3]`.** r83 built stage 5's
final boss ONLY (THE IDOL, four forms — §16), out of order, because plan §7
step 4 wants the medley's shape agreed before stage 4's dialect is designed.
The module `stages/s5.js` exists but is **not registered**: it is reached by
`tools/probes/idol-probe.mjs` (which pushes it onto the table at runtime) or by
`index.html?boss=idol` (a one-`if` dev flag in `main.js`, off by default, which
appends it for that page load — it then shows on the PRACTICE row as
`STAGE 4 — THE GREAT ALTAR`, its real slot number until stage 4 is inserted
before it). Everything else in the campaign is byte-identical: `campaign-probe`,
`stage2-probe`, `stage3-probe` and `node test/sim.mjs` all match the r82 control
in every number, run, robust seed, check and determinism string, with only the
known run-to-run S8 wall-clock line moving. The one shared change r83 needed was
two OPTIONAL arguments on `advanceBossPhase` (`hp` table, `last` form index),
defaulting to the three-form contract — so a four-form boss is a call, not a
copy (plan §6). Next in the plan: **stage 4, THE BLOOD GATE** (§7 step 5), which
fills form 4's `quoteS4` hook.

*Jacob, 2026-09-09: "i kinda wanna go down the stage 2-5 route. even though stage 1
is not perfect. im getting really tired of playtesting it." — his override of the
plan's "settle stage 1 first" gate (§7 step 0). r78 was §7 step 1 only: the game
could hold N stages while stage 1 stayed byte-identical.*

**r82 status — `stages/index.js` is `STAGES = [s1, s2, s3]`** (s2 = THE BONE RAIL,
§13; s3 = THE CANDLE SEA, §14). Registering a third stage needed **no further
code** beyond the array: a stage-2 clear now ends in `'stageclear'` → receipt →
briefing `STAGE 3 — THE CANDLE SEA` → `nextStage`, the PRACTICE row grew its
`STAGE 3 — THE CANDLE SEA` entry plus seven `ST3` sections (25 rows now),
`?level=2` and `speedhell.level` select it, and the board stamps `ST3` — all of
it from the generic loops r78 put in `main.js`. Measured this pass: stage 1 and
stage 2 are **byte-identical** (`node test/sim.mjs` equal to the r81 control in
every run, robust seed, check and the determinism string; `stage2-probe` equal in
every number on 7 seeds × 4 bots, with the one cosmetic change r80 predicted —
a clearing stage 2 now reads `'stageclear'`, since it is no longer the last
stage). `tools/probes/campaign-probe.mjs` was generalised the same way: its
final-clear assert used to read "stage 2 is last" and now walks every seam.

**r80 — what registering a second stage first switched on**, with no further code: a stage-1
clear now ends in `'stageclear'` → receipt (`STAGE 1 CLEAR`, the stage line) →
briefing card `STAGE 2 — THE BONE RAIL` → `nextStage` (lives, bombs, score, the rng
stream carried; the extend counter carried) → the stage cue restarts; the PRACTICE
row gains `STAGE 2 — THE BONE RAIL` plus its seven `ST2` sections; `?level=1` and
`speedhell.level` work; the Booth's `?level=1`; the board stamps `ST2`. New at r80
in the module contract: a stage may export **`enemyUpdate[type]`** — per-type
update hooks it owns (`game.js` update loop: hook → else boss hook → else the
shared `updateEnemy`); stage 1 exports none, so every one of its enemies takes the
old path. Stage 2 owns type 4 (the Hearse), 10 (its anchor) and 6 (the Bell's
parts) that way. `advanceBossPhase(g, e, killed, fade, parts = spawnParts)` gained
the parts-spawner argument; the camp governor, entrance, burn telegraph, banded
sweep and timeout were MOVED verbatim out of `updateBoss` into exported helpers
(`campGovernor`, `bossEntrance`, `bossBurn`, `bandedSweep`, `bossTimeout`) so the
Bell shares them instead of copying boss 1 (plan §6). Measured: `node test/sim.mjs`
on the r80 tree equals the r79 HEAD control in every run, robust seed, check and
the determinism string (`6208:82430:146:0:-1`), with ONE cosmetic difference — the
passive-human's stage-1 outcome string reads `stageclear` instead of `clear` because
the run no longer ends there; every number on that line is identical.
**Referee consequence for Jacob:** `sim.mjs`'s `s7_clearable` / `s7_robust` test
`outcome === 'clear'`; with two stages a clearing stage-1 expert reads
`'stageclear'` and would go red — today it does not show because the r79 expert
game-overs on stage 1's boss. The stage-1 recert needs a one-word referee edit
(`'clear' || 'stageclear'`), a Jacob-authorized commit, not a builder's.*

**Module layout.**
- `src/core/stages/s1.js` — THE CRYPT. Exports `buildTimeline()` (the r77
  `stage.js` function *moved*, byte for byte — same events, same stageT numbers,
  same rng draws), `SECTIONS` / `SEC_T` (the nine anchors `0, 120, 720, 1700,
  2400, 2460, 2900, 3700, 3900` that main.js, renderer.js, the three skins,
  booth.js and `tools/booth-replay.mjs` used to hand-mirror — they read the module
  now; `test/shots.html` keeps its own copy, read-only), `name`, and the boss hook
  `boss = { update: updateBoss, advance: advanceBossPhase, phases: 3 }`.
- `src/core/stages/index.js` — `STAGES = [s1]` and `stageAt(level)`. A plain
  mutable array on purpose (the probe pushes a fake second stage).
- `src/core/stage.js` — keeps what every stage shares: `ENEMY_DEFS`,
  `updateEnemy`, `mayFire`, the camp governor, `updateBoss` / `advanceBossPhase`,
  `spawnParts`. Stage 2+ append enemy types here and add their own module (plan §6).
- Landmarks stay art: each skin keeps its per-section landmark geometry
  (`SEC_LANDGEO`); the renderer now passes the section's entry stageT into
  `drawBackground(…, secT)` so the scroll math has no mirror to drift from. A new
  stage needs a landmark row per skin (cute-occult first; others may lag — plan §6).

**`g.level`** (`game.js` `makeGame`): 0-based index into `STAGES`; `g.startLevel`
= where the run began; `g.stageBase` = the run counters at the stage's start (all
zero on stage 1, so subtracting it is the identity). `startRun(g, atT = 0, level = 0)`
clamps `level` into `STAGES` and builds `g.timeline = STAGES[level].buildTimeline()`;
`g.stageT` semantics are untouched. Every existing caller (`startRun(g)`,
`startRun(g, t)`) is level 0 = stage 1 as before. The boss entity is dispatched
through `stageAt(g.level).boss.update / .advance` (`game.js` update loop +
`scoreBossPhase`) — stage 1's hook is the same `stage.js` code, one property
lookup away.

**`nextStage(g)`** (`game.js`, after `startRun`): keeps lives, bombs, score, kills,
speed kills, the run clock (`g.frame`), `g.stats`, the tune knobs, and **the same
`g.rng` / `g.fxRng` objects — no reseed; the stream is continuous inside a run**, so a
campaign run is as deterministic as a stage run. Resets what `startRun` resets:
pools, bullets, items, chain, gate, stageT / tlIndex, warn, the clear latches, the
ship's spot. `g.level++`, `g.stageBase` re-stamped, state back to `play`. Returns
without doing anything on the last stage.

**The clear flow (dormant until `STAGES.length > 1`).** `update()`'s tally now
ends in `g.state = 'stageclear'` on a non-final stage, `'clear'` on the last —
today's tally (stock bonus + `SFX.CLEAR`) either way. With one stage this is the
r77 path byte for byte. The shell (`main.js` `stepStageClear`): this stage's
receipt holds 210 f (SHOT skips it after 45 f) → the **target-briefing card**
(`howto.js` `openBriefing` — the pre-run card reused per §11's story placement /
Psikyo#9; text is `STAGE N` + the stage name, nothing else) for 120 f →
`nextStage(g)` → the stage cue restarts. **Zero-input 5.5 s ≤ 6 s** [WS05]. The
receipt (`results.js`) reads `STAGE n CLEAR`, a `STAGE n — NAME` line, and the
stage's own speed kills / kills / time / deaths / bombs via `g.stageBase` (score
is the run total, arcade style); the hi-score row stores `level` and the table
prints `STn` — all of it only when there is more than one stage. One open hook
for Jacob: the stock bonus (`lives × 1000 + bombs × 500`) pays at *every* stage
tally in this plumbing, because "today's tally runs for the stage"; whether it
should pay once at the end is his (§5 A territory; garnish-sized either way, S6).

**Stage select** (Pillar 3's practice tool; boghog T3). `main.js` builds the
PRACTICE row from `STAGES[].SECTIONS`: with one stage it is exactly the r36 rows
(S1 POPCORN … S8 BOSS) — the title is pixel- and behaviour-identical. With more,
each later stage adds a `STAGE N — NAME` entry (its full run from
`startRun(g, 0, level)`) followed by its sections tagged `STn`; the pick persists
as `speedhell.level` (`store`); `?level=N` on `index.html` preselects it (NOT
`?stage=`, which stays the sandbox's stageT jump, `sandbox.js:372`). A run started
past stage 1 has `g.startLevel > 0`: PRACTICE tag on the HUD, receipt yes, the
board never (`results.js` `qualifies(…, startLevel)`). The Booth: `?level=N` on
`booth.html` starts every run there; recordings carry `level`; `tools/booth-replay.mjs`
replays from it, calls `nextStage` on `'stageclear'` (the Booth records no ticks
while it holds the clear screen 5 s) and prints `level`.

**Referee rule (plan §4 rule 14).** `test/sim.mjs` is untouched this pass (12 of
15 green at HEAD and here — the r65 certificate is stale since r71's boss hp, a
recert Jacob has not yet authorized). When stage 2 exists it gets **one
Jacob-authorized control run per stage** from `startRun(g, 0, level)` with its own
bot suite, plus one campaign run (stock carried, rng continuous) — referee
commits, never a builder's. Stage 1's certificate never moves. The builder-side
instrument is `tools/probes/campaign-probe.mjs`: it plays the referee's four bots
through `startRun(g)` and `startRun(g, 0, 0)` on seed C0FFEE and asserts identity,
then fakes `STAGES = [s1, s1]` and asserts the carry-over (rng objects unchanged,
stock / score carried, chain reset, stageT 0, `g.level === 1`, final `'clear'`).

**Measured, 2026-09-09.** Stage 1 identity: `startRun(g)` →
`clear:8401:151280:124:69:3:0:0:0`, `startRun(g, 0, 0)` → the same; the other
three bots identical too; `node test/sim.mjs` on this tree equals the r77 HEAD
control in every run, robust seed, check and the determinism string
(`7022:81960:144:0:-1`); the shots harness replays `f=8401 score=151280 kills=124`
(= HEAD; it still reports DIVERGED against the r65 certificate, as HEAD does); a
Booth tape replays identically apart from the new `level` field. Two-stage fake:
the expert reaches the seam at 0 lives / 0 bombs (its r77 stage-1 state), carries
151 280 / 124 kills, and dies 1 571 f into "stage 2" (`gameover:9972:170380`) —
Pillar 4 doing its job, and the concrete reason the extend rule (§5 A) is the
first campaign decision; with the ship invulnerable from the seam (the camp probes'
trick, flow-only) the final tally is today's `'clear'` — `clear:16526:306240:240`,
stage 2 alone 8 125 f / 154 960, zero timeouts. Stage 2 on the continued stream is a *different* run
than a fresh stage 1 (no reseed).

**Decided r79 (Jacob, 2026-09-09): extend rule A1 and the Q8 price (one bomb on death).** **Also decided 2026-09-09: the Pillars Identity line now reads "V1 = a five-stage campaign" (Jacob's amendment, his words), and the stock bonus pays PER STAGE (Jacob: "that's pretty common for every shmup I've ever played") — the r78 plumbing already runs the tally at every stage, so nothing changes in code.** **Still Jacob's:** (the extend rule was plan §5 A1–A3 — A1 chosen)
and the Q8 suicide-for-bombs price (§5 B) *before stage 2 is built*; the Pillars
identity line "V1 = one full stage" (this pass does not edit the pillars); the
per-stage vs once stock bonus above; the S5 rubric amendment the Twin Moths need
(plan §3); which stage's pass opens next (plan §7: stage 2, the ground layer).

## 13. Stage 2 — THE BONE RAIL (r80, core pass)

*Built 2026-09-09 (Jacob: "build stage 2") from plan §3; this is the core + a
base-skin drawing + a probe. Cute-occult creatures for every new thing are a
later pass; in cute-occult / synthwave the new types and the two bosses fall
back to the base painter (renderer `drawEnemy`, r80). Music reuses the stage
track and the boss track (the `SFX.BOSS` cue switches tracks as on stage 1).
Module: `src/core/stages/s2.js`; the shared machinery it stands on: `stage.js`
(`ENEMY_DEFS` 7–10, `updateEnemy` cases 7–10, the r18 seal, the boss ritual
beats), `stages/kit.js` (the timeline helpers lifted from s1 — s1.js itself
untouched), `patterns.js staticFan`. Probe: `tools/probes/stage2-probe.mjs`.
Peeks: `img/r80-s2-sections.png`, `img/r80-s2-boss.png`, `img/r80-s2-hearse.png`.
r81 (Jacob's first play): two Lab tune knobs + the sealed tell — §13.9.*

### 13.1 Place ramp (L1) and the sections

Catacomb mouth → ossuary canal → the rail yard → the hull's dock (the barge
itself is an enemy; the dock is the landmark) → bell-tower approach → the
arena. Base skin: `S2_LANDGEO` + `landmark2` in `skins/base.js`, FIELD-band
values; the other skins show their stage-1 landmark for the section index
(said so, plan §6). The expert reaches the boss gate at **0:56–1:01** on
seven seeds (Psikyo#1: 42–80 s).

| # | stageT | Section | What (reps ≤ 2, escalating) |
|---|---|---|---|
| S1 | 120 | TANK COLUMN | rep 1: a four-tank **staircase** from the left (x 60 + 45·i, every 40 f — WS05: never a vertical tank stack; a diagonal reads as a route) + crossers over it from the right (y 88); rep 2 (denser): five from the right, faster, popcorn from the left, then three **half-tracks** that creep toward your column (behaviour, not count [T2]) |
| S2 | 760 | BONE-WALL BREACH | rep 1: a wall of 7 segments across 10 slots (x 25 + 30·i), one 90 px lane at slot 2–4 (centre x 115), crossers; rep 2: the lane switches sides (slots 6–8, centre 235) with tanks rolling down behind it and divers |
| S3 | 1400 | HULL TURRET DECK | the barge parks at y 120 with four deck turrets at (−58,−6) (−22,16) (22,16) (58,−6); crossers from each side in turn (y 60), popcorn, crossers (y 88); one rep — it is the stage's elite |
| S4 | 2400 | THE HEARSE | gate; §13.4 |
| S5 | 2460 | RAIL RUSH | tanks (−) + crossers (+) → risers from ONE lane edge (x W−60) → a mid at x W/2+40 (the midsize metronome, Psikyo#5) → half-tracks (+) + divers (−) → risers from the other lane edge (x 60) |
| S6 | 2880 | RELEASE | cancel wall 30/bullet + 14 × 150 over the bell tower, ending empty (L2, BRDA#9); WARNING at 3010 (70 f, gate) |
| S7 | 3080 | THE BELL | gate; §13.5 |

Flow (wiki Q21, Jacob's standing point): one strong thing at a time (the
hull, the Hearse, the mid, the Bell never overlap); popcorn arrives from one
side at a time — the Hearse's escort pair comes from ONE side and alternates,
the rush's risers climb one lane edge at a time (`risersOneSide`, x 60 /
W−60, not the screen edge); no lane at the screen edge (the walls' lanes sit
at x 115 / 235).

### 13.2 The niche — the ground layer, and how sealing is taught

Stage 1 has one ground enemy (the turret) and one place where the r18
proximity seal matters (the alley). Stage 2 is *made* of ground: everything
new is sealed inside 48 px, so the tool the stage teaches is "go to the gun".

- **Rail tank** (type 7; hp 24, 500 / 1,000, window 150 f, r 12 — turret
  class). Scrolls with the stage at 0.55 px/f (rush: +0.15); one polite
  2-round aimed prong (spread 0.25, 2.5 px/f) every 75 f from vulnerability;
  angry at 4 s on screen: 4-round / 0.7 / 2.9 every 40 f. Half-tracks (`side`
  2) creep ≤ 0.35 px/f toward your column. **No contact:** the ship flies
  over it (`game.js GROUND` — Toaplan/Psikyo tanks; the research doc's Q1
  table). Sitting on a tank is its reward; the column's other tanks are the
  pressure. Pink fire (not in the needle tier).
- **Bone wall** segment (type 8; hp 24, 500 / 1,000, 150 f, r 14). Scrolls at
  0.8; its hidden gun fires ONCE as it crosses y 140 (~3.3 s after spawn) — a
  3-round aimed prong (0.4 / 2.3) — unless it is dead or you are on it
  (sealed). Below that it is a silent **physical barrier** (contact: r 14 + 3
  at 30 px spacing leaves no gap — the one ground type that collides, T3
  "checkmate from physical properties"). Breach three segments where you
  stand (~0.6 s point-blank) and the loot spills — **3 items × 100** per
  segment (`killEnemy`, fixed offsets, no rng; garnish-priced under the S7
  coin, S6) — or take the lane it gives you, which is where the next wave
  aims. Destructible-terrain theme (WS05); Garegga houses / Psikyo gold
  under buildings (research doc).
- **The hull** (type 9; hp 220, 3,000 / 6,000, 380 f, r 20 — elite class).
  An ossuary barge ~164 px wide (the deck is drawn; the *hittable* core is
  the reliquary drum at its centre, r 20 — bible §6's "visibly not body"
  clause). Enters at 1.0 px/f, parks at y 120 for 800 f, leaves at 0.9.
  Four **deck turrets** are ordinary type-2 turrets with `holdT` 2: position
  slaved to the hull's (vx, vy) offset, the same turret sentence (3 / 0.4 /
  2.3 every 85 f, angry 7 / 1.0 / 3.1 every 34 f), each sealed on its own —
  the deck is wider than the seal, so you can never silence all of it at
  once. The core is **armored until the deck is dead** (`armorUntil` = ∞ at
  spawn; `updateEnemy` case 9 drops it the frame the last deck turret dies —
  DDP#4 "killing its turrets chain-links into a core kill"); then the 380 f
  window starts and its hidden gun opens: 4-needle aimed fans (0.5 / 3.0)
  every 75 f — cyan, it IS the special tier. Its death fires the elite's
  LOCAL 30/bullet cancel (r 90). No contact. Ignored, it leaves with
  whatever is still bolted to it — 9,000+ unpaid.

Fire gating is the r18 canon only — no new gate. The bot cannot learn the
lesson: the referee's `type >= 4` homing (bot.mjs, untouched) now closes on
tanks, walls and the hull too, which is where its stage deaths come from
(one per run in S3–S5); Jacob's playtest is the test of the teaching.

### 13.3 Windows and the route

Every wave has its fuse: tanks fire at vulnerability + 40 f, walls at y 140,
deck turrets on arrival (the r17 arrival shot — they honour the seal), the
core the frame it opens. The expert bot speed-kills tanks 5–6 / 17–21 and
walls 3 / 5–13 per run — it does not route for ground targets (Q25).
Loot: 21 wall items × 100 = 2,100 if every segment falls; the S6 release
14 × 150. Stage-2 budget for the lives-pinned expert: 140–183 k vs stage 1's
150–190 k (plan §5: 1.0–1.3× through targets, no multiplier).

### 13.4 The midboss — THE HEARSE (`s2.js updateHearse`, type 4 through `enemyUpdate`)

The same row as stage 1's midboss (hp 400, 8,000 / 16,000, window 700 f,
r 26, never sealed, `MIDBOSS_TIMEOUT` 35 s, the r9 speed-gated cancel and the
8 × 800 shower in `killEnemy` by type). Enters to y 80, then **crawls** along
the rail one stop at a time toward your column — stops at x 60 / 110 / 160 /
210 / 260, 2.2 px/f, dwell 70 f (phase B: 3.0 / 40) — a stalker, not the
Reliquary's tanh sweep. Its gimmick: a **chained anchor** (type 10; hp 24,
1,000 / 2,000, 300 f, r 10 — part class) on a visible pendulum: chain 105 px
(drops over the first 60 parked frames — the opening telegraph; no arrival
bloom, that is the Reliquary's), ±1.0 rad, period 3.5 s, deterministic
(`bobX/bobY` on the Hearse, the renderer draws the chain). The anchor is a
**physical hazard** — contact r 10 + motion, no bullets — and the speed-kill
sub-part: point-blank on the Hearse means standing inside the swing (T3). Kill
it and the hazard is gone (parts behave like stage 1's; Q17 open).
Fire — phase A: aimed 3-needle fans (0.4 / 3.1) from the two lanterns (x ∓ 20)
every 80 f, a laned static arc (9 / 1.6 / 1.5, centre gap) every 150 f, the
leave-alive hose past 780 f; phase B (hp < 45 %, announced with a ring the
frame it flips, r14 grammar): rings every 130 f, bounded spray every 75 f,
bendy pair past 950 f. Escort: a crosser pair from ONE side every 150 f,
alternating (Q21 addendum). "No breather after it dies" [T2]: the gate opens
on the kill, the rush's first tanks are at stageT 2460.
Measured (7 seeds): expert kill 7.7–10.9 s (in-window), aggressive-human
9–12 s, passive-human 23–30 s (no timeouts); the anchor dies to the expert
in ~10 f of point-blank (`img/r80-s2-hearse.png` uses the passive bot so the
pendulum lives long enough to swing).

### 13.5 The boss — THE BELL (`s2.js updateBell`, three forms on the r6 ritual)

Ritual as stage 1's, by construction: the S6 scoreless sweep + cancel, WARNING
70 f over an emptied field, `bossEntrance` (90 f armored descent, parts on
the last beat), `bossBurn` at each handoff, `advanceBossPhase` (cancel wall,
item shower with the late-kill fade, 60 f armor, `BOSS_PHASE_HP` 390 / 402 /
405 — the r71 3×), `bossTimeout` (35 s, flee telegraph), the camp governor
(`campGovernor`, moved verbatim), the escalation clock `k` (§5.2b). Parts
are type 6 through `enemyUpdate` (`updateBellPart`): ≥ 1 per form, each
hosting an emitter, dying with its form.

**Dialect (L6, WS03 #6 "emitter movement distorts the pattern"): pendulum
arcs.** A clapper swings under the boss on a chain (deterministic; `bobX/bobY`,
drawn by the renderer as a bob on a dotted chain) and throws a **static 5-round
fan along the chain's radial** on a 30 f beat — but only at the swing's ends
(|θ| > 0.45 rad), so the fans leave from the flanks pointing down-and-out and
trace the arc across the lower field; the column under the tower is the aimed
fire's, the flanks are the arcs'. Grouped beats, never a curtain (HOMAGE
guardrail; an 8 f stream was the first draft and read as a wall). Nothing in
the sections fires from a moving emitter (S3b-6). Pink rounds — no new shape.

- **P1 — BELL TOWER** (hp 390). Near-static: the tower drifts ±40 px (or the
  governor's safe spot when latched) at ≤ 1.2 px/f, y 93. Chain 96 px, ±1.05
  rad, period 224 f. Arcs 5 + min(rep, 2) rounds / 0.9 rad / 2.1·k; tower
  aimed fan 3 + min(rep, 3) needles / 0.5 / 3.1·k every 60 f; rep ≥ 3 an
  off-beat 4-round arc. Parts: two **lanterns** at ±36 (hp 24) firing 3-needle
  aimed fans every 90 f — the tower's aimed pressure lives in them: kill both
  and the tower is arcs only (L7 "structure changes as you win").
  **Point-blank invitation:** under the tower, above the clapper's swing
  (y 93–140), nothing but the aimed fans reaches you.
- **P2 — BELL WALKER** (hp 402). Hard strafing: the bell drops to y 118 on
  strut legs and **steps rail to rail** (x W/2 ± 100, 4.2 px/f — faster than
  the ship) to the rail on the far side of the player, never the same rail
  twice for a player who moves (boss 1's P1 rule, `pickSafeX` when latched),
  dwell 170 f. Static **flank sprays** outward from the rim (4 / 0.8 / 2.2·k
  at π/2 ± 0.55 from x ± 24) every 50 f leave the column UNDER it clear — the
  safe spot, re-earned every step (L7); a **stomp ring** (12 + 2·min(rep, 4)
  at 1.5·k) on each landing; the clapper (chain 56) keeps a slower beat (every
  36 f, |θ| > 0.3). Part: one **rope node** at +38 (hp 56) — the walker's only
  aimed emitter (bounded spray 7 / 0.6 / 2.0–3.0 every 70 f), asymmetric on
  purpose like P2's node on stage 1.
- **P3 — THE CLAPPER** (hp 405). Bare core on the banded sweep (ω 0.005) with
  the ±22 px bob; the desperation medley recombines only what came before:
  the bare-core ring (14 + 2·min(rep, 4) at 1.45·k, t = 20), **two** clappers
  (chain 70, mirrored, off-beat) throwing P1's arcs, P2's flank sprays twice a
  cycle; rep ≥ 3 adds rings. Parts: two **relays** at ±38 (hp 24) firing
  aimed needle pairs every 100 f.

Camp governor: the same code, one property lookup away — P1's slow drift
uses its safe-spot pick, P2's steps its far-rail rule, P3 its banded sweep
walls. Parts bite back is Q17, unresolved: parts here behave as stage 1's.

### 13.6 Numbers as built

| Thing | hp | value | window | r | fires | contact |
|---|---|---|---|---|---|---|
| Rail tank (7) | 24 | 500 | 150 f | 12 | pink 2-prong / 75 f; angry 4 / 40 f | no |
| Bone wall (8) | 24 | 500 | 150 f | 14 | pink 3-prong once at y 140 | yes |
| Hull core (9) | 220 | 3,000 | 380 f | 20 | cyan 4-fan / 75 f once open | no |
| Deck turret (2, holdT 2) | 24 | 500 | 150 f | 12 | the turret's own | yes |
| Anchor (10) | 24 | 1,000 | 300 f | 10 | none — motion only | yes |
| The Hearse (4) | 400 | 8,000 | 700 f | 26 | §13.4 | yes |
| The Bell (5) | 390 / 402 / 405 | 12,000 / phase | 600 f | 30 | §13.5 | yes |
| Bell parts (6) | 24 (P2 node 56) | 1,000 | 300 f | 7 | per form | yes |

Zero new hp tiers (plan §4 rule 3). Castes: `NEEDLE_TIER` + 9. Bullet
families on screen ≤ 3 (pink, cyan, the player's). Draw time on the densest
frame of the C0FFEE pinned-expert run: **81 bullets in 0.13 ms** (headless
Chrome, 60 draws averaged; budget 16.6 ms). Max bullets seen by any bot on
any seed: 104 (an 800-bullet spike in the first draft was a bug — the
walker's stomp ring re-firing every transit frame — fixed before the numbers
below).

### 13.7 The probe (`tools/probes/stage2-probe.mjs`, seed C0FFEE + the six robust seeds)

The referee's four bots on stage 2 alone (`startRun(g, 0, 1)`). Remember the
r79 baseline: at HEAD the same expert **game-overs on stage 1's boss** (4
deaths in ~30 s of the Reliquary at 3×), so "the bot dies at the Bell" is
the bot's ceiling at 3× hp, not stage 2's alone.

| bot (C0FFEE) | outcome | clock | to boss | forms | score | kills / speed | deaths by section | max bullets | timeouts | Hearse |
|---|---|---|---|---|---|---|---|---|---|---|
| expert | game over in P2 | 1:21 | 0:58 | 2 (P1 11 s) | 119,010 | 106 / 45 | S5 1 · S7 3 | 77 | 0 | 8.3 s |
| aggressive-human | game over in P2 | 1:22 | 1:00 | 2 (P1 15 s) | 101,400 | 88 / 42 | S2 1 · S4 1 · S5 1 · S7 1 | 75 | 0 | 10.0 s |
| passive-human | clear (2 lives) | 3:12 | 1:21 | 3 (37 / 36 / 36 s) | 67,550 | 91 / 42 | S4 1 | 99 | 3 (every form) | 30.3 s |
| blind | game over in S3 | 0:25 | — | 0 | 20,250 | 32 / 12 | S1 1 · S2 2 · S3 1 | 44 | 0 | — |

Across the seven seeds: expert to-boss 0:56–1:01, forms reached 1–2 (P1
10–22 s when killed), score 79–124 k, deaths 4 (one in S4/S5, three at the
Bell), max bullets 71–104, dead air 1.3–1.9 s total; aggressive-human 1–3
forms (one seed clears with 0 lives, P2 timed out); passive-human clears
every seed with 2–3 lives and three timeouts; blind dies in S3 at 0:25 on
every seed (its inputs are deterministic). Speed-kill rates, expert: zako
~32/61, tank 5–6/17–21, wall 3/5–13, deck turrets 0/4, hull 0/1, Hearse 1/1,
anchor 1/1.

**The clock (expert with LIVES PINNED — probe-only, so every form is
measured):** clear on 7/7 seeds, **1:53–2:14** (target 1:40; envelope
1:30–2:15), boss reached at 0:56–1:01, forms P1 11–28 s / P2 19–34 s (one
36 s timeout, feedf00d) / P3 15–26 s = **55–74 s of boss = 48–55 %** (band
30–50 %; Q24), deaths at the Bell 4–8, score 140–183 k.

**The two-stage campaign** (`startRun(g)` → seam → stage 2, expert, C0FFEE):
the honest r79 expert ends stage 1 `gameover f6438 79,790` — nobody reaches
the seam at r79 without the extend. With lives floored at 1 through stage 1
(probe-only): stage 1 `stageclear f8461 174,230 / 145 kills / 1 life / 0
bombs / clearBonus 1,000` → seam: `level 1, stageT 0, lives 1, bombs 0, score
174,230, chain 0, extended 0, rng the same object` → stage 2 on the continued
stream: game over in S4 after 0:42 (2 deaths, 1 life in), run total 3:03 /
209,300. The extend at 400 k is not reached by this bot (plan §5 A1 sized it
at "an expert's stage-2 clear").

### 13.8 Open questions (this stage)

Q24 (the Bell's share of the clock at 3×), Q25 (deck / hull windows), Q26
(ground = no contact vs the wall) in §8. Also for the Booth: does the tank
column TEACH sealing, or does a human just shoot tanks from the bottom (their
prongs are slow: 2.5 px/f)? Is a 90 px lane in a 320 px field a lane or a
funnel (WS03 roles)? The Hearse's anchor dies in ~10 f of point-blank — too
cheap for a "physical checkmate", or exactly the Psikyo fuse?

### 13.9 r81 — the tune pass: two Lab knobs and the sealed tell

*Jacob's first play of stage 2 (2026-09-09), verbatim: "im not even noticing
the tank sealing. they all approach from the top and they are very easy to
kill. i expect having many more tanks, approaching from the sides with lower
HP may cause sealing to happen more often." — and — "i am always dying at the
boss's phase 2. the boss keeps running around extremely fast and is hard to
catch. feels frustrating and annoying but maybe i just suck." Jacob's rule:
gameplay changes go in the Lab. Both knobs default `current` and the stage is
byte-identical to r80 at the defaults (identity lines in the changelog). They
are run-start tune knobs on the r70 / r73 pattern (`main.js beginRun` sets
`g.tune.s2tanks` / `g.tune.bellWalker` AFTER `startRun`; the timeline events
and the Bell read `g.tune` when they fire, never live; stamped on receipts).
Open questions Q27 / Q28 in §8. Probe: `tools/probes/stage2-tune-probe.mjs`.
Peeks: `img/r81-s2-swarm.png` (the column, current vs swarm, same frame
index), `img/r81-sealed-tell.png` (a sealed tank and turret, 8×).*

**Knob 1 — Lab `s2tanks`: current / swarm** (`stages/kit.js tankFile`,
`stage.js` case 7). `swarm` is Jacob's shape, built as ONE lower tier carried
on the tank itself: the same n timeline events (no extra entries — the
caravan pull reads the next event's `t`, which is how the default stays
byte-identical) each spawn a **pair from one flank at mid-height** (y 96 /
120 / 144, x −14 / W+14 and 34 px behind), **sides alternating per event**
(WS05 Toaplan "spawn on opposite sides", never both at once — Q21). They roll
inward at 1.8 px/f along a rail to a stop (the leader crosses farthest, its
trailer stops 64 px short, so the file still lands as a diagonal), then are
rail tanks like any other (case 7 `phase` 1 → 0), scrolling with the stage.
**hp 12** (popcorn 2 · swarm tank 12 · turret 24 — a lower tier by design,
never inflation; value 500 / window 150 f untouched: scoring is Jacob's),
**polite prong every 55 f** instead of 75 (`holdT` 1 marks the tier — every
non-flank tank keeps r80's 75 f under either knob), angry at 4 s unchanged,
no contact unchanged. A flank tank still off the field's edge fires nothing
(canon gate 1). Only the column's files carry `flank: 1` (S1: 120 / 420 /
600; S5: 2460 / 2640) — S2's three tanks behind the bone wall stay r80 under
every knob: a wall AND a flank file is two strong things at once (WS05). Rep 1
/ rep 2 escalation kept (rep 2's half-tracks creep after landing).

**Knob 2 — Lab `bellWalker`: current / calm** (`s2.js updateBell` P2).
`calm`: walk 4.2 → **3.4 px/f** (under the ship's 3.7, so pursuit catches
it), dwell 170 → **240 f**, the flank sprays every 50 → **70 f** (same
geometry — x ± 24 at π/2 ± 0.55 — so the column under it stays clear: the
safe spot is still the invitation), the **stomp ring on every second landing**
(`e.bloomed` counts landings; the field is the midboss's, free on the boss),
rope node / clapper / hp unchanged (Q24 is Jacob's).

**The sealed tell** (ships, presentation only — `renderer.js drawEnemy`,
`skins/base.js` types 2 / 7 / 8 / 9, `cute-occult.js` + `synthwave.js` type 2).
A ground gun that WOULD fire this frame but is sealed by proximity shows it:
the renderer reads exactly `mayFire`'s condition with the seal true
(vulnerable, below the top dead zone, above the bottom band, inside 48 px —
`stage.js sealed`, the pure function, imported; no core state written) and
the painter draws the barrel **retracted** to ~0.65 of its length with a 1 px
`GROUND.out` muzzle cap and no highlight (the wall: the skull's mouth shut;
the hull: its opened gun window capped dark), while the sprite **dims 2
frames in 4** (alpha 0.6 toward the field — a washed value, bible §3; drawn
under the bullets as ever, so nothing is masked; the hit-flash wins). One
cache-key bit (`tell`), a 12th painter arg; the other skins' type-2 barrels
retract along their axis.

**Measured (`stage2-tune-probe.mjs`, expert bot, 7 seeds, stage 2 alone;
sealed kill = the ship inside 48 px at the kill; transit = the walker
stepping between rails; latched = the camp governor's ban in force):**

| knobs | mode | tanks spawned / killed / sealed (S1+S5) | column deaths (run) | max bullets | P2 reached / P3 / boss killed | P2 s | transit % (latched % of P2 / of transit) | P2 deaths | hp dwell / transit | outcome (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| current / current | mortal | 20.0 / 8.4 / 0.0 | 0.7 (4.0) | 70 | 6/7 · 0/7 · 0/7 | 13.3 | 24 % (20 / 12) | 1.6 | 184 / 15 | game over 7 (1.5) |
| current / current | pinned | 20.0 / 8.4 / 0.0 | 0.7 (7.6) | 70 | 7/7 · 7/7 · 7/7 | 26.6 | 38 % (56 / 69) | 3.4 | 304 / 95 | clear 7 (2.1) |
| swarm / current | mortal | 40.0 / 30.7 / 1.3 | 1.0 (4.0) | 91 | 2/7 · 0/7 · 0/7 | 7.7 | 31 % (20 / 13) | 0.3 | 42 / 3 | game over 7 (1.2) |
| swarm / current | pinned | 40.0 / 30.7 / 1.3 | 1.0 (8.4) | 91 | 7/7 · 7/7 · 7/7 | 19.3 | 33 % (49 / 61) | 2.1 | 335 / 65 | clear 7 (2.0) |
| current / calm | mortal | 20.0 / 8.4 / 0.0 | 0.7 (4.0) | 70 | 6/7 · 2/7 · 0/7 | 12.6 | 25 % (42 / 37) | 1.3 | 154 / 26 | game over 7 (1.5) |
| current / calm | pinned | 20.0 / 8.4 / 0.0 | 0.7 (6.7) | 70 | 7/7 · 7/7 · 7/7 | 22.9 | 40 % (64 / 75) | 2.6 | 258 / 123 | clear 7 (2.0) |
| swarm / calm | mortal | 40.0 / 30.7 / 1.3 | 1.0 (4.0) | 91 | 2/7 · 1/7 · 0/7 | 9.6 | 43 % (56 / 70) | 0.1 | 65 / 7 | game over 7 (1.2) |
| swarm / calm | pinned | 40.0 / 30.7 / 1.3 | 1.0 (8.6) | 91 | 7/7 · 7/7 · 7/7 | 22.6 | 44 % (75 / 83) | 2.4 | 285 / 115 | clear 7 (2.1) |

What moved, and what did not:

- **The column.** Swarm doubles the tanks (20 → 40) and the bot kills 3.7×
  as many (8.4 → 30.7 — flank tanks at mid-height stay in the shot's reach;
  from the top, 12 of 20 scroll past the r80 bot unkilled) at 30 % more
  bullets (70 → 91) and +0.3 column deaths. **Sealed kills: 0 → 1.3 per run
  (4 %)** — the bot snipes from y 374 and never goes to a gun (§13.2 said it
  cannot learn the lesson; its `type ≥ 4` homing closes on tanks only to
  shoot them). The sealing choice is a human measurement — the Booth's. The
  dead air rises 1.3 → 2.2 s (the flank files clear faster).
- **The Bell's P2.** The mortal r80 picture reproduces: P2 reached 6/7, dies
  there on every seed, P3 0/7, ~13 s in P2, 1.6 deaths. `calm` moves it a
  little — P3 reached 2/7, P2 deaths 1.3 (pinned 3.4 → 2.6), P2 shorter
  (26.6 → 22.9 s pinned) — but the **transit share does not fall (38 → 40 %)**,
  and the per-seed lines say why: transit tracks the **camp governor's
  latch**, not the walk speed (seeds latched 90 %+ of P2 walk 50 %+ of it;
  seeds latched < 30 % walk ~25 %). The bot camps y 374, gets banned, and
  the walker re-targets `pickSafeX` every frame — "running around" is the
  governor pursuing a camper, the same code as boss 1's rail hop (§5.5).
  hp dealt while walking rises with `calm` (95 → 123 pinned): a 3.4 px/f
  walker IS caught. The swarm rows' mortal P2 columns are thin (2/7 reach it)
  because that bot spends a life at S2 stageT 1316 on every seed — one
  deterministic path (S1–S2 draw no rng): a bullet in a 47-bullet field with
  the bot pinned at x 289; read the pinned rows for P2 under swarm.
- **Not moved:** hp, values, windows, scoring, the seal radius, the rope node,
  the clapper, stage 1 (identity lines in the changelog).

## 14. Stage 3 — THE CANDLE SEA (r82, core pass)

*Built 2026-09-10 from plan §3 ("stage 3 — the set-piece climax"); this is the
core + a base-skin drawing + a probe. Cute-occult creatures for every new thing
are a later pass; in cute-occult / synthwave the three new types and the boss
fall back to the base painter (renderer `drawEnemy`, r80 — verified this pass by
a headless render, `?skin=cute-occult` on `tools/s3peek.html`). Music reuses the
stage and boss tracks. Module: `src/core/stages/s3.js`; the shared machinery it
stands on: `stage.js` (`ENEMY_DEFS` 11–13 appended at `stage.js:54–56`, the r18
seal, the camp governor, the r6 boss beats), `stages/kit.js:100` (`vFile`),
`patterns.js:150` (`eggFan`), and the two consequences a stage module cannot own,
in `game.js killEnemy` (`game.js:376` the leader tells its file, `game.js:382`
the carrier's cancel, `game.js:388` the Moth pair holds the gate) plus the egg's
hatch tick in the bullet loop (`game.js:641`). Probe:
`tools/probes/stage3-probe.mjs`. Peeks: `img/r82-s3-sections.png`,
`img/r82-s3-boss.png`, `img/r82-s3-moths.png`.*

### 14.1 Place ramp (L1) and the sections

Open sky over a sea of votives → the moth shrine → the candle field → the shrine
plaza (the Moths' arena) → the deep field → **the cocoon** (the boss's approach
landmark, L2) → the arena. Base skin: `S3_LANDGEO` + `landmark3` in
`skins/base.js:108/114`, with the stage's own `S3_BG / S3_SLAB / S3_STAR /
S3_LAND` — this is the **brightest background in the game** and the washed band
is still the hard constraint: every swatch is warm wax and **no channel exceeds
`0x2e`**, the same ceiling stages 1 and 2 obey (S2-MUST-1; bible §3 "a landmark
may be large, never bright"). Candles are dim motes. The other skins show their
stage-1 landmark for the section index (said so, plan §6). The expert reaches
the boss gate at **1:00–1:02** on seven seeds (Psikyo#1: 42–80 s).

| # | stageT | Section | What (reps ≤ 2, escalating) |
|---|---|---|---|
| S1 | 120 | FORMATION DRILL | rep 1: ONE V file from the left with nothing else on screen — the leader is the only decision (`s3.js:331`); rep 2 (the twist): the **mirrored double-V**, two files one beat apart (100 f) from opposite sides, so the route is still obvious [WS05 "one by one with slight delays"] — two leaders, two windows |
| S2 | 800 | CARRIER PAIR | two carriers, ONE AT A TIME (`s3.js:342`), each with a file over it so the pods are never the only target; the second is the denser rep |
| S3 | 1500 | THE VIGIL | the just-in-time-cancel run-up (`s3.js:352`): two carriers arrive LATE and near the shrine, so a player who speed-kills on sight walks into the Moths' curtain with nothing to cancel it, and a player who saves one walks in with a pod-spitting mid alive |
| S4 | 2200 | TWIN MOTHS | gate; §14.4 — and the stage's one curtain |
| S5 | 2260 | SWARM RUSH | the density peak (`s3.js:376`): six files on a tightening clock from alternating sides, the last three with **every second** follower shooting instead of every third (the escalation twist), a carrier as the metronome, risers up one lane edge at a time, divers to close |
| S6 | 2880 | RELEASE | cancel wall 30/bullet + 14 × 150 over the cocoon, ending empty (L2, BRDA#9); WARNING at 3020 (70 f, gate) |
| S7 | 3090 | THE MOTH QUEEN | gate; §14.5 |

Flow (wiki Q21, Jacob's standing point; [BH101 §Level design]): one strong thing
at a time — the two carriers of S2 never overlap, no file shares a frame with a
carrier's arrival, and the **Twin Moths are the campaign's ONE sanctioned
exception** (below). Files enter from one side at a time, sequenced by ≥ 90 f;
every entry sits at x 56 / W−56, never the screen edge. Longest single stretch
of dead air: **0.7 s** (stage 2's is also 0.7 s); 2.3 s total across the stage.

### 14.2 The niche — formations, and what a leader is for

Stage 1 taught speed-killing, stage 2 taught sealing. Stage 3 teaches
**priority**: seven bodies arrive together and one of them decides what the
other six do.

- **A FILE** (`kit.js:100 vFile`) is one **leader** (type 11) at the head of a V
  and n **followers** (type 0, `holdT` 3, or 4 for the every-third one that
  shoots — every SECOND in the rush's last three files). They spawn on the same
  frame and fly ONE straight diagonal, no steering, no rng: a formation arrives
  as a formation. The followers sit BACK along the travel vector and OUT along
  its perpendicular, so the leader is the first body on the file's path —
  reaching it means getting *ahead* of the file, which is the sweeping,
  goal-driven movement flow is made of [WS05 "high-priority enemies as goals"].
  A file's group id lives in `sweepOff`; a follower's state lives in `bloomed`
  (0 in formation / 1 scattered / 2 streaming).
- **The leader** (type 11; hp 24, 500 / 1,000, window 150 f, r 12 — the TURRET
  row verbatim, zero new tiers). Kill it inside the window and the file
  **scatters**: it breaks up and leaves (`s3.js:55`). What is paid is *safety*,
  not points — the natural meta paying in survival [WS06 / Pillar 2]. Let the
  window expire and the leader itself **turns** onto your column and takes the
  file with it (`s3.js:88`), and a turned file dives and forces you to stream
  [WS05 "popcorn forces streaming"]. The miss is announced by the file's own
  motion and by the leader's crest going wine-red, so a death here teaches
  (S5 MUST). Pink fire: turret class is outside `NEEDLE_TIER`, so a file never
  speaks the special tier's cyan (§6.3).
  **Why 24 hp and not popcorn's 2:** at 2 hp any stray shot decapitates every
  file for free and the decision cannot be failed. 24 is the lowest existing
  tier that keeps it a decision [WS04 "lowest hp that still fulfils the role"].
  **No group payout, no leader bonus, no new scoring math** — every popcorn in
  the file still pays only its own binary speed-kill (plan §5 option C stays
  unchosen; CLAUDE.md standing condition).
- **The carrier** (type 12; hp 44, 800 / 1,600, window 210 f, r 14 — the MID row
  verbatim). Parks and releases a **pod of two popcorn every 110 f**, tightening
  to 70 f and adding a spray if left alive past 380 f (S4 dynamic lifecycle),
  then **exits** at 620 f — finite, so nothing here respawns for points (S6 no
  milking). Its own gun is one cyan aimed fan: it is in the tier, so a needle in
  this stage still means "a real gun has you". Sealed by proximity (r18 canon):
  flying to the carrier is how you silence it.
  **Its death is the stage's just-in-time cancel** (`game.js:382`): a local
  cancel wall at the elite's garnish rate — **30/bullet either way** — where the
  SPEED kill buys **reach**, not a better rate (r 130 in-window vs r 70 late).
  Binary and visible (the wall's size); no new scoring math, garnish stays
  garnish (S6 hierarchy). What it is *for* is S3 + S4: the curtain is 8 s long
  and a carrier you kept alive is the button that turns it into gold. That is a
  conflict of goals, which is what a scoring system is made of [WS06; BH101
  §Scoring] — and it costs nothing in formula.

Fire gating is the r18 canon only — no new gate. Bullet families on screen stay
at three (pink rounds, cyan needles, the player's violet).

**The referee bot cannot be read straight here.** `test/bot.mjs` homes on
`type >= 4` as a "big target", so leaders (11), carriers (12) and Moths (13) all
pull it in — it flies far higher than a human would and speed-kills 8–10 of 10
leaders per run. A human will not. Read the bot's leader rate as a ceiling, not
a forecast (the same caveat r80 recorded for tanks and the hull).

### 14.3 Windows and the route

Every wave has its fuse: a shooter follower fires one prong at age 70 (≈ 1.2 s
after the file spawns — this is what makes the novice test pass, below), the
leader at age 70 and then every 90 f, a carrier on arrival at age 46 and every
95 f parked, the Moths on their alternating beats. Expert speed-kill rates
(pinned, seven seeds): zako 60–75 / 92–116, **leader 8–10 / 8–10**, carrier
4 / 4–5, Moth 1 / 2, boss parts 1–4 / 5. Loot: the S6 release 14 × 150; there is
no destructible terrain on this stage (that is stage 2's). Stage-3 budget for
the lives-pinned expert: **156–194 k** vs stage 1's 150–190 k and stage 2's
140–183 k (plan §5: 1.0–1.3× through targets, never a multiplier).

### 14.4 The midboss — THE TWIN MOTHS (`s3.js:153 moth`, type 13 ×2)

**Rubric S5's one sanctioned exception** (Jacob, 2026-09-10, as the plan's
default: "a designed midboss PAIR, entering staggered by ≥ 1 beat (Psikyo M7),
once per campaign — stage 3's Twin Moths"). *The rubric edit itself is pending
Jacob's commit in the main tree; `docs/CRITIC_RUBRIC.md` is untouched here.*

- **Two elite-tier bodies, 220 hp each** — not the midboss tier split in half:
  400 / 2 = 200 would be a NEW number and the plan forbids new tiers, while 220
  is the elite row verbatim. 440 total is 10 % over the Hearse, and the pair
  dies to the expert in **11.1–11.8 s**, comfortably inside the 35 s
  `MIDBOSS_TIMEOUT` that applies to the pair (aggressive-human 17–20 s;
  passive-human times BOTH out at 37 s).
- **Staggered arrival**, no second timeline event needed (the gate freezes the
  timeline): both spawn on the gate frame and the right Moth holds 95 f above
  the top edge before it descends. One beat apart, so the sequence still
  suggests the route [WS05 / BH101's verbatim "spawning them one by one with
  slight delays creates an obvious route"].
- **They mirror.** Both read one shared clock (`g.frame`) and sit at W/2 ± the
  same offset, so their halves are exact reflections; their aimed fans are
  offset by half a beat (48 f of a 96 f cycle) so the player never reads two
  aimed patterns on the same frame (S3 MUST "no more than 2 focal points"), and
  each one's laned arc keeps its gap biased toward the CENTRE, so the lane
  *between* the pair is real — and it is the point-blank lane.
- **Sealing is the pair's point.** A Moth is an ordinary elite as far as
  `mayFire` is concerned (r18 canon; types 4 and 5 are the only exemptions), so
  hugging one **mutes it** — and its mirror is exactly what covers the spot you
  must stand in to do that. You can silence one at a time, never both.
- **Killing one ENRAGES the other** (behaviour, never hp): it announces the flip
  with a ring the frame it happens (r14 grammar), stops mirroring, hunts your
  column, and fires **both slots** — the pair's whole sentence out of one body —
  plus a bounded spray and, past 900 f, a leave-alive ring tax.
- **The curtain accent.** The left Moth throws it once on arrival: three slow
  laned sheets 26 f apart from the shrine's height, 0.80–0.94 px/f, **~8 s to
  cross the field**, two lanes open per sheet and the lanes MOVE between sheets.
  This is the HOMAGE guardrail's whole allowance — *true curtains only as
  5–10 s accents at midboss and boss finale* — spent once, and it obeys "density
  low, lethality positional": it is dense but slow, so what kills is where you
  are standing, not how fast you can react. It is also the only place in the
  campaign a player is *invited* to spend a saved carrier.
- **Escort:** a mirrored crosser pair from ONE side every 170 f, alternating
  (Jacob's Q21 addendum), thrown by the left Moth only while both live so the
  pair never doubles it.
- **The pair holds the gate** (`game.js:388`): each death pays the elite's local
  relief (30/bullet, r 90); the LAST death is the midboss release moment — the
  r9 speed-gated wall (100 in-window / 30 late) and the 8 × 800 shower, verbatim
  from the type-4 rule — and only then does the gate open. "No breather after it
  dies" [T2]: the rush's first file is at stageT 2260.

### 14.5 The boss — THE MOTH QUEEN (`s3.js:237 updateQueen`, three forms)

Ritual as stage 1's and stage 2's, by construction: the S6 scoreless sweep +
cancel, WARNING 70 f over an emptied field, `bossEntrance` (90 f armored
descent, parts on the last beat), `bossBurn` at each handoff, `advanceBossPhase`
(cancel wall, item shower with the late-kill fade, 60 f armor, `BOSS_PHASE_HP`
390 / 402 / 405 — the r71 3×), `bossTimeout` (35 s, flee telegraph), the camp
governor, the escalation clock `k` (§5.2b). Parts are type 6 through
`enemyUpdate` (`updateQueenPart`, `s3.js:291`): ≥ 1 per form, each hosting an
emitter, dying with its form.

**Dialect (L6, WS03 #5 "projectiles that spawn emitters"): EGGS THAT HATCH.**
`eggFan` (`patterns.js:150`) gives a pink round a **fuse**; the egg drifts as an
ordinary round, and over its last 30 f six motes appear around it *at exactly
the angles the burst will fire* and close in (the telegraph — the renderer's
`drawRoundBullet`, half a second of warning, well over the S7 120 ms floor);
at zero it dies and leaves a fixed 6-round ring where it sat (`game.js:641`,
deterministic — no rng, so the referee's stream is untouched). Same pink caste,
same radius, same r20 display contract: **the dialect is the bullet's life
cycle**, not a new colour or shape. Nothing in any stage section fires an egg
(S3b-6). The pattern you dodge is not the one that was fired.

- **P1 — THE COCOON** (hp 390). Hangs almost still (±30 px at ≤ 0.9 px/f, or the
  governor's safe spot when latched) at y 92 and **lobs eggs OUTWARD** — two
  fans at π/2 ∓ 0.62, fuse 110 f, so they hatch in the mid-field on the flanks.
  Its own gun is one modest aimed fan every 84 f; the aimed pressure lives in
  the two **silk anchor** parts (hp 24, ±36) firing 3-needle fans — kill both and
  the cocoon is eggs only (L7 "the structure changes as you win").
  **Point-blank invitation:** the column *under* the cocoon is where no egg goes.
  rep ≥ 3 fires eggs down the middle — the timeout-rider tax closes the
  invitation.
- **P2 — THE MOTH** (hp 402). The imago: **hard strafing**, rail to rail at
  4.0 px/f (faster than the ship's 3.7) on boss 1's far-side-of-the-player rule,
  dwell 150, y 108. `ledFan` every 44 f (aimed AND led — neither standing still
  nor drifting answers it; led fire is boss-only, S3b-6). Every 60 f it **lays a
  single slow egg wherever it is** (fuse 150 f) — the dialect distorted by a
  moving emitter: its path becomes a delayed minefield. A **wing-beat** on each
  landing throws two static fans OUTWARD, so the column under it is clear — the
  safe spot, re-earned every step (L7). Part: one **wing node** at +38 (hp 56),
  the form's only spray, asymmetric on purpose as on both earlier stages.
- **P3 — THE EMBER CORE** (hp 405). Bare core on the banded sweep (ω 0.005) with
  the ±22 px bob; the desperation medley recombines only what came before — the
  bare-core ring beat (14 + 2·min(rep, 4) at 1.45·k), P1's egg fans, P2's led
  fans; rep ≥ 3 adds rings. Parts: two **relays** at ±38 (hp 24) firing aimed
  needle pairs.

Camp governor: the same code, one property lookup away. Parts bite back is Q17,
unresolved: parts here behave as stage 1's.

### 14.6 Numbers as built

| Thing | hp | value | window | r | fires | contact |
|---|---|---|---|---|---|---|
| Formation leader (11) | 24 | 500 | 150 f | 12 | pink 3-prong at age 70, then / 90 f; wider once turned | yes |
| Follower (0, holdT 3/4) | 2 | 200 | 75 f | 10 | the shooter third: one pink prong at age 70 | yes |
| Carrier (12) | 44 | 800 | 210 f | 14 | cyan 3-fan / 95 f; pods / 110 f (70 f hot) | yes |
| A Twin Moth (13) | 220 | 3,000 | 380 f | 20 | §14.4 | yes |
| The Moth Queen (5) | 390 / 402 / 405 | 12,000 / phase | 600 f | 30 | §14.5 | yes |
| Queen parts (6) | 24 (P2 node 56) | 1,000 | 300 f | 7 | per form | yes |

Zero new hp tiers (plan §4 rule 3): 11 = the turret row, 12 = the mid row,
13 = the elite row, all copied verbatim from `ENEMY_DEFS`. Castes:
`NEEDLE_TIER` + 12, 13 (the leader stays pink — turret class). Bullet families
on screen ≤ 3. **Performance (`tools/s3peek.html`, headless Chrome, 60 draws
averaged, budget 16.6 ms): the swarm rush's densest frame = 78 bullets in
0.14 ms; the run's densest frame = 86 bullets in 0.15 ms.** Max bullets seen by
any bot on any seed: 194 (passive-human, at the Queen); max enemies on screen:
45 (the swarm rush, expert) against a 64 cap.

### 14.7 The probe (`tools/probes/stage3-probe.mjs`, seed C0FFEE + the six robust seeds)

The referee's four bots on stage 3 alone (`startRun(g, 0, 2)`), plus the expert
with lives pinned, plus ONE full campaign run (levels 0 → 1 → 2 on the continued
rng stream). Remember the r79 baseline: at HEAD the same expert **game-overs on
stage 1's boss**, so "the bot dies at the Queen" is the bot's ceiling at 3× hp.

| bot (C0FFEE) | outcome | clock | to boss | forms | score | kills / speed | deaths by section | max bullets | rush b/e | timeouts | Moths |
|---|---|---|---|---|---|---|---|---|---|---|---|
| expert | game over in P2 | 1:25 | 1:01 | 2 (P1 9 s) | 119,330 | 111 / 78 | S4 1 · S5 1 · S7 2 | 83 | 78 / 45 | 0 | 11.2 s |
| aggressive-human | game over in S5 | 1:03 | — | 0 | 61,050 | 110 / 67 | S4 2 · S5 2 | 72 | 72 / 41 | 0 | 20.1 s |
| passive-human | clear (3 lives) | 3:19 | 1:27 | 3 (37/36/36 s) | 54,340 | 139 / 66 | — | 170 | 70 / 39 | 5 (both Moths + every form) | 37.2 s |
| blind | game over in S4 | 0:36 | — | 0 | 33,150 | 74 / 50 | S1 1 · S2 1 · S3 1 · S4 1 | 65 | — | 0 | — |

Across the seven seeds: expert to-boss 1:00–1:02, forms reached 1–3, score
112–139 k mortal, deaths 4 (one or two in S4, one in S5, the rest at the Queen),
max bullets 66–130, dead air 2.3–3.1 s total (longest single stretch 0.7 s);
aggressive-human reaches the boss on 5 of 7 seeds and never past form 1;
passive-human clears every seed with 0–3 lives and five timeouts (both Moths and
all three forms); blind dies at 0:35–0:36 in S1–S4 on every seed. The formation
ledger, expert: 13 files, **6–9 scattered · 3–5 turned**; passive-human: **2–3
scattered · 10–11 turned** — the niche's two outcomes separate cleanly by skill,
which is the S4 dynamic-lifecycle demand answered by a *formation* instead of an
hp bar.

**The clock (expert with LIVES PINNED — probe-only, so every form is
measured):** clear on 7/7 seeds, **1:45–2:03** (target 2:00; envelope
1:30–2:15), boss reached at **1:00–1:02** (Psikyo#1: 42–80 s), boss =
**42–51 %** of the clock (band 30–50 % — six of seven seeds inside it; the
seventh is feedf00d at 51 %). This is the closest any stage has come to the
plan's envelope: stage 2 sits at 1:53–2:14 with the boss at 48–55 % (Q24), and
**the fix is not hp** — see Q24. Score 156–194 k, deaths S4 1–2 / S5 1 / S7 3–7.

**The full campaign** (`startRun(g)` → seam → seam, expert, C0FFEE): the honest
r79 expert still game-overs on stage 1's boss (`gameover f6438 79,790`) — nobody
reaches stage 3 at r79 without the extend. With lives floored at 1 through
stages 1–2 (probe-only): stage 1 `stageclear 2:21 / 174,230` → stage 2
`stageclear 2:09 / +133,980` → stage 3 `gameover 0:42 / +35,240`, run total
5:13 / 343,450 / 16 deaths. With the ship invulnerable from the first seam
(`campaign-probe`, flow only): all three stages clear, **7:05 total, 439,740**,
zero timeouts, and **the 400 k extend is earned in stage 3** — the first time
plan §5 A1's number has been reached by anything.

### 14.8 Open questions (this stage)

Q29 (the rush vs the novice test), Q30 (does the leader READ), Q31 (does anyone
ever use the just-in-time cancel), Q32 (the pair and the r18 seal), Q33 (the
egg's telegraph) in §8. Q24 (the boss's share of the clock at 3×) and Q17
(parts bite back) apply here unchanged.

**Boghog's novice test** [T1], measured (`stage3-probe`-style script, seven
seeds): freeze the expert — fire only, no movement — for 60 f from every file's
spawn frame. **49 of 49 isolated file windows (S1–S3) survive on every seed.**
The only freeze deaths are in the SWARM RUSH: exactly 2 per run on all seven
seeds, always with three or four files overlapping. So the *file* passes the
test and the *density peak* does not — which is Q29, and Jacob's call.

## 16. Stage 5 — THE GREAT ALTAR (r83, final-boss SKELETON)

*(§15 — Stage 4, THE BLOOD GATE — will be inserted BEFORE this section when that
stage is built. This section is out of numeric order with the campaign on
purpose: plan §7 step 4 builds stage 5's boss FIRST, because the finale is a
medley and stage 4's dialect has to be designed knowing it will be quoted.)*

*Built 2026-09-10 from plan §3 "Stage 5 — THE GREAT ALTAR". This is the FINAL
BOSS ONLY: there is no place ramp, no altar stair, no compressed "best of"
approach, no returning-midboss gauntlet (Hearse → Twin Moths → Gatekeeper — the
Gatekeeper is stage 4's midboss and does not exist), no campaign receipt and no
loop-2 seal. `STAGES` is still `[s1, s2, s3]`: the module is **not registered**.
Module: `src/core/stages/s5.js`. Probe: `tools/probes/idol-probe.mjs`. Peek:
`img/r83-s5-idol.png`. Music reuses the boss track. In every skin the Idol falls
back to the base painter (`base.js:543 paintStage5Boss`), as stages 2 and 3's
bosses do.*

**How to reach it.** Probe: `node tools/probes/idol-probe.mjs` (it pushes the
module onto `STAGES` at runtime — the array is mutable on purpose). Browser:
`index.html?boss=idol` appends it for that page load only (`main.js`, one
`if`, off by default), so it lands at index 3 and the PRACTICE row reads
**`STAGE 4 — THE GREAT ALTAR`** — its real slot number *until stage 4 is
inserted before it*. `index.html?boss=idol&level=3` starts the fight directly.
Without the flag nothing in the shell changes. Peek page: `tools/s5peek.html`.

### 16.1 The four forms

The ritual is stages 1–3's by construction (§5.1): WARNING 70 f over an emptied
field → `bossEntrance` (90 f armored descent, parts on the last beat) →
`bossBurn` at each handoff → `advanceIdolPhase` (cancel wall, item shower with
the late-kill fade, 60 f armor) → `bossTimeout` (35 s per form) → the camp
governor → the escalation clock `k` (§5.2b, restarting at zero on every form —
with four forms that reset happens three times).

**The boss-only dialect is the MEDLEY ITSELF** (S3b-6). No stage section, and no
earlier boss, speaks four stages' dialects out of one body. Every individual
pattern in the fight is a quotation; form 4 invents nothing (S3b-5).

| # | form | hp | movement | quotes | part(s) | the beats | file |
|---|---|---|---|---|---|---|---|
| 1 | **THE IDOL** | 220 (elite tier) | static — ±18 px at ≤ 0.5 px/f, y 90 (or the governor's safe spot when latched). The only boss in the game that lets you pick your ground | **STAGE 1**: the accelerating `lanceVolley` + the laned `arcWall` | two **votive braziers** ±36 (24), 3-needle aimed fans — kill both and the idol is lances and walls only (L7) | lance t 24 (5 + rep, cap 1.5×·k) · aimed fan / 46 f · arc wall t 76, **lane 6 of 13 = straight down** · rep ≥ 3 a wall that does *not* open under it | `s5.js:132` |
| 2 | **THE DEMON** | 220 (elite tier) | aimed — hunts your column at 1.5 px/f, y 104. Slower than the ship (3.7), so it is escapable but standing still is the one answer that fails | **STAGE 3** (`eggFan`, fuse 110 f) + **STAGE 2** (`staticFan` along a censer's radial at the swing's ends only, chain 78, ±0.95 rad, period 200 f) | one **horn** node +38 (**56**), bounded spray — asymmetric on purpose, as every stage's aimed form | eggs t%74=10 lobbed outward · arcs t%32=0 when \|θ\| > 0.45 · `ledFan` t%50=16 · rep ≥ 3 eggs down the middle | `s5.js:157` |
| 3 | **THE PRIESTESS'S MIRROR** | 402 (boss tier) | **player-shaped**: moves at **3.7 px/f — the ship's exact speed** — to `W − player.x`, the mirror of your column, y 112 | **Ship B "PRIESTESS"** (parked branch `design/ship-b`, NOT merged — hand-written here): a three-way spread, fired down | two **option pods** ±34 (24), cyan needle pairs — the ship's own wing guns turned on you | spread t%22=0 (3 / 0.50 / 2.7·k) · **FOCUS** t%16=0 (3 / 0.10 / 3.4·k) when the mirror is barely moving, i.e. when *you* are · an off-beat wide spread t%90=45 · rep ≥ 3 a ring — the bomb turned on you | `s5.js:182` |
| 4 | **THE HOLLOW CORE** | 405 (boss tier) | bare core on the house `bandedSweep` (ω 0.005) + the ±22 px breathing bob | **everything**: the bare-core ring (every boss's), form 1's lance, form 2's censer arcs and eggs, form 3's spread — and the inert `quoteS4` slot | two **relays** ±38 (24), needle pairs | ring t 20 (14 + 2·min(rep,4)) · lance t 70 · arcs t%34=8 · eggs t%62=30 · spread t 130 · **`quoteS4` t 155** · rep ≥ 3 extra rings | `s5.js:206` |

**The point-blank invitation** (S3b-SHOULD) is form 1's: the arc wall's lane is
`gapIndex` 6 of 13 — straight down, i.e. *under the idol* (boss 1's P1 rule,
"riding the lane IS pursuit"). The price of standing there is the lance, the
fastest thing in the game. At rep ≥ 3 the timeout-rider tax throws a wall that
does not open there, so riding the form out closes its own invitation.

**Castes / families.** Zero new emitters, zero new bullet shapes, zero new
colours: pink rounds (arcs, eggs, rings, the three-way spread) + cyan needles
(lances, aimed and led fans) + the player's — **2 enemy families per form**,
inside S2's ≤ 3. `NEEDLE_TIER` is untouched (the boss (5) and parts (6) were
already in it). **Zero new hp tiers** (plan §4 rule 3) and **zero new enemy
types** — `ENEMY_DEFS` is not touched at all, the newest id is still 13.

**Movement of the medley (S3 MUST, ≤ 2 focal points).** The five quoted layers
of form 4 sit on distinct beats of one 240 f cycle so they arrive in sequence,
not together — but `t%34` (arcs) and `t%62` (eggs) do collide periodically.
First pass; open as **Q36**.

### 16.2 The medley hooks, and `quoteS4`

Each quotation is a single named call, so filling or re-pointing one is a
one-line edit — that is the whole reason the skeleton exists before stage 4:

| hook | lives in | quotes | status |
|---|---|---|---|
| `lanceVolley` | forms 1 + 4 | stage 1's boss dialect (accelerating needles) | live |
| `staticFan` on `bobX/bobY` | forms 2 + 4 | stage 2's pendulum arcs (THE BELL, §13.5) | live |
| `eggFan` | forms 2 + 4 | stage 3's hatching eggs (THE MOTH QUEEN, §14.5) | live |
| `staticFan(…, 3, …, PI/2)` | forms 3 + 4 | Ship B's three-way spread | live |
| `ring` | form 4 | the bare-core beat every boss ends on (§5.2, R6.5) | live |
| **`quoteS4(g, e, k, rep)`** | form 4, `t === 155` | **stage 4's BOX TRAP** (WS03 #7: six emitters pen the player, then the pen moves) | **INERT — `s5.js:110`** |

`quoteS4` is a real call site on a real beat that does nothing. It has to be
inert rather than absent for two reasons. Rubric **S3b-5** says the finale
recombines the earlier forms' dialects *"and only those"* — a live emitter for a
dialect that does not exist yet would break that rule today. And plan §3 spends
the box trap on stage 4's boss with the words *"Touhou's favourite, **used once,
here**"* — so whether a finale quote counts as a second use, against [T1] "never
repeat the same encounter more than twice", is **Q39**, Jacob's.

**The contract for whoever builds stage 4** (also written in the code):
1. build the box as a `boxTrap(...)` emitter in `patterns.js` while building THE
   GATE; 2. import it here and fire **one pen**, sized down — a medley quotes, it
does not re-run the set piece; 3. it stays pink rounds, so form 4's family count
does not move; 4. it draws **no rng today**, so whatever goes in WILL move the
rng stream for any run that reaches form 4 — expect a referee recert (Jacob's
commit, never a builder's).

### 16.3 The hp budget — Jacob's decision, with the numbers

Plan §3 states the problem and the two horns: *"Boss ≤ 65 s (50 % of 2:15) —
four forms at 3× hp do not fit; either the finale runs its own multiplier or
forms 1–2 are short (≤ 10 s) and only 3–4 are full length."* The whole knob is
one named table, `IDOL_HP` (`s5.js:75`). **Option A is what r83 ships**; B and C
were measured with the probe's `IDOLHP=` override, not by editing the module.

Measured on the expert bot, lives pinned, seed C0FFEE + the six robust seeds:

| | option A — **shipped** | option B — the finale's own multiplier | option C — the mirror on the elite tier |
|---|---|---|---|
| `IDOL_HP` | **220 / 220 / 402 / 405** | 258 / 266 / 268 / 268 (m ≈ 0.66 of the r71 tiers) | 220 / 220 / **220** / 405 |
| new hp numbers | **none** — elite row + the r71 boss tiers | **four**, all new (needs Jacob's override of "zero new tiers") | **none** |
| form 1 | 6.5 s | 7.2 s | 6.5 s |
| form 2 | 5.2–6.7 s | 7.7–8.6 s | 5.2–6.7 s |
| form 3 | **36.0 s, TIMED OUT on 7 of 7** (23–230 hp still standing) | 18.5–36.0 s (timed out 2 of 7) | 16.4–36.0 s (timed out 1 of 7) |
| form 4 | **never reached honestly** (22.1–23.2 s measured in isolation) | 11.8–17.8 s | 17.5–24.9 s |
| forms reached | **3 of 4 on every seed** | 4 on 5 of 7 | 4 on 6 of 7 |
| whole boss | 49–52 s | 49–59 s | 47–71 s (over 65 s on 2 of 7) |

**The finding that matters is not the hp — it is the dps.** Measured hp/s for
the expert: form 1 **34**, form 2 **38**, form 4 **18**, form 3 **11**. Form 3
is a third as damageable as form 1 *because of how it moves*: a boss travelling
at exactly the ship's speed away from the mirror of your column is never
stationary in your firing lane, and the camp governor then bans the one spot
that solves it (the centre line is the mirror's fixed point — stand on `W/2` and
it must stand on you; hold there and the governor latches and slides it off).
So **402 hp is not 402 hp on this form**, and time — not hp — is the unit the
budget has to be written in. That is why option C, which uses **no new numbers
at all**, lands form 3 inside HOMAGE's 15–25 s guardrail where option B's
"balanced" four-way split does not fully.

Against HOMAGE's *"boss phases 15–25 s"* guardrail (`HOMAGE_STUDY.md:118`), on
option A: forms 1 and 2 are **under the 15 s floor** (5–7 s) and form 3 is over
the ceiling; only form 4 (22–23 s isolated) sits inside. Psikyo's own four-form
finale — the thing being homaged — runs **10 / 10 / 14 / 12 s for ~65 s total**
(`homage/study-s1945ii.md:121–126`), so the *film* supports short opening forms
and the *guardrail* does not. Amending it is Jacob's (plan §4 rule 1 already
names that override path). Open as **Q37**.

**Timeouts.** Each form carries the existing `BOSS_PHASE_TIMEOUT` (35 s, r72) —
no new number. Four forms is therefore a **140 s worst case** against a ≤ 65 s
target and a ≤ 2:15 whole-stage cap, and the passive bot demonstrates it (91–110 s,
three or four timeouts). A shorter timeout for the short forms is the obvious
answer and is **Q38**, not a builder's call.

**Payout.** `scoreBossPhase` pays `ENEMY_DEFS[5].value` per form, so a four-form
boss pays **48,000** where every other boss pays 36,000. That is the same rule
applied one more time — no scoring math changed — but it is a finale premium
nobody has decided on: **Q40**.

### 16.4 Art — the four forms, and the one declared deviation

`base.js:543 paintStage5Boss`. Silhouette, movement and dialect all change per
form (S3b MUST 2): **the idol** (a seated effigy on a plinth, hooded, one lidded
eye) → **the demon** (horned skull, folded wings, the censer swinging under it —
the chain and its bob are drawn by `renderer.js:611 drawIdolCenser`, its own
function so stage 2's chain path is untouched) → **the mirror** (below) → **the
hollow core** (stripped body, burnt wing roots, ember).

- **A fourth core hue: there isn't one, on purpose.** The bible (§3 "never a
  fourth saturated hue", §10 "core colour per phase stays pink / cyan / gold")
  has no fourth to give, so form 4's core burns in the BOSS row's own `ember`,
  already sanctioned there for the burn beat. No new hue enters the game and
  pink/cyan-are-bullets, gold-is-value still holds.
- **A fourth arena restain** (S3b-SHOULD) in all three skins. Adding it fixed a
  real bug the peek page caught: `cute-occult` and `synthwave` indexed 3-entry
  boss-phase arrays by phase, so on form 4 cute-occult read `undefined` and left
  the previous fill across the whole field, and synthwave's `BTONE[3]` was
  undefined. Indexes 0–2 are byte-identical, so stages 1–3 draw the same skies.
- **DECLARED DEVIATION — form 3 draws the player's shape on an enemy.** The
  bible does not cover it, and three of its rules pull against it: §3
  exclusivity ("violet only on the player"), §6's ladder (a boss "reads as the
  biggest thing on screen", 84–110 span, vs the ship's 28), and §1's "big things
  are slow and strong". The resolution keeps all three: **the shape** is the
  ship's, **the palette** is the boss's (bone hull, boss armor, the form's core
  hue — not one violet pixel, so S2-MUST-3 holds and the player still finds
  their own ship by colour), and it is drawn at **boss scale (~86 px span, three
  times the ship)**, so the ladder is intact and it reads as an idol *wearing*
  your shape rather than a second player ship. The only rule it genuinely breaks
  is "big things are slow" — and that lie is the story beat. Whether it actually
  READS as the ship is **Q35**, Jacob's eye, not a metric.

### 16.5 The probe (`tools/probes/idol-probe.mjs`, seed C0FFEE + the six robust seeds)

The referee's four bots on the finale alone, the expert with lives pinned, a
probe-only pass that holds forms 1–3 at 1 hp so the medley is measured on every
seed, and the hp-budget table. `IDOLHP=a,b,c,d` measures any budget without
editing `s5.js`. `test/sim.mjs` is untouched; the stage-5 control run is a
Jacob-authorized referee commit (plan §4 rule 14).

| bot (C0FFEE, option A) | outcome | boss clock | forms | seconds per form | score | deaths by form | max bullets | timeouts |
|---|---|---|---|---|---|---|---|---|
| expert | clear (1 life) | 50.1 s | 3 of 4 | 6.5 · 5.8 · **36.0 TIMEOUT, 23 hp left** | 72,700 | F3 2 | 98 | boss-p3 |
| aggressive-human | clear (0 lives) | 43.1 s | **4 of 4** | 9.3 · 4.0 · 16.3 · 11.7 | 115,370 | F3 2 · F4 1 | 88 | — |
| passive-human | clear (2 lives) | 91.5 s | 3 of 4 | 36.6 TIMEOUT · 17.0 · 36.0 TIMEOUT | 23,910 | F1 1 | 153 | p1, p3 |
| blind | clear (0 lives) | 56.0 s | 3 of 4 | 9.4 · 8.8 · 36.0 TIMEOUT | 72,210 | F1 1 · F2 1 · F3 1 | 118 | boss-p3 |

Across the seven seeds (option A): the expert clears with 1–2 lives on all
seven, **always by timing form 3 out**, boss 49.5–51.0 s; the aggressive-human
reaches form 4 on 2 of 7 and is the only bot that kills the mirror inside its
timeout; the passive-human rides 91–110 s on two or three timeouts; the blind
bot game-overs on 4 of 7. Max bullets on screen, any bot any seed: **221**
(passive-human). Worst draw on the peek page: **0.12 ms** for 42 bullets
(headless Chrome, 60 draws averaged, budget 16.6 ms) — the finale is nowhere
near the S8 gate, and stage 1's midboss bloom still holds the bullet record.

Note the shape of that expert result before reading it as a verdict: the bot
takes form 3 from 402 to as little as 23 hp and runs out of clock. That is a
**bot ceiling against a form built to deny a pursuer** — the aggressive-human,
which lags by 7 frames and therefore routes differently, kills it in 16.3 s.
It is not patched with hp; the options are Q34.

### 16.6 What is NOT built (so nobody assumes it is)

The altar stair and the sigil disc (a place ramp, so no `SEC_LANDGEO` row in any
skin — the skeleton borrows stage 1's), the compressed "best of" approach (one
formation, one tank column, one Warden, one carrier, ≤ 25 s), the returning-
midboss gauntlet (Hearse → Twin Moths → **Gatekeeper**, which needs stage 4),
the BRDA#8 countdown meter across it, the release, the campaign receipt, the
loop-2 seal, a stage-5 music cue, and cute-occult creatures for the four forms.
`STAGES` stays `[s1, s2, s3]`.

### 16.7 Open questions (this stage)

Q34 (the mirror's timeout / the hp budget), Q35 (does the mirror READ as the
ship), Q36 (the medley's focal points), Q37 (short forms vs the 15–25 s
guardrail), Q38 (four × 35 s), Q39 (`quoteS4` vs "used once, here"), Q40 (the
four-form payout) in §8. Q16 (boss hp), Q17 (parts bite back) and Q24 (the
boss's share of the clock) apply here unchanged — Q24 especially: a *three*-form
boss already overruns the 30–50 % band, so a four-form finale inherits an
unresolved question upstream of it.

## Changelog of decisions recorded here

- 2026-08-27 — r9 midboss arrival bloom + speed-gated 100/bullet cancel.
  Decision: keep the full-screen detonation feel; source density from
  aggression, never from waiting. P3 parts: practice, not tuning, for now.
- 2026-08-27 — r10 mid entry shot (age 65 aimed fan). Decision: make the mid a
  race between closing and hanging back; never add hp. Referee red set moved from
  {s6, s4, s7_robust} at HEAD to {s7_pressure 23.2<24, s7_clearable expert P3
  timeout} — rng-stream drift, uncertified either way; recert pending.
- 2026-08-29 — r11 cancel scoping: mids no wall, elite local (90px), midboss/
  boss/S7/bomb walls unchanged; elite entry signature wall (age 70). Decision:
  full-screen release is reserved for authored moments; relief is scoped to what
  the dead enemy controlled. Referee: s7_pressure GREEN (23.2→32.2), s6/s7_
  clearable green; red = s4_dynamic 1.47<1.6 (mechanical: fewer wipes narrow the
  passive/aggressive bullet contrast — the check's bar encodes the old wipe-heavy
  world; recert question, flagged in §8) and s7_robust (5eed42 P1+P2 timeouts,
  stream drift).
- 2026-08-29 — r12 MOCK (playtest pending): mid's own voice. Entry fan replaced
  by an entry SPRAY (7 pink, lingering terrain); parked cycle = DOUBLE-TAP (two
  narrow 2-needle prongs 12f apart, second re-aims — tracks the dodge) alternating
  with a spray every 160f; leave-alive hose unchanged. Rationale: mid and turret
  fired the same aimedFan sentence; reserved dialects (lance/led/spiral=boss,
  bendy=midboss, laned wall=elite) forced a new voice from primitives. Measured:
  section avg bullets 32.5 (was 59 — fewer, deadlier: the human-like bot now
  loses a life in the section). Sprays draw rng → referee reshuffle expected.
- 2026-08-29 — r13 ramp (playtest: r12 still cleanly speed-killable): sprays at
  age 45 AND 85 (10 pinks, was one 7-spray at 65), parked cycle 160f→100f with
  the double-tap ~0.2s after park. Section avg bullets 59.7 / max 160 (r12:
  32.5/56); human-like bot loses a life. Speed kill still available, now earned
  inside the scatter. BUILD tag added to footer (r12→r13, src/version.js).
- 2026-08-29 — r14 midboss flip beat: phase B was hp-triggered but its patterns
  clock-triggered — at point-blank DPS act two lasted ~0.5s and could not fire
  (measured floor kill: 1.4s; bottom-lane 4.2s; window 11.7s). The 45% crossing
  now fires the B ring immediately (boghog T2 phase-bleed, T1 hp-as-duration,
  MSX expert bias). Verified: even the 1.4s kill meets the ring. Post-death
  scare attack (boghog T2) noted as optional, unbuilt.
- 2026-08-29 — r15 clear vacuum: boss killed → all items magnet to the ship at
  8px/f from any distance during the 150f pre-tally window (verified: 12 coins
  field-wide all collected). Cleared: homage L3 receipt, boghog loot-paid
  breathers, Psikyo/Cave stage-end auto-collect; MSX no-pushback (threat dead →
  no decision lost). Note: r15 coin-drops proposal (popcorn wave-end gold) is
  cleared-but-parked pending r13/r14 playtest settling (boghog pass-cooldown);
  this vacuum took the r15 build number.
- 2026-08-29 — r16 gold pickup presentation (Blue Revolver homage; built before
  r12–r15 landed from the parallel session, renumbered to avoid the r12 collision
  — it never carried a BUILD tag until r17): coin radius
  now scales with value (`min(12, 7 + val/150)`, was flat 6) + per-coin glint
  pulse. Renderer-only + a cosmetic `tw` phase field on the item struct (no rng,
  nothing in core reads it). Control run confirmed sim-invisible: gameplay
  metrics byte-identical with/without; red set unchanged {s4_dynamic, s7_robust}.
  Open: grow collect radius 12→~16 to match the new visual edge (Jacob's call;
  shifts score timing a few frames, needs sim numbers).
- 2026-08-29 — DECISION (consultation, no code): "hard mode with suicide bullets"
  → **loop 2**, not a menu mode. Pillar 3 ("one honest difficulty, no menu
  slider") + non-goals ("a second loop is the natural v2") forbid the toggle;
  HOMAGE L8 / S1945II adopt #10 already spec the loop as a bullet-diff — same
  stage, every kill (popcorn included, Psikyo precedent) spits slow aimed revenge
  dots, cancel-eligible. MSX: options-menu difficulty "subverts the intended
  difficulty curve through external factors"; loop 2 is earned in-credit (expert
  bias) and Garegga-flavored (speed-killing everything now fills the screen).
  Boghog: suicide bullets are the "just get paid" spam layer — slow, readable,
  macro-dodge, licensed by cancels; rejects mode bloat. Cotton "You Do!" claim
  from TV Tropes checked in-game by Jacob and NOT found — dropped. Cancel rate
  for revenge dots = scoring, Jacob's call. Loop-1 referee path untouched by
  design (`g.loop` flag); loop-2 cert is a separate question.
- 2026-08-29 — r17 turret arrival shot (see §3 Turret). Problem (Jacob playtest):
  "move to the top of the screen and kill all the turrets before they have a
  chance to shoot." Probe confirmed it's structural, not skill: a top camper saw
  0 bullets in the alley. Corpora: **boghog** — turrets are "kill fast or be
  blanketed" [T2] but his speed kill had a price (off-route); ours had none →
  "aimed forces movement" [T3], "balance = counters, not numbers" [T3] (no hp;
  rejected per standing condition), same entry-signature grammar as r10/r11.
  **MSX** — expert bias: the rewarded play must not be the trivial play (Pillar 2
  inverted); difficulty clarifies design — the alley was "in low contrast."
  **Rubric S7** no-unavoidable-deaths: argued in §3 (contact already owns the
  no-path spot); not sim-enforced today. Pushback noted: boghog "don't design
  around your own ideal route" — the bots never camped, so this is a human-only
  fix and Jacob's playtest is the test (same caveat as r10). Referee (control =
  same tree minus the one line): s7_pressure 34.2→28.7 aggressive (bar 24,
  green), s4_dynamic 1.69→1.97 (green, up), s7_clearable green; **s7_robust
  RED: one boss-P3 timeout on feedf00d**, all 6 seeds still clear with identical
  lives — stream drift (alley changes bot timing → later spray rng lands
  differently; boss is ~5,000 stage-frames downstream), same signature r11
  logged on 5eed42. Recert item, not a balance regression. No rng drawn.
  **Playtest verdict (Jacob, same day):** the free camp is gone but the alley
  "still feels too easy — a master/expert shmupper will tear through it no
  problemo." Accepted as-is for v1 / stage 1: it's the on-ramp, and expert
  pressure on this section is deferred to loop 2 (L8 revenge dots turn every
  tear-through kill into return fire). Dials in reserve if that changes: earlier
  arrival (fire at y≈0, before vulnerability), tighter pair timing (−40 spawn
  closer to −16), or arming the alley's popcorn too. No hp.
- 2026-08-29 — top-of-screen silence zone found in playtest (Jacob's friend);
  four recommendations logged as open question §8.9 (distance-floor mayFire,
  boss never muted, side/rear entries into the top band, top-band referee
  probe). No code. Deep research on classic/Japanese bullet hells commissioned:
  targeting/fire-gating rules, enemy density per stage, destructible
  environment — the three holes Jacob named after playing S1945II, Soldier
  Blade, DDP.
- 2026-08-29 — r18 fire gating: `mayFire` rewritten from "enemy must be 40px
  ABOVE the player" to the canon's three gates (on-screen; bottom screen band
  y > H−60; 48px seal), boss never sealed; the r17 arrival shot now honours the
  seal. Deep-research report (`~/Dev/claude-visualizations/shmup-canon-three-
  holes-report.md`) found no classic game gates fire by the player being above
  or beside an enemy. Corpora: **boghog** WS04 ("ground enemies will stop
  shooting if the player is close… a zone at the bottom of the screen where
  enemies will stop shooting since the player typically can't shoot backwards";
  the top is dangerous because "their collision hitboxes still make that area
  very dangerous" — WS05); **Toaplan/Yuge** (proximity seal "so people wouldn't
  think the game was unfair"; "tests to see whether the enemies could hit the
  ship at any given location on the screen"); **Ikeda** ("I do my best to find
  and remove [safe spots]"); **MSX** entropy ("consequence for the player being
  idle"); Pillar 5 (top risky, not forbidden), Pillar 6 (fire from below in the
  existing needle language — no new bullet family), rubric S7 reaction floor
  (48px ≈ 240ms). Pushback noted: canon seals GROUND enemies only; we seal all
  non-boss enemies because S7's floor demands it — air enemies at 20px would be
  unreactable. **Referee (Jacob-authorized edits: new `s6_topband` probe; the
  bot's 40px target filter is untouched — it picks what to shoot, and shots only
  travel up):** old rule → boss-arena top-parker CLEARED with 3 timeouts, 0
  bullet deaths, 8 bullets fired, score 0 (the friend's bug, reproduced); r18 →
  dies in 562f to 124 bullets. Stage top-parks: first bullet death 12.7s → 2.6s.
  Turret-alley camper (y 40, sidestepping): 24 → 369 bullets, 0 → 3 deaths.
  Expert bot BYTE-IDENTICAL (167,360, same deaths) — honest low play never
  touched the old mute. Aggressive-human: avgBullets 28.7 → 36.8, one new
  MIDBOSS timeout + one more death (the midboss now fires when hugged from
  beside/above — the first real balance signal, expected: aggression costs
  bullets now). **s4_dynamic RED 1.97 → 1.44 (bar 1.6)** — the passive/
  aggressive bullet contrast narrows because the aggressive bot takes fire it
  used to mute; §8.1 already asks whether that bar encodes the old world.
  Recert decision. s7_robust unchanged (feedf00d P3, pre-existing). s6_nocamp,
  s7_clearable, s7_pressure (36.8, bar 24) green. BUILD r17 → r18.
  **Playtest verdict (Jacob, same day):** (1) "top of the screen is not a safe
  zone anymore — you get shot in the ass"; (2) midboss: "we have work to do, but
  it's ok for now" — follow-up item, not a blocker; (3) turrets still easy when
  point-blanking and speed-killing — expected, it's the canon's seal reward, and
  the real fix is overlap (S3 top-band traffic + D-pass density), next; (4)
  needles from beside/below read fine (Pillar 6 holds). r18 pass settled.
  **Midboss (Jacob, after r18):** "way too easy to speedkill. With no
  overlapping enemies it's very boring — doesn't even feel like a challenging
  section." Diagnosis matches the research: the midboss is fought in a vacuum
  (mid #4 exits, nothing else is on screen — the r9 bloom waits for a clean
  screen by design), so the point-blank speed kill has no cost. The canon
  answer is overlap, not hp (standing rule): popcorn flying in during the fight
  (boghog WS05 "one enemy that controls space + popcorn flying in"; Psikyo
  bosses spawn popcorn — "procrastinate a boss fight to capitalize on the
  popcorn waves that appear regularly", 1cclog on Strikers 1945). Folded into
  the S3/D-pass plan as its first target; see §8.10.
- 2026-08-29 — r19 overlap pass (S3 of the canon report + §8.10): popcorn
  CROSSERS through the top band (turret alley ×2, mid gauntlet ×2, 5 each),
  RISERS from the bottom rails (rush ×2, elite rep 2, 4 each), a midboss
  ESCORT (crosser pair every 150f after the bloom), and the midboss removed
  from the seal (bosses never seal). +32 timeline popcorn (+~6 escort) →
  ~138 enemies, ~30/min (canon report: 60–190; this is the first step, the
  D-pass is the big one). Corpora: **boghog** WS05 Top Line ("break the top of
  the screen into lanes… spawn enemies on opposite sides"), WS05 "sequences of
  elite spawns get boring if not supported by smaller enemies like flying
  popcorn", Gunvein "ships fly up from the bottom"; **Garegga** st.4 ambush from
  below, st.5/6 side entries; **Psikyo** bosses spawn popcorn (1cclog S1945);
  **MSX** density/entropy; Pillars 1, 5; standing rule no-hp honoured. S7
  reaction floor for risers argued in §3 (40f slow start). G2 landmark turrets
  deferred — needs the hull set-piece. **Referee vs r18 control (no referee
  edits this pass):** s4_dynamic back to GREEN 1.44 → 1.89 (traffic reaches
  the passive bot), s5_edges 2 → 0, s7_pressure 30.6 (bar 24), s6_topband
  green; expert 100 → 128 kills, score 167,360 → 168,370, deaths 1 → 2; blind
  bot lasts 0.71 → 0.86m and scores 32k → 69k (more popcorn to farm — watch
  for the D-pass). **s7_robust red with a NEW cause:** 1234567 midboss timeout
  (the bot chases escort popcorn until the 1400f timeout), facade boss-p3
  (drift), feedf00d's old P3 timeout gone; lives 1 on three seeds. Midboss
  isolation (seed 1): unseal alone 448 → 653f (speed kill kept); escort alone
  → 912f (window missed) — bot target priority, see §4.3. Turret-alley camper
  y40: 316 bullets, 4 deaths. BUILD r18 → r19. Open for Jacob: (a) accept the
  escort and treat the bot's midboss chase as a referee-bot limitation (bot
  target-priority edit = referee edit), (b) thin the escort (every 200f, or
  one crosser instead of a pair), (c) escort only after the phase-B flip.
- 2026-08-30 — Booth session 1 (r19): first pause-and-talk playtest. Two flags,
  both replayed to the frame. Findings: (1) S1→S2 seam has a 2.5–3 s empty
  screen even with the caravan pull — Bored; the turret arrival landing on the
  music lift is a positive to protect; (2) turret alley overlap works
  mechanically but isn't cohesive because all enemies read as the same grey
  shape — enemy visual identity is the next hole (§8.11), crosser entry point
  secondary. Tooling: `booth.html`/`src/booth.js`/`tools/booth-server.mjs`/
  `tools/booth-replay.mjs`, `playtest/` (uncommitted). No code changes to the
  game this session.
- 2026-08-30 — r20 enemy identity art pass (§8.11; renderer-only, hitboxes
  and core untouched → referee unaffected by construction). Replaces the five
  flat grey polygons with two families and a size ladder: AIR — propeller
  fighter (popcorn), darker tilted diver twin, swept dart CROSSER flying
  sideways, stubby khaki RISER that climbs nose-up with exhaust and flips to
  fall, twin-boom MID that bobs while parked, four-engine bomber ELITE with
  rust wingtips, flying-wing MIDBOSS whose core goes pale on the phase-B flip;
  GROUND — TURRET on an octagonal plate with a drop shadow, khaki dome, a
  barrel that aims at the ship, rust when angry. All sprites nose-along-
  heading (rotate to velocity), two-tone shade/base/highlight, prop flicker.
  Palette stays desaturated (steel-blue air, olive ground, dark steel heavies)
  so pink/cyan/gold/violet remain bullets/items/player-only. Corpora:
  **boghog** WS02 ("values are the most important thing… colours still
  matter"; reserve bullet hues), WS04 ("enemies should react to getting hit…
  visible damage and destructible parts sell the feeling of interaction" — hit-
  flash kept); **Komazawa** ("the way tanks fire… every enemy and character in
  that game had a backstory"); **DDP** scale hierarchy ("big things are slow;
  fast things are small"); **Psikyo** WWII planes vs ground guns (S1945II
  study); Pillar 6 readable chaos honoured (enemies below bullets, no
  saturated colour). Gallery: tools/enemy-gallery.html (served by the booth
  server). Open after playtest: sprite detail at 2× canvas scale, whether the
  khaki riser reads as "from the ground", boss forms (untouched, already
  three silhouettes). BUILD r19 → r20.
- 2026-08-30 — r20 continued: Booth session 2 (three display lies + two bugs,
  all found by Jacob in play; debrief `playtest/sessions/2026-08-30-booth-2.md`).
  Fixed: popcorn nose now follows true flight (the core adds a sine wobble
  bigger than stored vx — renderer now adds the same term); midboss "teleport"
  at park (sweep ran off e.age ≈ 89 — now a 60f glide onto the same path;
  referee vs r19 control: s4_dynamic green 1.82, s6_alignment 2.81 vs bar 3 —
  RED, same recert class as §8.1; s7_robust swaps facade boss-p3 → midboss);
  WARNING now CUTS the stage track (was a 0.9s fade, audible under the siren);
  player ship redesigned 18 → 28px around the unchanged 3px core; hitbox
  display research commissioned and applied — ship dot drawn at the 6px
  effective radius, bullet white cores at their true 3px (see §6.2, with
  pictures). New dev tools: hitbox tester + enemy gallery. Corpora: boghog
  WS01 ("small hitboxes… much smaller than their sprites"; "tiny sizes can
  still be unintuitive to new players — find a balance"), WS02 value contrast;
  Touhou/CAVE/Blue Revolver marker conventions (hitbox-display-report.md);
  Significant Bits "players were less likely to feel cheated if they came out
  on the positive end". Open: shrink bullet hit radius 3 → ~2 (balance +
  referee, Jacob's call, parked); boss art to match the families (§8.11 scope).
  **Playtest verdict (Jacob, post-commit):** all four targets pass — "crossers
  and popcorn look different. midboss doesn't teleport. warning music is good.
  death feels earned." Overall: "feels OK" — the display/identity debts are
  paid; the remaining gap to *feels great* is the open density/pacing work
  (S1→S2 seam, crosser entry, D-pass), not polish. r20 settled.
- 2026-08-30 — research corpus moved into the repo (`docs/research/`, with
  raw per-pass findings and an index that carries the roadmap state) so any
  future agent can continue without this session's context. New: ZeroRanger
  deep-dive (`research/zeroranger.md`) — hue=threat/value=identity palette
  (adopt for the boss-art ramps), pattern-over-quantity density counterweight
  to the canon numbers (weigh in the D-pass shape decision), boss timer and
  overkill scoring candidates, save-wager refused (steal the stake shape only).
- 2026-08-30 — r21 seam pass (Booth session 1 flags, playtest pending): (1) the
  S1→S2 lull bridged with popcorn (5 at stageT 560, 4 at 645) — the turrets and
  their music-lift arrival are byte-identical (first vulnerability frame 690 in
  both builds); DDP grammar, "popcorn is mortar between bricks", and the felt
  problem was two parts: an empty gap the caravan pull only partly compresses
  plus ~1.4s of armored turret crawl — the bridge now overlaps both. Measured
  (expert bot, "nothing shootable" seconds across the seam): total 1.62s →
  0.83s, remaining = the crawl, now with live targets alongside. (2) Alley
  crossers enter mid-side at y 88 (Garegga side-tank height) instead of the top
  corner ("the top sides doesn't feel right"); mid-gauntlet crossers keep y 44
  so the Booth can compare heights. **Referee vs r20 control: s6_alignment
  recovered to GREEN (2.81 → 3.02) and s7_robust fully green for the first
  time since r18 (both midboss timeouts gone, facade 0L → 2L); s5_deadair
  expert max streak 1.1 → 0.8s; s7_pressure 38.0. s4_dynamic RED again (1.82 →
  1.49, bar 1.6)** — this bar has now flipped on four consecutive passes with
  every timeline change; recert question §8.1 is overdue. BUILD r20 → r21.
  **Playtest verdict (Jacob, 2026-08-31):** "feels ok enough. definitely very
  little lulls and downtime." r21 settled. His one report — "after killing the
  boss his laser kept flying at me and killed me" — replayed (run5, frame 3092)
  and decoded: not the boss (all phases were speed-killed and full-screen
  cancelled); it was the S6 ELITE kill — r11's LOCAL cancel leaves the elite's
  laned wall downfield, and the rep-2 turrets/risers fired after it died. Open
  question for Jacob: keep as the r11 price, or widen the elite cancel to its
  own bullets screen-wide.
- 2026-08-31 — r22 flee telegraph (Jacob's report, from an UNRECORDED run:
  "after killing the boss his laser kept flying at me and killed me"). Code
  audit: sub-parts die with the boss and a killed phase cancels full-screen —
  the only path leaving lances behind a vanished boss is the P3 TIMEOUT, whose
  despawn was silent and indistinguishable from a kill. The r6 scoring law is
  untouched ("pays nothing, cancels nothing, leaves its bullets"); the flee is
  now LEGIBLE: "FLED +0" popup + a fixed fan of departure streaks (spawnFx,
  zero rng) on boss-phase and midboss timeouts. addPopup exported for it.
  Referee: byte-identical to r21 across all four bots (scores/kills/deaths/
  timeouts equal); red set unchanged {s4_dynamic}. Booth lesson reinforced:
  the flag button exists because unrecorded memories decode slowly — the
  recorded elite death (see r21 entry) was a different, real finding (elite
  local-cancel question, still open). BUILD r21 → r22.
- 2026-08-31 — r23 grave-shot fix (Jacob, firmly: "I killed the boss and its
  blue laser stayed on screen and killed me"). Root cause found in the enemy
  loop: enemies UPDATE (fire) before the dead-sweep removes them, so a killed
  P3 boss got one more update tick and could emit a final lance volley AFTER
  its own kill's full-screen cancel — from beyond the grave, uncancellable
  (r22's timeout theory was wrong; apologies are in the transcript). Fixes:
  (1) dead enemies never update; (2) the guarantee Jacob asked for —
  `g.bossKilled` set on a killed final phase, and update() scorelessly sweeps
  any enemy bullet every frame until the tally (a TIMED-OUT boss's bullets
  still stay, r6 law untouched). Referee: byte-identical to r22 across all
  four bots and all six robust seeds; red set unchanged {s4_dynamic}. The
  bots never hit the one-frame window — human-only timing bug, three sessions
  of Booth flags to pin. BUILD r22 → r23.
- 2026-08-31 — r24 engageable-only caravan pull (Booth flag, r23 session: "if
  I don't kill all the popcorn enemies, I have to wait for them to fly off the
  screen before the mids arrive" — replay confirmed ~2.9s of waiting on
  stragglers below the ship). The pull's empty-screen gate now counts only
  ENGAGEABLE enemies — strictly above the ship, i.e. still hittable by
  upward-travelling shots; anything at or below the player can never be killed
  and no longer holds the timeline. §2.5 rule refined accordingly. Referee:
  identical to r23 on every measured number across all bots and robust seeds
  (bots kill everything above them, so certified paths never differed) — a
  human-facing fix, like r23. Red set unchanged {s4_dynamic}. BUILD r23 → r24.
- 2026-09-01 — r25/r26 experiment round (Jacob's explicit hp override, Booth
  session 2026-08-31): (1) MIDBOSS hp 130 → 400 — "adding the health to the
  midboss felt great… good call, we'll leave it for now"; point-blank kill
  ~1.1s → ~4–5s, phase B finally exists (boghog T1: boss HP is a
  pattern-duration knob). (2) ELITE rep escalation BUG fixed — `rep = e.phase`
  but nothing ever set an elite's phase, so the documented ring-at-rep-1 /
  hose-at-rep-2 never ran and elite #2 was a copy of #1 with 1.8s of silence
  per cycle (his "slight lull"). Elite #2 now genuinely rep 1. (3) Booth
  VARIANTS panel (r26): deterministic tune knobs in core (eliteHp / eliteEntry
  / eliteEscort / midbossHp, defaults = shipped values, referee never sets
  them), chips applied at run start only, every run/recording/flag stamped
  with its variant, replay honors the stamp — A/B/A comparisons are chip–R–
  play. Elite experiment chips wired (HP 220/280/340, side entry, escort);
  bottom-ambush deliberately not built (density-pass material). All knobs
  verified applied + deterministic in a bot clear.
  **REFEREE RED, decision needed (vs r24 control): the expert bot now TIMES
  OUT the 400hp midboss on the certified seed and all six robust seeds** —
  the bots chase escort popcorn (the r19 finding; 912f at 130hp) while Jacob
  kills it in ~4–5s. s7_clearable FAIL, s7_robust FAIL (6× midboss, +2 boss
  timeouts), s6_alignment 2.15 vs bar 3 FAIL; s4_dynamic 1.38 (chronic).
  Options, Jacob's call: (a) referee edit — give the bots boss/midboss target
  priority (the §4.3 option, now forced); (b) accept a red referee until the
  recert round; (c) revisit the hp (contradicts his verdict). The experiment
  stands as played; the referee question is now unavoidable. BUILD → r26.
- 2026-09-01 — TATE mode (Jacob: rotate the game output for a physically
  rotated monitor, "like most any other vertical shmup"): 90°/270° display
  rotation in the real game (T key cycles, persisted) and the Booth (panel
  button or ?tate). Pure display transform — the stick isn't bolted to the
  monitor, so physical-up is already game-up: no input remap (arcade cabinets
  rotate the monitor, not the stick). Booth also gained a portrait-desktop
  layout toggle (panel below the canvas). Tooling only; core untouched.
- 2026-09-01 — r27 elite verdict shipped (Booth variant testing, Jacob: "I like
  elite HP at 220 w/ side entry with escorts"): ENEMY_DEFS elite hp 134 → 220
  (range grind 2.4s → 3.9s, inside the 2.2–6s economy law), elite #1 enters
  from the flank at combat height, escort crosser pair every 150f during its
  fight. Booth chips flipped to ROLLBACKS (134 / top entry / no escort /
  midboss 130) so comparisons stay one chip away. Also this session: TATE
  mode + T binding, portrait layout. Referee vs r26: s5_edges 25f of side-entry
  exposure (bar 60) PASS, s1_economy PASS, s6_alignment 2.15 → 2.43 (closer,
  still under the 3 bar), expert lives 1 → 2, stray boss timeouts gone — every
  remaining red is the ONE pending decision: the expert bot times out the
  400hp midboss on all seeds (target-priority flaw; humans kill it in ~4–5s).
  §4.3 options stand: (a) bot priority referee edit, (b) live red until
  recert, (c) revisit hp. BUILD r26 → r27.
- 2026-09-01 — r28 Booth recorder divergence ROOT-CAUSED and fixed (handoff
  item 4; Jacob: "fix the divergence bug first"). draw()'s screen shake pulled
  TWO g.rng values per rendered frame (renderer.js:55, r8-era code — it predates
  the renderer's own "no g.rng in draw" rule). draw() only runs in the browser,
  so every live shake frame (bomb, elite/midboss kill, death) advanced the
  gameplay stream past what headless replay sees: live and replay played
  different games from the first shake on. Evidence: replay-sweep of all 119
  tapes → 54 diverged, the replay ghost ALWAYS dying earlier than the live run
  (the handicapped-ghost asymmetry was the tell); emulating the leak in the
  replayer (2 g.rng draws per post-update shake frame) made ALL four divergent
  r27 tapes and both tested r26 tapes replay byte-perfect to their recorded
  endings (20260901-141640 runs 2/4/5/8 → exact end tick, frame, state). The
  r25-exp tape (the original handoff exhibit) improves 2341 → 3573 but not to
  parity — it also carries pre-r26 build skew (no tune stamp). Fix: shake
  offsets now g.fxRng (the standing fx rule). Safety proof: draining fxRng
  every shake tick leaves end state byte-identical (fxRng feeds no gameplay
  branch); referee untouched (test/sim.mjs never imports the renderer;
  evidence/ not rerun). tools/booth-replay.mjs now warns on build-mismatched
  and pre-r28 tapes — pre-r28 recordings are HISTORICAL: their inputs answered
  the leaked-rng world and will never replay true. Deterministic replay is now
  trustworthy going forward — unblocks attract-mode / practice replays (polish
  phase) and restores the Booth's flag→replay→fix spine. Not a design change
  (no scoring/behavior/timeline delta); corpus clearance n/a — the fix
  IMPLEMENTS the existing fx-rng rule. BUILD r27 → r28.
- 2026-09-01 — r29 POLISH PHASE opens: options menu (Jacob: "start the polish
  phase with the options menu"). Esc opens a pause-overlay menu in the real
  game: music + sfx sliders (0–100% MULTIPLIERS on the tuned mix — 100% = the
  mix as shipped, so tuning and player preference never fight), mute, TATE
  cycle (same persisted state as the T key), fullscreen toggle, and keyboard
  rebinding for shot/focus/bomb (movement + R/P/M/T stay fixed and are
  reserved; a rebind steals a key from any other action; footer controls line
  re-renders from the live binds). Sim fully frozen while open; music pauses,
  respecting an existing P-pause on close. All settings persist through a tiny
  storage adapter in src/options.js (localStorage today, file-backed in a
  future desktop/Steam shell — swap two functions). New browser-only module
  src/options.js + gain plumbing in audio.js (musicBus/sfxBus multipliers);
  index.html overlay markup. Core untouched, Booth untouched, referee
  untouched. Shell UI, not a design change — no scoring/behavior/timeline
  delta; corpus note: menu adds no automation of play (fire stays held, not
  toggled — BOGHOG_CRAFT stands). BUILD r28 → r29.
- 2026-09-02 — r30 options menu playtest fixes (Jacob's r29 report: music
  slider dead, mute dead, Esc-in-fullscreen drops fullscreen). ROOT CAUSE of
  the first two, one bug: music ran through createMediaElementSource → gain →
  master, and Safari (Jacob's browser — the reason the no-store server exists)
  can leave such an element playing STRAIGHT to the speakers, bypassing the
  whole WebAudio graph: music slider and mute (master gain) were silent no-ops
  while the sfx slider (pure WebAudio) worked. Fix: music volume now rides
  HTMLMediaElement.volume (level × tuned mix × slider × mute; 50ms ticker eases
  crossfades/ducks) — no MediaElementSource at all, which also makes the boss
  crossfade and death-duck real on Safari for the first time. Also: music keeps
  playing under the open menu so the slider is audible (menu no longer pauses
  it), sfx slider plays a throttled test blip, M toggles mute inside the menu,
  and fullscreen Esc is handled — Keyboard Lock API where available
  (Chrome/Edge: Esc works in fullscreen), elsewhere the first Esc exits
  fullscreen and the menu stays put. Browser-only files (audio.js, options.js,
  main.js call site); core/Booth/referee untouched. BUILD r29 → r30.
- 2026-09-02 — r31: sfx slider feedback moved from throttled blips-while-
  dragging to ONE blip at the final value on release (Jacob weighed a TEST
  button; verdict: release-blip — cause/effect stays glued to the gesture, no
  extra panel row, re-tapping the handle is an implicit test button). Music
  needs neither: it plays continuously under the menu. BUILD r30 → r31.
- 2026-09-02 — r32: the options menu pauses music again (Jacob: "I can't
  think of a shmup that continues the in-game music in the options menu" —
  correct, mid-run pause = silence is the arcade convention; r30's
  keep-playing was a wrong trade for slider feedback). The music slider now
  speaks like the sfx one: on release it plays ~1.5s of the CURRENT track from
  where it sits at the new volume, then re-pauses (audio.musicBurst; an
  explicit pause/resume always cancels a live burst so closing the menu
  mid-burst can never pause music in-game). Menu close still respects an
  existing P-pause. Jacob's alternative — dedicated options-menu music — was
  parked as a title-screen item (title is currently silent; new asset + music
  direction decision), added to the HANDOFF polish queue. BUILD r31 → r32.
- 2026-09-02 — r33: burst position fix (Jacob's catch: burst at 1:00, fiddle
  for 10s, close menu → music resumed at 1:10, not 1:00 — the burst plays the
  same element forward). pauseMusic(true) now bookmarks currentTime; resume
  seeks back to the bookmark before playing, so slider auditions can wander
  without moving where the run's music picks up. Works under P-pause + menu
  combinations (the bookmark is taken at first pause, restored at the real
  resume). BUILD r32 → r33.
- 2026-09-02 — r34: Enter toggles the options menu (Jacob: Esc still drops
  fullscreen instead of closing the menu). In Safari fullscreen, Esc ALWAYS
  exits fullscreen — a browser rule no page can intercept; the Keyboard Lock
  API that lets Esc through is Chromium-only. So the menu gets a second toggle
  that works everywhere including fullscreen: Enter (everywhere but the title
  screen, where Enter starts the run — passed as an isTitle accessor so
  options.js stays state-blind). Menu + footer copy updated (ESC/Enter); when
  fullscreen without keyboard-lock the menu itself explains "Esc leaves
  fullscreen — Enter toggles this menu". BUILD r33 → r34.
- 2026-09-02 — r35 onboarding: one-card HOW TO briefing (polish queue item 2).
  Corpus shape: MSX legacy-skill forbids re-teaching the genre (no dodge/shoot
  tutorial, nothing forced — a forced tutorial is beginner bias);
  HOMAGE_STUDY's "one-card boss briefing at run start (Psikyo#9)" sanctions the
  one-card form; Pillar 3 / WS05 leave deep teaching to game-overs and (later)
  the receipt. The card teaches ONLY the two SPEEDHELL-specific truths: the
  display contract (§6.2 — you are the 6px dot; only the white bullet core
  kills; the card's canvases draw through the renderer's own ship/bullet functions (r57; hand-copied r35–r56) so it
  can never lie about the contract) and the speed-kill rule (§2.1 — stopwatch,
  SPEED = double + chain, binary). Live keybinds rendered from options state.
  Auto-shows ONCE ever (localStorage), dismiss = shot key/Enter/Esc/click;
  afterwards H from the title (H reserved from rebinding; never opens during
  play). Title banner gains "H how to play · ESC options". New browser-only
  src/howto.js; core/Booth/referee untouched. BUILD r34 → r35.
- 2026-09-02 — r36 practice/section select (polish queue item 3): left/right
  on the title picks where the run starts — FULL RUN or any of S1–S8; Enter
  launches, R retries the SAME section (die at the midboss, retry it in two
  seconds). Corpus: MSX expert bias + the mastery path (practice tools are
  pro-player culture in arcade ports); Pillar 3/WS05 learning-across-runs is
  exactly what section drilling serves; Pillar 4 (true failure) protected by
  a hard rule — a practice run is REHEARSAL: gold PRACTICE tag on the HUD the
  whole run, and g.practice must exclude the run from the hi-score table /
  receipt when those land (noted on the HANDOFF item). Mechanism: the
  sandbox's stage-jump moved into core as startRun(g, atT) — pure
  stageT/tlIndex fast-forward, no rng consumed; the atT=0 path (full runs,
  referee, Booth, replays) is byte-identical to pre-r36 (control: a known-
  MATCH tape still replays byte-perfect). Practice starts with fresh
  lives/bombs (drill convention). Music starts on the stage track; the boss
  WARNING swap works as in a full run. BUILD r35 → r36.
- 2026-09-02 — r37: quit-to-title (Jacob: "how do I exit practice mode?" —
  r36 shipped without a way back to the picker). Options menu gains a
  "quit to title" row (works mid-run, deliberate two-step so a full run can't
  be lost to one stray key); Q on the gameover/clear screens jumps straight to
  the title; end-screen banners read "R retry · Q title"; q reserved from
  rebinding. quitToTitle() re-rolls a fresh seed and fades the music. BUILD
  r36 → r37.
- 2026-09-02 — r38 controller parity + hotkey removal (Jacob: "we NEED
  controller to have the same support as keyboard… Blue Revolver doesn't have
  hotkeys — there's usually an options menu; retry should be a menu option,
  not a hotkey"). Gameplay hotkeys R/P/M/T/Q are GONE (their keys freed for
  rebinding); the pause menu is the shell: resume / retry run / quit to title
  at the top, mute + TATE inside, and the menu is fully navigable — keyboard
  ↑↓←→ Enter Esc, gamepad d-pad/stick + A activate + B/START close (one
  menuNav entry point; pad shell actions are edge-triggered so menus never
  machine-gun). Pad parity everywhere: START = menu (play + end screens),
  title picker on d-pad/stick with START/A to launch, death screen A/shot =
  one-press retry (S7 restart<2s preserved — the death screen IS the fast
  path; mid-run retry is the deliberate two-step through the menu), B/SELECT =
  title, how-to card dismisses on A/B/START. Enter now opens the menu only
  during play (title Enter starts, end-screen Enter retries). Known limit,
  messaged in-menu: pad presses lack browser "user activation," so the
  fullscreen toggle needs one keyboard/mouse press. Homage precedent: Blue
  Revolver's shell (HOMAGE_STUDY lineage); S7 honored. Browser-only files;
  core/Booth/referee untouched. BUILD r37 → r38.
- 2026-09-02 — r39: two r38 playtest fixes (Jacob). (1) B closed the menu AND
  dropped a bomb — the close edge and the held bomb poll fired on the same
  tick; pad fire/bomb are now latched after any overlay-operating press until
  buttons 0–3 all release. (2) The HOW TO card rendered broken under TATE —
  the stylesheet's `canvas` and `body.tate canvas` rules predate any second
  canvas and were rotating/absolutely-centering the card's mini-canvases; now
  scoped to `#game`. Overlay UI (menu, card) deliberately never rotates with
  TATE — the monitor is physically rotated, DOM text must stay readable.
  BUILD r38 → r39.
- 2026-09-02 — r40: pad-button rebinding (Jacob tried to rebind with the
  arcade stick; capture only listened for keyboard — his earlier "success" was
  B canceling the capture while B was already bomb by default). Each action now
  carries keyboard keys AND pad buttons; an armed rebind takes whichever
  arrives first. START/SELECT/d-pad (8, 9, 12–15) reserved for the shell;
  START cancels a capture like Esc. Key-steal rule hardened both maps: an
  emptied action refills from defaults MINUS the stolen input (no
  resurrection). Bind rows display both ("Z / space · pad 0/2"); reset
  restores both maps; pad binds persist as speedhell.padkeys. pollInput and
  the r39 latch now run off the bound buttons, not hardcoded 0–3. BUILD
  r39 → r40.
- 2026-09-02 — r41 (interim): options reachable from the title on pad —
  SELECT opens the menu (START/A start the run); title banner advertises
  "options: ESC / SELECT". Jacob's larger point stands: shell gaps keep
  surfacing one at a time, so a shell-parity audit agent is researching Blue
  Revolver, Gunvein, and M2 ShotTriggers conventions against r28–r40; its
  prioritized gap list will drive the next shell rounds (a real title menu is
  the expected headline finding). BUILD r40 → r41.
- 2026-09-02 — r42: REAL TITLE MENU (shell-parity audit MUST #1, now filed at
  docs/research/shell-parity-audit-2026-09-02.md — Blue Revolver, Gunvein and
  every M2 ShotTriggers port use list menus; our banner-with-hidden-keys was
  the root of Jacob's "gaps keep surfacing" complaint). GAME START /
  PRACTICE ◀section▶ / HOW TO PLAY / OPTIONS as DOM rows under the logo:
  keyboard arrows+Enter, pad d-pad+A/START, mouse click — one input grammar
  with the pause menu. Retires the r41 SELECT interim and the hidden H key
  (h freed for rebinding); retry now re-enters whatever start the run used
  (currentStart). Audit verdict recorded: shell MEETS standard on pause
  structure, dual rebinding, TATE, volume UX, practice granularity, fast
  retry, HOW TO; remaining MUSTs = hi-score+entry, receipt, title audio;
  SHOULDs incl. replays/attract (r28 tapes), pillarbox gadgets, CRT toggle,
  legibility sliders, practice resources. Open question for Jacob (flagged,
  not recommended): all three references ship autofire; our law is
  fire-is-held — stated stance or silence? BUILD r41 → r42.
- 2026-09-03 — r43: audio unlock vs stick-only sessions (Jacob: "first
  startup after hard refresh the sound doesn't work; retrying used to fix it;
  now it doesn't"). Root cause: browsers only start audio after a real user
  gesture — keyboard/mouse/touch, NOT gamepad — and r38's full pad parity made
  gesture-free sessions possible (the old "retry fixes it" was the R key being
  a gesture; r38 removed R). Fixes: (1) unlock armed on every pointerdown/
  keydown/touchstart, capture-phase, idempotent; (2) a music track that
  failed to start while locked now recovers on unlock (musicShouldPlay
  tracks intent vs what the browser allowed — pause/stop clear it, so
  recovery can never resurrect deliberately paused music); (3) never fail
  silently — while audio is blocked and unmuted, the canvas shows "SOUND:
  press any key or click once (browser rule)". Steam/Electron wrap has no
  autoplay policy, so this whole class disappears there. Booth demo not
  needed — cause fully determined from code. BUILD r42 → r43.
- 2026-09-03 — r44: results receipt + hi-score table (audit MUSTs #2+#3;
  HOMAGE L4/R8 "grade the run with an itemized receipt"; BR initials + local
  table; Gunvein's launch complaint proved the expectation). Receipt (DOM,
  replaces the canvas end banners): score, speed kills x/y (%), longest
  chain, time, deaths, bombs used, NO MISS / NO BOMB badges, stock bonus on
  clear; practice runs get the receipt tagged "score not saved" and never
  touch the table (Pillar 4). Qualifying FULL RUNS flow into arcade 3-letter
  initials entry (type directly, or ↑↓/←→ + Enter/Ⓐ; Esc/Ⓑ/START saves as
  shown — nothing discards a run; initials remembered) then a top-10 table
  ({name, score, speed, chain, cleared, date, build} in localStorage via the
  shared store adapter — Steam file-backed later). HI-SCORES row added to the
  title menu. Core gained two instrumentation counters (stats.maxChain,
  stats.bombsUsed) — counters only, no rng, no behavior; control: known-MATCH
  tape replays byte-identical with correct counter values. One-press retry
  from the receipt preserved (S7): entry only intercepts input while a new
  hi-score is actually being entered. Per-section speed-kill breakdown (full
  R8) deferred — needs killLog to carry section, a separate instrumentation
  round. BUILD r43 → r44.
- 2026-09-03 — r45: initials entry never appears in practice (Jacob: "practice
  shouldn't even show the input-initials card — no shmup does that"). r44
  already excluded practice from the SAVE, but a state-leak could still surface
  the entry overlay; couldn't be pinned by inspection, so the fix is
  belt-and-suspenders rather than clever: the qualify decision is now a pure,
  exported qualifies(state, practice, score, scores) — practice > 0 returns
  false at any score — and a module latch wasPractice hard-hides the entry and
  no-ops entryNav for a practice receipt regardless of prior state. Headless
  check: a practice game object never qualifies even with an empty board and a
  huge score; a full run at the same score does. BUILD r44 → r45.
  **[r47 correction: wrong cause. There was no state-leak — the JS gate was
  already correct at r44; the card showed because index.html had no generic
  `.hide` CSS rule (see r46). The headless check here exercised only the JS
  gate and could not see the stylesheet, so "fixed" was claimed without
  loading the page. Latch removed in r47.]**
- 2026-09-03 — r46: THE actual practice-entry bug + a proper practice card
  (Jacob: "it STILL asks for a name… shows AAA… use best UI/UX practices, this
  is sloppy"). Root cause the r45 gate couldn't have caught: there was no
  generic `.hide` CSS rule — every overlay hid via an id-scoped rule
  (#opts.hide, #results.hide…), but #entry and #resTag were inner elements
  toggled with a bare `hide` class that NOTHING styled, so the initials card
  (and "not saved" tag) were never hidden on any receipt. The r44/r45 gate set
  entryOpen=false correctly; CSS ignored it. Fix: `.hide { display:none
  !important }` global (lesson: toggling a class only hides if a rule matches —
  a headless gate test can't see a missing stylesheet rule). UX pass on top:
  practice now renders a visibly different card — gold accent + border,
  "PRACTICE" heading, section subtitle, "practice run — not saved to
  hi-scores" note, retry-section hint, and zero score-submission chrome; the
  initials entry belongs to qualifying full runs only. Verified: g.practice
  survives to gameover in core (headless), entry gate proven pure (r45).
  BUILD r45 → r46.
- 2026-09-03 — r47: cleanup after the r45/r46 post-mortem (Jacob: "there were
  some serious errors"). (1) The r45 wasPractice latch is gone — qualifies()
  is the single practice gate; the latch guarded against a JS bug that never
  existed. (2) Practice heading keeps the OUTCOME: r46's "PRACTICE" h1 meant a
  death in practice showed no GAME OVER anywhere; now h1 = GAME OVER / STAGE
  CLEAR as always and the gold subtitle reads "PRACTICE · S4 MIDBOSS". (3)
  resSub/resTag text is cleared on full-run receipts (the r44 tag text
  persisted across runs). (4) New `test/shell.mjs`: zero-dep headless-Chrome
  check (same CDP pattern as shots.mjs) that loads index.html and asserts
  every `.hide` element computes to display:none, plus the results overlay's
  known ids — the regression guard r44–r45 lacked. Lesson recorded: a
  headless gate test cannot see a missing stylesheet rule; shell/DOM changes
  are verified in a browser before being called fixed. No core/sim/rng
  change. BUILD r46 → r47.
- 2026-09-03 — r48: seeded default hi-score table (Jacob, after a 7000-point
  death prompted for initials: "seed the default table"). r44's rule was "top
  10 of whatever is stored", so an empty board asked every run for a name.
  Arcade convention (Garegga/Cave, HOMAGE_STUDY R8 lineage): the board ships
  full and a run must beat the lowest row. Ten house rows 100000 → 10000
  (SPD HEL MSX HOG ACE JET RAY ZAP VEL RIP), regenerated on every load, never
  trusted from storage, rendered dimmed with dashed speed/chain columns.
  Calibration from evidence/metrics.json: blind bot's ~29k early death makes
  rank 9, passive-human clear ~37k rank 8, expert clear ~175k tops the board;
  a 7k no-name death does not enter. Not a scoring change (Pillar 2 untouched):
  the receipt, the values and the entry rules are the same — only the entry
  threshold on a fresh install moved from 0 to 10000. Shell only; no core/sim/
  rng change. BUILD r47 → r48.
- 2026-09-04 — r49 EXPERIMENT: `SPEED +1600` popup (wiki §2.6 / open question
  #4; Jacob: "only an experiment, I may decide to not use it / go with something
  else"). Corpus: Pillar 2 + BH WS06 want quick-kill bonuses as binary VISIBLE
  states, never opaque frame math — the word stays first and gold, the number
  makes the doubling legible beside the `+800` a slow kill already shows (the
  old asymmetry meant the player only saw a number when they'd done it wrong).
  MSX: the meta is authored in the game, no hidden math — a scoring lever the
  player never sees the value of is the opposite. Pushback (S2 readable chaos,
  BH WS02): the popup is ~2× wider on a dense field; mitigated by keeping the
  15px gold style and the addPopup baseline de-conflict, unchanged. Not a
  scoring change (values, windows, chain untouched); text only, no rng —
  referee run byte-identical to r48 as control. Booth rollback chip "SPEED
  word only (old)" for A/B. BUILD r48 → r49.
- 2026-09-04 — r50: THE LAB (wiki §10). Jacob: "give Mark the option to turn
  on SPEED +1600, turn off the +1600, turn off SPEED… think of a best-practice
  way to offer Mark and Boghog and playtesters options; eventually we decide
  and remove them." One registry (`src/lab.js`) → rows in OPTIONS (only with
  `?lab` in the URL), shareable config links (`?lab=id:choice`, address bar
  always holds the current one), receipt + hi-score stamping, persistence via
  the options store. First entry: speedPopup with four choices (SPEED +1600 /
  +1600 / SPEED / none). Plumbing change under it: core popups carry `val`
  (the paid value) and never format text — renderer formats per `prefs`
  (renderer stays DOM-free; sim never imports it). r49's `g.tune.speedNum` and
  the Booth chip are gone (superseded). Not a design change to scoring or
  behaviour; referee run byte-identical to r48/r49 controls. `test/shell.mjs`
  now also loads `?lab=speedPopup:num` and asserts rows inject, the choice
  applies, and the address bar is rewritten; and asserts zero lab rows on the
  plain page. BUILD r49 → r50.
- 2026-09-04 — r51 EXPERIMENT: explosions in the Lab (Jacob: "I know for sure
  I want to experiment with the explosions, likely making them bigger and
  better looking"). Two rows: fxSize 1×/1.5×/2× and fxStyle classic/bloom/
  heavy — renderer-only in `drawFx`, details in §10, open Q12. Corpus: boghog
  (r8-fx comment: "explosions significantly bigger than the enemy, varied
  patterns, extra debris") and rubric S4-MUST "explosions punchy" both pull
  toward bigger; S2-MUST depth sort is preserved (fx still below bullets) and
  BH WS02 readable-chaos is the pushback — halos are alpha-capped after the
  first peek blew a boss phase out to a flat white disc. Core, fx rng, particle
  budgets and the referee untouched (no sim change possible: sim.mjs never
  imports the renderer). New builder tool `tools/peek.mjs` + `test/fxpeek.html`
  (headless screenshots of a harness page) so looks get eyeballed before
  hand-off. `test/shell.mjs` now decodes a two-experiment link. BUILD r50 → r51.
- 2026-09-04 — r52 EXPERIMENT: "chunky" explosion look in the Lab (Jacob: "i
  guess it's not necessarily the size that makes them feel better… his
  explosions feel satisfying like in a CAVE game", four Lazy Devs episodes
  analysed). Recipe + numbers in §10. Corpus: boghog "explosions significantly
  bigger than the enemy, varied patterns, extra debris" and rubric S4-MUST
  "punchy, ≤2 startup frames, cover the sprite, debris" both pull toward it;
  S2-MUST depth sort preserved (opaque blobs under bullets — and opaque can't
  blow out to white under a bullet, which HELPS readable chaos vs r51's
  additive halos); S8 budget: chunky spawns fewer particles than classic at
  every tier. Core change is a spawn-time branch on `g.fxStyle` (default
  classic) + three particle fields (friction, colour-clock offset, chunky
  flag); classic path byte-identical — referee run == r49 control. Lazy Devs
  caveats recorded: none of the four episodes touch shake/hitstop/sound (the
  feel is motion + colour + volume), and his grape animation was deferred past
  those episodes — (4) above is his stated plan, built here. BUILD r51 → r52.
- 2026-09-04 — DECISION (consultation, no code, no build bump — r52 is a
  parallel session's explosion experiment): **Pillar 3 amended** from "one honest
  difficulty" to "every mode is an honest difficulty — an arrange with its own
  scoring identity or a novice mode that keeps the skeleton; no slider, no
  rubber-banding." Jacob: "the wiki we made says one difficulty but Blue Revolver
  has three difficulties and an awesome challenge mode. Zero Ranger has… two
  modes. CAVE games often include different arrange modes." Cleared: MSX (novice
  modes that preserve the skeleton vs easy modes that remove difficulty; CAVE
  arranges; accessibility = tools to engage difficulty), boghog T1 "start hard,
  scale back" + T3 "practice tools, not mode bloat", ZeroRanger research (single
  difficulty = its recurring complaint; White Vanilla easy-mode→mode rework),
  HOMAGE L8. Pushback kept: no slider (Pillar 3), practice/EX before any easy
  mode (boghog), nothing before arcade ships (two-game strategy). Supersedes the
  2026-08-29 "toggle → loop 2" entry only where it read the pillar as forbidding
  modes; the loop-2 spec stands and is item 2 of the §11 build order. Non-goal
  "no difficulty menu" → "no difficulty slider". Story placement note added to
  §11 (pillar "no story beats mid-stage" unchanged).
- 2026-09-04 — r53 EXPERIMENT: speed-kill reward dressing in the Lab (Jacob:
  "start with 4 and 5" from the explosion/weapon-feel research). Details §10,
  open Q13. Corpus: MSX (DOJ review: "you want the player to feel powerful…
  explosions on top of the explosions") read through Pillar 2/5 — the power
  moment is the stopwatch reward, not the gun, so nothing about DPS, shot cap
  or scoring moves; DOJ rations its hyper for the same reason. Boghog: "extra
  debris, varied patterns"; S4-MUST punchy. Pushback logged: S2 readable chaos
  on full-screen cancel walls (mitigated: pops are opaque, under bullets, and
  the wall has already removed the bullets), S6 garnish stays garnish (the
  rush shower's VALUE is unchanged, only its look). Core branch on g.fxMeta
  (default 0): referee run == r49 control. BUILD r52 → r53.
- 2026-09-04 — r54 EXPERIMENT: kill sound weight in the Lab (option 5 of the
  explosion/weapon-feel research). Details §10, open Q14. Corpus: MSX (DOJ:
  "you hear the laser, you hear the explosion, then you hear the kick-ass
  tunes — everything blends"); boghog T1 "sync key events to music beats
  loosely; nail the driving-forward feel" (a thump on every kill is the
  driving-forward layer); no pushback found beyond taste — the compressor
  keeps it under the music. Browser-only: core, sim, rng untouched. BUILD
  r53 → r54.
- 2026-09-04 — r55: SOUND TEST (Jacob, after hearing r54's thump: "thoughts on a
  music demo room? to demo each sfx?"). Shell, not Lab: a sound test is arcade
  canon (every M2 ShotTriggers port, CAVE option menus — shell-parity audit
  lineage), so it is permanent. OPTIONS gains an "audio: sound test" row; the
  card opens ON TOP of the menu (menu + pause stay underneath), lists all 16
  sfx by plain name plus both music tracks (♪ toggles play/stop from the
  track's musical entry point), ↑↓ / Enter / Ⓐ / Esc / Ⓑ, mouse click, pad.
  Effects play DRY: `audio.playSfx` suppresses the music cut/duck/switch that
  DIE / WARNING / BOSS / CLEAR / GAMEOVER carry, so you audition the sound,
  not the transition. Music preview never touches the run's music
  bookkeeping (`current` / pause bookmark), so closing the card resumes
  exactly what was playing. Live lab settings apply (r54 killAudio), which
  makes this the A/B tool for the audio pass and lets Mark hear one sound at
  a time. `test/shell.mjs` opens the card headlessly and asserts 18 rows.
  Browser-only; core, sim, rng untouched. BUILD r54 → r55.
- 2026-09-04 — r56: sound test z-order FIX (Jacob: "i press sound test but
  nothing happened and now my inputs through the gamepad are doing nothing").
  r55 put #sounds at z-index 8; #opts is 10 and its panel is opaque, so the
  card opened UNDERNEATH the menu — invisible, but it owned the pad (B would
  have closed it; ↑↓/A moved an unseen cursor). Now z-index 12, above #opts
  (10) and #howto (11). Lesson, same family as r45: "it rendered" is not "it
  is visible" — `test/shell.mjs` now opens the menu, opens the card, and
  asserts the card is the element under the screen centre (elementFromPoint),
  not the options panel. tools/peek.mjs static server no longer crashes on a
  404 (the page requests mp3s). BUILD r55 → r56.
- 2026-09-04 — r57: ART_BIBLE ROUND 1 (renderer-only; branch `art/round-1`).
  Pixel grid (§2): integer sprite origins, integer geometry, 16 heading
  steps, whole-pixel shake, no alpha shadows (turret gets a solid
  under-plate). Named palette (§3): every hex literal in `renderer.js` now
  lives in one block (`AIR/GROUND/HEAVY/SHIP/ROUND/NEEDLE/ITEM/UI/BOSS`,
  exported as `PAL`) — values are r56's, unchanged; boss surface waits for
  Round 2. Rims (§4): every enemy, part, boss and the ship is painted once
  into an offscreen sprite cache (alpha-thresholded so polygon edges are
  hard), outlined 1px in its family `out` colour, drawn with one drawImage
  at an integer origin; hit-flash whitens the rim too; the ship adds a 1px
  hull-light rim on its top edge. Bullets (§5): pink rounds are a two-frame
  pixel-disc sprite at the exact r20 radii (5.6/4.2/3 — the r5 0.35px pulse
  became a ring flash held 4 ticks); needles keep smooth rotation (an aimed
  shot's direction is the telegraph — 16 steps would lie by up to 11°) and
  gain the 1px bright tail tick. Items are pixel discs (pulse steps 1px).
  The HOW TO card draws through `drawShip/drawRoundBullet/drawNeedle`
  instead of hand-copied pixels (§6.2 sync rule updated). Max-load draw
  cost 1.99 → 1.43 ms (headless, 1026 bullets). Core, `ENEMY_DEFS r`,
  `PLAYER.hitR`, timeline, `g.rng`, sim and referee untouched — the
  display contract's sizes are identical. Peek sheets + open-question
  answers: `docs/art-rounds/round-1.md`. Corpus: boghog WS02 (values over
  colour — rims add a value step, no new hue), Pillar 6 / S2-MUST (bullets
  still the highest-contrast layer; pink/cyan/gold/violet exclusivity now
  enforced by the palette block), MSX: no scoring or difficulty surface
  touched. BUILD r56 → r57.
- 2026-09-04 — r58: heading steps 16 → 32 (renderer-only, `STEPS`). Jacob's
  r57 playtest: pixel look approved, bullet flash approved, "the small enemies
  do seem a bit wobbly" — the popcorn's ±20° sine wobble (heading(), the r20
  Booth fix) snapped across 2–3 of the 22.5° steps and read as jitter; at
  11.25° it sweeps ~4 steps. Bible §12 Q2 answered. BUILD r57 → r58.

- 2026-09-04 — r59: BULLET CASTE BY SOURCE (design change; branch
  `design/needle-tier`; Jacob's decision after his push-back on the r5 rule).
  Cyan needles are now only the special tier's aimed fire (mid, elite, midboss,
  boss + parts — `game.js NEEDLE_TIER`); popcorn-family and turret aimed prongs
  become pink rounds. Needle share 45% → 22% (expert), first needle moves from
  s1 to the s3 mids. Details, numbers and the four-tier comparison in §6.3.
  Rubric S2-MUST bullet-language line rewritten (Jacob-authorized), HOMAGE L6
  amended, patterns/renderer comments updated. Downgraded shots take the
  round's r 3.2 (same look = same hitbox); the pre-existing 2.6/3.2 vs "3"
  discrepancy is open Q15. Corpus: MSX — readable enemy hierarchy, no scoring
  surface touched; boghog — layered boss patterns keep two colours; HOMAGE L6
  Psikyo source caste. Referee recert pending. BUILD r58 → r59.
- 2026-09-05 — r60: ART SKINS (renderer-only refactor; branch `art/skins`).
  Jacob: "i want to see all four implemented … four agents implementing the
  art in those styles. and then ill play through them and see how they feel."
  Everything a direction may restyle — palette, background, enemy/ship/item
  painters, an optional post pass — moved into `src/render/skins/<id>.js`
  (contract in `skins/base.js`, which IS the r58 look: pixel-identical on the
  peek sheet). Bullets, the hit dot, the sprite cache/grid, fx, HUD layout
  stay in `renderer.js`. Lab row `skin` (`?lab=skin:<id>`) switches live;
  `tools/artpeek.html?skin=<id>` peeks one. Four skins — cute-occult,
  neon-vector, synthwave, graphic-pop — are built by four Opus builders from
  `docs/concepts/` per `docs/art-rounds/skins-brief.md`; Jacob picks by
  playing. No design change; referee draws the base skin. BUILD r58 → r60
  (r59 = the needle-tier branch).
- 2026-09-05 — r61: FOUR SKINS MERGED (branch `art/skins`; renderer-only).
  Four Opus builders, one worktree each, from `docs/concepts/` per
  `docs/art-rounds/skins-brief.md`; each gated by the orchestrator (only its
  skin file + brief + peek changed; no `g.rng`, no alpha on sprite fills,
  pink/cyan only on the sanctioned boss cores; max-load draw: cute-occult
  1.76 ms · neon-vector 1.70 · synthwave 1.55 · graphic-pop 1.65, gate 16.6).
  Peek sheets `docs/img/r6x-skin-<id>.png`, briefs `docs/art-rounds/skin-<id>.md`.
  Play: `?lab=skin:<id>` (Lab row "art skin"). Builder deviations to weigh:
  synthwave boss cores amber (not pink/cyan/gold — my brief was stricter than
  bible §10's core exception); neon-vector midboss = a 4th saturated hue while
  on screen; all four separate fighter/diver by silhouette only. Jacob picks by
  feel; the winner becomes the default and the bible §3 palette is rewritten
  to it. BUILD r60 → r61.
- 2026-09-05 — r62: ART DIRECTION = CUTE-OCCULT (Jacob's override, recorded
  here as the CLAUDE.md rule requires for a change neither corpus argues for).
  Verdict after playing the four r61 skins: "the cute occult felt like it had
  the most personality … i did like what you were trying with the synthwave
  background. felt like Outrun … I liked the attempt at building getting close
  to you as the stage scrolled, the execution wasn't quite there." Renderer
  default skin → cute-occult (Lab row default too; artpeek default too);
  base stays as "classic (r58)" for reference. Bible §3 palette rewritten to
  the skin's ramps (BONE / WAX / MOTH), §10 Round 2 points at its boss sheet,
  Rounds list notes the synthwave approaching-landmark technique as Round 3's
  starting idea. Corpus check: MSX — theme is not a system; readability and
  scoring surfaces untouched; boghog — values-over-colour holds (bone `base`
  below bullet cores, S2 max-load sheet); HOMAGE L1 "the place is the wave"
  is what Round 3 will serve. The referee now draws cute-occult by default —
  evidence shots regenerate at the pending recert. Losers (neon-vector,
  graphic-pop) await Jacob's delete/keep call; synthwave kept until its
  landmark technique is ported. BUILD r61 → r62.
- 2026-09-05 — r63: MERGE — r59 (bullet caste by source) + r60–r62 (art
  skins, cute-occult default) on one line (branch `design/needle-tier`).
  `art/skins` had been cut from r58, so its playtest builds r60–r62 silently
  lacked r59: every aimed shot was a needle again. No new design decision;
  both changes as recorded above. Skins draw by `b.kind`, so downgraded
  prongs render pink under every skin with no skin edits. Conflicts were the
  BUILD tag, this file's header/changelog, and the renderer header comment.
  Referee recert still pending (r59's bullet stream + r62's default skin).
  BUILD r59/r62 → r63.
- 2026-09-07 — r64: LOSING SKINS RETIRED (renderer-only; Jacob's call after
  verifying r63 in play: needle caste, cute-occult default, sound all good).
  `neon-vector` and `graphic-pop` removed from `src/render/skins/` and the
  registry; briefs (`docs/art-rounds/skin-<id>.md`, now headed "Retired r64")
  and peek sheets (`docs/img/r6x-skin-<id>.png`) kept as the record.
  `synthwave` stays until its approaching-landmark technique is ported
  (Round 3 starting idea, r62). Lab row `skin` now offers cute-occult /
  synthwave / classic (r58). No design change, no rng. BUILD r63 → r64.
- 2026-09-07 — REFEREE RECERT at r64 (Jacob-authorized, separate commit; no
  BUILD bump — nothing in the game changed). `node test/sim.mjs` then
  `node test/shots.mjs`: metrics + 25 shots + manifest regenerated from one
  run; `shot-s4-midboss-p2.png` is gone — NOT because phase B is unreached
  (a core trace shows it at f+1042 of the fight, hp < 180, firing ~6.5 s
  before the f+1435 timeout with 87 hp left) but because `test/shots.html`
  still tests `hp < 130 * 0.45` (pre-r25 hp). Referee-file fix, Jacob to
  authorize. Watch the certified fight live: `sandbox.html?stage=0&seed=
  12648430&bot=referee&god=0&lives=0&speed=4&slowAt=2200` (sandbox commit). Certified state: 13
  checks green (stress p99 0.109 ms, max 0.547 ms of 16.6; determinism
  byte-identical), four red — s6_alignment 1.52 (<3), s4_dynamic 1.44
  (<1.6), s7_robust (midboss timeout on all six seeds; 5eed42 also boss-p3),
  s7_clearable (clear, midboss timeout, 0 lives). Bot scores: expert 151,470
  · aggressive 134,260 · passive 88,230 · blind gameover 33,550. The midboss
  timeout on every seed is the standing signal (r25/26 400 hp override, wiki
  §8); the r59 caste and r62 skin are now what the evidence shows. §6.3 and
  §7 updated.
- 2026-09-07 — r65: MIDBOSS TIMEOUT 23s → 35s (design change; `stage.js
  MIDBOSS_TIMEOUT` 1400 → 2100; Jacob's call after watching the certified
  referee fight live in the sandbox — "the computer player was shooting from
  too far away… remove the midboss timeout, or at the very least extend it").
  Measured (7 seeds × expert/human bots, midboss fight only): 23s — 0/14
  kills, avg 0.6 deaths in the fight; 35s — 4/14 kills, 0.9 deaths, 0 game
  overs; 47s — 8/14, 2 game overs; none — 14/14 but fights to 64s. Max
  bullets on screen flat (~117) at every setting, so the leave-alive ramps do
  not pile up. Removal rejected: the post-bloom crosser pair every 150f is an
  infinite point source (~320 pts per 2.5s), so with no timeout parking under
  the midboss out-earns the 16,000 speed kill inside a minute — rubric S6
  MUST ("nothing respawns infinitely for points"); the gate would also hold
  the stage forever for a player who cannot finish it (boghog T2: the stage
  does not wait). Milk ceiling at 35s ≈ 9.6k < the honest 16k. Corpus: MSX —
  timeouts are scoring integrity, not difficulty; no scoring math touched;
  boghog T1 — hp stays the pattern-duration knob (400 untouched, no
  hp-inflation). Control sim at r65 (uncommitted evidence): three robust
  seeds now clear the midboss by kills (bada55, 5eed42, 1234567); the
  certified seed still times out at 35s with 12 hp left; facade/ab12cd pick
  up boss-p2 timeouts (rng drift); s6_alignment score ratio 1.52 → 2.96 (bar
  3). The bot shooting from too far is a separate referee-side fix
  (test/bot.mjs, Jacob to authorize). Referee recert pending after the
  playtest settles. BUILD r64 → r65.
- 2026-09-07 — REFEREE FIX + RECERT at r65 (both Jacob-authorized: "perform
  the referee fixes. go ahead with r65 recert"). `test/bot.mjs`: the
  aggressive bot homed to y = H−110 whatever it shot at; with shotLimit 6 /
  shotSpeed 9 a bottom-of-screen shot lives ~37f, so the limit capped fire at
  ~1 per 6f instead of 1 per 3f — half DPS on big targets (the "shooting from
  too far away" Jacob saw in the sandbox). New options closeY / closePull /
  trackPull (110 / 1.0 / 0.8), picked by a full-referee sweep: 0.3/0.6 left
  s6+s4 red; 0.7/0.8, 1.0/0.6, 130/1.0/0.8, 90/1.0/0.8 all lost lives or
  s7_clearable; 1.0/0.8 = zero timeouts on all seeds, s6 1.52 → 3.15, s4
  1.44 → 1.97, expert 151,470 → 181,470 with 1 life. Passive bots untouched.
  `test/shots.html`: s4-midboss-p2 keyed on the phase latch (was a stale
  `hp < 130 × 0.45`). Recert: 16 green / 1 red (s7_robust: three seeds end
  at 0 lives; no timeouts anywhere); stress p99 0.13 ms, max 0.52 of 16.6;
  determinism byte-identical. The recert entry above (r64) stands as the
  prior state. No game code touched, no BUILD bump.
- 2026-09-07 — r67: LAB CATCH-UP (Jacob: "clean up/catch up our lab to the
  main version. Explosion size should be 2x. Explosion look should be chunk —
  Lazy Dev / CAVE recipe. Kill sound should be heavy. remove those from the
  lab but keep the rest"). Per the §10 lifecycle rule: winners → constants,
  losers deleted in the same commit. `renderer.js` FX_SIZE = 2 (prefs.fxSize
  gone; bloom/heavy painters deleted); `game.js` `explode` = `explodeChunky`
  (classic recipe + its TIER_CORE/FIRE/SPREAD/STAG/SMOKE tables deleted;
  `g.fxStyle` field gone, main.js no longer mirrors it); `audio.js` thump
  under every explosion (killWeight switch gone). Lab rows left: skin,
  speedPopup, speedDress. `test/fxpeek.html` now peeks the one recipe;
  `test/shell.mjs`'s multi-decode check uses speedDress instead of fxSize
  (harness edit, not the referee). Open Q12 + Q14 marked decided. Corpus:
  boghog — explosions "significantly bigger than the enemy" (2×) and the
  Lazy Devs stall/cool/opaque recipe that r52 built from; MSX (DOJ) — "you
  hear the explosion", weight is half the feel. S2 held: chunky is opaque,
  drawn under bullets, budgets ≤ classic. Control sim: bot outcomes and
  scores identical to the r65 certificate (fx on g.fxRng only); stress max
  0.52 → 2.68 ms on one frame (p99 0.111, budget 16.6) — the chunky max-load
  spawn, still 6× under budget; evidence untouched, recert whenever the next
  design change settles. r66 is the `feat/music-cues` branch. BUILD r65 → r67.
- 2026-09-08 — r70 EXPERIMENT: BOSS HP MULTIPLIER in the Lab (open Q16). Jacob,
  after playtesting: the boss feels easier than the midboss (measured: midboss
  34–48 bullets avg with 1.3–2.1 extra enemies always on screen, boss 16–32
  and none; phases die in 4–8 s vs 10–29 s), killing parts makes it EASIER
  (DDP / Blue Revolver make it harder — next), and "we can increase the HP of
  the boss, despite what the corpora says… That's why we playtest!" Corpus:
  boghog T1 supports hp as the pattern-duration knob (the r25 midboss case);
  MSX — the boss is the exam, escalation should be met by killers too; the
  no-hp-inflation standing condition is about sponge-as-balance, not
  duration, and Jacob has explicitly overridden it for the boss regardless.
  Lab row `bossHp` (1× / 1.5× / 2× / 2.5× / 3×), a run-start tune knob
  (§10 Kinds amended) → `g.tune.bossHp`, applied at boss spawn and at each
  phase change; stamped on receipts. Referee runs defaults (identical to the
  r65 certificate — control sim). Timeouts untouched (no phase reaches 24 s
  even at 3×). Coming next, Jacob's order: parts that bite back, then
  difficulty modes (Normal / Hard; traffic at the midboss as the first
  modifier; hp identical across modes — modes are not a slider, Pillar 3).
  The boss-ritual plan (docs/plans/boss-ritual.md) waits behind these.
  BUILD r67 → r70 (r68/r69 = parked/in-progress branches).
- 2026-09-08 — r71: BOSS HP 3× (design change; Jacob's Lab verdict after
  playing 1.5× / 2× / 2.5× / 3×: "3 felt the best. I think it's best we design
  for difficulty and challenge. If it's difficult for me, it's likely
  normal/easy for expert shmup players. 3x felt challenging"). `ENEMY_DEFS[5]
  .hp` 130 → 390, `BOSS_PHASE_HP` 134/135 → 402/405; parts, windows, values,
  timeouts untouched. Lab row deleted (lifecycle rule); `g.tune.bossHp`
  stays a Booth/sandbox knob. Corpus: boghog T1 (hp = pattern duration — the
  phases and their rep-3+ escalation now exist for a killer); MSX — the boss
  is the exam, and Jacob's stated target audience (expert players) is the
  reference difficulty; the no-hp-inflation standing condition is overridden
  by Jacob for the boss (recorded r70). Pushback recorded: the referee's
  expert bot clears 1/7 seeds at 3× (it dies, no timeouts) — the bot is now
  far below the target player; s7 checks will be red at the next recert
  until the bot improves or the bars are re-read (Jacob's call, §7/§8.1);
  phase timeouts (24 s) are within reach of a slow P1 (~20 s for the bot)
  — extend to 35 s like the midboss, or leave as the stalling tax (Jacob).
  Design principle recorded (Jacob, 2026-09-08): design for difficulty and
  challenge; Jacob's own difficulty ≈ an expert's normal. Next: parts that
  bite back, then difficulty modes. BUILD r70 → r71.
- 2026-09-08 — r72: BOSS PHASE TIMEOUT 24s → 35s (design change; Jacob: "let's
  go with 35s for the boss phase timeout", after the r71 3× hp verdict).
  `BOSS_PHASE_TIMEOUT` 1450 → 2100, matching the midboss (r65). Reason: at
  3× hp the referee's expert bot — shooting the whole time — timed out P1 on
  2 of 7 seeds (25.8 s), throwing away the 12,000 phase value for being slow
  in a fight Jacob deliberately made longer; the escalation clock (§5.2b,
  1.84× at 20 s, 2.2× cap) is now the stalling tax, so the timeout only has
  to catch a true passive rider. Corpus: rubric S6 "no milking — every boss
  phase has a timeout" still holds (35 s, not removed); boghog T2 the stage
  does not wait — the boss gate is the run's end anyway; MSX — timeouts are
  scoring integrity, and a killer should not meet one. Control sim at r72:
  see the recert when authorized. BUILD r71 → r72.
- 2026-09-08 — r73 EXPERIMENT: BOSS PARTS BITE BACK in the Lab (open Q17).
  Jacob's second boss observation: killing parts makes the boss easier; DDP /
  Blue Revolver make it harder, points at the risk of a harder fight. Three
  variants behind the run-start knob `g.tune.partBite` (Lab row `bossParts`):
  clock (+1 rep per dead part), inherit (the core takes the emitter, denser),
  burst (retaliation ring + both). Bookkeeping only in `killEnemy`
  (`boss.partKills`), reactions in `updateBoss`, reset per phase. Default
  byte-identical to r72 (control sim). Values, windows, hp, timeouts
  untouched. Measured table + corpus in §10 r73. BUILD r72 → r73.
- 2026-09-08 — DOCS: `docs/BOGHOG_WORKSHOP.md` added — the SHMUP WORKSHOP 01–06
  digest (Jacob re-watched the series: "it seemed like we've missed stuff"; a
  transcript-vs-repo diff confirmed the rubric kept the checkable rules and
  dropped the vocabulary, technique catalogue, player-behaviour model and
  numbers). Each rule carries a ✅/◐/◻ status against r67–r70 code. Two ◻ rules
  became open questions with a builder plan (`docs/plans/boghog-ws-questions.md`,
  Lab rows in the r70 `bossHp` run-start pattern): **Q18 quantized aim**
  [WS03] and **Q19 the small-hitbox trade** [WS01] (which also supplies the
  argument Q15 lacked — both lenses point at "unify at 3.0", not "shrink to
  2"). Corpus clearance for both is written in the plan and must be restated
  in the entry that lands the knobs. CLAUDE.md's clearance rule now cites the
  workshop digest. No design change, no BUILD bump (r70 stands); §8 gained
  items 17–19 (17 = pointer to the parked beatPulse Q17 in §10).
- 2026-09-09 — r77: SHOT LOOK DECIDED — `heavy` SHIPPED (Q22). Jacob, after
  the r76 three-way row: "heavy is obviously the best." §10 lifecycle rule,
  one commit: the r76 recipe is the constant (`renderer.js` `drawShots` /
  `shotSprite` / `IMPACT_D`, `drawScorch` + impact pass always on;
  `prefs.shotLook` gone, the muzzle stamps stay); deleted: the r57 4×20 rect
  loop, the r75 `drawBolts` + `BOLT_ROWS` + 2-frame strobe + 3-frame blob
  painter, the Lab row (rows left: skin, speedPopup, bossParts, speedDress),
  `g.fxShot` + its gate in the hit block (the blob + two up-sparks now spawn
  on every hit, `fxRng` only), the `main.js` mirror, `audio.js`
  `setHitWeight` (the hit click is always on), the `?shot=` switch in
  `tools/shotpeek.html` / `tools/artpeek.html`. HOW TO card shows the bolt
  through a new renderer export `drawShot` (§6.2 r77 update, the card follows
  the winner as the r75 plan said). Control sim vs r76: bot lines, robust
  seeds, checks and determinism `7022:81960:144:0:-1` identical; S8 stress
  p99 0.143 → 0.114, max 0.595 → 0.574 (noise), heapDeltaKB 2775 → 3203 (the
  per-hit fx the default sim never spawned before); evidence untouched, recert
  whenever the next design change settles. Max-load draw 1.77 ms (r76 heavy
  1.78). Peeks `img/r77-shot.png`, `img/r77-howto-card.png`. Corpus: research
  §8 frame study (muzzle first, alternating, a third of the ship), boghog 101
  Shooting (length, messy streams, feel the damage), Vlambeer (muzzle, bigger
  bullets, lower accuracy, impact, permanence), WS05 ("always check in
  motion" — the verdict came from play), S1/S2 held (no DPS / cap / hitbox /
  speed / colour change; player family under enemy bullets). Left as is: the
  top-edge echo/ghost drag (~5 frames, cosmetic, not a one-liner). Details
  §10 r77; Q22 DECIDED; §10 live list. BUILD r76 → r77.
- 2026-09-09 — r76 EXPERIMENT: SHOT LOOK `heavy` in the Lab (open Q22, third
  choice on the r75 row). Jacob on r75: "better but still a pea shooter."
  `heavy` = bolt + the six recipes of `research/player-shot-juice-2026-09-09.md`
  in the frame study's revised order (§8): a 10×12 flame muzzle alternating
  barrels (4 frames), a 6×28 bolt + a 50 % echo 4 px behind + a 16 px four-ghost
  trail (clipped above the barrel line), ±1 px seeded jitter + the right rail a
  frame behind (draw only), a six-frame impact blob 8→1 px + two up-sparks +
  a 10-frame scorch dot, a 25 ms 150 Hz hit click once per frame under the
  tick (`audio.js setHitWeight`), and a 1/2 px spine shimmer. Core diff: the
  gated `if (g.fxShot)` block only (blob life, sparks, `fxRng`); control sim
  identical (determinism `7022:81960:144:0:-1`); `current` and `bolt`
  pixel-identical to r73 / r75 (0 differing pixels); max-load draw 1.74 →
  1.78 ms. Corpus: the frame study (research §8 — the muzzle is the biggest
  gap, width is not, Psikyo's pair, 3–4 volleys on screen), boghog 101
  Shooting (length to "ridiculous extremes", "huge messy streams… Chaos feels
  good", "make damage sounds more powerful"), Vlambeer (muzzle, bigger
  bullets, lower accuracy, impact, permanence), Lazy Devs cart (5-frame
  muzzle/splash, hit sfx once per frame), rubric S1/S2, Pillar 5. Pushback:
  WS02 (more white while firing), bible §2.5 alpha (echo + ghosts), bible §3
  white exclusivity. No DPS, cap, hitbox, speed or colour change;
  `src/howto.js` untouched until the verdict. Details §10 r76; Q22 gets its
  built line; §10 live list. BUILD r75 → r76.
- 2026-09-09 — r75 EXPERIMENT: THE PLAYER SHOT AS A BOLT in the Lab (open Q22).
  Jacob: "the shot feels like a pea shooter… visually, it looks like a simple
  rectangle being fired." Lab row `shotLook` (current / bolt, live): a 5×20
  pixel bolt (white 3 px head, dark rim, violet body + white spine, 2 px
  tail), an 8 px stepped trail, a 2-frame muzzle strobe on both barrels
  (shell-side, off the `SFX.SHOT` ring), and the hit IMPACT BLOB (research
  option 2 — the one core touch: `g.fxShot` mirrored like `g.fxMeta`, a gated
  `FX.CORE ck=2` spawn in the hit block, `g.fxRng` only). Default
  pixel-identical to r73 (0 differing pixels, artpeek before/after); control
  sim identical (determinism `7022:81960:144:0:-1`); max-load draw 1.64 →
  1.71 ms. Corpus: boghog WS05 player shots ("thick, detailed, juicy splash
  with good value contrast; always check in motion"), WS follow-through (the
  shot stream carries the ship's motion — no options), DOJ "weapons visually
  huge" / "every hit is answered", rubric S1 (fast, tall, economy untouched)
  and S2 (family + draw order unchanged). Pushback: WS02 value contrast of
  player shots (the strobe adds white 2 of 3 frames); bible §2.5 alpha (the
  trail uses the fx-halo exception). No DPS, cap, hitbox, speed or colour
  change; `src/howto.js` untouched until the verdict. Details §10 r75, Q22
  gets its built line. BUILD r73 → r75 (r74 = `feat/stem-layers`).
- 2026-09-08 — DOCS: `docs/plans/campaign-five-stages.md` — Jacob asked for a plan
  for four more stages ("i know we were planning on only a two loop game but i
  wanna see what u can come up with"). Proposal: a five-stage Psikyo-clock
  campaign (S2 Bone Rail = ground layer · S3 Candle Sea = formations + elite-pair
  set-piece climax · S4 Blood Gate = wall pods / risers / armoured Warden, the
  strict stage · S5 Great Altar = returning-midboss gauntlet + four-form finale),
  loop 2 = revenge-dot bullet-diff of all five behind a Ketsui-style seal. One
  niche, one place, one midboss gimmick, one boss dialect per stage; zero new hp
  tiers; speed-kill unchanged. Corpus clearance (MSX, boghog T1/T2/T3/WS03–06,
  HOMAGE L1–L8, ZeroRanger) is in the plan with the pushback. Needs Jacob's
  override on the Pillars identity line ("V1 = one full stage") and on §11 before
  anything is built; decisions it forces first: Q8 (suicide-for-bombs ×5) and an
  extend rule (options A1–A3). No design change today, no BUILD bump, §11
  roadmap unchanged until he rules.
- 2026-09-09 — PILLARS AMENDED + STOCK BONUS PER STAGE (decisions, no build).
  Jacob: "go ahead and fix the line. we are expanding this into five stages" →
  `docs/DESIGN_PILLARS.md` Identity: "V1 = one full stage" → "V1 = a five-stage
  campaign on the Psikyo clock", stage 1 the template, one new niche / place /
  boss dialect per stage, never a stage multiplier ("V1 has one loop" stands).
  Stock bonus: pays at every stage's tally (Jacob: "pay a bonus per stage,
  that's pretty common for every shmup I've ever played") — as the r78
  plumbing already does; boghog WS06 stage-end bonus archetype; S6 garnish
  sizing unchanged (lives × 1,000 + bombs × 500 per stage). Stage 2 content
  (THE BONE RAIL) is now unblocked.
- 2026-09-09 — r79: EXTEND RULE A1 + ONE-BOMB DEATH REFILL (design changes;
  Jacob: "let's go with the extend rule A1 and fix the bomb price").
  `game.js EXTEND_AT = 400000`: the loop's ONE extend the first frame score
  crosses it (lives +1, EXTEND popup, new `SFX.EXTEND` rising five); the HUD
  announces "EXTEND 400000" under the stock until earned (plan §5 A1: fixed,
  announced, binary — Pillar 2 visible math; Psikyo gives extends; a 10-minute
  1CC on three lives with none is CAVE-cruel). Carried across stages by
  `nextStage` (once per LOOP; loop 2 resets it when loop 2 exists). Dormant in
  a one-stage run (expert ≈ 150–190k). `playerDie`: bombs refill to ONE (was
  two) — Q8 DECIDED per boghog "keep the move, fix the price" [T3 balance =
  counters, not numbers]; the trade stays legal and visible (MSX natural
  meta) but pays half; stock value 1,000 untouched (S6, no scoring math).
  Control (r78 → r79, one stage, no extend reachable): expert clear 151,280 /
  0 lives → GAME OVER 79,790 (4 deaths); aggressive-human 86,890 → 122,630
  (both game over); passive-human clear 56,880 / 1 life → clear 49,930 / 0;
  s6_alignment 1.53 → 2.46. The bots leaned on the two-bomb refill as
  insurance at 3× boss hp; one bomb removes it. In the campaign the extend
  pays some of that back from stage 2 on — this is the trade Jacob chose.
  Referee stale since r65; recert per stage per §12. BUILD r78 → r79.
- 2026-09-09 — **r78 CAMPAIGN INFRASTRUCTURE** (plan `docs/plans/campaign-five-stages.md`
  §7 step 1, no stage content). **Jacob's override**, verbatim: "i kinda wanna go
  down the stage 2-5 route. even though stage 1 is not perfect. im getting really
  tired of playtesting it" — overriding the plan's "settle stage 1 first" gate (§7
  step 0). Built: `src/core/stages/s1.js` (stage 1's timeline MOVED, not edited)
  + `stages/index.js` (`STAGES`), `g.level` / `g.startLevel` / `g.stageBase`,
  `startRun(g, atT, level)`, `nextStage(g)` (lives, bombs, score, rng stream
  carried — no reseed), the dormant `'stageclear'` → receipt → briefing card →
  next-stage flow (5.5 s zero-input ≤ 6 s [WS05]), stage select on the PRACTICE
  row + `speedhell.level` + `?level=N` (title identical with one stage), Booth
  tapes / replay carry `level`, receipt + board stamp the stage only with >1
  stage; `tools/probes/campaign-probe.mjs`. Corpus: **boghog pushes back on the
  process order** — [T1] player abilities → enemies in the void → layout, scoring
  last: no stage 2 until the ship roster (A/B) and the S1 pass are settled; "work
  in passes with cooldown" (one stage per pass, playtested before the next) —
  recorded, and honoured in that this pass builds no content; [WS05] the ≤ 6 s
  between-stage cap is met. **MSX**: density over duration — Psikyo's length is
  fine, dilution is not; every added second must carry decisions (the Psikyo clock,
  plan §4 rule 1, is the guardrail when stage 2 opens). Pillars 3 (stage select is
  the practice tool), 4 (stock carries — the probe shows the r77 expert bot dying on
  a faked stage 2 at 0 lives), 7 (no per-frame cost: one property lookup for the
  boss hook). **Stage 1 byte-identical:** `startRun(g) → clear:8401:151280:124:69:3:0:0:0`
  = `startRun(g, 0, 0)`; sim identical to the r77 HEAD control in every run / seed /
  check / determinism string; shots replay `f=8401 score=151280 kills=124` = HEAD.
  Wiki: new §12; §1 and §11 gained one pointer each; the header. Not decided here
  (Jacob's): extend rule §5 A, Q8 price, the Pillars "V1 = one full stage"
  amendment, per-stage vs once stock bonus, the S5 amendment for the elite pair.
  BUILD r78. `test/sim.mjs`, `CRITIC_RUBRIC.md`, `evidence/`, `DESIGN_PILLARS.md`
  untouched.
- 2026-09-09 — **r80 STAGE 2 — THE BONE RAIL, core pass** (plan §3 stage 2 / §7
  step 2; Jacob: "build stage 2"). Built: `src/core/stages/s2.js` registered as
  `STAGES = [s1, s2]` (the r78 seam, receipt/briefing, stage select and `?level=1`
  are live); the ground-layer niche — rail tank (7), bone wall (8), the hull (9)
  with four deck turrets riding it, the anchor (10) — all turret / elite / part
  class, zero new hp tiers, all sealed by proximity (r18 canon, no new gate),
  tanks and the hull flown over (no contact), the wall a physical barrier; THE
  HEARSE (type 4 through the new `enemyUpdate` hook: rail crawler dragging a
  chained anchor on a deterministic pendulum — a physical hazard + the sub-part
  speed-kill target; no bloom, one-side escort); THE BELL (three forms on the
  shared ritual beats, moved verbatim out of `updateBoss`: tower → walker →
  clapper; dialect = pendulum arcs from a swinging emitter, `patterns.js
  staticFan`, boss-only); base-skin painters + a stage-2 landmark row, other
  skins fall back; `tools/probes/stage2-probe.mjs`, `campaign-probe.mjs` on the
  real table; three peek sheets. New §13, §12 status, Q24–Q26. **Corpus
  clearance.** *MSX:* density over duration — every section carries a decision
  (seal or snipe, breach or lane, deck-then-core), the caravan pull compresses
  what a speed-killer clears, dead air 1.3–1.9 s; expert bias — the deck's core
  opens only for the player who kills the deck, the walker's safe spot is
  re-earned; the Psikyo clock is the guardrail: pinned-expert 1:53–2:14, boss
  48–55 % (*pushback recorded:* over the 1:40 target and the 30–50 % boss band —
  Q24, a 2.5× Bell is the rule's remedy, Jacob's). *Boghog:* [T1] niches not
  counts (one niche: ground), chunk-with-escalation (≤ 2 reps, rep 2 = denser +
  half-tracks), "start hard, scale back" (the first clapper draft was a curtain
  and was cut to beats); [T2] escalate behaviour (half-tracks, risers later,
  the walker's steps), "no breather after the midboss" (rush at 2460); [T3]
  checkmate from physical properties (the anchor, the wall), balance = counters
  (armor that the deck unlocks, not hp); [WS03] roles named per form (arcs =
  area denial on the flanks, needles = pressure), #6 moving emitter; [WS04]
  turrets and tanks don't fly off, sealing + bottom band + top dead zone; [WS05]
  destructible-terrain theme, never two strong enemies at once, no vertical tank
  stacks (staircases), nothing at the edges (lanes at x 115 / 235, risers at
  the lane edge), release paid in loot. *Pushback recorded:* [T1] process order
  — no stage 2 until the ship roster and the S1 pass settle; Jacob's r78
  override stands; "work in passes with cooldown" — this is ONE pass, the Booth
  and the recert come before stage 3. *Pillars:* 1, 2 (speed-kill unchanged;
  the walls' loot and the extend are visible and binary), 3 (stage select is
  the practice tool, now live), 4 (stock carries — the campaign probe shows the
  r79 expert dying at the seam), 5 (the anchor is a real checkmate), 6
  (readable: ≤ 3 families, no new shape, the densest frame 81 bullets), 7
  (0.13 ms on the densest frame; pools unchanged). *HOMAGE:* L1 place ramp with
  guns ON the landmark (the hull), L2 release over the bell tower ending empty,
  L3 the ritual by construction, L5 fuses on every wave, L6 castes (tier + hull;
  the dialect is motion, not colour), L7 parts + point-blank under the tower /
  the walker, Psikyo#1 clock (to-boss 0:56–1:01 inside 42–80 s), Psikyo#5
  metronome (the rush's mid; S1–S2 rely on groups — a SHOULD, noted), Psikyo#6
  transform not phase, DDP#4 deck → core. *Stage 1 byte-identical:* campaign
  probe identity lines (`gameover:6438:79790:139:66:4:0:-1:0` for all four bots,
  = HEAD), `node test/sim.mjs` = the r79 control in every run / seed / check /
  determinism (`6208:82430:146:0:-1`), the passive-human's stage-1 outcome now
  spelled `stageclear` (same numbers). Shell PASS unchanged; shots DIVERGED vs
  the r65 certificate as at HEAD. Not decided here (Jacob's): Q24–Q26, the
  stage-2 referee control run + the one-word `sim.mjs` outcome edit (§12), the
  cute-occult pass for the new creatures, a stage-2 music cue. BUILD r80.
  `test/sim.mjs`, `test/bot.mjs`, `CRITIC_RUBRIC.md`, `evidence/`,
  `DESIGN_PILLARS.md`, `stages/s1.js` untouched.
- 2026-09-09 — **r81 STAGE 2 TUNE PASS** (Jacob's first play; §13.9, Q27 /
  Q28; plan §3 status). Two run-start Lab knobs on the r70 / r73 pattern
  (`main.js beginRun` sets `g.tune.s2tanks` / `g.tune.bellWalker` AFTER
  `startRun`; timeline events and the Bell read them when they fire; stamped
  on receipts) + one presentation change that ships. **`s2tanks` = swarm**
  (`stages/kit.js tankFile` `flank` files, `stage.js` case 7): the same n
  events spawn flank PAIRS at mid-height from alternating sides, rolling
  inward on rails to a diagonal of stops, hp 12 / prong every 55 f carried on
  the tank (`holdT` 1) — a lower tier, not inflation; value / window / angry
  untouched; S2's wall tanks stay r80. **`bellWalker` = calm** (`s2.js` P2):
  walk 3.4, dwell 240, flank sprays every 70 f (same geometry — the column
  under it stays clear), stomp every second landing (`e.bloomed` counts
  landings). **The sealed tell** (`renderer.js drawEnemy` reads `stage.js
  sealed` — the pure function, exported since r18 — with `mayFire`'s other
  gates; `skins/base.js` types 2 / 7 / 8 / 9, `cute-occult.js` / `synthwave.js`
  type 2; one cache-key bit, a 12th painter arg): a proximity-sealed ground
  gun retracts its barrel to ~0.65 with a 1 px `GROUND.out` cap and no
  highlight, and the sprite dims 2 frames in 4 (alpha 0.6, under the
  bullets, hit-flash wins). Probe `tools/probes/stage2-tune-probe.mjs` (the
  expert bot's opts copied verbatim from `test/sim.mjs`; mortal + pinned;
  table in §13.9): swarm 20 → 40 tanks, 8.4 → 30.7 killed, sealed kills 0 →
  1.3, bullets 70 → 91, column deaths 0.7 → 1.0; calm P2 deaths 3.4 → 2.6
  pinned / 1.6 → 1.3 mortal, P3 reached 0/7 → 2/7, transit share 38 → 40 %
  — the walker's transit follows the camp governor's latch (seeds latched
  90 %+ walk 50 %+), not the walk speed. **Corpus clearance.** *BH101:*
  "killing fast must be hugely beneficial and leaving alive dangerous" —
  the swarm tier dies in four bolts and its tail turns angry low on the
  field; "bullet sealing" as a minor mechanic made legible (the tell);
  "approaching for a kill must never be disproportionately dangerous" — a
  sealed tank is quiet, and the tell says so. *Boghog:* [WS05] spawn on
  opposite sides / never both at once (Q21), never let the player linger
  (flank pairs keep coming), no vertical tank stacks (the stops are a
  diagonal), never two strong enemies at once (S2's tanks excluded from the
  swarm); [T2] escalate behaviour, kill fast or be blanketed; [T3] balance =
  counters (a seal, not hp). *Pushback recorded:* boghog "I balance it so
  that I never feel comfortable dodging it myself" [T2] — `calm` is a
  softening, and a walker the ship outruns is a walker you can sit under;
  it stays a Lab option, not the constant. *MSX:* difficulty is content, but
  frustration is not difficulty — the safe spot under the walker must be
  legible, and Q28 separates "hard to catch" (the knob) from "the governor
  chasing a camper" (a rule question; Jacob's). No hp inflation (12 is a
  lower tier); no scoring math; `g.rng` untouched (spawn geometry and the
  tell draw none); core DOM-free (the renderer reads core, writes nothing).
  *Identity:* knobs at `current` → stage 2 byte-identical (probe row
  current/current = the r80 numbers: mortal P2 6/7, P3 0/7, 13.3 s, 1.6
  deaths); `node test/sim.mjs` = the r80 control in every run / seed / check
  / determinism (only the wall-clock S8 stress line differs), evidence
  restored; `campaign-probe` 30 ok, `gameover:6438:79790:139:66:4:0:-1:0`;
  `stages/s1.js` diff empty; `test/shell.mjs` PASS with six Lab rows (over
  the ~5 cap — said so in §10). Peeks `img/r81-s2-swarm.png`,
  `img/r81-sealed-tell.png` (`tools/s2tunepeek.html`). Not decided here
  (Jacob's): Q27, Q28, the governor question, Q24. BUILD r81.
  `test/sim.mjs`, `test/bot.mjs`, `CRITIC_RUBRIC.md`, `evidence/`,
  `DESIGN_PILLARS.md`, `stages/s1.js` untouched.

- 2026-09-10 — **r82 STAGE 3 — THE CANDLE SEA (core pass; §14).** Built from
  plan §3 on Jacob's runbook (`docs/plans/next-session-stages-3-5.md`, plan §7's order).
  `STAGES = [s1, s2, s3]`; `ENEMY_DEFS` gains 11 leader / 12 carrier / 13 Moth,
  each an existing tier row copied verbatim (turret / mid / elite) — zero new
  tiers, zero hp fixes. New niche: **formations with a leader** (speed-kill it →
  the file scatters; miss the window → it turns and streams). New midboss: the
  **Twin Moths**, a staggered mirrored elite PAIR that enrages when half of it
  dies. New boss: **THE MOTH QUEEN**, three forms, dialect = **eggs that hatch
  emitters**. One curtain accent (~8 s) at the Moths' arrival, cancellable by a
  carrier kept alive. Numbers in §14.6/§14.7.
  **Corpus clearance — what each lens says, including where it pushes back:**
  · **Boghog craft/workshop.** *For:* [T1] "think in niches, not counts" — one
  niche, three behaviours, no new stat; [T1] "levels are never finished, you
  just run out of time" — one pass, then stop; [WS05] themed sections with
  repetition-and-twist (the drill's V → mirrored double-V; the rush's every-third
  → every-second shooter), "popcorn forces streaming" (a missed file IS the
  streaming lesson), the just-in-time-cancel theme, landmarks as memory
  shortcuts (S5 SHOULD: every spawn anchored to the place ramp); [WS04] "lowest
  hp that still fulfils the role" (the leader at 24, argued in §14.2) and the
  dynamic lifecycle (a carrier left alive doubles its metronome and hoses);
  [WS03 #5] projectiles that spawn emitters — the boss dialect, previously ◻
  in our audit of the technique catalogue, now built. *Pushback:* [WS05] "never
  two strong enemies at once" — the Twin Moths break it deliberately; that is
  the S5 amendment below and nothing else on the stage overlaps two strong
  things. [WS05] "even ship intro animations add up" — no new zero-input beat
  was added; the briefing card is the r78 one. [T1]'s **novice test** is
  measured and FAILS in the swarm rush (2 of 6 file windows, every seed) while
  passing 49/49 in the isolated sections — logged as Q29, unfixed, because the
  remedy is section cadence and that is Jacob's call.
  · **[BH101 §Level design]** supplies the verbatim rule the whole stage is
  built on — "spawning two or more higher HP enemies at the exact same time
  creates confusion… spawning them one-by-one with slight delays creates an
  obvious route" — so the Moths stagger by 95 f, the carriers arrive one at a
  time, and files are sequenced by ≥ 90 f; "no lanes at the edges" (entries at
  x 56 / W−56); the Toaplan pattern as the core layer with popcorn clustered
  around it (a file IS that layer). **[BH101 §Bullet patterns]**: "fixed
  emitters = clean, moving emitters = distortion" — P2 lays eggs while
  strafing; "chunk bullets into lines and groups" — the egg's burst is a
  6-round ring, never a stray. *Pushback:* **[BH101 §Enemies]** "approaching for
  a kill must never be disproportionately dangerous" — reaching a leader means
  getting ahead of its file, which is exposure; the mitigation is that the file
  itself does not fire for 70 frames (§14.3) and the novice measurement above.
  **[BH101 §Scoring]** "incentives must be tangible… players gauge performance
  without reading numbers": the leader's payoff is the file visibly breaking
  up, and the carrier's is the size of its cancel wall — both are pictures, not
  numbers.
  · **Mark MSX doctrine** (`~/.claude/skills/mark-msx/references/philosophy.md`).
  *For:* the natural meta is untouched — speed-killing is still the only rule,
  and here it buys *safety* (a scattered file) rather than a new currency;
  expert bias holds (the better you play, the more files scatter and the
  cleaner the rush gets); difficulty is the content (the rush is the campaign's
  peak and is meant to hurt). *Pushback:* MSX's standing objection to opaque
  scoring — which is exactly why there is **no group payout and no leader
  bonus** (plan §5 option C stays unchosen) and why the carrier's cancel buys
  RADIUS at an unchanged 30/bullet rather than a better rate. Also his
  anti-dilution line: a stage that exists to be long is a defect — this one is
  1:45–2:03 with 0.7 s as its longest dead-air stretch.
  · **Pillars.** 1 (density over duration): the peak is 45 enemies / 78 bullets
  in 0.14 ms of draw; dead air 2.3 s total. 2 (natural meta): binary, visible,
  no math added. 3 (difficulty is the content): built hard first — the scale-back
  that happened was pattern cadence (the release moved 50 f later so the section
  reads as release), never hp. 4: stock is the only wall, and the honest expert
  still cannot reach stage 3 at r79 — that is Pillar 4, and the extend answers
  it (§14.7: 400 k is earned in stage 3 for the first time). 5: the bomb and the
  cancel wall are unchanged. 6 (readable chaos): three families, the brightest
  field in the game still inside the washed band (≤ `0x2e` per channel), the
  egg's telegraph in-family. 7: 0.15 ms worst measured frame against 16.6.
  · **HOMAGE.** L1 the place IS the wave (a landmark per section, the cocoon as
  the boss's approach); L2 breathers paid in loot; L3 the ritual unchanged; L6
  castes + a boss-only dialect (eggs appear in no section); L7 destructible
  parts and a point-blank invitation per form. **The curtain guardrail is the
  binding one** — "no slow-curtain primary language; true curtains only as
  5–10 s accents at midboss and boss finale" — and this stage spends exactly
  one, ~8 s, at the midboss, laned and slow so lethality stays positional. No
  CAVE endurance: the sections are 10–40 s and the forms resolve in 9–30 s for
  the expert.
  · **Rubric.** S2 ≤ 3 families and the washed band held; S3 all three attack
  types plus ≥ 2 lanes through the Moths' mirrored walls; S3b every MUST
  (WARNING over an emptied field, forms not phases, ≥ 1 part per form,
  point-blank invitation per form, medley finale, boss-only dialect); S4 role
  coverage + dynamic lifecycle (the carrier) + intro armor + outro; S5 themed
  sections, repetition-with-twist, tension-release, landmarks — and the ONE
  exception below; S6 unchanged (no new scoring math, garnish stays garnish, no
  milking: the carrier's pod budget is finite and it exits); S7 the expert
  clears pinned on 7/7 and the blind bot dies by 0:36; S8 measured above.
  **S5 amendment (Jacob, 2026-09-10, the plan's default):** rubric S5 gains one
  sanctioned exception — "a designed midboss PAIR, entering staggered by ≥ 1
  beat (Psikyo M7), once per campaign — stage 3's Twin Moths". *The rubric edit
  is pending Jacob's own commit in the main tree; `docs/CRITIC_RUBRIC.md` is
  untouched by this pass.*
  **Measured:** expert pinned clears 7/7 at 1:45–2:03, boss at 1:00–1:02
  (42–51 % of the clock), score 156–194 k; swarm rush 78 bullets / 45 enemies
  drawn in 0.14 ms; the Moth pair dies in 11.1–11.8 s inside a 35 s timeout;
  the full campaign clears in 7:05 / 439,740 with the 400 k extend earned.
  **Stages 1 and 2 byte-identical** (control diff in §12). `test/shell.mjs`
  PASS. Peeks `img/r82-s3-sections.png`, `img/r82-s3-boss.png`,
  `img/r82-s3-moths.png` (`tools/s3peek.html`). New open questions Q29–Q33.
  Not decided here (Jacob's): Q29–Q33, Q24 (the boss's share of the clock),
  Q17, and the S5 rubric commit. BUILD r82. `test/sim.mjs`, `test/bot.mjs`,
  `CRITIC_RUBRIC.md`, `evidence/`, `DESIGN_PILLARS.md`, `stages/s1.js`,
  `stages/s2.js` untouched.
- 2026-09-10 — **r83 stage 5's FINAL BOSS SKELETON: THE IDOL, four forms
  (§16).** Built out of order, per plan §7 step 4: the finale is a MEDLEY, so
  its shape must be agreed before stage 4's dialect is designed. Boss only — no
  approach, no midboss gauntlet, no loop-2 seal, and **`STAGES` stays
  `[s1, s2, s3]`** (reachable via `idol-probe.mjs` or the `?boss=idol` dev
  flag). Four forms, ≥ 1 destructible part each, one point-blank invitation
  (form 1's arc-wall lane, straight down under the idol), and the boss-only
  dialect is the medley itself: **1 THE IDOL** (static, 220, quotes stage 1's
  accelerating lances) → **2 THE DEMON** (aimed, 220, quotes stage 3's hatching
  eggs + stage 2's pendulum arcs off a censer) → **3 THE PRIESTESS'S MIRROR**
  (402, player-shaped: 3.7 px/f — the ship's exact speed — to the mirror of your
  column, firing Ship B's three-way spread, tightening into a "focus" spread
  when you hold still) → **4 THE HOLLOW CORE** (405, rings + every earlier
  dialect recombined, nothing new, plus the inert `quoteS4` hook stage 4 fills).
  Zero new enemy types (`ENEMY_DEFS` untouched, newest id still 13), zero new hp
  tiers, zero new emitters, zero new bullet shapes or colours, ≤ 2 enemy bullet
  families per form.
  **Corpus clearance, including pushback.**
  *For:* HOMAGE **Psikyo#6** is the direct warrant — "the final boss chains 4
  forms ending in an organic demon and a bare core with a firework desperation"
  (`homage/study-s1945ii.md:204–212`), and its measured forms run 10/10/14/12 s
  for ~65 s, which is where plan §3's ≤ 65 s target comes from. **L3** ("warn →
  enter → transform → desperate → receipt") and **L6/L7** (boss-only dialect,
  parts, point-blank invitation) are kept beat for beat. Rubric **S3b-5**
  ("recombines the earlier phases' bullet dialects *and only those*") is what
  form 4 is; **S3b-6** is answered by the medley itself. **[T2]** licenses the
  ritual pause ("stage-3/final bosses are the only gravitas pauses") and
  "no gimmick → buy interest with pattern variety; zigzag difficulty is
  acceptable" licenses the 220/220/402/405 zigzag. **[T1]** "boss HP is a
  pattern-duration knob, not durability; if HP must be short, use the
  intro-speed trick so the shape is instantly on screen" is why each short
  form's quoted dialect fires at t 24, at the front of its cycle. **[WS03 #5]**
  (projectiles that spawn emitters) is the egg quote, **#6** (emitter movement
  distorts the pattern) is the censer *and* the mirror, **#7** is the box trap
  the `quoteS4` hook reserves. **[BH101 §Level design]** "intensity variation so
  peaks stand out" — the finale is the peak the campaign exists to make. **MSX**:
  "legacy skill — good design challenges it instead of re-teaching how to jump
  over a pipe"; the medley is a legacy-skill exam written in the game's own
  accumulated vocabulary, and 3rd Strike's parry-as-knowledge-check is the
  nearest thing to a warrant for a mirror form.
  *Against (recorded, not engineered away):* **HOMAGE's own guardrail** says
  "boss phases 15–25 s" and forms 1–2 measure 5–7 s — an override plan §4 rule 1
  reserves for Jacob (**Q37**). **MSX** pushes back twice: "bloat & length as
  value — longer ≠ better, just diluted density", and harder, "devs terrified to
  punish the player until the very end, so the real game only appears at the
  end — costs longevity"; the answer has to be the campaign's own escalation,
  not the finale. **[WS05]** "even ship intro animations add up over many runs"
  — a four-beat ritual is paid every credit. **The ART BIBLE** has no fourth
  core hue (§3 "never a fourth saturated hue"), so form 4 burns in the boss
  row's own `ember` rather than inventing one; and it is silent on a
  player-shaped boss, whose §3/§6/§1 rules all pull against it — the declared
  resolution (ship SHAPE, boss PALETTE, BOSS SCALE, no violet) is in §16.4 and
  its readability is **Q35**. **Rubric S3 MUST** caps a pattern at 2 focal
  points and form 4 stacks five quoted layers on one cycle (**Q36**). **S6 +
  r72** make four forms a 140 s worst case against a ≤ 65 s target (**Q38**),
  and **Q24** is unresolved upstream: a *three*-form boss already overruns the
  30–50 % band. **Plan §3** spends the box trap on stage 4 "used once, here", so
  whether a finale quote is a second use under [T1] is **Q39**.
  **Measured (expert, lives pinned, 7 seeds; `tools/probes/idol-probe.mjs`).**
  Forms 1/2 run 6.5 s and 5.2–6.7 s; **form 3 TIMES OUT on 7 of 7** at 36.0 s
  with 23–230 hp still standing, so form 4 is never reached honestly (22.1–23.2 s
  in isolation); whole boss 49–52 s. The cause is dps, not hp: 34 / 38 / **11** /
  18 hp/s — a boss travelling at the ship's own speed away from the mirror of
  your column is never in your lane, and the governor bans the centre line,
  which is the mirror's fixed point. **Not patched with hp** (standing rule);
  three budgets measured and offered as **Q34** (A shipped, B a finale
  multiplier = four new numbers, C the mirror on the elite tier = no new numbers,
  4 forms on 6 of 7). Max bullets 221; worst peek draw 0.12 ms (budget 16.6).
  **Stages 1–3 byte-identical** (`campaign-probe`, `stage2-probe`,
  `stage3-probe` and `node test/sim.mjs` all equal to the r82 control, only the
  known run-to-run S8 wall-clock line moving). `test/shell.mjs` PASS. Peek
  `img/r83-s5-idol.png` (`tools/s5peek.html`; the `?skin=` pass caught and fixed
  a real bug — cute-occult and synthwave indexed 3-entry boss-phase arrays by
  phase and broke on form 4). New open questions **Q34–Q40**. Not decided here
  (Jacob's): Q34 (the hp budget), Q35–Q40, and the S5/S3b rubric consequences a
  fourth form implies (the evidence kit's shot list still reads "boss p1/p2/p3").
  BUILD r83. `test/sim.mjs`, `test/bot.mjs`, `CRITIC_RUBRIC.md`, `evidence/`,
  `DESIGN_PILLARS.md`, `HANDOFF.md`, `stages/s1.js`, `stages/s2.js`,
  `stages/s3.js` untouched.
