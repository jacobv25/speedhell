// Stage 5 — THE GREAT ALTAR (r85; plan docs/plans/campaign-five-stages.md §3).
// THE FINISH. Its niche is that it HAS none: "no new niche — everything returns,
// remixed" (ZeroRanger: repetition legitimizes). Zero new enemy types, zero new
// hp tiers, zero new emitters, zero new bullet shapes — `ENEMY_DEFS`' newest id
// is still 16, exactly where stage 4 left it. What is new is the ARRANGEMENT:
//   · THE APPROACH (≤ 25 s, sections S1-S2) — a compressed "best of": ONE
//     formation file (stage 3), ONE tank column (stage 2), ONE Warden (stage 4)
//     and ONE carrier (stage 3), each at ≤ 1 rep and sequenced so no two STRONG
//     bodies ever arrive together [WS05 / Jacob's standing Q21 point].
//   · THE RETURNING-MIDBOSS GAUNTLET (S3-S5) — THE HEARSE → A TWIN MOTH → THE
//     GATEKEEPER, one form each on the ELITE tier (220), back to back, each kill
//     cancelling its own field to gold. Precedent: BRDA#3's miniboss chains and
//     ZeroRanger's boss-rush stage; [T2]'s "no breather after the midboss"
//     applies to each KILL, not to the chain.
//   · THE RELEASE (S6) over the sigil disc, ending empty (L2 + BRDA#9).
//   · THE IDOL (S7) — the four-form finale, whose patterns are finished here
//     (the r83 skeleton's placeholders are gone).
// The three returning midbosses are REUSED, not copied: this module imports the
// stage modules that own them and calls their `enemyUpdate` hooks, so the Hearse
// is stage 2's Hearse to the frame and the Gatekeeper is stage 4's Gatekeeper
// (s2.js / s3.js / s4.js are not edited at all — plan §4 rule 14 keeps them
// byte-identical). Both returning midbosses are type 4, so each body carries its
// OWNER's level in `e.role` (game.js) and this file's type-4 hook dispatches on
// it; the renderer reads the same field to pick the right painter.
//
// THE IDOL — four FORMS (Psikyo#6: the final boss chains four). Forms, not
// phases: each one is a different body, a different movement grammar and a
// different quotation, and each carries ≥ 1 destructible part.
//   1 THE IDOL     — static. Quotes STAGE 1: the accelerating lance + the laned
//                    arc wall whose lane sits under its own column (the
//                    point-blank invitation).
//   2 THE DEMON    — aimed. It hunts your column, slower than you. Quotes
//                    STAGE 3 (eggs that hatch) and STAGE 2 (pendulum arcs off a
//                    swinging censer).
//   3 THE PRIESTESS'S MIRROR — a PLAYER-SHAPED form. It moves at 3.7 px/f (the
//                    ship's exact speed) to the mirror of your column and fires
//                    a three-way spread: Ship B "PRIESTESS"'s grammar turned on
//                    the player. The only story beat in the campaign, and it is
//                    a pattern, not text (plan §8 "no mid-stage story text").
//                    r85 gives it a RE-TARGET BEAT — see MIRROR_BEAT.
//   4 THE HOLLOW CORE — bare core, firework desperation. Rings plus every
//                    earlier dialect recombined and NOTHING NEW (rubric S3b-5),
//                    including stage 4's box trap through `quoteS4`.
// The boss-only dialect is the MEDLEY ITSELF (S3b-6): no stage section anywhere
// in the campaign speaks four dialects in one body.
//
// hp: a single named table, IDOL_HP below (forms 1-2 short at the ELITE tier,
// forms 3-4 full at the boss tiers) — zero new hp tiers (plan §4 rule 3); it is
// UNCHANGED from r83 (wiki Q34 is Jacob's open choice, and r85 does not take it).
// Everything shared lives elsewhere: ../stage.js keeps ENEMY_DEFS, mayFire's
// r18 gates, the camp governor, the r6 boss beats and the escalation clock;
// ../patterns.js keeps every emitter (this stage adds none — the finale quotes);
// ./kit.js keeps the timeline grammar (this stage adds none either — the
// approach is spelled in helpers stages 2, 3 and 4 already wrote).
// Music: reuses the stage and boss tracks for now (a stage-5 cue is a later pass).
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, W, H } from '../game.js';
import { mayFire, campGovernor, bossEntrance, bossBurn, bandedSweep, bossTimeout, pickSafeX, advanceBossPhase } from '../stage.js';
import { aimedFan, ring, arcWall, spray, ledFan, staticFan, eggFan, lanceVolley, boxTrap } from '../patterns.js'; // r84: boxTrap = stage 4's dialect, quoted by form 4 (see quoteS4)
import { makeKit } from './kit.js';
// r85: the modules that OWN the returning midbosses. This is reuse, not a copy:
// their `enemyUpdate` hooks are the same functions stages 2, 3 and 4 run, so a
// returning body behaves to the frame like the one the player already learned.
// (Import order note: stages/index.js imports s1…s4 BEFORE s5, so all three are
// fully evaluated by the time this module's body runs; nothing here dereferences
// them at load time either — every use is inside a function.)
import s2 from './s2.js';
import s3 from './s3.js';
import s4 from './s4.js';

