# Review — SHMUP WORKSHOP transcripts re-checked; digest + five-stage plan audited (2026-09-08)

*Reviewer session, read-only on `docs/`. Phase 1 = verify the six boghog SHMUP
WORKSHOP transcripts against the live videos and produce corrected copies. Phase 2 =
audit `docs/BOGHOG_WORKSHOP.md` and `docs/plans/campaign-five-stages.md` against the
corrected transcripts, `BOGHOG_CRAFT.md`, `HOMAGE_STUDY.md` (+ the three studies),
`DESIGN_PILLARS.md`, `CRITIC_RUBRIC.md`, wiki §1/§3/§5/§8/§11, `src/core/stage.js`
and `evidence/metrics.json`. Nothing under `docs/` was edited; fixes are listed in §C
for the maintainer.*

---

## Phase 1 — transcript verification (summary)

Full detail: `~/Dev/boghog-research/transcripts/CORRECTIONS-2026-09-08.md`. Corrected
transcripts: `~/Dev/boghog-research/transcripts/<basename>.corrected.txt` (×6).

- **No creator-uploaded captions exist on any of the six videos** (`yt-dlp -j`:
  `subtitles: {}`; only `automatic_captions en-orig/en`). The ASR is the best text
  source there is; the archive `.en.vtt` files are **byte-identical** to the captions
  served today (`cmp`, all six). No drift.
- Video ids: WS01 `yAF2FkgyiYM` · WS02 `jYuqPKa0yPE` · WS03 `ArZRZSYICLo` · WS04
  `999tBKu8hNE` · WS05 `RENI2gk0ZJA` · WS06 `hbIrPeuOhlI`. WS02–06 carry YouTube
  chapters (listed in the CORRECTIONS file); WS01 has none.
- ~95 term fixes applied (Ketsui, Espgaluda, Guwange, DoDonPachi, Touhou, Battle
  Garegga, Batrider, Ibara, Cave, Psikyo, Psyvariar, Raiden IV, Toaplan, Galaga,
  Mushihimesama Futari, Dangun Feveron, "sealing", "pace", "tension/release",
  "depth vs clarity", "linear vs exponential", "funnel patterns"…). **Four remain
  unresolved and are marked `[?]`:** WS03 "the cat spider" (a Cave boss), WS03 "second
  boss" (no game name is audible — see A1), WS03 "Sesame" (a Touhou boss), WS06 "GG LS3".
- The descriptions add things the digest lacks: the series is boghog's shmup-101 doc
  in video form, framed as *"know which rules you're breaking and why they're there"*;
  WS03/WS04 say the game examples are "a bit fudged"; WS05 excludes terrain-based
  horizontal shooters; WS06 says the video is "term-heavy" and points at the
  shmups.wiki glossary and the Garegga liveplay.

---

## A. Digest accuracy — `docs/BOGHOG_WORKSHOP.md`

Ordered by impact. Transcript quotes are from the corrected files (ASR wording kept).

**A1. WS03 technique #6 attributes the moving-emitter example to "DDP stage-2 boss" — the transcript names no game.** [overstates]
Digest: *"6. Emitter movement distorts the pattern (DDP stage-2 boss: three aimed
bullets from a moving emitter look chaotic)."*
Transcript WS03: *"…Ketsui's true last boss it shoots projectiles that leave behind
slowly accelerating bullets [?]'s second boss gives a very interesting example of how
emitter movement itself can be used to distort patterns…"* — the possessive before
"second boss" is inaudible. Given the description's "some of the video examples are
a bit fudged", the game should not be asserted. The Bone Rail boss in the plan cites
this as "WS03 #6"; the technique is real, the attribution is not.

