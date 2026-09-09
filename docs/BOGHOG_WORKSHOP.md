# Boghog SHMUP WORKSHOP digest (WS01–06)

*Distilled 2026-09-08 from the six SHMUP WORKSHOP transcripts in
`~/Dev/boghog-research/transcripts` (Dec 2022 – May 2023; the videos are mostly
visual, so watch alongside). Companion to `BOGHOG_CRAFT.md` (the T1–T3 interview
digest) and `CRITIC_RUBRIC.md` (which turned the checkable WS rules into referee
checks S1–S6). This file holds everything the rubric could NOT hold: the
vocabulary, the technique catalogue, the player-behaviour model and the numbers.
Cite as [WS0N] in wiki changelog entries, the same way T1–T3 are cited.*

*Provenance: all six videos have auto-generated captions only (no creator track;
verified 2026-09-08 — the archive VTTs are byte-identical to the live captions; see
`~/Dev/boghog-research/transcripts/CORRECTIONS-2026-09-08.md` and the
`.corrected.txt` files, ~95 name fixes). boghog's own framing from every
description: "a rundown of genre conventions… a 'know which rules you're breaking
and why they're there' type of deal"; WS03/WS04 examples are "a bit fudged";
WS05 "won't apply to most terrain-based horizontal shooters". Reviewed against
the corrected transcripts 2026-09-08: `docs/plans/reviews/2026-09-08-workshop-recheck.md`.*

*Status key per rule — **✅** captured (rubric check, wiki section or code, with
pointer) · **◐** partly captured · **◻** not captured anywhere before this file.
Status is as of r67/r69, read from the code on 2026-09-08.*

---

## WS01 — Movement, shooting & hitboxes

### Movement
- **Normalize diagonals**; Battle Garegga is the noted exception. ✅ S1.
- **No acceleration/inertia, ever.** Inertia is input lag on dodging; smoothness
  comes from animation instead. ✅ S1.
- **Turning animation whose speed matches the ship's speed**; vertical thrusters
  for up/down. Quick ship → quick turn. ◻ The renderer has no bank/turn/lean
  frames (grep of `src/render/`, 2026-09-08). Art-bible question, not a core one.
- **Follow-through** (Alucard in Symphony of the Night is the model: hair and
  cape lag an instantly-moving body): options are appendages — make them lag; long trails on ship
  and options; fast, dense player shots also smooth motion because players read
  ship position off them. ◐ S1 SHOULD (option/trail lag); no options in the
  game today, so the load falls on the shot stream.
- **Speed transitions are a control decision**: gradual (Cave) = smoother, less
  control; instant (Touhou) = twitchy, reactive. ✅ S1 (instant, our pick).
  Craft [T1] adds the numbers (~3 vs 1.5–2 px, "halving feels bad").

### Player shots
- **Fast** — nothing feels worse than catching your own bullets. ✅ S1.
- **Tall** — stretch simulates motion blur; "the sky is the limit". ✅ S1.
- **Thick, detailed, juicy splash** with good value contrast; always check in
  motion because speed hides small detail. ◐ S1 says fast/tall only.
- **Messy is allowed**: at speed a stream reads as one object, the whole is
  greater than the sum. ◻ (permission, not a rule).
- **On-screen shot limit** (Space Invaders → Galaga → Contra/Mega Man): damage
  becomes a function of distance → point-blanking. ✅ S1 MUST (≥1.8× DPS at
  40 px vs 300 px).
- **Other aggression levers**: a wide shot; a contact-damage aura (DDP). ◐ Ship B
  (`docs/plans/ship-b.md`) is the wide-shot lever.
- **Deceive the player on power-ups**: shots look 2× stronger (thicker, taller,
  more saturated, more of them) while damage rises slightly — keeps balance
  simple. ◻ No power-ups today; applies the day one lands.

### Hitboxes
- **Visuals and hitboxes are separate in every game**; bullet hell is just the
  extreme. Players estimate positions by glance and peripheral vision, so small
  hitboxes are the shmup's version of input buffers and coyote time. ✅ wiki §6.2.