export const id = 5;
export const name = 'THE GREAT ALTAR';

// Section table (index 0 = FULL RUN). Seven sections + the full run; the WARNING
// beat sits inside S6 exactly as it does on stages 2, 3 and 4.
// The gauntlet is three sections 60 stageT apart on purpose: a midboss GATE
// freezes the timeline, so the next guard's event is 60 ticks (≈ 0.3 s once the
// caravan pull sees an empty field) after the previous one's death — back to
// back, with its own cancel-to-gold as the only breath [T2 / WS05].
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 120, label: 'S1 THE ALTAR STAIR', name: 'S1 the altar stair — the approach (formation · Warden)' },
  { t: 780, label: 'S2 THE ALTAR', name: 'S2 the altar — the approach (tank column · carrier)' },
  { t: 1570, label: 'S3 THE HEARSE', name: 'S3 gauntlet 1 — the Hearse returns' },
  { t: 1630, label: 'S4 THE MOTH', name: 'S4 gauntlet 2 — a Twin Moth returns, alone' },
  { t: 1690, label: 'S5 THE GATEKEEPER', name: 'S5 gauntlet 3 — the Gatekeeper returns' },
  { t: 1750, label: 'S6 RELEASE', name: 'S6 release — the sigil disc' },
  { t: 1950, label: 'S7 THE IDOL', name: 'S7 boss — the Idol' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

const PI = Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const findType = (g, type) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === type && !o.dead) return o; } return null; };

// --- THE GAUNTLET'S HP (existing tiers only) -----------------------------------
// plan §3: "one form per midboss at ≤ 8 s each (24 s), back-to-back". r83
// measured 220 hp ≈ 6.5 s for the expert, so every returning guard's BODY is the
// ELITE row verbatim — 220, the Twin Moths' own number, zero new tiers. A Moth
// already IS 220 (`ENEMY_DEFS[13]`), so only the two type-4 bodies are re-stamped
// at spawn, exactly as the Idol's form 1 re-stamps the boss row.
// The 35 s MIDBOSS_TIMEOUT still applies to each of the three (wiki Q47).
const GUARD_HP = 220;

// --- THE HP BUDGET (Jacob's open choice — wiki §16, option A vs B vs C) --------
// UNCHANGED from r83. Psikyo clock (plan §4 rule 1): the boss is 30-50 % of a
// 1'30"-2'15" stage, so the finale's target is ≤ 65 s for the expert. FOUR forms
// at the 3× boss tiers (390/402/405/405 = 1602 hp) do not fit that; three
// already sit at 1197. OPTION A — SHIPPED: forms 1-2 run SHORT on an EXISTING
// tier (elite 220) and forms 3-4 run full length at the boss tiers. 220 + 220 +
// 402 + 405 = 1247, only 4 % over a three-form boss, and zero new hp numbers
// enter the game. Option B (a finale-own multiplier) needs four NEW numbers and
// therefore Jacob's override; option C moves form 3 to the elite tier. r85 takes
// NEITHER: what r85 changes about form 3 is how it MOVES (MIRROR_BEAT), which is
// [T3] "balance = counters, not numbers" and is measured both ways in the wiki.
// [0] is used at SPAWN (the timeline overrides ENEMY_DEFS[5].hp, which is 390);
// [1..3] are read by advanceIdolPhase on each handoff.
export const IDOL_HP = [220, 220, 402, 405];

// r85 FORM 3's DWELL (wiki §16.3, the Q34-adjacent PATTERN answer — [T3]
// "balance = counters, not numbers"). r83 measured the mirror at 11 hp/s against
// forms 1-2's 34-38 and the expert timed it out on 7 of 7 seeds with up to 230 hp
// standing. The cause was not hp: a body travelling at exactly the ship's speed
// toward the mirror of the ship's column is NEVER stationary in the firing lane,
// and the camp governor bans the one spot that solves it (the centre line is the
// mirror's fixed point). So the form had no counter at all, which is a checkmate
// by arithmetic — the thing [T3] and [WS03] both refuse.
// The answer is a BEAT the player can play against: the mirror SAMPLES the mirror
// of your column, travels there at 3.7 px/f (the ship's speed exactly, so it is
// still inescapable), and then PLANTS for MIRROR_DWELL frames before it samples
// again. The plant is the window: chase it, and when it sets, kill it. It is the
// same grammar as stage 4's Gatekeeper arms (a fixture that relocates on a clock)
// and it makes the story beat legible — the Priestess copies you a beat late.
// Measured (expert, lives pinned, 7 seeds): the dwell is what lets the finale's
// LAST form be reached at all; the sweep is in wiki §16.3.
const MIRROR_DWELL = 45;