**A2. WS05 "Clarity: gate extras behind skill" is almost certainly the ASR mishearing "Variety".** [changes meaning once corrected]
Digest: *"**Clarity**: gate extras behind skill, especially in early levels…"*
Transcript: modern levels *"prioritize first time fairness variety Clarity good
learning curve non-exhaustive pacing and memorable set pieces"*; the arcade
counterpart list runs *fairness → "Clarity" → learning curve → pacing → set pieces* and
the "Clarity" paragraph is *"arcade levels greatly benefit from gating a lot of cool
extra stuff behind player skill… Advanced scoring tricks Secrets like DoDonPachi's
bees, Guwange's hidden barrels, hidden tiles in Caravan games and variable enemy
spawns and dynamic difficulty."* That is replay **variety**, not clarity; "variety" is
otherwise missing from the arcade list. The plan's §1 and §3 rely on this rule
("early stages are replayed the most, so gate the extras behind skill there") — the
rule survives, the heading should read *Variety (ASR: "Clarity")*. Note the examples
are **secrets and spawns, not scoring math** (matters for B7).

**A3. "Our stance is flow-first (Pillars)" — the Pillars say no such thing, and boghog's hedge is dropped.** [overstates + omits]
Digest WS05: *"Flow vs depth is a trade… ◻ Our stance is flow-first (Pillars)."*
`DESIGN_PILLARS.md` never mentions flow; the flow-first rule lives in **rubric S5
MUST** ("never 2+ elites simultaneously"), which is stricter than the source.
Transcript: *"flow can require sacrificing depth **which isn't always a worthwhile
trade-off** spawning too many conflicting overlapping elements will paralyze players…
while this breaks flow this conflict and decision making might be exactly what you
want Battle Garegga and Armed Police Batrider are examples of games that have a more
playground-like approach"*. Cite the rubric, not the Pillars, and keep boghog's
"isn't always worthwhile".

**A4. "Think in niches, not counts" is not a WS04 idea.** [misattribution — used by the plan]
The digest's WS04 section correctly uses *types* and *roles*; the phrase "niches,
not counts" is **[T1]** (`BOGHOG_CRAFT.md` "Enemies & waves"). The plan's §0 quotes it as
*"(WS04: 'think in niches, not counts')"* and its table header says "New niche
(WS04)". WS04's actual vocabulary: *"enemy types popcorn… mid… Elite… turrets and
tanks… enemy walls"* and roles *"pressure… [clutter]… area denial… direct challenge"*.

**A5. WS03 role list: "funnel" is a reconstruction, say so.** [minor]
Digest: *"*funnel* (lead the player somewhere — to guide or to trap)"*. Transcript:
*"final patterns which lead the player somewhere sometimes to help guide them
sometimes to trap them"*. "Funnel" is the obvious reading of ASR "final" but it is a
reconstruction; the corrected transcript marks it `[? ASR: 'final']`.

**A6. WS06 archetype "GG LS3 power-up wait" copies a garble as if it were a title.** [minor]
Digest: *"timed pickups (Psikyo flashing coins; GG LS3 power-up wait)"*. Transcript:
*"waiting for the right power up in GG LS3 stage"* — unresolved; write `[unresolved
game] stage 3` or drop the example.

**A7. WS03 #5 "Ketsui TLB" is right; the first example ("the cat spider") is unresolved.** [minor]
Transcript: *"a fun trick Cave likes to use is having bosses shoot projectiles which
in turn spawn their own projectiles for example the [cat spider?] throws a ball which
creates at least four emitters that all curve opposite ways"*. The digest omits the
example, which is fine; do not add a name later without the video.

