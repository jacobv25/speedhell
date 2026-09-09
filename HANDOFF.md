# SPEEDHELL — Session Handoff (2026-09-08)

*Rewritten from scratch at r73 by the session that ran r63–r73 (2026-09-05 →
09-08). Supersedes the 2026-09-01 snapshot. The deep record is
`docs/DESIGN_WIKI.md` (its "Changelog of decisions" is current through r73)
and `docs/plans/`; this file is the quick resume. Memory for Claude sessions:
`~/.claude/projects/-Users-jacobvalenzuela-Dev-speedhell/memory/`.*

## State

- **`main` == `design/needle-tier` at r77** (r77 = heavy shot shipped, Jacob: "heavy is obviously the best"; feat/shot-look merged), pushed to GitHub
  (`jacobv25/speedhell`). Fast-forward main after every commit on
  design/needle-tier (a clean `play-main` worktree exists for that).
- **Two Claude sessions share this working tree.** As of this rewrite the
  OTHER session has uncommitted files here: `docs/plans/campaign-five-stages.md`,
  `docs/plans/boghog-ws-questions.md`, `docs/BOGHOG_WORKSHOP.md` (+ edits to
  `CLAUDE.md`, `README.md`). Don't commit or revert another session's files;
  `git add` by name. Check `BUILD` + the wiki changelog before taking a round
  number (next free on main: **r78** — r74 is `feat/stem-layers`).
- **Referee:** last certificate r65 (expert bot fixed to close on big
  targets). Since then r71 (boss hp 3×), r72 (boss phase timeout 35 s) and
  r73's experiment changed outcomes; at 3× the bot clears 1–2 of 7 seeds and
  is below Jacob's target player. **Recert once modes + parts land**, one
  Jacob-authorized commit. Run HEAD as a control before blaming a change.
- **Servers** (session-local, may be gone): :8001 python no-cache on this
  tree; :8005 Booth server on this tree (music lab); :8007 music-cues,
  :8008 beat-pulse, :8010 ship-b worktrees. `node tools/booth-server.mjs <port>`.

## Done 2026-09-05 → 09-08 (r63–r73)

- **Music lab** (`tools/music/`): Demucs stems + beat grid (`analyze.py`),
  browser marker app (`lab.html`, Booth server `POST /music/cues`), cues
  format in `docs/music/<track>.cues.json`. Boss-track cues seeded from
  Jacob's first listen. insert-coin-skies has a 3:2 tempo ambiguity — use
  `--bpm 172`. Skyline Breaker's true grid is **125 BPM / 0.480 s / first
  beat 0.004** (the old 123 / 3.692 json is wrong).
- **r63** merged r59 (needle caste) + r60–r62 (art skins) — `art/skins` had
  been cut from r58 and silently lacked r59. **r64** neon-vector +
  graphic-pop skins retired (cute-occult default, synthwave kept).
- **r65** midboss timeout 23 s → 35 s (Jacob, after watching the certified
  fight live in the sandbox). Removal rejected: the post-bloom crosser pulse
  is an infinite point source (S6).
- **Referee fixes (Jacob-authorized):** bot closes in on big targets
  (`test/bot.mjs` closeY/closePull/trackPull 110/1.0/0.8 — the old bot shot
  from the bottom at half DPS because of shotLimit 6); shots harness p2 rule
  uses the phase latch. Recert at r65: 16 green / 1 red (lives on 3 seeds).
- **Sandbox:** `bot=referee` + URL presets — `sandbox.html?stage=0&seed=
  12648430&bot=referee&god=0&lives=0&speed=4&slowAt=N` replays the certified
  run live (midboss ≈ frame 2241, boss ≈ 4680 at r73).
- **r67** Lab catch-up: 2× chunky explosions + heavy kill sound shipped as
  constants; classic/bloom/heavy painters and the rows deleted.
- **r70→r71** boss hp 1×–3× in the Lab → **3× shipped** (390/402/405).
  Jacob: "design for difficulty and challenge. If it's difficult for me, it's
  likely normal/easy for expert shmup players." **r72** boss phase timeout
  24 s → 35 s. Wiki **§5.2b** documents the escalation clock (rep table, per-
  phase scaling + unlocks, timeout, parts-per-phase) for Mark/boghog.
- **r73 EXPERIMENT** parts bite back — Lab `bossParts` current / clock /
  inherit / burst (open Q17). Both critic lenses lean **inherit**; burst
  needs a telegraph; clock is least legible. Expert playtesters decide.
- Plans written: `boss-ritual.md` ("the player wins": hp drives phases,
  music follows; boss track from 0:00 = the 12-s intro ritual),
  `stem-layers.md` (stage track breathes via Demucs stems, no jumps),
  `midboss-tell.md` (1-s sting + top-band bracket, no gate).

## Branches (all pushed unless noted)

