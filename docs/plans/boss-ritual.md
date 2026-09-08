# Plan — Boss ritual + song-following boss ("the player wins")

*Written 2026-09-07 for a builder agent, from Jacob's decisions in the boss
discussion. Branch: new `design/boss-ritual` from `main` (r67+). Read
`CLAUDE.md` first, then `docs/DESIGN_PILLARS.md`, `docs/DESIGN_WIKI.md` §5
(the boss), §7 (referee), §10 (Lab), `docs/HOMAGE_STUDY.md` (L3 ritual),
`docs/BOGHOG_CRAFT.md`, `src/core/stage.js` (WARNING at stageT 3830, boss at
3900, `updateBoss`, `BOSS_PHASE_HP`, `BOSS_PHASE_TIMEOUT`), `src/audio.js`
(`MUSIC`, `playMusic`, the r30 volume rule), `src/main.js`, `tools/music/README.md`
and `docs/music/insert-coin-skies.cues.json` (Jacob's marks — the spec's data).*

## Decisions already made (do not re-open)

1. **"The player wins."** Boss phases stay HEALTH-driven with their timeouts.
   The MUSIC follows the fight, never the reverse. (Jacob, 2026-09-07; the
   alternatives — song-locked phases, stem layering — were declined for the
   boss. Stem layering may still come to the STAGE track later.)
