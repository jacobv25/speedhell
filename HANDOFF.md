# SPEEDHELL — Session Handoff (2026-09-01)

*Supersedes the 2026-08-29 handoff (that session's in-flight notes are folded
in; its r9–r17 stack is long committed). Written at closeout of the marathon
session that ran r18–r27. **Jacob's next step: polish phase, in a NEW
instance.** Read `docs/DESIGN_WIKI.md` changelog + `docs/research/README.md`
first — they are the deep record; this file is the quick resume.*

## State

- **Committed through r27** (`5d9b037` + closeout commit). **22+ commits
  UNPUSHED** to origin — Jacob's standing choice; ask before pushing.
- Working tree at closeout: only today's Booth recordings (committed by the
  closeout commit) — clean otherwise.
- **Servers left running on purpose:** Booth/no-store server on **:8002**
  (`node tools/booth-server.mjs`, kill by pid on port) and an older python
  no-cache server on **:8001**. The Booth flag-monitor was session-local and
  died with the old session — a new instance must re-arm it:
  `tail -n 0 -F playtest/notes.jsonl | grep --line-buffered '"kind":"flag"'`
  via Monitor.
- Referee: last full run at r27. **Board is RED on purpose** — see decision 1.

## Done this session (r18–r27, all Booth-driven)

- **r18** fire gating: canon's three gates replaced the "enemy must be 40px
  above player" mute (top-of-screen safe spot, boss included); `s6_topband`
  referee probe added (Jacob-authorized).
- **r19** overlap pass: crossers/risers, midboss escort + unseal.
- **r20** enemy identity art (two families, size ladder), player ship 28px,
  **display contract** (wiki §6.2, with images): dot = 6px effective kill
  radius, bullet white cores = true 3px, focus = shape. Hitbox tester +
  enemy gallery tools.
- **r21** seam pass (S1→S2 popcorn bridge, crossers to mid-side y88).
- **r22** flee telegraph (timed-out boss/midboss announces itself).
- **r23** grave-shot fix (dead enemies never update) + killed-boss bullet
  guarantee. **r24** caravan pull counts only engageable enemies.
- **r25/r26** experiment round: midboss 130→400hp (Jacob: "felt great"),
  elite rep-escalation bug fixed, **Booth VARIANTS panel** (deterministic tune
  knobs, chips at run start, every run/flag stamped, replay honors stamps).
- **r27** elite verdict shipped: **HP 220 + side entry + escort** as defaults;
  chips became rollbacks. TATE mode (T key / booth button, 90°/270°) +
  portrait layout.
- **Research corpus** (`docs/research/`): canon three-holes, hitbox display,
  playtest interviewing, ZeroRanger, Undertale free-release playbook, game-#2
  wrapper genres (verdict: story-rich roguelite action > Undertale-shape RPG >
  deckbuilder×shooter; avoid survivors-like). Strategy memory: ship SPEEDHELL
  asap as game #1; game #2 = Trojan shmup.

## Left to do (most important first)

1. **DECISION (Jacob): referee midboss bot-priority.** The expert bot times
   out the 400hp midboss on every seed (it chases escort popcorn; humans kill
   it in ~4–5s). Options in wiki changelog r26/r27: (a) bot target-priority
   referee edit, (b) accept red until recert, (c) revisit hp. Blocks a green
   board; should be settled before the Mark/boghog consult.
2. **POLISH PHASE** (Jacob's chosen next step; merge with his own list):
   ~~options menu~~ ✅ SHIPPED r29–r34 (volume, TATE, rebinding, fullscreen)
   → ~~onboarding~~ ✅ SHIPPED r35 (one-card HOW TO: display contract +
   speed-kill rule, auto-once + H key) → practice/section
   select (playerize the sandbox stage-jump) → local hi-score table + results
   "receipt" screen (homage L4) → `SPEED +1600` popup (wiki §2.6) → named
   boss patterns (ZUN/Undertale trick) → boss art to families (§8.11; NOTE any ship/bullet
   redesign must update the HOW TO card — src/howto.js mirrors the art,
   ⚠ notes in renderer.js) →
   title/menu music (parked r32: title screen is silent today — asset +
   direction decision, pairs with the attract-mode/title pass) →
   audio pass → cross-browser/perf pass → itch packaging.
3. **Mark/boghog consult handout ready:** wiki §6.2 + §8, docs/research/, the
   canon-three-holes HTML page, plus decisions 1 above, elite-cancel width
   (r21 changelog), s4_dynamic recert bar (chronic, four flips).
4. **Booth recorder divergence — RESOLVED r28 (2026-09-01).** Root cause: the
   renderer's screen shake drew from g.rng (renderer.js:55) — browser-only, so
   live runs consumed gameplay-rng the headless replay never saw. Fixed to
   g.fxRng; proof + sweep evidence in the wiki changelog (r28). Pre-r28 tapes
   are historical (inputs answered the leaked-rng world; will never replay
   true) — booth-replay.mjs now warns. Recordings made from r28 on replay
   byte-perfect; attract mode / practice replays are unblocked.
5. Deferred design queue: density pass (compression vs multiplication — after
   the consult), loop 2 (Ketsui-style seal), bullet-radius leniency (parked),
   suicide-for-bombs meta (§8.8).

## Next first step

Open a new instance in this repo and say what phase to run. For polish:
start with the options menu (index.html/main.js — volume sliders need
audio.js gain plumbing; TATE already has state to surface). Check
`git log --oneline -15` + wiki changelog tail to orient.

## Gotchas / decisions (the why)

- **Corpus rule is live** (CLAUDE.md): design changes cite boghog/MSX/research
  in the wiki changelog; hp changes need Jacob's explicit override (midboss
  400 and elite 220 have it, on record in the changelog).
- **Referee reds are not all equal:** s4_dynamic is chronic (bar encodes the
  pre-r18 world); the midboss timeouts are the bots' flaw, not the game's.
- **Bots ≠ Jacob:** he speed-kills far faster than the bots on bosses; bot
  TTK data misled twice (r19, r25 probes). Use DPS math + his hands.
- **The Booth is the method:** flag → replay → fix → verdict, one round per
  build tag, byte-identical referee checks for presentation-only changes.
- Variant chips are ROLLBACKS now (old values), not experiments.
- `tools/probes/` holds the session's measurement probes (absolute paths).

## State warnings

- 22+ commits unpushed (deliberate). Two servers running (above). Referee red
  (deliberate, decision 1). Recorder divergence FIXED r28 (item 4).
