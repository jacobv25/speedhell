# tools/probes — scratch measurement probes (rescued from session scratchpads)

Not referee checks — ad-hoc instruments built during Booth-driven rounds.
All import the core by ABSOLUTE path (adjust if the repo moves).

- `midboss-probe.mjs` — expert + aggressive-human midboss fight: kill frames
  from vulnerability, avg enemies/bullets in the gate, deaths. Used to aim the
  r25 hp experiment (bots are unreliable here: they chase escort popcorn).
- `camper-probe.mjs <y> <pure|dodgy> <seed>` — turret-alley camper: bullets
  seen, deaths, kill ages (the r16-r18 top-band investigation).
- `seam-probe2.mjs` — "nothing shootable" seconds across the S1→S2 seam (r21).
- `fmt-midboss.py` — formatter for midboss-probe output.
- `campaign-probe.mjs` — r78 campaign infrastructure: `startRun(g)` vs
  `startRun(g, 0, 0)` identity with the referee's four bots (seed C0FFEE), then a
  faked two-stage run (`STAGES = [s1, s1]`) asserting the carry-over — rng objects
  unchanged, stock / score carried, chain reset, `g.level`, the final `'clear'`.
  Imports by RELATIVE path (runs in any worktree). Exit 1 on a failed assert.
- `stage2-probe.mjs [seedsHex]` — r80 STAGE 2 (THE BONE RAIL): the referee's four
  bots on `startRun(g, 0, 1)` over seed C0FFEE + the six robust seeds (outcome,
  clock, time to boss, score, speed-kill rate per type, deaths per section, max
  bullets, timeouts, dead air, boss forms reached), the expert with lives pinned
  (the clock and every form), and the two-stage campaign with its carry-over.
  Builder instrument — the stage-2 control run in `test/sim.mjs` is Jacob's.
- `stage2-tune-probe.mjs [seedsHex]` — r81 stage-2 tune knobs (wiki §13.9, Q27 /
  Q28): for each `s2tanks` × `bellWalker` combo the expert bot (opts verbatim
  from `test/sim.mjs`) plays stage 2 alone on the seven seeds, mortal and lives
  pinned — tank column (S1 + S5) tanks spawned / killed / killed WHILE SEALED
  (ship inside 48 px at the kill), column deaths, max bullets, dead air; the
  Bell's P2 reached / P3 / killed, P2 seconds, transit share, the camp
  governor's latched share, P2 deaths, hp dealt in dwell vs transit; each death
  with its section, stageT, live / angry tanks, ship y. `COMBOS=swarm/current,…`
  and `MODES=mortal|pinned` narrow the table. Builder instrument.
- `stage3-probe.mjs [seedsHex]` — r82 STAGE 3 (THE CANDLE SEA): the referee's four
  bots on `startRun(g, 0, 2)` over seed C0FFEE + the six robust seeds (outcome,
  clock, time to boss, boss forms, score, speed-kill rate per type, deaths per
  section, max bullets AND max enemies for the run and for the SWARM RUSH alone —
  the stage's S8 stress scene, timeouts, dead air, the Twin Moths' fight length,
  and the formation ledger: files seen, files scattered vs turned), the expert
  with lives pinned (the clock and every form), and ONE full campaign run
  (levels 0 → 1 → 2 on the continued rng stream) printing each stage's outcome,
  the seams and the total clock. Builder instrument — the stage-3 control run in
  `test/sim.mjs` is Jacob's.
