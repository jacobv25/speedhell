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
