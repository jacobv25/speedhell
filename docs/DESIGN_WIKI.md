# SPEEDHELL — Design Wiki

*How the game's systems actually work and why they were built that way. Written for
three readers: Jacob coming back after a break, a future Claude session, and outside
eyes (Mark MSX, boghog). Every number here is read from the code, not remembered;
file:line pointers are to `src/core/`. Where a decision is contested or unresolved,
it says so — the "Open questions" section is the part to send to a critic.*

*Companion docs: `DESIGN_PILLARS.md` (the constitution), `HOMAGE_STUDY.md` (the
lineage laws), `BOGHOG_CRAFT.md` (craft notes), `CRITIC_RUBRIC.md` (the referee's
acceptance criteria). This wiki is the explainer that sits underneath them.*

Last updated: 2026-08-27 (r9, midboss bloom — uncommitted at time of writing).

---

## 1. The game in one paragraph

One stage, ~1.5–2 minutes for an expert, ~4–5 for a practiced human. A 320×427
field, fixed 60Hz, seeded deterministic logic (the same seed and inputs always
produce the same run — this is what makes the bot referee possible). Eight
sections: popcorn intro → turret alley → mid gauntlet → midboss → rush → elite
pair → release → 3-phase boss. You have 3 lives and 2 bombs; a death restores
bombs to 2. Score is the only progression. There is no rank, no difficulty
menu, no unlocks.

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
| Zako (popcorn) | 80 | 2 | 200 | 400 | 75f · 1.25s |
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
  off the bottom; magnet radius 53px.
- **Bullet cancels** — the screen's bullets convert to points at a per-bullet
  rate: 30 on elite/turret kills, bombs, and the S7 wall; 100 on a midboss
  **speed** kill (30 if late — r9, see §4.3); 100 on a boss phase kill.
- **Bombs** — cancel at 30/bullet, 180f invulnerability, 90f cooldown. The panic
  button has a price: each unused bomb is 500 at the clear tally.
- **Clear tally** — `lives × 1,000 + bombs × 500` (`game.js:481`).

### 2.5 Caravan pull (`game.js:323`)

If the screen is empty, no gate is holding, and the next timeline event is >30
frames away, the stage clock runs 4×. Speed-killing a wave pulls the next one in
sooner (WS06 lineage). Never fast-forwards through the WARNING ritual.

### 2.6 Known legibility gap

Speed-kill popups say `SPEED`, not the doubled number; slow kills say `+800`.
The biggest scoring lever is the one the player never sees. Candidate fix:
`SPEED +1600`. Not yet done.

## 3. Enemy lifecycles — "dynamic lifecycle" (S4)

The house rule: a speed-killed enemy shows only its polite opening; an ignored
one escalates and owns the screen. Escalation is on a *behavior* clock separate
from the *scoring* window, so the two knobs can be tuned independently.

- **Zako** (`stage.js:72`) — one-volley popcorn. Every 3rd in a group is a
  shooter (one aimed prong on the way down); the diver variant homes briefly
  at 40–70f then commits with a short aimed fan. Soft walls steer them back
  inside the field so wall-hugging can't drag them off-screen.
- **Turret** (`stage.js:118`) — scrolls down; goes "angry" at 4s on-screen (more
  fire, same scroll speed, so a lingering angry turret still clears on schedule).
- **Mid** (`stage.js:97`) — enters, holds deep (y 120–153), aimed fans every 80f,
  a spray at 230f; past 300f it parks and hoses. Exits (committed, never
  re-descends) at fireT > 560. *Note: the comment says it "exits before the
  midboss arrives"; mid #4 spawns at 2060 and exits around stage-frame 2710,
  after the midboss lands at ~2489. See §4.3 for why that matters.*
- **Elite** (`stage.js:131`) — parks deep (y 150), patrols the full width on the
  house tanh sweep, area-denial cycles that escalate per 210f rep: rep 0 is
  grindable, ring joins at rep 1, hose at rep 2, overstay tax at rep 3+. Killing
  an elite or turret fires a 30/bullet relief wall — "speed-kill = safety."

## 4. The midboss

### 4.1 Fight (`stage.js:172`)

Descends to y=73, then sweeps rail-to-rail on the house tanh curve. Phase A
(hp > 45%): twin aimed fans every 70f, bendy streams every 130f; a leave-alive
hose starts at 780f. Phase B: rings every 130f + bounded spray; a desperation
layer past 950f. Times out at 1,400f (23.3s) — flees, no score, no cancel wall,
gate opens. "No milking" (S6).

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
- **As of 2026-08-27 the committed `metrics.json` is stale** (pre-r8-fx). HEAD
  itself fails `s6_alignment` (2.07 < 3), `s4_dynamic` (1.55 < 1.6), and
  `s7_robust` when re-run. Recert is a separate, Jacob-authorized referee
  commit; builders never edit `test/` or `CRITIC_RUBRIC.md`.

The bots define what "expert" means here. Jacob is not a 1CC-level player;
"the bot can do it" is evidence about the bot.

## 8. Open questions (send these)

1. **Camp governor vs point-blank lineage.** Should a behavioral meter tuned
   against bots shape boss movement, or should anti-camp live only in the
   bullets and the hop? If it stays, should it be *visible* (a meter, a tell)?
2. **P3 parts reach.** Is the 5s part window honest for a human against the
   sweep + bob, or a bot-only side-bet? Measure before tuning.
3. **SPEED popups hide the number.** Show `SPEED +1600`?
4. **Midboss bloom readability.** Three slow laned walls at arrival — fair, or
   a jump-scare that needs to be two?
5. **Mid #4 exit timing** overlaps the midboss gate, contradicting its own
   comment. Fix the timing or accept the overlap as content?
6. **Chain as a scoreboard.** The HUD's most prominent number is the least
   valuable one. Keep it (it's the *speed-kill streak*, which is the identity)
   or demote it?

## 9. Practice notes (for humans)

- `sandbox.html`: presets spawn any enemy or the boss at P1/P2/P3 (P1 via preset
  has no pods — jump the timeline to 3900 for the real entrance). God mode and
  ∞ lives are on by default; `H` hitboxes, `L` labels (hp + remaining speed-kill
  window per enemy), time-scale, pause/frame-step.
- Never stop moving under the boss. Micro-dodge in its column; the governor
  counts that as engagement.
- Think stopwatches, not run time. Engage the instant something appears.
- Never leave items. Don't die, don't bomb unless it saves a life.

## Changelog of decisions recorded here

- 2026-08-27 — r9 midboss arrival bloom + speed-gated 100/bullet cancel.
  Decision: keep the full-screen detonation feel; source density from
  aggression, never from waiting. P3 parts: practice, not tuning, for now.
