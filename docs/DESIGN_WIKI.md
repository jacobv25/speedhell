# SPEEDHELL — Design Wiki

*How the game's systems actually work and why they were built that way. Written for
three readers: Jacob coming back after a break, a future Claude session, and outside
eyes (Mark MSX, boghog). Every number here is read from the code, not remembered;
file:line pointers are to `src/core/`. Where a decision is contested or unresolved,
it says so — the "Open questions" section is the part to send to a critic.*

*Companion docs: `DESIGN_PILLARS.md` (the constitution), `HOMAGE_STUDY.md` (the
lineage laws), `BOGHOG_CRAFT.md` (craft notes), `CRITIC_RUBRIC.md` (the referee's
acceptance criteria), `ART_BIBLE.md` (drawing rules, draft 2026-09-04), and `research/` (the deep-research corpus: canon fire-
gating/density/ground-layer, hitbox display, playtest interviewing, ZeroRanger —
see `research/README.md` for the roadmap state). This wiki is the explainer
that sits underneath them.*

Last updated: 2026-09-08 (r70 EXPERIMENT: boss hp 1×–3× in the Lab (open Q16); r67: Lab catch-up — 2× chunky explosions + heavy kill sound shipped, rows deleted; referee bot fix + recert at r65 — 16 green / 1 red; r65: midboss timeout 23s → 35s (design change, Jacob); referee recert at r64; r64: neon-vector + graphic-pop skins retired; r63: r59 needle caste merged into the skins line; r62: cute-occult is the game's look — Jacob's verdict; r61: four art skins merged for Jacob's playtest; r60: art SKINS — renderer split into skins/*.js, four concept directions built in parallel; r59: bullet caste by source — needles = special tier's aimed fire (design change, Jacob); r58: heading steps 16 → 32 after playtest; r57: ART_BIBLE Round 1 — pixel grid, named palette, family rims, pixel-disc bullets (renderer-only); r56: sound test z-order fix; r55: SOUND TEST card in OPTIONS; r54: kill sound weight in the Lab (open Q14); r53: speed-kill reward dressing (open Q13); Pillar 3 amended: modes, not a slider — §11 mode roadmap; r52: chunky explosion look in the Lab (open Q12). Reds = midboss bot-priority question only).

---

## 1. The game in one paragraph

One stage, ~1.5–2 minutes for an expert, ~4–5 for a practiced human. A 320×427
field, fixed 60Hz, seeded deterministic logic (the same seed and inputs always
produce the same run — this is what makes the bot referee possible). Eight
sections: popcorn intro → turret alley → mid gauntlet → midboss → rush → elite
pair → release → 3-phase boss. You have 3 lives and 2 bombs; a death restores
bombs to 2. Score is the only progression. There is no rank, no difficulty
slider, no unlocks. Today there is one mode (arcade); the mode roadmap is §11.

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

Escalation per 240f rep is super-linear past rep 3 — a "timeout-rider tax"
that only players stalling a phase ever meet. Killers resolve phases by rep 2–4.

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
8. **The suicide-for-bombs meta (accidental Garegga).** Discovered by Jacob in
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
16. **Boss phase hp** (r70 lab `bossHp` 1×–3×). The boss dies in 5–7 s per
    phase against the midboss's 10–29 s; its escalation never fires for a
    killer. Which multiplier makes the boss the exam and not the quiz, without
    turning it into sponge? Playtest decides; measured table in §10 r70. Tied
    to the coming decisions: parts that bite back (DDP/Blue Revolver) and
    difficulty modes (Normal = solo midboss, Hard = with traffic).

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

Live experiments (r70): **skin** (§11, r60) · **speedPopup** (§2.6, open Q4) ·
**bossHp** (boss phase hp 1×–3×, open Q16, r70, run-start tune knob) ·
**speedDress** (speed-kill reward dressing, open Q13, r53). Decided and
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
sequence (after the art overhaul), hit impact blob, sprite-shaped debris.

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
