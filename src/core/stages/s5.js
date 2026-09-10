// Stage 5 — THE GREAT ALTAR (r83 SKELETON; plan docs/plans/campaign-five-stages.md §3).
//
// WHAT THIS FILE IS TODAY: the FINAL BOSS ONLY. Plan §7 step 4 builds stage 5's
// boss BEFORE stage 4, because the finale is a MEDLEY — it has to quote every
// stage's dialect, so the shape of the medley must be agreed before stage 4's
// dialect is designed (stage 4 is then written knowing it will be quoted).
// So there is no place ramp, no approach, no returning-midboss gauntlet and no
// loop-2 seal here yet, and `STAGES` is still `[s1, s2, s3]` — this module is
// NOT registered. It is reachable two ways, both documented in wiki §16:
//   · `node tools/probes/idol-probe.mjs` (pushes it onto STAGES at runtime), and
//   · `index.html?boss=idol` → PRACTICE row (main.js, dev flag, off by default).
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
//   4 THE HOLLOW CORE — bare core, firework desperation. Rings plus every
//                    earlier dialect recombined and NOTHING NEW (rubric S3b-5),
//                    including the `quoteS4` hook that stage 4 will fill.
// The boss-only dialect is the MEDLEY ITSELF (S3b-6): no stage section anywhere
// in the campaign speaks four dialects in one body.
//
// hp: a single named table, IDOL_HP below (forms 1-2 short at the ELITE tier,
// forms 3-4 full at the boss tiers) — zero new hp tiers (plan §4 rule 3).
// Everything shared lives elsewhere: ../stage.js keeps ENEMY_DEFS, mayFire's
// r18 gates, the camp governor, the r6 boss beats and the escalation clock;
// ../patterns.js keeps every emitter (this stage adds none — the finale quotes).
// Music: reuses the boss track for now (a stage-5 cue is a later pass).
import { sfx, SFX, spawnEnemy, W } from '../game.js';
import { mayFire, campGovernor, bossEntrance, bossBurn, bandedSweep, bossTimeout, pickSafeX, advanceBossPhase } from '../stage.js';
import { aimedFan, ring, arcWall, spray, ledFan, staticFan, eggFan, lanceVolley } from '../patterns.js';

export const id = 5;
export const name = 'THE GREAT ALTAR';

// Section table (index 0 = FULL RUN). SKELETON: the approach (the altar stair),
// the returning-midboss gauntlet and the release are plan §3 items still to be
// built, so the timeline is the boss ritual and nothing else. The WARNING beat
// sits inside S1 exactly as it sits inside the last section on stages 1-3.
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 130, label: 'S1 THE IDOL', name: 'S1 boss — the Idol (skeleton: no approach, no gauntlet yet)' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

const PI = Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const findType = (g, type) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === type && !o.dead) return o; } return null; };

// --- THE HP BUDGET (Jacob's open choice — wiki §16, option A vs option B) ------
// Psikyo clock (plan §4 rule 1): the boss is 30-50 % of a 1'30"-2'15" stage, so
// the finale's target is ≤ 65 s for the expert. FOUR forms at the 3× boss tiers
// (390 / 402 / 405 / 405 = 1602 hp) do not fit that; three already sit at 1197.
// OPTION A — SHIPPED HERE (default): forms 1-2 run SHORT on an EXISTING tier
// (elite 220, the Twin Moths' row verbatim) and forms 3-4 run full length at the
// boss tiers. 220 + 220 + 402 + 405 = 1247, only 4 % over a three-form boss, and
// zero new hp numbers enter the game (plan §4 rule 3 / CLAUDE.md "no new tiers").
// OPTION B — the plan's alternative, NOT built: give the finale its own
// multiplier (e.g. 0.78 × the r71 tiers on all four forms ≈ 304/314/316/316).
// It reads better on paper — four EQUAL forms — but every one of those numbers
// is a NEW hp tier, which needs Jacob's explicit override of a standing rule.
// The measured comparison is in wiki §16; this table is the one knob either way.
// [0] is used at SPAWN (the timeline overrides ENEMY_DEFS[5].hp, which is 390);
// [1..3] are read by advanceIdolPhase on each handoff.
export const IDOL_HP = [220, 220, 402, 405];

// Part geometry per form: [dx, dy] off the boss centre, outside its r=30
// collision circle horizontally so every part is hittable from below (the
// PART_GEO rule in stage.js). Existing part rows only: hp 24, except form 2's
// single node at 56 — both are tiers that already exist.
const IDOL_GEO = [[36, 8], [38, -2], [34, 4], [38, -4]];
function spawnIdolParts(g, boss) {
  // Form 2 is the asymmetric one (ONE node at +38, hp 56) — the same shape
  // stages 1, 2 and 3 all give their strafing/aimed form (L7, on purpose).
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + IDOL_GEO[boss.phase][0] * s, boss.y + IDOL_GEO[boss.phase][1], { side: s });
    if (p) { p.phase = boss.phase; p.armorUntil = boss.armorUntil; if (boss.phase === 1) p.hp = p.prevHp = 56; }
  }
}