// Part geometry per form: [dx, dy] off the boss centre, outside its r=30
// collision circle horizontally so every part is hittable from below (the
// PART_GEO rule in stage.js). Existing part rows only: hp 24, except form 2's
// single node at 56 — both are tiers that already exist.
const IDOL_GEO = [[36, 8], [38, -2], [34, 4], [38, -4]];
function spawnIdolParts(g, boss) {
  // Form 2 is the asymmetric one (ONE node at +38, hp 56) — the same shape
  // stages 1, 2, 3 and 4 all give their strafing/aimed form (L7, on purpose).
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + IDOL_GEO[boss.phase][0] * s, boss.y + IDOL_GEO[boss.phase][1], { side: s });
    if (p) { p.phase = boss.phase; p.armorUntil = boss.armorUntil; if (boss.phase === 1) p.hp = p.prevHp = 56; }
  }
}

// --- THE STAGE-4 QUOTE (filled at r84; the beat re-timed at r85) ---------------
// Stage 4's boss dialect is THE BOX TRAP (WS03 #7) — six emitters pen the player,
// then the pen MOVES — and rubric S3b-5 makes the finale recombine earlier
// material and introduce nothing new, so form 4 must quote the box. The contract
// r83's skeleton wrote for this hook, and what it means here:
//   1. THE GATE's dialect is `boxTrap` in ../patterns.js — six sources lay the
//      six wall segments of a pen, one segment is omitted (the door), and every
//      round carries the same drift and accel so the pen MOVES. Done.
//   2. ONE pen, SIZED DOWN — 46 × 34 against the Gate's own 60 × 48, one cast per
//      form-4 cycle against the Gate's every 150 f, and it is thrown at your
//      COLUMN in front of the Idol rather than built around you. A medley quotes:
//      it says the sentence, it does not re-run the set piece (Q39's answer as
//      the plan frames it — the Gate's fight IS the one use, a quote is not a use).
//   3. Pink rounds, so form 4's family count is unchanged (still pink + cyan +
//      the player's violet, ≤ 3 on screen, S2).
//   4. It draws NO rng.
// Cast on the ship's COLUMN at the Idol's own reach (e.y + 96, span 68), never
// clamped — the Gate's pens are not clamped either, for the reason written at
// `pen` in s4.js (clamping the centre puts a wall on a ship at an edge, which is
// a spawn-on-player death; an unclamped pen simply loses its far wall off-field).
function quoteS4(g, e, k, rep) {
  const hw = 46, hh = 34;
  const cx = g.player.x;
  const dir = (rep & 1) ? 1 : -1;
  const door = dir > 0 ? (rep & 2 ? 4 : 5) : (rep & 2 ? 1 : 2); // the door on the trailing side, as the Gate's own pens place it
  boxTrap(g, cx, e.y + 96, hw, hh, 15, dir * 0.30 * k, 0.34 * k, door, 0.010);
}

