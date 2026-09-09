# Plan — the five-stage campaign (stage 1 + four more)

*Reviewed against the corrected workshop transcripts 2026-09-08 —
`docs/plans/reviews/2026-09-08-workshop-recheck.md`; its C2 fixes are applied
here. Written 2026-09-08 at Jacob's request ("write a plan for 4 more stages. i know
we were planning on only a two loop game but i wanna see what u can come up
with"). This is a design proposal for Jacob's decision, not a build order that
starts tomorrow: it changes Pillar scope ("V1 = one full stage") and the §11
mode roadmap, both of which need his override. Nothing in code changes with
this file. Read `CLAUDE.md`, `docs/DESIGN_PILLARS.md`, `docs/HOMAGE_STUDY.md`
(L1–L8 and the three studies in `docs/homage/`), `docs/BOGHOG_WORKSHOP.md`
(WS03 roles, WS04 niches, WS05 arcade levels), `docs/DESIGN_WIKI.md` §1, §3,
§5, §8 Q8, §11, `docs/research/zeroranger.md` §2, and `src/core/stage.js`
`buildTimeline` before building anything from it.*

---

## 0. The recommendation in one paragraph

Ship stage 1 as it stands (the free vertical slice; the two-game strategy
says finish first). Then grow SPEEDHELL into a **five-stage Psikyo-clock
arcade campaign** — every stage 1'30"–2'15" for an expert including its boss,
about 10 minutes to 1CC loop 1, with **loop 2 as the revenge-dot bullet-diff of
all five stages**, optionally sealed behind a clear condition (a new rule — no
corpus doc supports or forbids it; Psikyo's loop 2 is unconditional). Speed-kill
stays the only scoring rule; each stage adds exactly one new *niche* ([T1]: "think in niches, not counts";
each niche is named by its WS04 role), one place (L1), one midboss gimmick (Psikyo#5)
and one boss with form changes and its own bullet dialect (L3/L6). The
campaign has boghog's anchor structure [T1]: strong opening (S1, exists),
mid-game set-piece climax (S3), strong finish (S5). S2 and S4 are the
connective stages that introduce the ground layer and the "from behind /
armoured" grammar the finale remixes.

---

## 1. Corpus clearance (what each lens says, including pushback)

- **Mark MSX.** *For:* Psikyo ("the most slept-on developer of all time";
  "speed hell") ships 7–8 missions of extreme density — length is not the
  enemy, dilution is. Expert bias: later stages must give the better player
  *more* (harder + richer), which a campaign does by adding niches and boss
  parts, never by a stage multiplier. *Pushback:* "density over duration"
  (Pillar 1) — every added second must carry decisions; if a stage exists to
  be long, cut it. CAVE endurance (3-minute stages, 1:45 bosses) is the
  named non-goal (DDP#10); the Psikyo clock is the guardrail that keeps us
  honest. Also: a 10-minute 1CC raises the cost of every death — that is the
  arcade contract (Pillar 4), not a bug.
- **Boghog.** *For:* [WS05] arcade levels are "an array of lines stacked
  vertically" — built for repeated play; **early stages are replayed the
  most, so gate the extras behind skill there**; "repetition legitimizes";
  chunk-with-escalation [T1]; "anchor structure: strong opening, mid-game
  set-piece climax, strong finish" [T1]; niches not counts [T1]; roles (pressure / clutter / area denial / direct challenge) [WS04];
  escalate *behaviour* across the game, not counts ("ships from the bottom
  later") [T2]. *Pushback:* [T1] process order — player abilities first,
  enemies in the void, then layout, scoring last: **no stage 2 until the
  ship roster (A/B) and the S1 pass are settled**; "work in passes with
  cooldown" — one stage per pass, playtested before the next; [T1] "levels
  are never finished, you just run out of time" — set the clock per stage
  and stop. [WS05] "even ship intro animations add up over many runs":
  between-stage cards must total ≤ 6 s of zero-input.
- **Pillars.** 1 (density), 2 (speed-kill is the meta — unchanged), 3
  (difficulty is the content; hard first; practice tools before easy modes —
  stage select is the practice tool), 4 (lives are the only currency; a
  campaign makes stock *matter*), 5 (imperfect tools; the armoured niche in
  S4 is a real checkmate, not a stat), 6 (readable chaos — every new
  dialect obeys S2), 7 (60 fps; five stage modules add zero per-frame cost).
  **Amendments needed:** Identity line "V1 = one full stage" → "V1 = stage 1;
  the campaign is five"; Non-goals "V1 has one loop" stands (loop 2 stays
  the first v2 mode, now over five stages).
- **Homage laws.** L1 place-is-the-wave (five places, landmark ramps); L2
  loot-paid breathers (per-stage release over the boss's approach landmark);
  L3 boss ritual per boss; L4 receipt per stage; L5 route as a line; L6
  castes (needles = stage, dots = boss; each boss adds its own dot dialect);
  L7 parts + point-blank; L8 loop 2 = bullet-diff. Psikyo#1 envelope
  (1'11"–2'11" per mission, 42–80 s to boss), Psikyo#5 midsize metronome and
  midboss gimmicks, Psikyo#6 transform-not-phase, Psikyo#9 one-card target
  briefing naming the boss, Psikyo#10 loop plan. BRDA#3 repetition-with-
  density, BRDA#8 countdown meter before the final boss.
- **ZeroRanger.** Take: stage lengths *escalate* (2:20 → 4:15 → 6:15 — we
  escalate inside the Psikyo cap instead), "midbosses return as true
  bosses" in the remix, boss-rush finale shape, one named cue per stage /
  midboss / boss. Refuse: hidden rank, continues-as-currency, 12-minute
  stages.
- **Standing conditions untouched:** no hp-inflation fixes, no opaque
  scoring math, loot garnish-priced, pass-cooldown. Scoring rules are
  Jacob's — §5 below presents the two scoring consequences as options.

---

## 2. The campaign at a glance

| # | Stage (place) | New niche [T1] + WS04 role | Section theme (WS05) | Midboss + gimmick | Boss forms (L3) | Boss dialect (L6) | Expert clock |
|---|---|---|---|---|---|---|---|
| 1 | **THE CRYPT** (exists) | speed-kill itself; popcorn / turret / mid / elite | intro → turret alley → mid gauntlet → rush → elite pair → release | Reliquary, lid opens (phase B) | winged cathedral → manta → bare core | lances / twin spirals / rings | 1:46 at the r65 certificate (boss hp 1×); ≈ 2:04–2:15 at r71 3× hp per the r70 bot table — recert pending |
| 2 | **THE BONE RAIL** | **ground layer**: rail tanks, plinth turrets ON a scrolling ossuary hull, destructible bone walls | destructible terrain + turret decks | The Hearse — rail crawler with a **chained anchor** that swings through the lane (physical checkmate, T3) | bell tower → bell walker → the clapper | **pendulum arcs** (moving emitter distorts a static pattern, WS03 #6) | 1:40 |
| 3 | **THE CANDLE SEA** | **formations**: leader-led popcorn files (kill the leader, the file scatters) + **carrier** mids that release popcorn | swarm rush + just-in-time cancels (WS05 theme) | **Twin Moths — the elite PAIR** (Psikyo M7) with a mirrored escort | cocoon → moth → ember core | **eggs that hatch emitters** (WS03 #5) | 2:00 |
| 4 | **THE BLOOD GATE** | **wall pods** on both flanks (corridor) + **risers from behind** as a theme + the **Warden**: front-armoured elite — flank or point-blank, never sniped from below (a counter, not hp) | strict high-hp overlap gauntlets (WS05 "play by my rules") | The Gatekeeper — a gate that *closes lanes* (area denial) and transforms when its lock is broken | the gate → what was behind it → core | **the box trap** (WS03 #7): pens that move | 2:10 |
| 5 | **THE GREAT ALTAR** | none — everything returns, remixed (ZR) | 42-s approach, then the **returning-midboss gauntlet** with no breathers (T2 Psikyo compression), WARNING, final boss | Hearse → Moths → Gatekeeper, one form each, back-to-back | idol → demon → the Priestess's mirror → bare core with fireworks (Psikyo#6: four forms) | **medley of every boss dialect** (BRDA#5) — recombination only, nothing new | 2:15 (cap) |

Loop 1 expert total ≈ 10:10–10:20 at r71 (9:50 with the r65 stage 1); practiced
human ≈ 20–25 min (wiki §1's 2.5× expert ratio; the S1945II study's 15-minute
loop 1 is an expert 2-ALL run). Nothing past 2:15 per stage (Psikyo#1).

**Difficulty shape** (boghog "start hard, scale back" + zigzag allowed [T2]):
S1 hard opening (as certified) · S2 slightly *looser* (new grammar to learn,
the ground layer seals fire near the player) · S3 the density peak and
set-piece · S4 the strict stage (highest deaths-per-minute by design) · S5 the
finish: short stage, long boss.

---

## 3. Stage by stage

### Stage 1 — THE CRYPT (sections as certified at r65; boss at r71/r72 — re-measure the clock before the campaign cap is applied)
The opening. It is already at the M7/M8 end of the Psikyo envelope, which is
fine for a stage that will be replayed the most ([WS05]) — but it must gain
the campaign's **skill-gated extras** there — secrets in WS05's sense: hidden
pickups or a hidden spawn gated behind a skill act (e.g. a bonus turret that
only spawns if the alley is cleared in-window), never a hidden score formula
(CLAUDE.md standing condition; Pillar 2) — and the boss part order (L7). No new sections. Its receipt becomes the per-stage receipt
template (L4).

### Stage 2 — THE BONE RAIL (the ground stage)
- **Place ramp** (L1, one landmark per section): catacomb mouth → ossuary
  canal → the rail yard → the hull (a 40–50 %-width scrolling ossuary barge
  hosting the turret deck, R7) → bell-tower approach.
- **Niche:** the *ground layer* — rail tanks that scroll with the stage
  (WS04 "turrets and tanks don't fly off"), turrets bolted ON the hull
  (Psikyo#4, DDP#4), destructible bone walls that hide guns and pay loot
  (WS05 destructible-terrain theme; `research/raw-ground-layer-findings.md`).
  Ground enemies are **sealed** by proximity (r18 canon) — stage 1's turret
  alley already seals; here sealing becomes the tool you must use (hull
  turrets that can only be silenced by approaching).
- **Sections (≤2 reps each):** tank column (rep 1 / rep 2 denser) → bone-wall
  breach (destroy to open the lane; loot behind) → hull turret deck (the
  turret alley grown up; killing all deck turrets chain-links into a core
  kill, DDP#4) → **midboss The Hearse** → rail rush (tanks + crossers) →
  release over the bell tower (loot corridor, L2) → WARNING → boss.
- **Midboss gimmick:** The Hearse drags a chained anchor that swings across
  the lane on a visible pendulum — a *physical* threat (hitbox + motion,
  T3 "checkmate from physical properties"), and the anchor is the sub-part
  speed-kill target.
- **Boss — The Bell:** bell tower (static pendulum arcs from a swinging
  emitter, WS03 #6) → bell walker (strafes hard; the safe spot is under it,
  re-earned, L7) → the clapper (bare core, rings). Dialect: pendulum arcs;
  nothing in the stage sections uses them (S3b-6).
- **Numbers to start from:** needle speed as S1; tank hp 24 (turret class);
  bone wall 24 hp (turret class), pays 3 items; hull core 220 (elite class) — no new hp
  tiers.

### Stage 3 — THE CANDLE SEA (the set-piece climax)
- **Place ramp:** open sky over a sea of votives → the moth shrine → the
  candle field (brightest background in the game — the S2 washed band is the
  hard constraint) → the cocoon.
- **Niche:** *formations* — popcorn files with a **leader**; kill the leader
  in its window and the file scatters (each popcorn still pays its own binary
  speed-kill — no group payout; a leader bonus is §5 option C, Jacob's call);
  miss it and the file turns and streams (WS05 "popcorn forces streaming").
  **Carrier** mids release popcorn on a metronome (musical layering [T1]).
- **Sections:** formation drill (rep 1 V, rep 2 mirrored double-V) → carrier
  pair → **just-in-time cancel** theme: a curtain accent (5–10 s) on the Twin Moths'
  arrival — the HOMAGE guardrail permits curtains only at midboss and boss
  finale — that the carriers' deaths cancel into gold if killed in-window
  (WS05 theme; L2) → **midboss Twin Moths** →
  the swarm rush (density peak of the campaign; bullets-on-screen ceiling
  is the S8 stress scene) → release over the cocoon → WARNING → boss.
- **Midboss — Twin Moths, the elite pair:** two elites at once is exactly
  what WS05 forbids for *flow* — here it is the point: the "playground"
  conflict of goals (Garegga/Batrider, WS05), deliberately, once per campaign.
  Rubric S5 MUST forbids 2+ elites simultaneously with no exception; this
  needs a Jacob-authorized S5 amendment before the stage is built. Psikyo's
  M7 pair enters staggered (11:16 → 11:20); stagger the Moths by a beat so the
  sequence still suggests the route [WS05]. Gimmick: they mirror each other; killing one *enrages* the other (a
  behaviour change, not hp) — the classic Psikyo M7 pair.
- **Boss — The Moth Queen:** cocoon (static, spawns eggs) → moth (aimed,
  fast, hard strafing) → ember core. Dialect: **eggs that hatch emitters**
  (WS03 #5) — projectiles that spawn projectiles, telegraphed by a 30-f
  pulse before hatching (S2 warning rule).
- **Boghog's novice test here** [T1]: after routes burn in, wait ~1 s after
  each formation spawn before moving; the file must still be survivable.

### Stage 4 — THE BLOOD GATE (the strict stage)
- **Place ramp:** the gate's approach road → the corridor (wall pods bolted
  on both flanks, Psikyo M7 night base / DDP corridors) → the inner court →
  the gate itself (the arena is a set-piece hull, DDP#4).
- **Niche:** *threats from behind and from the flanks* — **risers** become a
  section theme (escalation of behaviour, T2 "ships from the bottom later");
  **wall pods** (turret class, sealed by proximity) fire across the corridor,
  so the lane geometry is the pattern (WS03 area-denial role); the
  **Warden** — a front-armoured elite that takes no damage from below at
  range; you flank it or point-blank it. This is [WS03] "a range of responses
  with pros and cons" made into an enemy and [T3] "balance = counters, not
  numbers". Not an hp change (standing rule). Late-kill state [WS04]: after
  its window the Warden advances and fires wide (rush — "possibly more
  dangerous"), so ignoring it is punished; S4 MUST's 1.6× check applies to it.
- **Sections:** corridor run (wall pods + crossers; rep 2 adds risers) →
  Warden 1 (solo) → the court (heavy overlap of *high-hp* enemies = strict,
  WS05) → **midboss The Gatekeeper** (its kill cancels the field to gold — release
  1) → the back-attack rush (risers + divers,
  the stage's tension peak) → Warden 2 + wall pods (twist) → release at the
  gate (release 2, short — S5 MUST wants one after each peak) → WARNING → boss.
- **Midboss — The Gatekeeper:** closes lanes with bars (area denial that
  *moves*), opens when its lock part dies; transforms on the kill of the lock
  (Psikyo M8 midboss transformation).
- **Boss — The Gate:** the gate (arena-wide; its pods are the parts) → what
  was behind it (fast strafer) → core. Dialect: **the box trap** (WS03 #7) —
  six emitters pen the player, then the pen moves. Touhou's favourite, used
  once, here.
- **Deaths-per-minute** is expected to be the campaign's highest; the
  learnability check (S5 "a game-over teaches") is the gate, not the death
  count.

### Stage 5 — THE GREAT ALTAR (the finish)
- **Place ramp:** the altar stair (≤ 25 s; the whole pre-boss run — stair +
  gauntlet + release — must land inside Psikyo's 42–80 s) → the altar → the
  sigil disc.
- **No new niche.** Everything returns, remixed (ZR: repetition legitimizes;
  loop-1 material as fake-outs). The approach is a compressed "best of":
  one formation, one tank column, one Warden, one carrier — each ≤ 1 rep,
  inside the 25 s.
- **The returning-midboss gauntlet:** Hearse → Twin Moths → Gatekeeper, one
  form per midboss at ≤ 8 s each (24 s), back-to-back (precedent: BRDA#3
  miniboss chains, ZeroRanger's boss-rush stage 4; T2's "no breather after the
  midboss" applies to each kill, not to the chain) — each kill cancels its
  field to gold (WS05 release; S5 MUST after each peak), the BRDA#8 countdown
  meter climbing across them. Then WARNING over an emptied altar, the final
  boss.
- **Final boss — The Idol:** four forms (Psikyo#6's final chains four):
  idol (static, the S1 lances) → demon (aimed, the S3 eggs + S2 arcs) → the
  Priestess's mirror (a *player-shaped* form: speed 3.7, a three-way spread
  — Ship B's grammar turned on the player; the only "story" beat, and it is
  a pattern, not text) → bare core, firework desperation (rings + every
  earlier dialect recombined, nothing new — S3b-5). Boss ≤ 65 s (50 % of
  2:15) — four forms at 3× hp do not fit; either the finale runs its own
  multiplier or forms 1–2 are short (≤ 10 s) and only 3–4 are full length.
- **Loop 2 seal** (changelog 2026-08-29 named the idea; it is a judgment call,
  not a corpus rule — Psikyo's loop 2 is unconditional): clearing S5 with the
  condition
  (proposal: no-miss on any two stages, or all five midbosses killed
  in-window — Jacob picks) enters loop 2; otherwise the campaign ends on the
  receipt. Loop 2 = the same five stages with revenge dots (L8), nothing
  authored twice.

---

## 4. Rules that apply to every new stage (the checklist a builder gets)

1. **Psikyo clock:** 1'30"–2'15" expert, 42–80 s to the boss, boss 30–50 %.
   The cap binds boss hp: a stage's boss at 3× must still fit 30–50 % of
   ≤ 2:15 for the expert bot, or that boss runs at a lower multiplier. This
   supersedes HOMAGE's "boss phases 15–25 s" only if Jacob amends the
   guardrail (r72's timeout is 35 s).
2. **Eight-ish sections, ≤2 reps each, escalating** (S1 grammar, BRDA#3).
3. **One new niche per stage, zero new hp tiers.** New enemies reuse the
   existing hp classes (popcorn 2 / turret 24 / part 24, P2 node 56 / mid 44 /
   elite 220 / midboss 400) with new *behaviour*; bosses per §5 (r71: 3×,
   subject to rule 1).
4. **Midsize metronome:** something mid-or-bigger every ~10 s (Psikyo#5).
5. **Fuse contract:** every wave has an explicit "fires at t+N"; a
   full-power player can zero most waves (Psikyo#2, wiki §2.2 window table — note its hp column is stale: elite 220,
   midboss 400, boss 390/402/405 since r27/r25/r71; timeout 35 s since r72).
6. **Boss ritual:** WARNING ≥ 1 s over an emptied field; forms not phases;
   ≥ 1 destructible part per form; one point-blank invitation; a boss-only
   dialect that never appears in sections; a medley finale (S3b).
7. **Castes:** pink rounds = stage common fire; cyan needles = the special
   tier's aimed fire; boss dialects are *shapes*, not new colours (≤ 3
   families on screen, S2). New bullet shapes must pass the r20 display
   contract (r 3 hit circle inside the drawn core).
8. **Fire gating** is the r18 canon (top dead zone, bottom band, proximity
   seal) — no stage invents a fourth gate.
9. **Release = loot over the boss's approach landmark, ending empty**
   (L2 + BRDA#9). Items stay garnish-priced (S6).
10. **Receipt per stage** (L4): speed-kills / kills, longest chain, time,
    no-miss, no-bomb — then a ≤ 2 s target-briefing card naming the next
    boss (Psikyo#9). Total zero-input between stages ≤ 6 s [WS05].
11. **Music:** one stage cue + one boss cue per stage (ZR; `docs/music/`
    grammar; the song-following boss builder in `docs/plans/boss-ritual.md`
    generalizes — build boss 1 that way first, then the rest inherit).
12. **Readability first:** every new dialect is drawn on the S8 stress
    scene before it is tuned; if the r20 dot or the cores are masked, the
    dialect is wrong (Pillar 6).
13. **Novice test** [T1] on every section after routes burn in.
14. **Referee:** each stage is its own certified control run from
    `startRun(g, 0, level)` with its own bot suite (Jacob-authorized recert
    per stage); the campaign run is one more check (stock carried, rng
    continuous). Stage 1's certificate never moves.

---

## 5. Scoring consequences (options with numbers — Jacob's decisions)

Speed-kill is unchanged. Two things a campaign forces:

**A. Stock across stages.** Lives and bombs carry (arcade). Score rises
across stages by *more targets* (parts, hulls, leaders), never a stage
multiplier (Pillar 2). Expert budget ≈ 181 k (S1, r65 certificate; unmeasured at r71) → ~1.1–1.3 M for loop 1 if
S2–S5 each pay 1.2–1.6× S1 through density, not math.

| option | rule | why / risk |
|---|---|---|
| A1 (recommended) | one **extend** per loop at a fixed, announced score (≈ 400 k, about an expert's S2 clear) | Psikyo gives extends; a 10-min 1CC with 3 lives and no extend is CAVE-cruel, not Psikyo. Visible, binary, no math. |
| A2 | no extends; 3 lives for the campaign | purest Pillar 4; expect the 1CC to sit with the top 5 % — fine for the arcade mode if Novice (§11) arrives |
| A3 | extend per stage-clear no-miss | WS06 archetype: a stage-end bonus (positive system). Pushback is Pillar 4 / MSX: it converts survival into a spendable resource and feeds the Q8 suicide trade — not recommended |
| C (option) | leader-kill payout in S3 formations | Jacob's call; default is none — each popcorn pays its own binary speed-kill |

**B. The suicide-for-bombs meta (§8 Q8) multiplies by five.** Today the
trade is ~1 k for up to ~33 k once; in a campaign it recurs at every boss and
the stock it spends is the stock the extend replenishes. Decide Q8 **before
stage 2 is built**: boghog "keep the move, fix the price" (death refills 1
bomb, or stock life 1 k → 5 k) is the recommendation for a campaign; MSX
"keep as-is" was blessed for a one-stage game where the trade happens once.

---

## 6. Architecture (what has to exist before stage 2)

- `src/core/stages/s1.js … s5.js`: each exports `buildTimeline()`, its
  landmark list and its boss module; `stage.js` keeps the shared
  `updateEnemy`, `mayFire`, camp governor and the cross-stage enemy switch.
  New types append to `ENEMY_DEFS` (tank, wall pod, warden, carrier,
  leader is a popcorn `phase`, not a type); new bosses are modules sharing
  the r6 ritual code, not copies of boss 1.
- `g.level` (0–4) on `g`; `startRun(g, atT, level)` (today `startRun(g, atT = 0)`, `game.js:122`); stage clear → receipt
  → briefing → `nextStage(g)` carries lives, bombs, score, chain state
  reset; rng stream continuous inside a run (determinism holds), seed +
  stage for practice runs.
- **Stage select** (Pillar 3's practice tool; boghog T3) for any stage
  reached in any run, persisted like the practice row; Booth `?level=N`
  (`?stage=` already means a stage-time jump in the sandbox, `sandbox.js:372`).
- **Receipt** per stage (extend `src/results.js`); briefing card (a
  pre-run card exists in the §11 story placement — reuse).
- **Skins:** cute-occult is primary; every new type needs a creature there
  first (`docs/art-rounds/`); base must draw it; other skins may lag (say so
  in the wiki).
- **Referee:** `test/sim.mjs` grows one control run per stage — a Jacob-
  authorized referee commit per stage, never a builder's.
- **Performance:** five timelines are built lazily per stage; pools stay
  fixed size; the S3 swarm rush is the new S8 stress scene.

---

## 7. Build order and gates (one stage per pass, cooldown between)

0. **Ship stage 1** (two-game strategy). Settle the ship-b / boss-hp /
   boss-ritual pass. Decide Q8 and option A. Amend Pillars + §11.
1. **Infrastructure pass** (no new content): stage modules, `g.level`,
   carry-over, receipt-per-stage, stage select, referee plumbing. Stage 1
   must stay byte-identical to its certificate. BUILD bump, wiki §12
   "Campaign" section created.
2. **Stage 2** — the ground layer is the biggest infrastructure (tanks,
   destructible walls, hull-mounted turrets, sealing as a taught tool). Built
   hard first, scaled back [T1]. Playtest in the Booth; recert; cooldown.
3. **Stage 3** — formations and carriers; the elite-pair midboss; the
   density ceiling is measured here and fixes S8's stress scene for good.
4. **Stage 5's final boss skeleton** *before* stage 4 — the medley needs
   every dialect's shape agreed, so the S4 dialect (box trap) is designed
   knowing it will be quoted.
5. **Stage 4** — wall pods, risers-as-theme, the Warden, the Gatekeeper.
6. **Stage 5** — the approach, the midboss gauntlet, the four-form finale,
   the loop-2 seal, the campaign receipt.
7. **Loop 2** — revenge dots over five stages (L8), then the §11 order
   resumes: Challenge, Caravan, Novice.

Each stage pass ends with: wiki section + changelog with corpus clearance,
BUILD bump, Booth session debrief, referee recert, and a cooldown before the
next stage is opened (boghog pass-cooldown).

---

## 8. What this plan deliberately refuses

- No new scoring systems per stage (no chain meters, medal ladders,
  multipliers) — the campaign's score depth is *routing across more targets*.
- No hp escalation as difficulty; new stages escalate behaviour and niches.
- No CAVE-length stages or bosses; no curtain primary language (accents only
  at midbosses and boss finales, per HOMAGE; stage 1's midboss bloom is one
  already).
- No mid-stage story text; the "Priestess's mirror" form is a pattern.
- No procedural or randomized layouts; fully scripted spawns (ZR, Psikyo).
- No build before stage 1 ships and the current pass settles.