2. **The boss track starts at 0:00.** Its first ~13 s are the arrival ritual
   ("boss intro with characters and some quick story and talking before the
   fight"). Today `MUSIC.boss.start = loopTo = 38.94` skips that intro; this
   plan is the pending design change that moves it (wiki + memory both note
   it as pending).
3. **Marks, not code, carry the musical story.** Everything below reads
   `docs/music/insert-coin-skies.cues.json` (made in `tools/music/lab.html`,
   kinds intro / phase / pattern / transition / cosmetic / note). Swapping the
   track later = swapping one JSON + re-marking.
4. Standing conditions hold: no hp inflation, no scoring-math change, loot
   stays garnish, cyan needles = special-tier aimed fire only (r59).

## How the two clocks are reconciled (the core idea)

The core never reads the audio clock (referee determinism). So:

- **Phase start = song jump.** When a phase begins (P1 at fight start, P2/P3
  on the previous phase's kill), the shell jumps the boss track to that
  phase's marked section start, on the next bar line, inside the phase-break
  moment (explosion, hitstop, cancel wall) — a cut that lands as part of the
  hit, not a splice mid-flow. The stage-track "scissor cut" verdict (r66,
  parked) does not apply here because the boss already has a hard beat there.
- **Signature moves ride the phase's frame clock.** A `pattern` mark at song
  time *t* inside phase P's section (section start *s*) becomes a boss move
  at frame `round((t − s) · 60)` of that phase. Because the song was jumped
  to *s* when the phase began, song time and phase time agree to within the
  audio nudge (< one beat). The core schedules by frames (deterministic, sim
  runs it identically with no audio); the song simply happens to be at the
  same place. If the player ends the phase before a move fires, the move is
  skipped — the player won.
- **Loops.** A phase can outlast its section (timeouts are 24 s). Each phase
  section needs a marked loop point (`transition` mark with label `loop`), or
  the whole section loops. Moves past the loop repeat on the loop period.
- **Audio follows the sim.** Once per second the shell compares
  `el.currentTime` to the phase's expected song time and, if drift > 80 ms,
  nudges the element (never the sim). Pause/resume keeps working (r43/r30).

## Data contract (Jacob supplies the marks; the builder reads them)

`docs/music/insert-coin-skies.cues.json` `cues[]`, by kind + label:

| kind | label | meaning | required |
|---|---|---|---|
| `intro` | `intro` (t=0, end≈13) | arrival ritual; `end` = fight start | yes |
| `phase` | `P1`, `P2`, `P3` | section start for each phase | yes (3) |
| `transition` | `loop` inside a phase section | where that section loops back to its phase start | optional |
| `pattern` | free text | a boss move at that moment (label = which move; notes = Jacob's description) | as many as he marks |
| `phase` | `clear` | section for the clear tally (music after the last kill) | optional |
| `cosmetic` | free | renderer-only pulses at that moment (background, flash) — no core | optional |

The four seed marks Jacob already made (intro 0–12, "music starts jamming"
13 s, "flow changes" 22–24 s, "deep bass percussion" 32 s → massive circle
bullets) map to: intro end 13 = P1 start; the 22–24 s transition = a P1
move or the P1 loop point (Jacob decides in the lab); 32 s = a P1 `pattern`
("massive circle bullets"). **The builder must not invent marks.** Missing
required marks → build with placeholders at the analysis JSON's section
boundaries, label them PLACEHOLDER in the wiki, and say so in the recap.

Move vocabulary (label → emitter), the builder implements these and only
these, each a group per rubric S2, on `g.rng` in the same order every run:
`ring-big` (massive slow circle bullets, 3.2 r rounds, one ring per bar of
the mark's duration), `fan-aimed` (needle fan, special tier), `wall-laned`
(existing `arcWall`), `spiral-burst` (existing twin spirals, 2 s), `lance`
(existing lance volley). Anything else Jacob writes in a note = ask, do not
guess.

## The ritual (arrival), frame by frame

Today: stageT 3830 WARNING (70 f gate, siren, music cut, sweep) → 3900 boss
spawn → 90 f armored entrance → fight. New (intro length L = `intro.end ·
60` frames, from the marks; 13 s → 780 f):

1. **3830 WARNING** as today, but bigger: the siren, the sweep and the stage
   music cut stay; the boss track starts at 0:00 on the siren's last hit
   (`playMusic('boss')` with `start: 0`); the WARNING band grows to a
   screen-wide card for the full intro (renderer). Gate holds (`'warning'`
   → `'boss'`); the caravan pull never fast-forwards it (existing rule).
2. **Boss enters immediately** (spawn at the WARNING instead of 70 f later)
   and *stays armored for L frames* — visible, moving on its P1 rail hop at
   half speed, firing nothing. The player keeps full control and may shoot
   (armor = 0 damage, hit sparks only). Boghog: the ritual is a beat, not
   dead air — the boss is on screen doing something the whole time.
3. **Dialogue** (the "characters + quick story + talking"): text lines from
   `docs/boss/intro.json` `[{ at: seconds, who: 'witch'|'boss', text }]`,
   Jacob-authored, drawn by the renderer as two portrait boxes (art from the
   cute-occult skin's ship + boss sheets — placeholder boxes are fine for
   the builder; Round-style art later). Timing keys off the intro frame
   clock (`frames since WARNING / 60`), so it matches the song without
   reading it. Pure presentation: nothing in core.
4. **Skip** (MSX: no unskippable cutscene every credit): pressing START (or
   fire twice?) — Jacob picks — ends the intro early: the core jumps the
   intro counter to L (deterministic: the skip is an INPUT, recorded like any
   other, so replays reproduce it), the shell seeks the song to the P1 mark
   on the next bar line. Practice mode starting at the boss skips the intro
   automatically (Jacob confirms).
5. **Fight starts at L**: armor off, wing pods deploy (today's "last beat"),
   P1 patterns begin, song is at the P1 mark by construction.

The 2× bigger WARNING vs the midboss's future *tell* (smaller, no gate) is
a separate small plan; do not build a midboss warning here.

## Non-negotiable constraints

1. `src/core/` DOM-free, deterministic; cue TIMES enter the core as a
   generated JS data module `src/core/data/boss-cues.js` (a script
   `tools/music/export-cues.mjs` writes it from the JSON — commit both; the
   sim imports the module, never fetches).
2. No hp / timeout / scoring / window changes. `BOSS_PHASE_HP`,
   `BOSS_PHASE_TIMEOUT` untouched. The intro adds L frames to every run: the
   referee's frame counts shift by exactly L for every bot (report it); no
   other outcome may change for a bot that ignores the intro.
3. Never edit `test/sim.mjs`, `docs/CRITIC_RUBRIC.md`, `evidence/`. The
   recert is a separate, Jacob-authorized commit. Run HEAD as a control.
4. `g.rng` order: new boss moves draw rng only when they fire; the intro
   draws none. Verify with the determinism check.
5. Music volume via element volume (r30). Seeks land on bar lines from the
   cues JSON's grid (bpm / first_beat / bar_phase), never mid-beat.
6. BUILD bump; wiki §5.1 rewritten (ritual), new §5.7 "The song follows
   the fight" (the reconciliation above + the marks table as built), §10 if
   any Lab row is added (none planned — this ships as the design, not an
   experiment), changelog with both corpora cited including pushback (MSX:
   skippable, player control; boghog: ritual is a beat, HP knob untouched;
   HOMAGE L3 ritual order kept; rubric S3b arrival: bare field at spawn —
   the boss alone is allowed).

## Steps (in this order; stop and report after 3)

1. `tools/music/export-cues.mjs` + `src/core/data/boss-cues.js`; the core
   reads intro length, phase sections, loop points, moves.
2. Core ritual: boss spawns at WARNING, armored for L, skip input, moves
   scheduled per phase. Sim control run: frames shift by L, nothing else.
3. Probe `tools/probes/boss-ritual-probe.mjs`: for the certified seed print
   the boss timeline (frame → event: warning, spawn, intro end/skip, phase
   starts, each move fired or skipped, kills) for expert + human bots, and
   the diff vs HEAD (frames +L only). **Report.**
4. Shell: `MUSIC.boss.start = 0`, phase-start seeks on bar lines, drift
   nudge, skip → seek, practice-at-boss skip.
5. Renderer: full-screen WARNING card for the intro, dialogue boxes from
   `docs/boss/intro.json`, armored-boss hit sparks, `cosmetic` marks.
6. Wiki + BUILD.

## Tests / acceptance

- `node test/shell.mjs` PASS. Determinism: two full sim runs byte-identical.
- Control: HEAD vs branch, expert bot — every outcome identical except
  `frames` (+L) and the boss moves' bullets (new; report max bullets during
  the boss, must stay under S8's cap and the boss-phase readability rules).
- Skip: a run with a skip input at intro frame 60 ends the intro at 60 and
  is deterministic on replay.
- Manual (Jacob): song at 0:00 on the siren; fight starts as the music
  "starts jamming"; each phase break cuts to its section on a downbeat and
  reads as part of the hit; the 0:32 circle bullets land on the bass hits.

## What only Jacob supplies

- The marks (P1/P2/P3 sections, loop points, moves with notes) — in the lab.
- `docs/boss/intro.json` dialogue lines (a rough draft is enough).
- The skip input (START vs double fire) and whether practice-at-boss skips.

## Recap format for Jacob

The boss timeline from the probe (HEAD vs branch); the marks table as built
(with PLACEHOLDER flags); BUILD rN; wiki sections changed; what is pending
(marks, intro text, recert).