// --- THE IDOL -----------------------------------------------------------------
// Ritual as stages 1-4's, by construction: WARNING ≥ 1 s over an emptied field,
// `bossEntrance` (90 f armored descent, parts on the last beat), `bossBurn` at
// each handoff, `advanceIdolPhase` (cancel wall, item shower with the late-kill
// fade, 60 f armor), `bossTimeout` (35 s per form, flee telegraph), the camp
// governor, the escalation clock `k` (wiki §5.2b) — the clock RESTARTS at zero
// on every form, so a fresh form always opens at 1.0× however long the last one
// dragged, and with four forms that reset happens three times.
function updateIdol(g, e) {
  g.emitter = e;
  const phase = e.phase, rep = e.fireT / 240 | 0;
  const k = Math.min(1 + rep * 0.08 + Math.max(0, rep - 3) * 0.22, 2.2);
  if (bossEntrance(g, e, spawnIdolParts)) return;
  bossBurn(g, e);
  const { latched, parked, vLead } = campGovernor(g, e);
  e.fireT++;
  const t = e.fireT % 240;

  if (phase === 0) {
    // ---- FORM 1 — THE IDOL (static; the stage-1 quotation) --------------------
    // It does not chase. It is a statue on the altar: the only boss in the game
    // that lets you pick your ground, and the arc wall's lane is under its own
    // column, so the ground it offers you is point-blank (boss 1's P1 rule:
    // "riding the lane IS pursuit"). The price of standing there is the lance —
    // the fastest thing in the game and the one dialect that accelerates.
    // hp 220 (elite tier) makes this a ≤ ~10 s form: an opening statement, not
    // a fight (plan §3: "forms 1-2 are short").
    // [T1] "if HP must be short, use the intro-speed trick so the SHAPE is
    // instantly on screen": at 220 hp this form can be over in ~2 s, so its
    // quoted dialect fires EARLY in the cycle (t 24, not boss 1's t 70) —
    // a short form must still get its sentence out, or it is a cutscene with
    // a health bar (MSX: "orange juice into water").
    const tx = latched ? pickSafeX(e) : W / 2 + Math.sin(e.fireT * 0.003) * 18;
    e.x += clamp(tx - e.x, -0.5, 0.5);
    e.y += clamp(90 - e.y, -0.5, 0.5);
    if (mayFire(g, e)) {
      if (t === 24) lanceVolley(g, e.x, e.y + 16, 5 + Math.min(rep, 2), 3.3 * Math.min(k, 1.5)); // STAGE 1's boss-only dialect, at the FRONT of the cycle
      if (t === 76) arcWall(g, e.x, e.y + 12, 13 + rep, 1.9, 1.6 * k, 6, 2);                     // THE POINT-BLANK INVITATION: gapIndex 6 of 13 = the lane straight DOWN, i.e. under the idol
      if (t % 46 === 8) aimedFan(g, e.x, e.y + 16, 3 + Math.min(rep, 2), 0.5, 3.0 * k);          // its own modest gun; the braziers carry the rest (L7)
      if (t === 150) lanceVolley(g, e.x + 22, e.y + 12, 4, 3.2 * Math.min(k, 1.5));              // …a second lance off the idol's flank port, so the pair reads as two sources
      if (rep >= 3 && t === 200) arcWall(g, e.x, e.y + 12, 13 + rep, 1.9, 1.6 * k, 2, 1);        // timeout-rider tax: the wall that does NOT open under it — the invitation closes
    }
  } else if (phase === 1) {
    // ---- FORM 2 — THE DEMON (aimed; the stage-3 + stage-2 quotation) ----------
    // The idol tears itself off the altar. It HUNTS your column at 1.5 px/f —
    // deliberately slower than the ship (3.7), so it is escapable but never
    // ignorable, and standing still is the one thing that fails. A censer swings
    // under it on a chain (STAGE 2's pendulum: a fan thrown along the chain's
    // radial at the swing's ENDS only, so the arcs claim the flanks and the
    // column under the body stays the aimed fire's). It lobs STAGE 3's eggs
    // outward — the pattern you dodge is not the one that was fired.
    const tx = latched ? pickSafeX(e) : clamp(g.player.x, 52, W - 52);
    e.x += clamp(tx - e.x, -1.5, 1.5);
    e.y += clamp(104 - e.y, -0.6, 0.6);
    // the censer: deterministic, drawn by the renderer as a bob on a dotted chain
    const th = Math.sin(e.fireT * (2 * PI / 200)) * 0.95, L = 78;
    e.bobX = e.x + Math.sin(th) * L; e.bobY = e.y + Math.cos(th) * L;
    if (mayFire(g, e)) {
      if (t % 74 === 10) { // STAGE 3's eggs, lobbed outward — early in the cycle for the same [T1] reason as form 1's lance
        eggFan(g, e.x - 10, e.y + 14, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 + 0.60, 110);
        eggFan(g, e.x + 10, e.y + 14, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 - 0.60, 110);
      }
      if (t % 32 === 0 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5, 0.9, 2.1 * k, th + PI / 2); // STAGE 2's pendulum arcs, off the swing's ends
      if (t % 50 === 16) ledFan(g, e.x, e.y + 14, 4 + Math.min(rep, 3), 0.6, 3.2 * k, vLead);    // the AIMED form: led + direct in one fan, so neither stillness nor drift answers it
      if (rep >= 3 && t % 74 === 48) eggFan(g, e.x, e.y + 14, 3, 0.9, 1.35 * k, PI / 2, 95);     // timeout-rider tax: eggs down the middle
    }
  } else if (phase === 2) {
    // ---- FORM 3 — THE PRIESTESS'S MIRROR (the player-shaped form) -------------
    // The story beat, told as a pattern. The body is ship-shaped and it moves to
    // the MIRROR of your column — W − player.x — at 3.7 px/f, which is the
    // ship's exact speed. You cannot outrun it and you cannot lose it: your own
    // movement draws it. Its gun is Ship B "PRIESTESS"'s grammar (parked branch
    // design/ship-b, NOT merged — this is hand-written here, not imported):
    // a three-way spread, fired DOWN. And it mirrors FOCUS too — when YOU are
    // barely moving the spread tightens and speeds up, exactly as the ship's
    // focus does (read off the governor's own player-x ema, so nothing new is
    // computed and a stutterer cannot fake it).
    // r85: SAMPLE → TRAVEL → PLANT (MIRROR_DWELL above). `holdT` carries the
    // sampled column and `sweepOff` the plant clock — both are free on this form
    // (stage.js only uses holdT as the P2 rail dwell and re-solves sweepOff at
    // every handoff, and advanceIdolPhase clears them entering form 4).
    // The centre line is the fixed point of the mirror: stand at W/2 and it
    // stands on top of you. That is the form's own invitation, and its trap.
    if (e.fireT <= 1) { e.sweepOff = 0; e.holdT = clamp(W - g.player.x, 52, W - 52); }
    if (e.sweepOff > 0) { if (--e.sweepOff === 0) e.holdT = clamp(W - g.player.x, 52, W - 52); } // the plant ends → a fresh sample
    else if (Math.abs(e.holdT - e.x) < 2) e.sweepOff = MIRROR_DWELL;                             // arrived → PLANT (the window)
    const tx = latched ? pickSafeX(e) : e.holdT;
    const step = clamp(tx - e.x, -3.7, 3.7); // 3.7 px/f = PLAYER.speed exactly
    e.x += step;
    e.y += clamp(112 - e.y, -0.7, 0.7); // it fights low, in the pipeline's strong band, like a player would
    const focused = Math.abs(g.player.x - e.pxEma) < 1.0 && !parked; // the mirror of focus mode: YOU are barely moving
    if (mayFire(g, e)) {
      if (focused) { if (t % 16 === 0) staticFan(g, e.x, e.y + 14, 3, 0.10, 3.4 * k, PI / 2); }  // FOCUS: the tight, fast three-way
      else if (t % 22 === 0) staticFan(g, e.x, e.y + 14, 3, 0.50, 2.7 * k, PI / 2);              // SPREAD: the wide, slower three-way
      if (t % 90 === 45) staticFan(g, e.x, e.y + 14, 3, 0.90, 2.3 * k, PI / 2);                  // the off-beat wide spread: the mirror never gives you a clean lane for a whole cycle
      if (rep >= 3 && t % 80 === 40) ring(g, e.x, e.y, 14, 1.6 * k, g.rng.range(0, 0.3));        // timeout-rider tax: the bomb turned on you
    }
  } else {
    // ---- FORM 4 — THE HOLLOW CORE (the medley; nothing new, S3b-5) ------------
    // Bare core on the house banded sweep + the ±22 px breathing bob — the same
    // desperation grammar all four earlier bosses end on. Every beat here is a
    // QUOTATION: the bare-core ring (every boss's), form 1's lance (stage 1),
    // form 2's censer arcs (stage 2) and eggs (stage 3), form 3's three-way
    // spread (the mirror), and stage 4's box trap through `quoteS4`. Nothing in
    // this form is invented (rubric S3b-5).
    //
    // r85 — THE CYCLE IS A CALL AND RESPONSE (wiki Q36, S3 MUST "no pattern
    // requires reading > 2 focal points"). r83 hung the quotes on co-prime
    // moduli (`t%34` arcs against `t%62` eggs) and they collided every few
    // cycles — 4 frames apart at the worst crossing, which is two positional
    // patterns arriving as one unreadable event. The 240 f cycle is now split:
    //   t 0-117   THE CENSER HALF — the swinging bob's arcs (positional), plus
    //             the core's own ring. Two sources, and one of them is the bob.
    //   t 118-239 THE QUOTED HALF — one quote at a time out of the core, each
    //             ≥ 22 f from its neighbours: lance (132) → eggs (158) →
    //             mirror spread (190) → the box-trap pen (216).
    // So the medley is heard in sequence, and no instant ever asks the player to
    // read the censer AND two core patterns at once. Re-timing only: not one
    // hp, speed or count moved (T3).
    bandedSweep(e, latched, 0.005);
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    const th = Math.sin(e.fireT * (2 * PI / 190)) * 0.9, L = 68;
    e.bobX = e.x + Math.sin(th) * L; e.bobY = e.y + Math.cos(th) * L;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // the bare-core beat (the firework)
      if (t < 118 && t % 34 === 8 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5, 0.9, 2.1 * k, th + PI / 2); // form 2 / STAGE 2 — the censer half
      if (t === 132) lanceVolley(g, e.x, e.y + 12, 5, 3.3 * Math.min(k, 1.5));                   // form 1 / STAGE 1
      if (t === 158) { eggFan(g, e.x - 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 + 0.55, 95); eggFan(g, e.x + 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 - 0.55, 95); } // form 2 / STAGE 3
      if (t === 190) staticFan(g, e.x, e.y + 12, 3, 0.50, 2.7 * k, PI / 2);                       // form 3 / the mirror's spread
      if (t === 216) quoteS4(g, e, k, rep);                                                       // STAGE 4's box trap, one sized-down pen (see quoteS4)
      if (rep >= 3 && (t === 62 || t === 174)) ring(g, e.x, e.y, 16, 1.5, g.rng.range(0, 0.3));   // timeout-rider tax, one ring per half
    }
  }
  bossTimeout(g, e, spawnIdolParts);
}