| branch | build | state |
|---|---|---|
| `feat/music-cues` | r66 | PARKED — bar-snapped section jumps = "scissor cut"; salvage its 125 BPM grid + cues loader |
| `feat/beat-pulse` | r68 | PARKED — pixel-identical off, imperceptible on; revive with a `bold` setting |
| `design/ship-b` | r69 | IN PROGRESS — Ship B "PRIESTESS" (3/1.5/1.5 at ±2.2, speed 3.2, focus 2.5, cap 9); Jacob: "much more difficult than ship A", keep for now; art + Ship-B referee runs pending; popcorn-rate red + 2/6 robust recorded |
| `feat/stem-layers` | r74 | BUILT, pushed, unmerged — Lab `musicLayers` (off by default): 3 layers (rhythm/lead/voice) at 32 kHz mono, 73.9 MB PCM, ramps on bar lines; Jacob listens on its worktree port |

## Left to do (most important first)

1. **Jacob's TODO — difficulty modes.** Playtest more, then write what
   Normal and Hard each do at every section (S1…S8). Modes are named
   designs, not sliders (Pillar 3 / §11): boss hp stays 3× on both; parts
   bite back on both; first modifier = midboss traffic (Normal solo, Hard
   with the crosser pulse). Then a plan + agent, Ship-B style.
2. **Parts verdict (Q17) — SAVED for Mark + boghog** (Jacob, 2026-09-09:
   "I'm not sure if it's my skill issue or the boss is unfair"). Expert hands
   on the r73 Lab links → winner becomes the constant, row deleted, §5.3
   priority rule rewritten. Don't decide this from Jacob's play alone.
3. **Boss ritual** (`docs/plans/boss-ritual.md`): waits on Jacob's marks in
   the music lab (P1/P2/P3 sections, loop points, pattern moves with the
   five move words), intro dialogue draft, skip input (START vs double fire).
4. **Stem layers** built on `feat/stem-layers` → Jacob listens with `?lab=musicLayers:on` (needs the gitignored stems: run the analyzer in whichever tree serves it); merge if it flows.
5. **Midboss tell** (`docs/plans/midboss-tell.md`) — small; build when Jacob
   says go (Lab `midbossTell`).
6. **Ship B — TODO (Jacob, 2026-09-09):** "it will require more tweaking…
   In the shmup games I've played, the ship with the wide shot is easier at
   clearing stages and popcorn enemies but more challenging when facing the
   boss. Our ship B just feels all around more challenging." Target identity:
   EASIER on popcorn/stage, HARDER on the boss. The probe agrees (popcorn
   speed-kill rate 45 % vs A's 62 %; range DPS a fifth of A because missed
   side bolts hold cap slots). Retune as a measured option (side-bolt angle
   ±1.6, per-bolt lifetime, or a cap that doesn't count off-screen bolts);
   then art (second craft, HOW TO, artpeek `?ship=1`) and Ship-B referee
   runs (Jacob-authorized). Sandbox ship sliders no longer move the ship.
7. **Referee recert** after 1–2 land. The expert bot is below Jacob's target
   player at 3× — a stronger dodge (referee change) or re-read bars (§8.1).
8. **Jacob's playtest notes 2026-09-09 (wiki Q21/Q22):** flow — S6 two elites
   overlap ~7 s on most runs, S3 four mids at once; far-side popcorn arriving
   simultaneously (risers 2470/2660/3290, S1 group at 420) "doesn't feel
   good"; the player shot "looks like a simple rectangle" — WS05 wants thick /
   detailed / juicy splash (Lab `shotLook`, renderer-only). All logged, none
   built; the flow items are modes-notes material.
9. **Campaign (stages 2–5):** the other session's proposal
   `docs/plans/campaign-five-stages.md` (uncommitted at rewrite time) — a
   design proposal for Jacob's decision; it amends Pillar scope and §11 and
   says no stage 2 until the current pass settles.

## Gotchas / decisions (the why)

- **Standing conditions** (CLAUDE.md): no hp-inflation *fixes* — Jacob
  overrode it for the boss (r71) on boghog T1 grounds (hp = pattern
  duration); no scoring-math changes; loot garnish; pass-cooldown.
- **"Design for difficulty."** Jacob's own difficulty ≈ an expert's normal;
  bot deaths are a bot ceiling, not a verdict (memory:
  `jacob-difficulty-principle`).
- **Lab lifecycle:** winner → constant, losers deleted in the same commit;
  run-start tune knobs are allowed in the Lab since r70 (`bossHp`,
  `bossParts` pattern: `main.js beginRun` sets `g.tune.*` AFTER `startRun`,
  which rebuilds `g`).
- **Referee bot:** `PLAYER.speed` is read by bot.mjs; Ship B's branch routes
  it through `SHIPS[g.ship]`.
- **Sound "dead" while music plays** = a wedged AudioContext in the tab —
  reload; each dev port has its own localStorage (SFX slider).
- **Two sessions, one tree:** always `git add` by filename.
