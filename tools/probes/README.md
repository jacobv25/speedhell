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