**A8. WS06 "lives can't be gained faster than lost" drops the qualifier.** [minor]
Transcript: *"making sure the players can't gain lives quicker than they lose them **in
checkpoint based games**"*. SPEEDHELL has no checkpoints; the rule as written in the
digest is broader than the source (relevant to the plan's extend options, B8).

**A9. Content the digest still omits (worth one line each):**
- The series' own framing from every description: *conventions; "know which rules
  you're breaking and why they're there."* This is the corpus's licence for a
  deviation with a stated reason — directly relevant to CLAUDE.md's "a change neither
  corpus supports needs Jacob's explicit override".
- WS03/WS04 descriptions: *"some of the video examples are a bit fudged"* — game
  attributions in WS03/04 are approximate by the author's own admission.
- WS05 description: *"it won't apply to most terrain-based horizontal shooters."*
- WS01: the Alucard / Symphony of the Night follow-through example (hair and cape lag
  the instantly-moving body) — the concrete model for option/trail lag.
- WS05 Top Line: *"higher HP enemies tend to require larger gaps than weaker
  enemies"* is in the digest, but the lane count is quoted as "~5–7"; the transcript
  says *"around 5 or 7 tends to be the norm but there are no hard rules"*.
- WS05 chapter names (LAYERED DESIGN = wave overlap; INFINITE DESIGN = arcade vs
  modern) and WS04 chapter names (SAFE APPROACHES / BULLET SEALING / INTRO DEADZONE)
  are the author's own headings — cite them, they are more stable than ASR phrasing.
- WS06 description: the video *"might be more useful for developers adding scoring
  systems in non-shmups, so they don't just throw in a basic chaining combo system"* —
  a second source for the standing "no collect-streaks/medal-ladders" condition.

Everything else in the digest checked out against the corrected text: WS01 (all
rules), WS02 (all rules, Ketsui/Espgaluda/Batrider/Marco Bucci confirmed by the
description), WS03 vocabulary/dodging/lanes/escalation/#1–#4/#7/#8, WS04 types,
lifecycle, priority, sealing/bottom band/top dead zone, explosions (Ibara), WS05
behaviour model, Top Line (Toaplan), overlap, sections, repetition 2–5, tension/release,
environments, arcade-vs-modern ("array of lines stacked vertically", "ship intro
animations add up"), WS06 axes (linear/exponential, positive/negative with Guwange as
the hybrid, depth/clarity with discrete states + hierarchy + inverted risk/reward),
archetypes (Raiden IV kill-speed, Star Soldier/Dangun Feveron caravan, Psyvariar
grazing, Ketsui/Espgaluda/Futari proximity, Mars Matrix reflect).

---

## B. `docs/plans/campaign-five-stages.md` vs the workshop videos and the other corpora

Tags: **[contradicts]** = a corpus or repo fact says otherwise · **[stretch]** = a
citation carries more than the source says · **[judgment]** = the corpora neither
support nor forbid · **[internal]** = the plan disagrees with itself or the code.

**B1. Stage 1's clock and budget are the r65 certificate at boss hp 1×; r71 (same day) tripled boss hp.** [internal, highest impact]
Table row 1: *"1:46 (certified)"*, §5: *"Expert budget ≈ 180 k (S1)"*, §3: *"as
certified; do not retune for the campaign"*. `evidence/metrics.json` (last regenerated
at r65, `git log`: `cc906e0`) = 6,340 frames / 181,470 with `ENEMY_DEFS[5].hp` 130.
Since r71 the boss is 390/402/405 (`stage.js:27,59`) and the r70 table (wiki §10) shows
the expert bot's phase times going **6.9/5.2/4.4 s → 20.3/10.3/4.4 s** at 3× — about
+18 s, i.e. stage 1 ≈ **2:04**, with P1 timing out at 24 s on 2/7 seeds; r72 raised the
timeout to 35 s. So stage 1 already sits at or over the plan's own rule 1 cap
(*"1'30"–2'15" expert"*), the campaign total 9:50 is understated, and the wiki says the
referee is stale (§7 "certified 2026-09-07 at r65"; r71 changelog: "s7 checks will be
red at the next recert"). The word "certified" is wrong today.
*Also:* rule 3 imports *"bosses per §5 (r71: 3×)"* into every stage while
`HOMAGE_STUDY.md` guardrails say *"boss phases 15–25 s each"* (DDP#10) — at 3× the
measured P1 is 14–26 s and the timeout is 35 s. The plan must pick one: the Psikyo
clock binds boss hp per stage, or the 15–25 s guardrail is amended.

**B2. "Zero new hp tiers" vs "bone wall 12 hp".** [internal]
Rule 3: *"New enemies reuse the four hp classes (popcorn 2 / turret 24 / mid 44 /
elite 220)"*. Stage 2 numbers: *"bone wall 12 hp"* — a fifth tier. Also the "four
classes" omit the existing part tier (24; P2 node 56, `stage.js:35,53`) and the
midboss 400. `ENEMY_DEFS` has seven entries.

**B3. Twin Moths (two elites at once) breaks rubric S5 MUST, and the plan does not say so.** [contradicts rubric; corpus supports the idea]
S5 MUST: *"strong-enemy spawns sequenced (never 2+ elites simultaneously)"*. The plan
invokes WS05's playground exception, which the transcript **does** support (*"this
conflict and decision making might be exactly what you want"*) — but the rubric has
no exception and builders cannot edit it. The Psikyo precedent is also staggered:
`study-s1945ii.md:106` *"green spider-mech on the wall (11:16), then a big white
winged mech descends (11:20)"*. WS05: *"spawning them in a sequence suggests the
intended route"*. Needs a Jacob-authorized S5 amendment (or the pair staggered by a
beat) recorded in the plan.

**B4. Stage 5 clock does not fit its own cap.** [internal]
Rule 1: 2:15 cap, 42–80 s to boss, boss 30–50 %. Stage 5: *"altar stair (42 s…)"* +
returning-midboss gauntlet (*"Hearse → Twin Moths → Gatekeeper, one form each"* — the
midboss class is 400 hp with a 11.7 s speed-kill window, measured phases 10–29 s) +
loot conversion + WARNING ≥ 1 s + a four-form boss at 3× hp. Even at 7 s per midboss
form: 42 + 21 + ~5 + 4 forms × ≥10 s ≈ 108 s + entrance/handoff/tally ≈ 2:00 before
any human slack; at measured phase lengths it is well past 2:15. And "time to boss"
here is 42 + gauntlet + release ≈ 70–90 s, at/over the Psikyo 80 s maximum — the
"42 s = Psikyo M4" figure is M4's *whole* pre-boss stage, not an approach before a
gauntlet.

**B5. "Niches not counts [WS04/T1]" and "(WS04: 'think in niches, not counts')" — WS04 never says it.** [misattribution; see A4]
Fix the tag to [T1]; if WS04 is to be cited for the new enemies, map each niche to a
WS04 **role** (pressure / clutter / area denial / direct challenge). The plan does this
only for wall pods (area denial).

**B6. T2 "no breather after the midboss" is stretched into "a three-midboss gauntlet with no breathers".** [stretch]
`BOGHOG_CRAFT.md`: *"no breather after it dies — back on route within a second… stage-3/
final bosses are the only gravitas pauses [T2]"* — a rule about the second after one
midboss dies, not about chaining three. WS05: *"when the tension reaches a climax it's
important to release it"*; rubric S5 MUST: *"after each peak… a release moment"*. The
in-corpus precedent for a boss-rush finale is ZeroRanger (`research/zeroranger.md` §2)
and BRDA#3's *"miniboss chains… run twice back-to-back"* — cite those, not T2, and
say whether the gauntlet has micro-releases.

**B7. Stage 1's "hidden speed-kill chains that pay only if every turret in the alley dies in-window" is a new scoring rule and a hidden one.** [contradicts standing conditions + the plan's own §8]
CLAUDE.md standing condition: *"no collect-streaks/medal-ladders or any opaque scoring
math (MSX/Pillar 2)"*; Pillar 2: *"binary, visible states… never opaque frame math"*;
plan §8: *"No new scoring systems per stage (no chain meters, medal ladders,
multipliers)"*; §5: *"Speed-kill is unchanged."* An all-turrets-in-window bonus is an
all-or-nothing streak, and "hidden" is the opposite of visible. WS05's skill-gated
extras (A2) are *secrets and spawns* — DDP bees, hidden barrels, hidden tiles — not
score formulas. Same problem in Stage 3: *"kill the leader in its window and the file
scatters (and pays as a group speed-kill)"* — a group payout is a scoring change,
Jacob's decision, not "unchanged".

