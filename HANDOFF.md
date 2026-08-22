# SPEEDHELL — Session Handoff (2026-08-22)

## ⚖️ DECISION NEEDED FROM JACOB (the brake)

**Round 6 (boss theatre) used its 3 builder iterations and did not fully close.
A 4th iteration needs your explicit go — that's the gauntlet's own rule.**

- **Theatre surface: CLEARED, verified 3× by fresh blind critics** — WARNING
  ritual, 3 true boss forms (winged carrier → armor-shed hull → bare core),
  burn telegraphs, destructible sub-parts per phase, boss-only bullet dialects
  (accelerating lances / twin spirals), desperation medley finale, per-phase
  arena restains. It looks and reads like the homage.
- **Balance surface: NOT closed.** Critic B (r6.3) found three low-skill
  full-pay breaks, all now encoded as RED referee checks:
  1. **Entrance-armor clobber BUG** — `src/core/game.js:119-120` sets boss
     armor then immediately zeroes it. A motionless hover kills P1 in 56f for
     SPEED pay before the boss fires. **Mortal-real. 2-line fix.**
  2. **3-spot shuffler** — the two-band latch memory is one band short;
     `pickSafeX` delivers the boss to the shuffler's third spot.
  3. **1.2px/f drifter** — the parked/drifter detectors leave the whole
     0.7–2px/f continuous-motion band ungoverned.
  Plus honest-cost tail: on fresh seeds the expert's P2/P3 kills brush/cross
  the 1200f decay knee (1 timeout + 2 decayed on 4 seeds).

**Options:** (a) authorize r6.4 — findings are concrete, fix #1 is trivial,
#2/#3 point at replacing movement-classification with a per-phase serve budget;
(b) commit theatre + bug-fix #1 only, accept documented invuln-only residuals,
revisit the governor as its own round; (c) park r6 uncommitted and play the r5
build first (`git stash` the tree; committed state is r5-complete + all docs).
**Recommendation: (a)** — but playtest the current tree first (it's genuinely
theatrical now) before deciding; your hands outrank the bots.

## State

- **Working tree: UNCOMMITTED r6 builder work** (src/ only: game.js, stage.js,
  patterns.js, renderer.js). All original 9 checks + s7_robust(6 seeds) green;
  s6_nocamp + s4_entrance_armor RED (the 3 breaks above, by design).
- Committed history this session (all green at their commit points):
  bot extraction → **screenshot harness** (zero-dep CDP, `node test/shots.mjs`)
  → boss-continuity instrument → **r5 CLOSED 2-critics-upheld** (popups, player
  color out of cyan, boss-handoff sync, section place-identity) → **homage study**
  (`docs/HOMAGE_STUDY.md` + `docs/homage/` — BR:DA/Psikyo/DDP film analyses) →
  S3b rubric → referee prep → s7_robust → s6_nocamp → r6.4 gate.
- Referee now: `node test/sim.mjs` (12 checks, takes a few minutes now — 6
  robust expert runs + 8 camp probes) and `node test/shots.mjs` (26 shots,
  replay-guarded, ~1s, spins its own server — the old handoff's python server
  is no longer needed).

## Left to do (after the r6 decision)

1. R7 stagecraft package (HOMAGE_STUDY): set-piece hull hosting turret alley,
   release-as-boss-approach, chain-route audit.
2. R8 receipt package: itemized stage-clear tally (per-section speed-kills).
3. Later: loop 2 as revenge-dot bullet-diff, countdown meter, boss briefing
   card, sound (Web Audio), r5 backlog nits (gold popup outline, HUD-strip dim).

## Gotchas (hard-won this session)

- **The Mac sleeping kills agents mid-response** — every "stalled" agent this
  session was the machine dozing; resume via SendMessage recovers them. Use
  caffeinate for long autonomous runs.
- s6_nocamp/s4_entrance_armor are law now: any boss change must pass 8 camp
  probes + descent-HP check. s7_robust runs 6 seeds — green-on-one-seed can't
  happen again. s7_pressure sits at ~24.7 vs 24.0 — tightest tripwire.
- Builders never touch test/, docs/, evidence/. Referee changes land first,
  in separate commits. 2 fresh blind critics close a round; adversarial
  re-probes (critics writing their own exploit bots) are what caught
  everything the metrics missed — keep that pattern.
- Governor comments in stage.js drifted from code (ration numbers, armor
  claim) — builder should true them up in r6.4.

## Next first step

`cd ~/Dev/speedhell && node test/sim.mjs` (see the 2 red checks), open
`index.html`, fight the boss yourself, then give the r6.4 go/no-go.