// The Idol's parts (type 6): slaved to the form, each hosting one of the form's
// emitters, so killing one measurably reduces that form's output (as every
// earlier boss's do — Q17 "parts bite back" is open and applies here unchanged).
function updateIdolPart(g, e) {
  g.emitter = e;
  const boss = findType(g, 5);
  if (!boss || boss.phase !== e.phase) { e.dead = 1; return; }
  e.x = boss.x + IDOL_GEO[e.phase][0] * e.side; e.y = boss.y + IDOL_GEO[e.phase][1];
  e.fireT++;
  if (!mayFire(g, e)) return;
  if (e.phase === 0) { if (e.fireT % 80 === (e.side < 0 ? 26 : 66)) aimedFan(g, e.x, e.y + 8, 3, 0.45, 3.0); }  // VOTIVE BRAZIERS: form 1's aimed pressure lives here — kill both and the idol is lances and walls only (L7)
  else if (e.phase === 1) { if (e.fireT % 70 === 40) spray(g, e.x, e.y + 8, 7, 0.6, 2.0, 3.0); }                 // THE HORN: the aimed form's only bounded spray, asymmetric on purpose
  else if (e.phase === 2) { if (e.fireT % 84 === (e.side < 0 ? 20 : 62)) aimedFan(g, e.x, e.y + 8, 2, 0.2, 3.3); } // OPTION PODS: the ship's own wing guns, in cyan, turned on the player
  else { if (e.fireT % 100 === (e.side < 0 ? 30 : 80)) aimedFan(g, e.x, e.y + 8, 2, 0.2, 3.3); }                 // RELAYS: needle pairs, exactly as every bare-core form's
}