**B8. Option A3 is mislabelled "a negative system (WS06)".** [stretch]
WS06: *"negative scoring systems… give you some kind of bonus and start a timer forcing
you to continue certain actions in fear of losing set bonus being passive is massively
punished"* (DDP chain). An extend for a no-miss stage clear has no timer and no
decay; it is WS06's *"stage/end bonuses"* archetype (*"amount of bombs and lives left
in stock at the end of levels"*) — a positive system. The real objection to A3 is
Pillar 4 / MSX (survival converted into a resource), not WS06. Also A1's *"a 10-min 1CC
with 3 lives and no extend is CAVE-cruel"* — WS06's only rule here is *"players can't
gain lives quicker than they lose them in checkpoint based games"* (A8); the corpus
neither mandates nor forbids an extend. **[judgment]** with a wrong tag.

**B9. The 5–10 s curtain accent is placed where the guardrail does not allow it, and "that is all" is already false.** [internal / stretch]
`HOMAGE_STUDY.md` guardrails: *"true curtains only as 5–10 s accents at midboss and
boss finale"* (DDP#9). The plan puts it on Stage 3's **carriers in a section** and §8
says *"one 5–10 s accent in S3, that is all"* — but stage 1's midboss bloom (wiki §4.3,
three slow laned walls) is already such an accent, and every boss finale is licensed.
Either move the S3 accent to the Twin Moths, or amend the guardrail explicitly.

