# Runbook — next session: build stages 3–5 (Opus 5, fresh context)

*Written 2026-09-10 at the end of the r63–r81 Fable session. Purpose: a fresh
Claude Code session on **Opus 5** builds stages 3, 4 and 5 with as little
back-and-forth as possible. Read this file first, then `HANDOFF.md`, then only
the wiki sections and plan sections named below. Do NOT re-read the whole wiki
or the whole changelog — they are long, and the cost is the point.*

## 0. State you are inheriting (2026-09-10)

- `main` == `design/needle-tier` at **r81**, pushed. Stage 1 (THE CRYPT) and
  stage 2 (THE BONE RAIL, base-skin art) are live: `STAGES = [s1, s2]` in
  `src/core/stages/index.js`. Next free build number: **r82**.
- Campaign infrastructure (wiki §12): stage modules, `g.level`,
  `startRun(g, atT, level)`, `nextStage` carry-over (rng continuous), stage
  clear → receipt → briefing → next, stage select on PRACTICE, `?level=N`.
- Extend rule A1 (one per loop at 400,000, announced), death refills one bomb,
  stock bonus per stage, Pillars say "V1 = a five-stage campaign".
- Lab rows (six — over the ~5 cap; don't add more without deleting one):
  skin, speedPopup, bossParts, speedDress, s2tanks, bellWalker.
- Referee: last certificate r65; `test/sim.mjs` untouched since; the stage-2
  control run and the `'stageclear'` outcome edit are Jacob-authorized referee
  work, not a builder's. `test/shots.mjs` reports DIVERGED vs r65 — expected.
- Parked branches: `feat/music-cues` (r66), `feat/beat-pulse` (r68),
  `design/ship-b` (r69, Ship B). Leave them.
- Dev servers may be dead after a restart: `node tools/booth-server.mjs 8001`
  from the main tree serves the game (no-store).

## 1. Two decisions to take from Jacob BEFORE starting (or use the defaults)

1. **Stage 3's Twin Moths** put two elites on screen at once on purpose.
   Rubric S5 MUST says never two elites simultaneously and has no exception.
   Ask Jacob for the amendment in his words. **Default if he says "use the
   default":** S5 gains one sanctioned exception — "a designed midboss PAIR,
   entering staggered by ≥ 1 beat (Psikyo M7), once per campaign" — recorded
   in `docs/CRITIC_RUBRIC.md` by a Jacob-authorized commit (say so in the
   commit message).
2. **Stage 5's loop-2 seal** — loop 2 unconditional (Psikyo) or gated behind a
   clear condition. **Default:** unconditional; the seal idea stays an open
   question. (Loop 2 itself is NOT built this session.)

Everything else you need is decided. Do not reopen Q24 (Bell vs clock), Q28
(camp governor on the walker), Q17 (parts bite back), Q23 (shot limit) — those
are Fable/Mark/boghog conversations, listed in §5.

## 2. Order (from plan §7; the finale quotes every dialect)

1. **Stage 3 — THE CANDLE SEA** (plan §3): formations with leaders, carrier
   mids, the just-in-time-cancel curtain accent, midboss Twin Moths (the
   sanctioned pair), boss The Moth Queen (eggs that hatch emitters, 30 f
   telegraph). Expert clock 2:00. This is the density peak; its swarm rush
   becomes the S8 stress scene — report max bullets and draw time.
2. **Stage 5's FINAL BOSS SKELETON only** (plan §3 Stage 5 "The Idol", four
   forms: idol → demon → the Priestess's mirror → bare core): build the form
   changes and the medley hooks with placeholder patterns that quote stage
   1/2/3's dialects, so stage 4's dialect (the box trap) is designed knowing
   it will be quoted. No stage-5 sections yet.
3. **Stage 4 — THE BLOOD GATE** (plan §3): wall pods on both flanks, risers as
   a theme, the Warden (front-armoured elite: flank or point-blank, never
   sniped from below — a counter, not hp), midboss The Gatekeeper (closes
   lanes, transforms when its lock dies), boss The Gate (the box trap, used
   once). Expert clock 2:10. Highest deaths-per-minute by design.
4. **Stage 5 — THE GREAT ALTAR** (plan §3): ≤ 25 s approach (one of each
   returning niche, ≤ 1 rep each), the returning-midboss gauntlet (Hearse →
   Moths → Gatekeeper, one form each, ≤ 8 s each, no breathers, cancel to
   gold after each), WARNING over the emptied altar, the Idol with real
   patterns, the campaign receipt. Expert clock 2:15 (cap). Boss ≤ 65 s.
5. Then STOP. Loop 2, art passes, modes, the boss ritual/music plan are not
   this session's.

## 3. How to run each stage (the recipe that worked for stage 2)

- Branch `campaign/stage-N` from `main` in a worktree under the session
  scratchpad; one **Opus** agent per stage (`Agent` tool, `model: "opus"`,
  `subagent_type: general-purpose`). Brief = the stage-2 brief's shape:
  worktree path + commit rules; read list (CLAUDE.md, Pillars, plan §3 stage
  N + §4 checklist + §6, wiki §12 + §13 (stage 2 as the template) + §5.2b
  (escalation clock) + §6.2/§6.3, BOGHOG_WORKSHOP WS03–05, BH101 note,
  ART_BIBLE §3/§4/§6, the code: `stages/s2.js`, `stages/kit.js`, `stage.js`,
  `patterns.js`, `game.js`, `skins/base.js`, `test/bot.mjs`, `test/sim.mjs`
  READ ONLY, `tools/probes/stage2-probe.mjs`); the "what to build" condensed
  from plan §3; the hard rules; the verification list; the recap format.
- **Hard rules to paste into every brief:** stages 1..N−1 byte-identical
  (`node tools/probes/campaign-probe.mjs` + `node test/sim.mjs` vs a control
  checkout, then `git checkout -- evidence/`); never edit `test/sim.mjs`,
  `docs/CRITIC_RUBRIC.md`, `evidence/`, `docs/DESIGN_PILLARS.md`; new types
  APPEND to `ENEMY_DEFS` (stage 2 used 7–10; stage 3 starts at 11), no new hp
  tiers (popcorn 2 / turret 24 / part 24 / node 56 / mid 44 / elite 220 /
  midboss 400 / boss 390-402-405 at 3×, timeouts 35 s); no scoring math; loot
  garnish; `g.rng` only in core patterns, fx on `g.fxRng`; core DOM-free;
  castes (pink common, cyan = `NEEDLE_TIER` aimed fire only, ≤ 3 families);
  fire gating = r18 canon only; **flow: never two strong enemies spawned at
  once (the Moths pair is THE exception), no popcorn on both far edges at
  once, no lanes at the screen edges, no vertical tank stacks**; every new
  thing drawn legibly in `skins/base.js`, other skins fall back; a
  `tools/probes/stageN-probe.mjs` printing the bot table (4 bots × 7 seeds:
  outcome, clock, time-to-boss, score, deaths per section, max bullets,
  timeouts, forms reached) + one full campaign run; peek sheets
  `docs/img/r8N-sN-sections.png` / `-boss.png`; BUILD bump; wiki §14/§15/§16
  in §13's shape + §12 status + changelog with the corpus clearance the plan
  spells out INCLUDING pushback; plan §3 status line; `HANDOFF.md` not the
  agent's.
- After the recap: verify cheaply — `git log`, `git diff --stat` on the
  protected paths (must be empty), `node test/shell.mjs`, `node
  tools/probes/campaign-probe.mjs`; look at ONE peek sheet only if a number
  looks wrong. Merge into `design/needle-tier`, `git branch -f main
  design/needle-tier`, push main + the branch, remove the worktree, add one
  line to `HANDOFF.md`. Then the next stage.
- Token discipline: don't paste recaps back to Jacob in full — relay the
  table, the deviations, the questions. Don't re-run sweeps the agent already
  ran. Don't read images by default.

## 4. Per-stage numbers to hold the agents to (plan §4)

Psikyo clock 1'30"–2'15" expert incl. boss, 42–80 s to the boss, boss 30–50 %
(stage 2 came in at 1:53–2:14 with the boss at 48–55 % — Q24 is why; don't
"fix" it by hp). ≤ 8 sections, ≤ 2 reps each, escalating. One new niche per
stage, zero new hp tiers. Midsize metronome ~every 10 s. Boss ritual: WARNING
≥ 1 s over an emptied field, 90 f armored entrance, forms not phases, ≥ 1 part
per form, one point-blank invitation, boss-only dialect, medley finale
(recombination only). Release = loot over the boss's approach landmark, ending
empty. Between-stage zero-input ≤ 6 s (exists). Readability: every new dialect
drawn on the S8 stress scene before tuning.

## 5. Leave for Jacob / Fable / Mark / boghog (do not decide these)

Q17 parts bite back · Q23 shot limit · Q24 the Bell vs the clock · Q25
deck-turret/hull windows · Q26 two contact rules · Q27 does the tank column
teach sealing (human test; Lab `s2tanks`) · Q28 the walker vs the camp
governor's latch (Jacob: "it feels like the bell walker did not calm down at
all") · difficulty modes (his section notes) · the boss-ritual/music plan ·
Ship B retune + art · cute-occult art for stages 2–5 (deferred by Jacob) ·
referee recert + per-stage control runs (Jacob-authorized) · the Lab's six
rows (decide two).

## 6. If something is off

Run HEAD as a control before blaming a change (CLAUDE.md). A red check that
was red at HEAD is not yours. If an agent's stage-N probe shows the expert bot
never reaching the boss, that is a design problem to report, not to patch
with hp. If two agents' branches conflict in `ENEMY_DEFS` / `stages/index.js`,
resolve by keeping both appends in id order.