// r83: the four-form handoff. `advanceBossPhase` grew two optional arguments so
// this is a call, not a copy (plan §6: "new bosses are modules sharing the r6
// ritual code"). One extra beat before it: form 4 rides the banded sweep, whose
// geometry lives in holdT (centre offset) and vy (amplitude) — stage.js resets
// those only when the INCOMING form is 1, so the incoming form 4 resets them
// here, and stage.js's continuity solve then runs against the real geometry.
// (r85: form 3 also uses holdT, as its re-target sample — this reset clears it.)
function advanceIdolPhase(g, e, killed, fade) {
  if (e.phase + 1 === 3) { e.holdT = 0; e.vy = 100; }
  return advanceBossPhase(g, e, killed, fade, spawnIdolParts, IDOL_HP, 3);
}

// --- the returning midbosses (r85) ---------------------------------------------
// Both guards 1 and 3 are type 4 — the shared midboss slot, which is what buys
// them `killEnemy`'s midboss release (the speed-gated 100/bullet cancel wall +
// the 8 × 800 shower + the gate opening), `mayFire`'s "a midboss is never
// sealed" (r19) and the 8,000 payout, all inherited rather than re-implemented.
// `e.role` carries the OWNER's level, so this hook hands the body straight back
// to the module that designed it (s2.js's Hearse, s4.js's Gatekeeper) and the
// renderer picks the matching painter off the same field.
function guard(g, e) { (e.role === 3 ? s4 : s2).enemyUpdate[4](g, e); }