**B10. Loop 2 "sealed Ketsui-style behind a clear condition" is new and uncited.** [judgment, flagged as such]
Wiki changelog 2026-08-29 + §11 spec loop 2 as *"earned in-credit (expert bias)"* with
no entry condition; Psikyo#10 / the S1945II study go straight into loop 2 after M8
(*"Loop 2 begins (15:48–16:28)"*). Ketsui's loop conditions are outside every corpus
doc. The corpus neither supports nor forbids a seal; the plan should present it as a
new rule for Jacob (it half does: "Jacob picks") and drop "Ketsui-style" or source it.

**B11. Stage 4's Warden needs its late-kill state, or it becomes the Tyrian enemy.** [judgment with a WS04 test attached]
WS04: *"safely approaching enemies shouldn't be disproportionately dangerous don't
encourage players to ignore enemies"*; *"Tyrian's enemies aren't as dynamic killing
them takes too long their attacks aren't that dangerous and as a result the players
are inclined to ignore them"*; and the three late-kill choices (*keep shooting / rush,
possibly more dangerous / ease off*). An elite that takes no damage from below at range
is exactly the enemy a player learns to ignore unless leaving it alive is punished; the
plan gives the Warden a counter (T3 ✓) but no lifecycle. S4 MUST (passive ≥ 1.6×
bullets) will measure it.

**B12. Stage 4 "release (short: S4 is the stage that breathes least)" vs S5 MUST.** [contradicts rubric]
S5 MUST: *"tension-release — after **each** peak (midboss, rush) a release moment"*.
Stage 4 lists two peaks (the Gatekeeper, the back-attack rush) before one short
release at the gate. WS05: releases can be *"big bullet cancels huge walls of scoring
items or pickups lengthy explosions short breaks or looser sections"* — a Gatekeeper
kill-cancel counts; say so.

**B13. "This is where the player *learns* sealing" (Stage 2) — stage 1 already teaches it.** [internal]
Wiki §3 (r18): *"Point-blank on a turret is quiet (its reward)"* — turret alley in
stage 1 is sealed today. Reword to "where sealing becomes a *tool* (hull turrets you
must approach)".

**B14. Booth `?stage=N` collides with the sandbox's existing `stage` parameter.** [internal / code]
`sandbox.js:372` and `sandbox.html:129` already use `?stage=0` to mean "stage-time
jump 0" (`stageT`) in the certified-run links quoted in wiki §5.2b and §4. The plan's
§6 *"Booth `?stage=N`"* and `startRun(g, 0, stage)` (today `startRun(g, atT = 0)`,
`game.js:122`) need a different name (`level`, `s`) or the sandbox links break.

**B15. "Practiced human ≈ 15–20 min (Psikyo 2-ALL loop 1 is 15 min for eight missions)".** [internal]
The 15:05 loop 1 in `study-s1945ii.md` is an expert 2-ALL run, i.e. the *expert* clock,
not a practiced-human one; the plan's own expert total is 9:50. Wiki §1 says stage 1 is
1.5–2 min expert vs 4–5 min practiced human (≈ 2.5×) → 20–25 min for five stages. Pick
one ratio and use it.