- `stage4-probe.mjs [seedsHex]` — r84 STAGE 4 (THE BLOOD GATE): the referee's four
  bots on `startRun(g, 0, 3)` over seed C0FFEE + the six robust seeds (outcome,
  clock, time to boss AND the boss's share of it, forms, score, speed-kill rate
  per type, deaths per section **with position clustering** — the modal 40 px
  cell and the cloud's spread, which is how S5 MUST's "a game-over teaches" is
  checked rather than asserted — max bullets / enemies, timeouts, dead air, the
  Gatekeeper's fight length and whether its LOCK was broken, and the Warden
  ledger: killed in-window / killed late / escaped, with the length of each
  late-kill RUSH); the expert with lives pinned, summarised against the Psikyo
  clock; the S4 MUST **1.6× check** run twice, scoped to the Warden sections and
  stage-wide; **pass 3b, the counter driven BY HAND** — the referee's bots cannot
  execute either answer to the Warden (bot.mjs homes to `bigY + closeY` and stage
  4's wall pods are type 15, so a pod near the bottom pins its target y there;
  and it always tracks a target's x, so it never flanks), so five canned holds
  (in-column at range / flank / shoulder / close / point-blank) measure the
  damage rule and the late-kill state directly; and ONE full campaign run
  (levels 0 → 1 → 2 → 3 on the continued rng stream). Builder instrument — the
  stage-4 control run in `test/sim.mjs` is Jacob's.
- `stage5-probe.mjs [seedsHex]` — r85 STAGE 5 (THE GREAT ALTAR): the referee's
  four bots on `startRun(g, 0, 4)` over seed C0FFEE + the six robust seeds —
  outcome, clock, the APPROACH's length against plan §3's ≤ 25 s, the GAUNTLET's
  length and each returning guard's own seconds against ≤ 8 s (the Hearse, the
  lone Moth, the Gatekeeper, and whether its lock was broken), time to the boss
  and the boss's share, forms reached with seconds per form and the hp still
  standing at a timeout, score, speed-kill rate per type, deaths per section with
  position clustering, max bullets / enemies, timeouts, dead air; the expert with
  lives pinned, summarised against the Psikyo clock and printing the per-form
  hp/s table; and **the FULL FIVE-STAGE CAMPAIGN** on one continuous rng stream,
  played three ways (honest · lives floored at 1 through the earlier stages ·
  invulnerable from the first seam) with the CAMPAIGN RECEIPT's own data
  (`g.stageLog`) printed exactly as the card reads it. Builder instrument — the
  stage-5 control run in `test/sim.mjs` is Jacob's.
- `idol-probe.mjs [seedsHex]` — r83 STAGE 5's final boss (THE IDOL, the four-form
  skeleton). Stage 5 is NOT in `STAGES`, so the probe pushes the module onto the
  table at runtime and plays the finale alone from `startRun(g, 0, <that index>)`.
  Three passes: (1) the referee's four bots on seed C0FFEE + the six robust seeds
  — outcome, total boss time (WARNING → resolution) against the ≤ 65 s target,
  forms reached, seconds per form with the hp still standing at any timeout,
  deaths per FORM, max bullets, timeouts; (2) the expert with lives pinned;
  (2b) the expert with forms 1-3 held at 1 hp (probe-only) so the MEDLEY is
  measured on every seed; (3) the hp-budget table — measured hp/s per form, each
  form against HOMAGE's 15-25 s guardrail, and the multiplier option B would need.
  `IDOLHP=220,220,220,405 node tools/probes/idol-probe.mjs` measures any hp budget
  without editing `s5.js` (it writes the exported table in place) — that is how
  wiki §16's options A / B / C were measured. Builder instrument — the stage-5
  control run in `test/sim.mjs` is Jacob's. **r84:** stage 4 is registered, so the
  probe now pushes stage 5 to index **4**, and form 4's `quoteS4` fires a real box
  trap — passes 1 and 2 are unchanged to the digit (the expert never reaches form
  4; it times out on the mirror, Q34), and only pass 2b moved. **r85:** stage 5
  is registered, so the probe pushes nothing — it starts the stage at its own S6
  RELEASE anchor (`startRun(g, 1750, 4)`), which is release → WARNING → the Idol
  and no stage in front of it. Read it next to `stage5-probe`, not instead of it:
  measured from the boss section the ship begins on W/2, which is the MIRROR's
  fixed point, so form 3 is at its worst there (7 of 7 timeouts) while the same
  form played from the top of the stage times out on 3 of 7 (wiki §16.3, Q46).