export const enemyUpdate = {
  // the returning bodies, run by their OWN stage's code (never a copy):
  4: guard,                                    // THE HEARSE (role 1) / THE GATEKEEPER (role 3)
  10: (g, e) => s2.enemyUpdate[10](g, e),      // the Hearse's chained anchor
  13: (g, e) => s3.enemyUpdate[13](g, e),      // a Twin Moth, alone (it enrages at once — see the timeline)
  14: (g, e) => s4.enemyUpdate[14](g, e),      // the Warden, front plate and late-kill rush intact
  16: (g, e) => s4.enemyUpdate[16](g, e),      // the Gatekeeper's lock
  11: (g, e) => s3.enemyUpdate[11](g, e),      // the formation leader
  12: (g, e) => s3.enemyUpdate[12](g, e),      // the carrier
  0: (g, e) => s3.enemyUpdate[0](g, e),        // formation followers take stage 3's branch; every other popcorn falls through to the shared updateEnemy
  // …and this stage's own boss parts:
  6: updateIdolPart,
};
export const boss = {
  update: updateIdol,
  advance: advanceIdolPhase,
  phases: 4, // r83: the first boss in the game that is not three (Psikyo#6 chains four)
};

// --- timeline ------------------------------------------------------------
// Sections (each ≤ 1 rep — the finale quotes, it does not drill): the altar
// stair → the altar → THE HEARSE → A MOTH → THE GATEKEEPER (three gates, back to
// back) → release → WARNING → THE IDOL.
// Flow (WS05 / Jacob's standing Q21 point / [BH101 §Level design]): the approach
// holds ONE strong body at a time — the Warden arrives alone at 420 and the
// carrier alone at 1020, 600 stageT apart, and no gauntlet guard ever shares the
// field with either (even a Warden nobody killed spends its late-kill rush walking
// into the bottom band and despawns ~270 stageT before the first gate). Popcorn comes from one
// side at a time, alternating; risers climb ONE lane edge; every entry sits at a
// LANE (x 56 / 60 / W−56 / W−60), never the screen edge; no vertical stacks.
export function buildTimeline() {
  const { tl, at, zakoGroup, crossers, risersOneSide, tankFile, vFile } = makeKit();

  // S1 THE ALTAR STAIR — the approach opens with the two quotes that ask for
  // ROUTING: stage 3's formation (one file, one leader, one window) and stage
  // 4's Warden (one body, one counter). One rep each, and the Warden is alone in
  // its beat with traffic only, exactly as stage 4 introduced it [WS05].
  vFile(120, -1, 6, 1);                                          // STAGE 3's formation file, from the left lane
  crossers(300, 1, 5, 60);                                       // traffic from the other side
  at(420, (g) => spawnEnemy(g, 14, 96, -18, { side: -1 }));      // STAGE 4's WARDEN — the approach's one elite
  zakoGroup(640, 1, 5);                                          // popcorn from the right while it creeps

  // S2 THE ALTAR — the two quotes that ask for SEALING and PRIORITY: stage 2's
  // tank column (ground guns silenced by going to them) and stage 3's carrier
  // (a mid that makes more popcorn, and whose death is the just-in-time cancel).
  // No `flank` on the tank file: stage 5 is deliberately independent of the r81
  // stage-2 Lab knobs, so this column has one shape under any setting (kit.js).
  tankFile(780, 1, 4, { spd: 0.1 });                             // STAGE 2's tank column, a staircase from the right
  crossers(900, -1, 5, 88);                                      // traffic from the left, over it
  at(1020, (g) => { const c = spawnEnemy(g, 12, W - 96, -16, { side: 1 }); if (c) c.holdT = 100; }); // STAGE 3's carrier, alone in its beat
  risersOneSide(1160, 3, -1);                                    // from behind, ONE lane edge (Q21 addendum)
  zakoGroup(1260, 1, 5, { diver: true });                        // …and the other side next, never both at once
  risersOneSide(1300, 3, 1);                                     // the second riser wave, the OTHER lane edge
  crossers(1470, -1, 4, 60);                                     // the last traffic: crossers leave the field horizontally, so the first gate opens clean

  // --- THE RETURNING-MIDBOSS GAUNTLET (S3-S5) ---------------------------------
  // Three gates, 60 stageT apart. Each guard is ONE FORM on the ELITE tier
  // (GUARD_HP 220 — zero new tiers) and each kill fires the shared type-4 /
  // type-13 release in game.js killEnemy: the speed-gated cancel wall (100 per
  // bullet in-window, 30 late) plus the 8 × 800 shower — the field goes to gold
  // three times in twenty-odd seconds (WS05 release; S5 MUST wants one after
  // each peak, and here each peak is a kill). "No breather after it dies" [T2]
  // is honoured per KILL, not across the chain: the next gate is ~0.3 s later.
  // Precedent for the chain itself: BRDA#3's miniboss chains and ZeroRanger's
  // boss-rush stage (HOMAGE_STUDY).
  //
  // GUARD 1 — THE HEARSE (stage 2's midboss, role 1). It hangs its anchor and
  // crawls the rail toward your column exactly as it does on THE BONE RAIL; at
  // 220 hp it crosses its own phase-B threshold (< 45 % of the type-4 row) about
  // a second in, so what returns is the Hearse's DESPERATION form — rings, the
  // bounded spray and the swinging anchor — with the anchor drop as its tell.
  // One form, as the plan asks, and it is the form the player learned last.
  at(1570, (g) => {
    g.gate = 'midboss';
    const h = spawnEnemy(g, 4, W / 2, -20, { role: 1 });
    if (h && !g.tune.midbossHp) h.hp = h.prevHp = GUARD_HP; // the Booth's midbossHp knob still wins, as it does on stage 2
  });

  // GUARD 2 — A TWIN MOTH, ALONE (stage 3's midboss, one body of the pair). The
  // pair is rubric S5's single sanctioned exception and it is NOT spent twice:
  // one Moth arrives, finds no twin, and ENRAGES on its fifth parked frame —
  // stage 3's own bereaved state, which fires BOTH slots out of one body (that
  // is the pair's whole sentence, which is exactly what a gauntlet form should
  // be). Its ARRIVAL CURTAIN cannot fire, because the curtain is gated on "not
  // yet enraged": the finale gets the Moth's pressure without an 8 s curtain,
  // which also keeps HOMAGE's "true curtains only at midboss and boss finale,
  // 5-10 s" guardrail spent where it already was. 220 hp is the row's own value,
  // so nothing is re-stamped here.
  at(1630, (g) => {
    g.gate = 'midboss';
    const m = spawnEnemy(g, 13, W / 2, -22, { side: -1 });
    if (m) m.holdT = 0;
  });

  // GUARD 3 — THE GATEKEEPER (stage 4's midboss, role 3). The bars fall and the
  // arms step to bracket your column exactly as they do at THE BLOOD GATE, and
  // its LOCK is spawned by its own code, so the Psikyo M8 transformation is
  // still on the table: the "one form" the plan asks for is the form the STAGE
  // gives it, and the second one stays the PLAYER's trade to make (break the
  // lock: the area denial ends and the pressure goes up). At 220 hp the trade
  // now has to be taken inside ~6 s, which is the finale's compression doing
  // the work rather than a new number.
  at(1690, (g) => {
    g.gate = 'midboss';
    const k = spawnEnemy(g, 4, W / 2, -20, { role: 3 });
    if (k && !g.tune.midbossHp) k.hp = k.prevHp = GUARD_HP;
  });

  // S6 RELEASE — loot over the sigil disc, the boss's approach landmark, ending
  // empty (L2 + BRDA#9). Items stay garnish-priced (S6). Same wall and the same
  // 14 × 150 shower stages 2, 3 and 4 all release with — the finale invents no
  // new reward either.
  at(1750, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 40 + i * 17, -10 - (i % 3) * 16, 150);
  });

  // WARNING ritual (r6 S3b): scoreless sweep + cancel, ≥ 1 s over an empty field
  at(1880, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning';
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12);
  });

  // S7 THE IDOL — gate until the run resolves. The spawn overrides
  // ENEMY_DEFS[5].hp (390) with the finale's own table (IDOL_HP[0] = 220): the
  // opening form is SHORT. g.tune.bossHp (the r70 Booth knob, open Q16) still
  // applies, exactly as it does through spawnEnemy for every other boss.
  at(1950, (g) => {
    g.gate = 'boss';
    const b = spawnEnemy(g, 5, W / 2, -27);
    if (b) { b.hp = b.prevHp = g.tune.bossHp ? Math.round(IDOL_HP[0] * g.tune.bossHp) : IDOL_HP[0]; }
  });

  // --- LOOP 2 WOULD BEGIN HERE (r85 hook; NOT BUILT) --------------------------
  // Decided for r85: loop 2 is UNCONDITIONAL, as Psikyo's is — there is no seal,
  // no clear-condition, nothing to earn (the 2026-08-29 "loop-2 seal" idea in
  // plan §3 was a judgment call, and this is the call). It is simply not built
  // yet: when THE IDOL's last form goes down, `advanceBossPhase` sets
  // g.bossDown, the tally reads g.level as the last stage and ends the run in
  // 'clear', and the shell shows this stage's receipt, then the CAMPAIGN receipt
  // (src/results.js), then the existing end-of-run path (initials → the board →
  // the title). Loop 2 (plan §7 step 7) is one branch at that seam: instead of
  // 'clear', restart the run at level 0 with the stock intact and a loop counter
  // on g, and add revenge dots (HOMAGE L8) — the same five stages, nothing
  // authored twice. Nothing in this module needs to change for it; the branch
  // belongs in game.js's tally next to the 'clear' line.
  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, enemyUpdate, buildTimeline };