// --- THE STAGE-4 HOOK (r83 placeholder — plan §7 step 4's whole point) ---------
// Stage 4 (THE BLOOD GATE) does not exist yet. Its boss dialect is already
// specified in plan §3: the BOX TRAP (WS03 #7) — six emitters pen the player,
// then the pen MOVES. Rubric S3b-5 says the finale recombines earlier material
// and introduces nothing new, so form 4 must quote the box; the call site
// therefore exists NOW, on a fixed beat of form 4's cycle, and does nothing.
//
// HOW STAGE 4 FILLS IT (the contract, so nobody has to re-derive it):
//   1. stage 4's boss builds the box with a `boxTrap(...)` emitter in
//      ../patterns.js (six static sources penning a rectangle, then translated);
//   2. import it here and make this function fire ONE pen, sized down for a
//      finale quote (the medley quotes, it does not re-run the whole set piece);
//   3. keep it inside form 4's ≤ 3 bullet families — the box is pink rounds, so
//      the medley's count does not change;
//   4. it draws no rng today. Whatever stage 4 puts here WILL move the rng
//      stream for any run that reaches form 4, so expect a referee recert
//      (CLAUDE.md: recerts are Jacob-authorized commits, never a builder's).
// Until then: legible by absence. Form 4 is a complete fight without it.
function quoteS4(g, e, k, rep) {
  void g; void e; void k; void rep; // r83 placeholder — stage 4's box trap goes here
}