**B16. The wiki numbers the plan points builders at are stale.** [internal, outside the plan]
Rule 5 sends builders to the *"S6 window table"* = wiki §2.2, which still lists elite
134, midboss 130, boss 110/134/135, and §2.3 still says the phase timeout is 1,450 f /
24.2 s (r72: 2,100 f). The plan's hp numbers are read from code and are right; the
table they cite is not.

**B17. Minor citation checks (all fine):** Psikyo#1 envelope and 42–80 s ✓ · Psikyo#5
midsize metronome / M7 elite-pair midboss / M8 transforming midboss ✓ · Psikyo#6 four
final forms ✓ · Psikyo#9 briefing ✓ · Psikyo#10 loop ✓ · M6 chained anchor
(Psikyo#5) ✓ · BRDA#3/#5/#8/#9 ✓ · DDP#4/#10 ✓ · L1–L8 ✓ · S3b-5/-6 numbering ✓ · T1
anchor structure / process order / passes / novice test ✓ · T2 "ships from the bottom
later" ✓ · T3 counters / physical checkmate / stage select ✓ · WS05 "array of lines",
"ship intro animations", "play by your rules", "popcorn → streaming", destructible
terrain + just-in-time cancels as section themes ✓ · WS03 #5 eggs-hatch-emitters and
#7 box trap (Touhou) ✓. The MSX quotes in §1 ("most slept-on developer") were not
checked against `mark-msx-research`.

---

## C. Concrete fixes

### C1 — `docs/BOGHOG_WORKSHOP.md`
| # | section | old → new |
|---|---|---|
| A1 | WS03 → Technique catalogue, item 6 | `(DDP stage-2 boss: three aimed bullets from a moving emitter look chaotic)` → `(an unnamed "second boss" in the video — the game is inaudible in the captions; three aimed bullets from an emitter that is itself moved left–right)` |
| A2 | WS05 → Arcade vs modern levels, "Clarity" bullet | `**Clarity**: gate extras behind skill,` → `**Variety** (the ASR reads "Clarity"; the content is replay variety): gate extras behind skill —` and append `Note the examples are secrets and spawns, not scoring formulas.` |
| A3 | WS05 → Flow, "Flow vs depth" bullet | `◻ Our stance is flow-first (Pillars); the trade should be named when a section is deliberately playground.` → `boghog's own hedge: "flow can require sacrificing depth, which isn't always a worthwhile trade-off." ◻ Our flow-first rule is rubric S5 MUST ("never 2+ elites simultaneously"), which is stricter than the source and has no playground exception; any deliberately playground section needs a Jacob-authorized S5 amendment.` |
| A4 | header of WS04 → Types and roles (add one line) | add: `(The phrase "think in niches, not counts" is [T1], not WS04 — cite CRAFT for it.)` |
| A5 | WS03 → Roles inside a pattern | `*funnel* (lead the player somewhere` → `*funnel* [ASR: "final"] (lead the player somewhere` |
| A6 | WS06 → Archetypes | `GG LS3 power-up wait` → `an unresolved game's stage 3 power-up wait [ASR "GG LS3"]` |
| A8 | WS06 → Building one, "No milking" | `lives can't be gained faster than lost.` → `lives can't be gained faster than lost (said of checkpoint-based games).` |
| A9 | top note (after "Cite as [WS0N]…") | add: `Provenance: all six videos have auto-generated captions only (no creator track; verified 2026-09-08, see boghog-research/transcripts/CORRECTIONS-2026-09-08.md). boghog's own framing from every description: "a rundown of genre conventions… a 'know which rules you're breaking and why they're there' type of deal"; WS03/WS04 examples are "a bit fudged"; WS05 "won't apply to most terrain-based horizontal shooters".` |
| A9 | WS01 → Movement, "Follow-through" | prepend `Alucard in Symphony of the Night is the model (hair and cape lag an instantly-moving body).` |
| A9 | WS05 → Top Line | `~**5–7 lanes**` → `**"around 5 or 7… no hard rules"**` |

### C2 — `docs/plans/campaign-five-stages.md`
| # | section | old → new |
|---|---|---|
| B1 | §2 table, row 1, last cell | `1:46 (certified)` → `1:46 at the r65 certificate (boss hp 1×); ≈ 2:04–2:15 at r71 3× hp per the r70 bot table — recert pending` |
| B1 | §2 below table | `Loop 1 expert total ≈ 9:50` → `Loop 1 expert total ≈ 10:10–10:20 at r71 (9:50 with the r65 stage 1)` |
| B1 | §3 Stage 1 heading | `(as certified; do not retune for the campaign)` → `(sections as certified at r65; boss at r71/r72 — the stage's clock must be re-measured before the campaign cap is applied to it)` |
| B1 | §4 rule 1 | append: `The cap binds boss hp: a stage's boss at 3× must still fit 30–50 % of ≤ 2:15 for the expert bot, or that boss runs at a lower multiplier. This supersedes HOMAGE's "boss phases 15–25 s" only if Jacob amends the guardrail (r72's timeout is 35 s).` |
| B1 | §5 | `Expert budget ≈ 180 k (S1)` → `Expert budget ≈ 181 k (S1, r65 certificate; unmeasured at r71)` |
| B2 | §3 Stage 2 numbers | `bone wall 12 hp, pays 3 items` → `bone wall 24 hp (turret class), pays 3 items` (or add "part 24 / node 56 / midboss 400" to rule 3's class list and declare the wall a part) |
| B2 | §4 rule 3 | `the four hp classes (popcorn 2 / turret 24 / mid 44 / elite 220)` → `the existing hp classes (popcorn 2 / turret 24 / part 24 (P2 node 56) / mid 44 / elite 220 / midboss 400)` |
| B3 | §3 Stage 3 Midboss | after `deliberately, once per campaign.` add `Rubric S5 MUST forbids 2+ elites simultaneously with no exception; this needs a Jacob-authorized S5 amendment before the stage is built. Psikyo's M7 pair enters staggered (11:16 → 11:20); stagger the Moths by a beat so the sequence still suggests the route [WS05].` |
| B4 | §3 Stage 5 place ramp | `the altar stair (42 s, Psikyo M4's time-to-boss, the shortest in the campaign)` → `the altar stair (≤ 25 s; the whole pre-boss run — stair + gauntlet + release — must land inside Psikyo's 42–80 s)` and give the gauntlet a budget: `three forms at ≤ 8 s each (24 s), one form per midboss` |
| B4 | §3 Stage 5 Final boss | `Boss length up to 50 % of the stage (Psikyo#1 allows 30–50 %).` → `Boss ≤ 65 s (50 % of 2:15) — four forms at 3× hp do not fit; either the finale runs its own multiplier or forms 1–2 are short (≤ 10 s) and only 3–4 are full length.` |
| B5 | §0 | `(WS04: "think in niches, not counts")` → `([T1]: "think in niches, not counts"; each niche is named by its WS04 role)`; §1 Boghog *For:* `niches not counts [WS04/T1]` → `niches not counts [T1]; roles (pressure / clutter / area denial / direct challenge) [WS04]`; §2 table header `New niche (WS04)` → `New niche [T1] + WS04 role` |
| B6 | §3 Stage 5 gauntlet | `back-to-back with **no breather** (T2: back on route within a second)` → `back-to-back (precedent: BRDA#3 miniboss chains, ZeroRanger's boss-rush stage 4; T2's "no breather after the midboss" applies to each kill, not to the chain) — each kill cancels its field to gold (WS05 release; S5 MUST after each peak)` |
| B7 | §3 Stage 1 | delete `the hidden speed-kill chains that pay only if every turret in the alley dies in-window, and`; replace with `secrets in WS05's sense — hidden pickups / a hidden spawn gated behind a skill act (e.g. a bonus turret that only spawns if the alley is cleared in-window) — never a hidden score formula (CLAUDE.md standing condition; Pillar 2)` |
| B7 | §3 Stage 3 Niche | `(and pays as a group speed-kill)` → `(each popcorn still pays its own binary speed-kill — no group payout; if Jacob wants a leader bonus it is a §5 option)` and add to §5 a row `C. leader-kill payout — option, Jacob's call` |
| B8 | §5 table row A3 | `but converts no-miss into a *resource* (a negative system, WS06) — not recommended` → `WS06 archetype: a stage-end bonus (positive system). Pushback is Pillar 4 / MSX: it converts survival into a spendable resource and feeds the Q8 suicide trade — not recommended` |
| B9 | §3 Stage 3 Sections | `a curtain accent (5–10 s, the guardrail's only permitted curtain) that the carriers' deaths cancel` → `a curtain accent (5–10 s) on the Twin Moths' arrival — the HOMAGE guardrail permits curtains only at midboss and boss finale`; §8 `No CAVE-length stages or bosses; no curtain primary language (one 5–10 s accent in S3, that is all).` → `…no curtain primary language (accents only at midbosses and boss finales, per HOMAGE; stage 1's midboss bloom is one already).` |
| B10 | §0 and §3 Stage 5 Loop 2 seal | `sealed Ketsui-style behind a clear condition` → `optionally sealed behind a clear condition (a new rule — no corpus doc supports or forbids it; Psikyo's loop 2 is unconditional)` |
| B11 | §3 Stage 4 Niche, Warden | append `Late-kill state [WS04]: after its window the Warden advances and fires wide (rush — "possibly more dangerous"), so ignoring it is punished; S4 MUST's 1.6× check applies to it.` |
| B12 | §3 Stage 4 Sections | `release at the gate (short: S4 is the stage that breathes least)` → `Gatekeeper kill-cancel → gold (release 1) … release at the gate (release 2, short) — S5 MUST wants one after each peak` |
| B13 | §3 Stage 2 Niche | `this is where the player *learns* sealing as a tool.` → `stage 1's turret alley already seals; here sealing becomes the tool you must use (hull turrets that can only be silenced by approaching).` |
| B14 | §6 | `Booth `?stage=N`` → `Booth `?level=N`` and note `(`?stage=` already means a stage-time jump in the sandbox — `sandbox.js:372`)`; `startRun(g, 0, stage)` → `startRun(g, 0, level)` (today `startRun(g, atT = 0)`, `game.js:122`) |
| B15 | §2 below table | `practiced human ≈ 15–20 min (Psikyo 2-ALL loop 1 is 15 min for eight missions)` → `practiced human ≈ 20–25 min (wiki §1's 2.5× expert ratio); the S1945II study's 15-minute loop 1 is an expert 2-ALL run` |
| B16 | §4 rule 5 | `S6 window table` → `wiki §2.2 window table (note: its hp column is stale — elite 220, midboss 400, boss 390/402/405 since r27/r25/r71; timeout 35 s since r72)` |

### C3 — `docs/DESIGN_WIKI.md` (outside the brief, but the plan sends builders there)
- §2.2 table: elite HP `134` → `220`; midboss `130` → `400`; boss phase `110 / 134 / 135` → `390 / 402 / 405`; boss sub-part unchanged. §2.3: `fades linearly to ~0 at the 1,450f (24.2s) timeout` → check `game.js:265` against `BOSS_PHASE_TIMEOUT` 2,100 (r72) and restate.
- §5 / §7: add one line that the certificate predates r71 and that `s7_*` are expected red until the Jacob-authorized recert.

### C4 — `~/Dev/boghog-research/README.md` (one line)
- Under "His own design videos": `Mostly visual — transcripts are thin; watch alongside.` → append `Captions are YouTube ASR only (no creator track; verified 2026-09-08). Use the `.corrected.txt` files; see CORRECTIONS-2026-09-08.md.`

---

## What is *not* a problem

- The digest's rubric-status marks (✅/◐/◻) were spot-checked against the rubric and
  `stage.js`; none contradicted the code as of r72.
- The plan's refusals (§8) match every corpus: WS06 depth-vs-clarity, Pillar 2, DDP#9/#10,
  T1 passes-with-cooldown.
- The plan's flow-vs-depth reading of WS05 (Twin Moths as the one playground section)
  is the *correct* reading of the transcript; the only gap is the rubric (B3).