- **Rule of thumb: if it helps the player make it big; if it harms, make it
  small.** Power-ups and player shots get big boxes; hazards and enemy bullets
  small. ◐ Done in code, never written as a principle: item pickup r 12 plus a
  53 px magnet (`game.js:559`), player shots hit at enemy r + 6 (`game.js:485`),
  enemy contact at enemy r + 3 (`game.js:544`), bullets r 2.6/3.2 vs the ship's
  r 3 (`patterns.js:25`, `game.js:22`).
- **Separate enemy collision box (small: don't clip the player) from enemy
  hurtbox (large: don't make them aim).** ◐ Same `e.r` with different pads
  (+3 contact, +6 shots); separated by pad, not by design.
- **Drawbacks of small hitboxes**: they enlarge the play area, so difficulty
  must come from more/bigger bullets → clutter and readability loss; they permit
  lucky accidental dodges, which makes tight restrictive challenges hard to
  build; tiny sizes are unintuitive to newcomers. "Find the balance." ◻ This is
  the argument against the parked "hit radius 3 → 2" (wiki §6.2, §8 Q15) and it
  was never cited there. See `docs/plans/boghog-ws-questions.md` (Q19).

## WS02 — Visibility

### The two art concepts
- **Value** = brightness of a colour; learn it with a black-and-white filter.
  Value contrast, not hue, makes one thing stand out from another. ✅ S2, wiki
  art rounds ("values over colour").
- **Atmospheric perspective**: far things lose value contrast toward a middle
  grey. Use it as the model for "what is close/important = high contrast". ◻
  (concept; the rule below is its application).

### Rules
- **Very dark next to very bright** on bullets — either alone fails against a
  varied background. ✅ S2 MUST.
- **Wash out the background's value contrast** (Ketsui, Espgaluda). ✅ S2 MUST.
- **Also reduce value contrast of player shots and explosions** — Batrider is
  the warning. ◐ S2 names only the background. Unchecked against the r67
  2× chunky explosions.
- **Distinct hues**: red/pink/purple bullets because they don't collide with
  explosions or gold medals; orange does. ✅ S2 MUST (no family shared with
  items or player shots).
- **Lead the player's eyes**: know where they're looking and build patterns
  around it; groups pull attention more than singles, and animated things more
  than static. A player blindsided from where they weren't looking is a design
  fault, not a skill fault. ◐ S3 "≤2 focal points without warning" is the thin
  version; no rule about bullet *sources* relative to attention.
- **Keep it predictable — a bullet language**: small round = randomized spread,
  needle = fast aimed; too many bullet types/colours defeats filtering. ✅ S2
  MUST (r59 caste rule).
- **Splitting focus without warning kills** (dark-blue bullets vs unseen
  fireballs). ✅ S3 MUST.
- **Group bullets; avoid single spawns.** Groups are "giant super bullets"
  with gaps good players exploit. ✅ S2 MUST.
- **Telegraph trajectories**: elongate with pointy ends; group rounds into
  lines for the same effect; trails on curving bullets show radius and speed.
  ✅ S2 SHOULD.
- **Animate bullets** (spin, wobble, ripple) — animated objects take attention
  priority. ✅ S2 SHOULD.
- **Depth sort by readability**: faster over slower, smaller over bigger, and
  *the harder a bullet is to read the higher its priority*; a large easy group
  can go low. Not absolute — decide what the player will look at. ◐ S2 MUST
  has the speed/size half only.

## WS03 — Bullet pattern design

### Vocabulary
- **Attack types**: aimed (manipulable by movement), static (positional; enemy
  motion can distort it into pseudo-aimed), randomized-within-limits (forces
  reaction; weights and limits keep it fair). ✅ S3 MUST; `patterns.js` header.
- **Aim quantized to sprite rotation frames** — 8 facing frames = 8 firing
  directions, which reads as "the enemy leads its shots" and makes aimed fire
  feel less predictable for free. ◻ Our aim is exact `atan2`
  (`patterns.js:29`). See `docs/plans/boghog-ws-questions.md` (Q18).
- **Dodging types**: micro (through gaps — risky, last resort, but gives
  confident players more spacing control) and macro (around the pattern —
  aimed needs misdirection and movement; static boils down to a safe spot,
  which is safe in isolation but drags the player into bad positions for the
  next threat). ✅ S3 MUST (both demanded); ◐ the safe-spot-drag consequence
  isn't recorded (see `research/raw-safespot-findings.md`).
- **General action-game principle**: a good attack is telegraphed and flashy
  and offers a *range* of responses with pros and cons (dodge away = safe but no
  counter; misdirect/parry = hard but best punish). Shmup attacks are the same
  thing chopped into overlapping parts. ◐ Lanes (below) carry this.
- **Lanes**: a dense pattern is a set of micro-challenges; some lanes have
  wiggle room but a worse exit, some are safe but forbid attacking, some are
  dangerous but keep you aggressive. Under aimed pressure the wiggle room is
  survival. ✅ S3 MUST (≥2 lanes, different risk/reward).
- **Roles inside a pattern** (every part has one whether you meant it or not):
  *pressure* (harass — don't stand still), *obstacle* (clutter — movement is
  harder), *area denial* (block screen parts; set up others; close old lanes),
  *funnel* [ASR: "final"] (lead the player somewhere — to guide or to trap), *direct
  challenge* (wide/dense/fast enough to stand alone). ◻ Not in rubric, craft
  or wiki. Use these words when a pattern is designed or reviewed.
- **Slow escalation** across repetitions telegraphs and lets the player find
  the flow before the full version. ✅ S3 MUST.
- **Be mindful of where the player will be and look**: players follow curves
  even when gaps exist; use that to hand one pattern to the next. ✅ S3 SHOULD.

### Technique catalogue (things to steal)
1. **Speed ramp per bullet** → bendy streams. ✅ `bendyStream` (`patterns.js`).
2. **Spread with mixed speeds** spawned together → gaps open as it travels. ◻
3. **Aimed start + rotating emitter** → curves and zigzags the player follows. ◻
4. **Two emitters rotating opposite ways**, bullets curving opposite ways →
   overlapping patterns that force timed dodges. ◐ check `twinSpiral`.
5. **Projectiles that spawn emitters** (Cave; Ketsui TLB: bullets that leave
   slowly accelerating bullets behind). ◻
6. **Emitter movement distorts the pattern** (an unnamed "second boss" in the video — the game is inaudible in the
   captions; three aimed bullets from an emitter that is itself moved
   left–right). ◻
7. **The box trap**: six emitters firing six bullets around the arena centre
   pen the player, then other patterns assault the box while it moves
   (Touhou favourite). ◻
8. **Escalating spread + wall combo**: fast spread that invites tap-dodging,
   gaps shrink per rep; then walls that invite micro-dodging and widen until
   macro becomes too risky → the player chooses micro. A simple pattern with a
   mix of dodging types and lane decisions. ◐ pieces exist (`arcWall`, `ring`,
   `aimedFan`); the sequence as a designed arc does not.
- **Homework**: boot a game, find a pattern, locate the emitters, classify
  aimed/static/random, watch how it moves you, name the lanes and the flow.

## WS04 — Enemy design & effects

### Why enemies
- Enemies add *time* to dodging: goals, priorities, "kill efficiently so
  patterns don't overlap and you're in a good spot for the next threat".
  Design every enemy with overlap in mind. ✅ wiki §3, S4/S5.

### Types and roles
*(The phrase "think in niches, not counts" is [T1], not WS04 — cite CRAFT for it.)*
- **Types**: popcorn (small, low hp, many), mid (defines the encounter with a
  pattern, dies fast), elite (direct challenge; synergy too), turret/tank
  (scrolls with the stage instead of leaving), enemy walls. ✅ S4 MUST.
- **Roles** (same as patterns): *pressure* (aimed fire or ramming), *clutter*
  (leftover shots), *area denial* (block screen → engage me), *direct
  challenge* (kills unassisted). ◻ S4 checks types, not roles.
- **Dynamic enemies**: encounters must play out differently by player skill —
  Ketsui (passive players are overwhelmed) vs Tyrian (kills too slow, attacks
  too weak → ignored). ✅ S4 MUST (passive ≥1.6× bullets).

### Stages of an enemy's life
- **Immediate/optimal kill**: may they die before shooting, or must they shoot
  at least once? Cave cheats with **intro armor**. ✅ S4 MUST.
- **Average kill**: know the intended experience. ◐ wiki §2.2 windows.
- **Late kill**: three choices — keep shooting as if nothing happened; *rush
  the player, possibly more dangerous*; or ease off (lower shot rate, stop). ◐
  wiki §3 uses "leave-alive escalation"; the three-way choice isn't named.
- **Outro states** stop players carrying enemies through the stage (bugs,
  score exploits). ✅ S4 MUST.

### Priority (emergent, but rules of thumb)
- Bulk (high hp = high commitment) grabs attention; dense/difficult patterns
  are prioritized regardless of bulk; **higher rate of fire traps harder**;
  **wide cones are harder to control**. ◻ (The wiki's "priority" hits are
  referee-bot targeting.)

### Keep the pace up
- **Lowest hp that still fulfils the enemy's function.** ✅ S4 MUST ("as low
  as role allows").
- **Approaching safely must not be disproportionately dangerous**; don't
  encourage ignoring enemies. **Bulky enemies moving downward** are the classic
  offender — they wall off more screen over time. ◻
- **Bullet sealing** near ground enemies (sometimes air); **bottom no-fire
  zone** because the player can't shoot backwards; **top dead zone** so
  enemies can't be shot before they appear. ✅ r18 fire gating, S4 MUST.

### Feedback and effects
- **Enemies react to hits**: flash (usual), damage particles, shaking;
  **visible damage and destructible parts** sell interaction most. ◐ S4
  hit-flash; parts only on the boss (§5.3).
- **"A shmup objectively cannot be good without good explosions."** Few
  startup frames; a quick shockwave sells impact, lingering flames look nice;
  cover the sprite; many sprites with randomized spawn points, timing and
  animation speed; extra shapes (Ibara's circles/lines/fireballs); **debris
  with gravity**; split into flame/spark/flare/smoke; **secondary explosions
  only if the death already reads clearly**. ◐ S4 MUST + r67 2× chunky
  (`research/explosion-and-weapon-feel-2026-09-04.md`); the "death reads
  first" caveat and the randomized-anim-speed detail aren't recorded.
- **Shake and hitstop only for big events** (elite/boss deaths); the player
  must clearly see the cause or juice becomes nuisance. ✅ S4 SHOULD.

## WS05 — Level design (with Mark MSX reading the script)

### Goals (same as any genre)
- A path with varied challenges testing different facets; clear but with
  wiggle room; varied pacing; tension/release cycles; interesting on repeat.
  ✅ Pillars, S5.

### The player-behaviour model ("limits" — the shmup's walls and floors)
- Players **avoid the top** (enemy collision boxes, straight shots limit
  offense unless directly below, no reaction time up close).
- Players **sit bottom-centre** (DPS, reaction time, screen space).
- Players **approach bulky enemies for damage, then back off when they fire**.
- Popcorn keeps spawning → players **stream side to side**.
- Players **avoid dodging at odd angles (diagonals)** — harder inputs, harder
  reads.
- Discover more by playing and noticing what you're inclined to do.
- ◻ None of this is written down; it is the foundation under Top Line and
  every routing decision. `research/raw-safespot-findings.md` quotes the 101
  version ("point blank at the top, defensive at the bottom").

### Flow
- Smooth, sweeping, goal-driven movement is the genre's best feeling. Create
  it with **high-priority enemies as goals**, **spawn sequences as a route**,
  **never let the player linger**, and **complicate/vary the movement**. Flow
  is a core to return to, not the whole; breaking it is fine for pacing or
  because a challenge needs it. ◐ S5 top-lane flow.
- **Top Line** (Toaplan is the clearest): split the top into **"around 5 or 7… no hard rules"** lanes;
  keep the player mobile by spawning on **opposite sides** or leaving **one
  lane of gap** between spawns; **higher-hp enemies need bigger gaps**. ◐ wiki
  §3 cites Top Line; the lane count and gap rules aren't in the rubric.
- **Improving flow**: never two strong enemies at once (paralysis) — sequence
  them to suggest the route; no clustering on one side; no vertical turret/tank
  stacks; nothing too near the edges (trap). ✅ S5 MUST.
- **Flow vs depth is a trade**: overlapping conflicting goals paralyze, but
  that conflict may be exactly what you want — Garegga and Batrider are
  "playground" levels built from conflicting goals. boghog's own hedge: "flow can require sacrificing depth, which isn't always
  a worthwhile trade-off." ◻ Our flow-first rule is rubric S5 MUST ("never 2+
  elites simultaneously"), which is stricter than the source and has no
  playground exception; any deliberately playground section needs a
  Jacob-authorized S5 amendment.

### Wave overlap (levels are timelines)
- Close spawns overlap; players must treat waves as one interconnected whole —
  a fast kill buys repositioning time and fewer lingering bullets. ✅ S5.
- Low overlap = breathing room; heavy overlap = aggressive movement to control
  patterns. **Heavy overlap of high-hp enemies = tense, strict, "play by my
  rules"; heavy overlap of low-hp enemies = routing freedom, dodge focus, still
  intense.** ◐ S5 checks that both exist, not which kind each section is.
- **Tanks and popcorn**: elite sequences make the main route but get boring
  alone; layer popcorn/tanks/turrets around them for small variations. ✅ wiki
  §3 ("one enemy that controls space + popcorn flying in").

### Sections, repetition, release
- **Themed sections** so parts don't blend: popcorn rush, ground turrets,
  destructible terrain mixed with enemies, just-in-time bullet cancels, tight
  gauntlets. ✅ S5 MUST (≥3).
- **Repetition legitimizes**: 2–5 reps with a twist each → a memorable
  mini-gauntlet, not one encounter. ✅ S5 MUST.
- **Tension/release like music**: build (more enemies, overlap, harder
  patterns, more to manage) → release (big cancels, walls of items, pickups,
  long explosions, short breaks, looser sections). Break high-tension parts
  with **freeform "mindless" dodging-and-blasting** where players improvise —
  "let the players enjoy their victories." ◐ S5 tension-release; the freeform
  improvisation section as a *type* isn't named.

### Environments
- Landmarks are memory shortcuts for chaotic spawns; foreground/background
  interaction (hatches baked into scenery), destructible background objects as
  anchors, non-intrusive set pieces tied to enemies. Extra useful in caravan
  games with variable spawn timing. ✅ S5 SHOULD; G-pass (`research/
  raw-ground-layer-findings.md`).

### Arcade vs modern levels
- Modern = one playthrough (first-time fairness, clarity, learning curve,
  set pieces). Arcade = "an array of lines stacked vertically": built for
  repeated play, so every principle is applied across runs.
- **Fairness**: long-term fairness via careful management of randomness
  beats first-encounter telegraphing.
- **Variety** (the ASR reads "Clarity"; the content is replay variety): gate
  extras behind skill, **especially in early levels** (the most replayed):
  advanced scoring tricks, secrets (DDP bees, hidden barrels/tiles), variable
  spawns, dynamic difficulty. Note the examples are secrets and spawns, not
  scoring formulas. ◻
- **Learning curve** spreads across runs: after a game over, did the player
  learn something usable next run? ✅ S5 MUST ("a game-over teaches").
- **Dynamic pacing is dangerous in arcade**: "even ship intro animations add
  up over the course of many runs." ◐ S7 restart ≤2 s; cite this in the boss
  ritual plan (`docs/plans/boss-ritual.md`) — a ritual is paid every run.
- **Set pieces**: interactive ones are good; attractive non-interactive ones
  wear off and the non-interactive part remains. ◻

## WS06 — Scoring systems

### What scoring gives
- Depth (nuances, shifting goals), **dynamic difficulty** (players take on more
  as they improve), moment-to-moment engagement, **resource management**
  (Ketsui multiplier, Espgaluda gems are finite and spent strategically),
  connection between encounters (long-term goals beyond survival). Garegga/
  Batrider: a whole economy where power-ups and bombs raise difficulty but
  score, score gives lives, lives fund strategic suicides, suicides score — a
  snowball. Even if you don't want scoring, understand what it brings and
  recreate it another way. ✅ Pillar 2, wiki §2, MSX "natural meta".

### Building one
- Think in **conflicts of goals and priorities that feed each other long
  term**: scoring vs survival first; then inside scoring (can't grab every
  item → prioritize; repositioning costs the next section; finite resources →
  where to spend). "Players can't have everything" is what makes them think.
  ◐ wiki §2 alignment.
- **No milking**: boss timers, limited respawns, lives can't be gained faster
  than lost (said of checkpoint-based games). ✅ S6 MUST.
- **Tangibility / natural incentives**: build on behaviours the rules already
  produce (kill fast to reduce danger, grab shiny things). "Going fast in a
  racing game feels natural; circling the start line for a multiplier does
  not." Items and big numbers make it tangible; caravan games (Soldier Blade,
  Dangun Feveron) reward fast kills with *more spawns*. The ideal: players
  score without thinking and **gauge performance without reading numbers**.
  ✅ S6 MUST ×2, §2.5 caravan pull.

### Axes
- **Linear vs exponential** (metaphors, not literal): linear = set points per
  kill/item, little punishment for a miss, reflects skill holistically,
  recoverable; exponential = multipliers, cash-outs, end bonuses, harsh resets,
  high risk/high reward, "one more try", instant feedback. Most games mix
  (capped multipliers, small multipliers on linear cores). ◻ SPEEDHELL is
  linear by choice (binary 2× speed-kill, garnish loot, stock bonus) — state it.
- **Negative vs positive**: negative = the game attacks the player (DDP chain
  timer; passivity is punished); positive = the player attacks the game (Giga
  Wing reflect; passivity is merely unrewarded). Guwange is the hybrid: timed chain, but growth needs cancel-coins, boss milking and shot-type matching.
  ◻ SPEEDHELL is positive by choice — this is the corpus name for the standing
  "no collect-streaks/medal-ladders" condition (CLAUDE.md).
- **Depth vs clarity**: piling multipliers maximizes depth but kills the
  game plan. Fixes: a **clear hierarchy** (emphasize the core visually, make
  garnish subtle), **discrete states** (quick-kill as binary, not per-frame),
  and **inverted risk/reward** — riskier, more complex moves pay *less* so
  players "don't get lost in the sauce too early". Simple core + nuances on
  top. Don't tie an over-complex system to survival unless the game is
  attractive enough to survive it. ✅ S6 MUST (binary, hierarchy); ◻ the
  inverted-risk rule is the argument behind S6 garnish pricing and isn't cited.

### Archetypes
- Item pickup (Dragon Blaze: can't get all → prioritize) · timed pickups
  (Psikyo flashing coins; an unresolved game's stage-3 power-up wait [ASR "GG LS3"]) · stage/end bonuses
  (destruction %, bombs/lives in stock) · max bonuses (DDP bomb-cap passive;
  R-Type per-pickup) · enemy chaining (DDP timer multiplier) · medal chaining
  (Garegga, Feveron) · grazing (Psyvariar, per-bullet or tick) · **kill-speed
  (Raiden IV — our core)** · **caravan (Star Soldier, Feveron — our pull)** ·
  proximity (Ketsui, Espgaluda, Futari) · bullet cancel (Espgaluda) · reflect
  (Mars Matrix) · hyper states. Espgaluda mixes proximity + hyper + cancel +
  end bonus. ◐ wiki §2 names ours; the map of what we deliberately did *not*
  pick is this list.

---

## What this file changes about how we work

- Corpus clearance (CLAUDE.md) now cites **[WS0N]** rules from here, not only
  the rubric checks. The rubric stays the referee's; this is the designer's.
- Two rules became design questions with a plan and Lab/Booth experiments:
  aim quantization (WS03) and the small-hitbox trade (WS01) —
  `docs/plans/boghog-ws-questions.md`, wiki §8 Q18/Q19.
- Everything marked ◻ above is context to cite, not a to-do list. Standing
  conditions (no hp inflation, no opaque scoring, garnish loot, pass-cooldown)
  are untouched.