// --- THE IDOL -----------------------------------------------------------------
// Ritual as stages 1-3's, by construction: WARNING ≥ 1 s over an emptied field,
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
    const tx = latched ? pickSafeX(e) : W / 2 + Math.sin(e.fireT * 0.003) * 18;
    e.x += clamp(tx - e.x, -0.5, 0.5);
    e.y += clamp(90 - e.y, -0.5, 0.5);
    if (mayFire(g, e)) {
      // r83 placeholder — tune in stage-5 pass
      // [T1] "if HP must be short, use the intro-speed trick so the SHAPE is
      // instantly on screen": at 220 hp this form can be over in ~2 s, so its
      // quoted dialect fires EARLY in the cycle (t 24, not boss 1's t 70) —
      // a short form must still get its sentence out, or it is a cutscene with
      // a health bar (MSX: "orange juice into water").
      if (t === 24) lanceVolley(g, e.x, e.y + 16, 5 + Math.min(rep, 2), 3.3 * Math.min(k, 1.5)); // STAGE 1's boss-only dialect, moved to the front of the cycle
      if (t === 150) lanceVolley(g, e.x + 22, e.y + 12, 4, 3.2 * Math.min(k, 1.5));              // …thrown off the idol's flank port, so the pair reads as two sources
      if (t % 46 === 8) aimedFan(g, e.x, e.y + 16, 3 + Math.min(rep, 2), 0.5, 3.0 * k);          // its own modest gun; the braziers carry the rest (L7)
      if (t === 76) arcWall(g, e.x, e.y + 12, 13 + rep, 1.9, 1.6 * k, 6, 2);                     // THE POINT-BLANK INVITATION: gapIndex 6 of 13 = the lane straight DOWN, i.e. under the idol
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
      // r83 placeholder — tune in stage-5 pass
      if (t % 32 === 0 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5, 0.9, 2.1 * k, th + PI / 2); // STAGE 2's pendulum arcs
      if (t % 74 === 10) { // STAGE 3's eggs, lobbed outward — early in the cycle for the same [T1] reason as form 1's lance
        eggFan(g, e.x - 10, e.y + 14, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 + 0.60, 110);
        eggFan(g, e.x + 10, e.y + 14, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 - 0.60, 110);
      }
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
    // a three-way spread, fired DOWN. And it mirrors FOCUS too — when the
    // mirror is barely moving (i.e. when YOU are barely moving) the spread
    // tightens and speeds up, exactly as the ship's focus does.
    // The centre line is the fixed point of the mirror: stand at W/2 and it
    // stands on top of you. That is the form's own invitation, and its trap.
    const tx = latched ? pickSafeX(e) : clamp(W - g.player.x, 52, W - 52);
    const step = clamp(tx - e.x, -3.7, 3.7); // 3.7 px/f = PLAYER.speed exactly
    e.x += step;
    e.y += clamp(112 - e.y, -0.7, 0.7); // it fights low, in the pipeline's strong band, like a player would
    const focused = Math.abs(step) < 1.2 && !parked; // the mirror of focus mode
    if (mayFire(g, e)) {
      // r83 placeholder — tune in stage-5 pass
      if (focused) { if (t % 16 === 0) staticFan(g, e.x, e.y + 14, 3, 0.10, 3.4 * k, PI / 2); }  // FOCUS: the tight, fast three-way
      else if (t % 22 === 0) staticFan(g, e.x, e.y + 14, 3, 0.50, 2.7 * k, PI / 2);              // SPREAD: the wide, slower three-way
      if (t % 90 === 45) staticFan(g, e.x, e.y + 14, 3, 0.90, 2.3 * k, PI / 2);                  // the off-beat wide spread: the mirror never gives you a clean lane for a whole cycle
      if (rep >= 3 && t % 80 === 40) ring(g, e.x, e.y, 14, 1.6 * k, g.rng.range(0, 0.3));        // timeout-rider tax: the bomb turned on you
    }
  } else {
    // ---- FORM 4 — THE HOLLOW CORE (the medley; nothing new, S3b-5) ------------
    // Bare core on the house banded sweep + the ±22 px breathing bob — the same
    // desperation grammar all three earlier bosses end on. Every beat here is a
    // QUOTATION: the bare-core ring (every boss's), form 1's lance (stage 1),
    // form 2's censer arcs (stage 2) and eggs (stage 3), form 3's three-way
    // spread (the mirror), and the empty `quoteS4` slot that stage 4's box trap
    // will fill. Nothing in this form is invented (rubric S3b-5).
    bandedSweep(e, latched, 0.005);
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    const th = Math.sin(e.fireT * (2 * PI / 190)) * 0.9, L = 68;
    e.bobX = e.x + Math.sin(th) * L; e.bobY = e.y + Math.cos(th) * L;
    if (mayFire(g, e)) {
      // r83 placeholder — tune in stage-5 pass
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // the bare-core beat (the firework)
      if (t === 70) lanceVolley(g, e.x, e.y + 12, 5, 3.3 * Math.min(k, 1.5));                    // form 1 / STAGE 1
      if (t % 34 === 8 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5, 0.9, 2.1 * k, th + PI / 2); // form 2 / STAGE 2
      if (t % 62 === 30) { eggFan(g, e.x - 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 + 0.55, 95); eggFan(g, e.x + 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 - 0.55, 95); } // form 2 / STAGE 3
      if (t === 130) staticFan(g, e.x, e.y + 12, 3, 0.50, 2.7 * k, PI / 2);                      // form 3 / the mirror's spread
      if (t === 155) quoteS4(g, e, k, rep);                                                      // form 4's STAGE 4 slot — empty until THE BLOOD GATE exists (see quoteS4 above)
      if (rep >= 3 && (t === 110 || t === 200)) ring(g, e.x, e.y, 16, 1.5, g.rng.range(0, 0.3)); // timeout-rider tax
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
  // r83 placeholder — tune in stage-5 pass
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
function advanceIdolPhase(g, e, killed, fade) {
  if (e.phase + 1 === 3) { e.holdT = 0; e.vy = 100; }
  return advanceBossPhase(g, e, killed, fade, spawnIdolParts, IDOL_HP, 3);
}

export const enemyUpdate = { 6: updateIdolPart };
export const boss = {
  update: updateIdol,
  advance: advanceIdolPhase,
  phases: 4, // r83: the first boss in the game that is not three (Psikyo#6 chains four)
};

// --- timeline ------------------------------------------------------------
// SKELETON (plan §7 step 4). Stage 5's own content — the altar stair, the
// compressed "best of" approach, the returning-midboss gauntlet (Hearse → Twin
// Moths → Gatekeeper) and the release — is a LATER pass, and stage 4 has to
// exist first (the Gatekeeper is its midboss). What is here is the boss ritual
// and only the boss ritual: an empty field, the WARNING, the Idol.
// The caravan pull (game.js) fast-forwards the empty opening, so the WARNING
// lands within ~2 s of the run's start.
export function buildTimeline() {
  const tl = [];
  const at = (t, fn) => tl.push({ t, fn });

  // WARNING ritual (r6 S3b): scoreless sweep + cancel, ≥ 1 s over an empty field.
  // Identical to stages 1-3's beat, 70 f ahead of the boss spawn.
  at(60, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning';
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12);
  });

  // S1 THE IDOL — gate until the run resolves. The spawn overrides
  // ENEMY_DEFS[5].hp (390) with the finale's own table (IDOL_HP[0] = 220): the
  // opening form is SHORT. g.tune.bossHp (the r70 Lab knob, open Q16) still
  // applies, exactly as it does through spawnEnemy for every other boss.
  at(130, (g) => {
    g.gate = 'boss';
    const b = spawnEnemy(g, 5, W / 2, -27);
    if (b) { b.hp = b.prevHp = g.tune.bossHp ? Math.round(IDOL_HP[0] * g.tune.bossHp) : IDOL_HP[0]; }
  });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, enemyUpdate, buildTimeline };
