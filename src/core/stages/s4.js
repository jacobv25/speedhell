// Stage 4 — THE BLOOD GATE (r84; plan docs/plans/campaign-five-stages.md §3).
// THE STRICT STAGE. Its one new niche is THREATS FROM BEHIND AND FROM THE
// FLANKS, in three pieces:
//   · WALL PODS (type 15, turret class) bolted to the corridor's flanks, firing
//     ACROSS the lane — so the pattern is the corridor's geometry, not an aim
//     solution [WS03 area denial]. Sealed by proximity like every ground gun
//     (r18 canon): going to the wall silences it, and the ship flies over them,
//     so going there is safe [WS04 "approaching safely must not be
//     disproportionately dangerous"]. Stage 2's lesson, restated as geometry.
//   · RISERS as a SECTION THEME, not a garnish — [T2] "escalate behaviour across
//     the game, not counts: ships from the bottom later". Stage 1 spends four of
//     them twice; here they open in S1's second rep and carry the whole
//     back-attack rush.
//   · THE WARDEN (type 14, elite class), a FRONT-ARMOURED elite: no damage from
//     below at range. Flank it (half rate, from safety) or close on it (full
//     rate, inside its fire) — [WS03] "a range of responses with pros and cons"
//     and [T3] "balance = counters, not numbers". The rule lives in game.js
//     (FRONT_ARMOR) as a DAMAGE rule; the r18 fire gates are untouched. Its
//     late-kill state is WS04's third choice — it RUSHES, "possibly more
//     dangerous" — and the rush walks it into the range where the plate stops
//     working, so ignoring it is punished and the punishment is the opening.
// Midboss: THE GATEKEEPER (type 4 through `enemyUpdate`, as stage 2's Hearse) —
// it closes lanes with BARS that move, and TRANSFORMS when its lock part dies
// (Psikyo M8: a behaviour and body change, never hp).
// Boss: THE GATE (type 5, three forms) with the campaign's box-trap dialect
// (WS03 #7), built as `boxTrap` in ../patterns.js and quoted once by stage 5's
// finale (`s5.js quoteS4` — wiki §16.2, Q39).
// Everything shared lives elsewhere: ../stage.js keeps ENEMY_DEFS (rows 14-16
// appended, zero new hp tiers), the wall pod's own case, mayFire's r18 gates,
// the camp governor and the r6 boss beats; ./kit.js keeps the timeline grammar
// (`podRun` is this stage's addition); game.js keeps the front-armour damage
// rule and the midboss release it already pays for every type-4 kill.
// Music: reuses the stage and boss tracks for now (a stage-4 cue is a later pass).
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, W, H } from '../game.js';
import { MIDBOSS_TIMEOUT, mayFire, fleeTelegraph, campGovernor, bossEntrance, bossBurn, bandedSweep, bossTimeout, pickSafeX, advanceBossPhase } from '../stage.js';
import { aimedFan, ring, arcWall, spray, ledFan, staticFan, boxTrap } from '../patterns.js';
import { makeKit } from './kit.js';

export const id = 4;
export const name = 'THE BLOOD GATE';

// Section table (index 0 = FULL RUN). Eight sections, ≤ 2 reps each (plan §4
// rule 2); the WARNING beat sits inside S7 as it does on every earlier stage.
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 120, label: 'S1 CORRIDOR RUN', name: 'S1 corridor run — wall pods' },
  { t: 900, label: 'S2 THE WARDEN', name: 'S2 the Warden (solo)' },
  { t: 1400, label: 'S3 THE COURT', name: 'S3 the inner court' },
  { t: 2100, label: 'S4 THE GATEKEEPER', name: 'S4 midboss — the Gatekeeper' },
  { t: 2160, label: 'S5 BACK ATTACK', name: 'S5 the back-attack rush' },
  { t: 2620, label: 'S6 WARDEN 2', name: 'S6 Warden 2 + wall pods' },
  { t: 3000, label: 'S7 RELEASE', name: 'S7 release' },
  { t: 3200, label: 'S8 THE GATE', name: 'S8 boss — the Gate' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

const PI = Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const findType = (g, type) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === type && !o.dead) return o; } return null; };

// --- THE WARDEN (type 14, elite-tier body) --------------------------------------
// The niche's checkmate piece. 220 hp — the elite row verbatim, zero new tiers —
// and the difficulty is NOT in the number: it is in where you have to stand.
// game.js's FRONT_ARMOR deflects any shot fired from more than 100 px below it
// while the ship is inside 16 px of its column, so the answers are:
//   FLANK  — 16-32 px off its column, where the inner gun clears the plate and
//            the outer one misses the body: half rate, from range, in safety.
//   CLOSE  — inside 100 px vertically, where the plate does not reach: full rate,
//            inside its fire; inside 48 px the r18 seal mutes it (the canon
//            point-blank reward) and the price is its contact circle.
// It CREEPS toward your column at 1.1 px/f — the ship does 3.7, so keeping a
// flank is a live, winnable chase and never a stat check [T3]. Do not read this
// as an hp fix: nothing here is heavier than the Twin Moths' body.
// LATE-KILL STATE [WS04's third choice, "rush the player, possibly more
// dangerous"]: when the 380 f window expires it announces the flip with a ring
// (r14 grammar), then ADVANCES and fires wide. It leaves through the bottom band
// (which mutes it, r18 gate 2) and despawns — nothing is dragged into the next
// section (S4 outro). `bloomed` 0 = holding, 1 = rushing.
const WARDEN_Y = 132;
function warden(g, e) {
  if (e.age === 70 && mayFire(g, e)) arcWall(g, e.x, e.y + 10, 11, 1.5, 1.7, 5, 1); // entry signature on the way down (the elite's r11 rule, verbatim): the pattern is FELT inside the speed-kill window
  // the late-kill flip is checked BEFORE the descent gate, so a Warden that is
  // still arriving when its window runs out still rushes (it cannot get stuck)
  if (!e.bloomed && e.vulnAt >= 0 && g.frame - e.vulnAt > e.window) {
    e.bloomed = 1; e.fireT = 0;
    if (mayFire(g, e)) ring(g, e.x, e.y, 18, 1.7, 0.09); // announced the frame it flips
  }
  if (!e.bloomed) {
    if (e.y < WARDEN_Y) { e.y += 1.15; return; }
    e.fireT++;
    // it keeps the plate on your column — slowly. This is the whole fight.
    const tx = clamp(g.player.x, 46, W - 46);
    e.x += clamp(tx - e.x, -1.1, 1.1);
    const rep = Math.min(e.phase + ((e.fireT / 210) | 0), 3); // phase seeds the rep: Warden 2 opens at rep 1 (the S1 elite-pair rule, r25)
    const cyc = e.fireT % 210;
    if (mayFire(g, e)) {
      if (cyc === 30) aimedFan(g, e.x, e.y + 12, 4 + rep, 0.55, 3.1);                 // cyan: it is in NEEDLE_TIER — a real gun has you
      if (cyc === 100) arcWall(g, e.x, e.y + 12, 11, 1.5, 1.6, 5, 1);                 // laned wall, gap under its own column: riding the lane IS closing (boss 1's P1 rule)
      if (rep >= 1 && cyc === 160) spray(g, e.x, e.y + 12, 7, 1.0, 1.8, 2.9);         // rep 1: the hose
      if (rep >= 2 && cyc === 65) ring(g, e.x, e.y, 14, 1.5, (e.fireT * 0.11) % 1);   // rep 2: the ring
      if (rep >= 3 && cyc === 135) arcWall(g, e.x, e.y + 12, 13, 1.5, 1.6, 5, 1);     // overstay tax (only a player who has already ignored the window sees it)
    }
    return;
  }
  // THE RUSH — it comes to you, and by coming it gives up the plate
  e.y += 0.6;
  e.fireT++;
  const tx = clamp(g.player.x, 40, W - 40);
  e.x += clamp(tx - e.x, -1.5, 1.5);
  if (mayFire(g, e)) {
    if (e.fireT % 70 === 20) aimedFan(g, e.x, e.y + 12, 7, 1.1, 3.2);   // WIDE (WS04 priority: wide cones are harder to control)
    if (e.fireT % 96 === 50) ring(g, e.x, e.y, 16, 1.6, 0.13);
    if (e.fireT % 44 === 12) spray(g, e.x, e.y + 12, 8, 1.2, 1.7, 2.9);
  }
}

// --- THE GATEKEEPER (midboss; type 4 through enemyUpdate) -----------------------
// A gate that CLOSES LANES. Three BARS — narrow, slow, near-vertical columns of
// pink rounds — fall from two arms and from the gate's own centre; the arms STEP
// (they do not swing: a bar is a fixture that relocates, which is what keeps it
// clear of stage 2's swinging-emitter dialect) to the stops that bracket your
// column, so the open lane between them narrows as you stand still and re-opens
// the moment you move. Area denial that MOVES [WS03], and the counter is
// footwork, not damage.
// THE LOCK (type 16, part class, 24 hp) sits at the gate's centre. It has NO gun:
// what it is, is the keystone. Break it and the gate TRANSFORMS (Psikyo M8, the
// M8 midboss's own transformation, homage/study-s1945ii.md:199-200) — the arms
// retract, the bars stop, and the body comes off its mounting to HUNT your
// column with aimed fire and rings on a much faster cycle. That is the trade:
// the area denial goes away and the pressure goes up (the shape of Q17's "parts
// bite back", applied to a midboss where it is not an open question but the
// design). The lock is guarded by the CENTRE bar — the price of reaching it is
// standing in the one lane that is always closed.
// Never sealed (mayFire exempts type 4, r19). Timeout = the shared
// MIDBOSS_TIMEOUT; the release on its death is game.js's type-4 rule, verbatim
// (speed-gated 100/bullet cancel + the 8 × 800 shower + the gate opens) — no
// breather after it dies [T2]: the back-attack rush starts at stageT 2160.
// Fields: bloomed = 0 arriving / 1 closed / 2 open, phase = the painter's body,
// sweepOff = dwell clock for the arm step, bobX / bobX2 = the arms.
const KEEPER_Y = 76, BAR_STOPS = [56, 104, 152, 200, 248];
function keeperArms(g, e) {
  // the two arms bracket the player's column: the left arm takes the highest
  // stop still left of the ship, the right arm the lowest still right of it, and
  // both travel at 1.6 px/f (a quarter of the ship's speed), so the lane closes
  // slowly enough to read and to leave [S3 lanes; S7 reaction floor].
  let li = 0, ri = BAR_STOPS.length - 1;
  for (let i = 0; i < BAR_STOPS.length; i++) if (BAR_STOPS[i] <= g.player.x) li = i;
  for (let i = BAR_STOPS.length - 1; i >= 0; i--) if (BAR_STOPS[i] >= g.player.x) ri = i;
  if (ri <= li) { li = Math.max(0, li - 1); ri = Math.min(BAR_STOPS.length - 1, li + 2); }
  e.bobX += clamp(BAR_STOPS[li] - e.bobX, -1.6, 1.6);
  e.bobX2 += clamp(BAR_STOPS[ri] - e.bobX2, -1.6, 1.6);
}
function gatekeeper(g, e) {
  g.emitter = e;
  if (e.y < KEEPER_Y) { e.y += 1.05; return; }
  e.fireT++;
  if (!e.bloomed) {                       // the first parked frame: the lock is set and the bars are hung
    e.bloomed = 1; e.bobX = e.x - 62; e.bobX2 = e.x + 62;
    const l = spawnEnemy(g, 16, e.x, e.y + 14, { side: 1 });
    if (l) l.armorUntil = g.frame + 30;   // the lock gets its entrance, like the Hearse's anchor
  } else if (e.bloomed === 1 && !findType(g, 16)) { // THE LOCK IS BROKEN → transform (Psikyo M8)
    e.bloomed = 2; e.phase = 1; e.fireT = 1;
    if (mayFire(g, e)) ring(g, e.x, e.y, 22, 1.7, 0.05); // the form change announces itself the frame it happens (r14 grammar)
  }
  if (e.bloomed === 1) {                  // ---- CLOSED: the gate holds its ground and closes lanes
    e.x += clamp(W / 2 + Math.sin(e.fireT * 0.004) * 34 - e.x, -0.7, 0.7); // a gate does not chase
    keeperArms(g, e);
    if (mayFire(g, e)) {
      // the BARS: narrow slow columns, 60 f apart, from the two arms and from the
      // centre. The centre bar is what guards the lock (see above).
      if (e.fireT > 60 && e.fireT % 120 === 0) staticFan(g, e.bobX, e.y + 14, 5, 0.22, 1.35, PI / 2);
      if (e.fireT > 60 && e.fireT % 120 === 60) staticFan(g, e.bobX2, e.y + 14, 5, 0.22, 1.35, PI / 2);
      if (e.fireT > 60 && e.fireT % 120 === 30) staticFan(g, e.x, e.y + 18, 5, 0.20, 1.5, PI / 2);
      if (e.fireT % 100 === 74) aimedFan(g, e.x, e.y + 16, 4, 0.5, 3.1);                                   // the gate's own gun (cyan — type 4 is in the tier)
      if (e.fireT > 700 && e.fireT % 96 === 20) spray(g, e.x, e.y + 16, 9, 1.1, 1.8, 3.0);                 // leave-alive hose: only slow play meets it
      if (e.fireT > 700 && e.fireT % 120 === 90) staticFan(g, (e.bobX + e.bobX2) / 2, e.y + 14, 5, 0.22, 1.5, PI / 2); // …and a fourth bar in the lane it was leaving open
    }
  } else {                                // ---- OPEN: it comes off the mounting and hunts
    const tx = clamp(g.player.x, 52, W - 52);
    e.x += clamp(tx - e.x, -2.4, 2.4);    // slower than the ship's 3.7: a pursuit you can win
    e.y += clamp(96 - e.y, -0.6, 0.6);
    e.bobX += clamp(e.x - 18 - e.bobX, -3, 3); e.bobX2 += clamp(e.x + 18 - e.bobX2, -3, 3); // the arms fold in
    if (mayFire(g, e)) {
      if (e.fireT % 70 === 20) aimedFan(g, e.x, e.y + 16, 5, 0.7, 3.2);
      if (e.fireT % 130 === 60) ring(g, e.x, e.y, 20, 1.6, (e.fireT * 0.13) % 1);
      if (e.fireT % 90 === 40) spray(g, e.x, e.y + 16, 7, 0.9, 1.9, 3.0);
      if (e.fireT > 620 && e.fireT % 60 === 15) aimedFan(g, e.x, e.y + 16, 7, 1.0, 3.3);                   // leave-alive: the hunt gets wide
    }
  }
  // escort: a crosser pair from ONE side every 150 f, alternating (Jacob's Q21
  // addendum — never both far edges at once). The gate freezes the timeline, so
  // without this the fight happens in a vacuum (the r19 finding).
  if (e.fireT % 150 === 60) {
    const k = ((e.fireT / 150) | 0) % 2, sx = k ? W - 16 : 16, vx = k ? -1.7 : 1.7, side = k ? 1 : -1;
    const a = spawnEnemy(g, 0, sx, 36, { vx, vy: 0.3, side, holdT: 1 });
    const b = spawnEnemy(g, 0, sx, 52, { vx, vy: 0.3, side, holdT: 0 });
    if (a) a.phase = 2; if (b) b.phase = 2;
  }
  if (e.vulnAt >= 0 && g.frame - e.vulnAt > MIDBOSS_TIMEOUT) { // flees, no score, gate opens (S6, T2)
    e.dead = 1; g.stats.timeouts++; g.stats.timeoutLog.push('midboss'); g.gate = null;
    fleeTelegraph(g, e);
  }
}
// The lock: slaved to the gate's centre, no gun, dies scorelessly with its owner.
function updateLock(g, e) {
  const k = findType(g, 4);
  if (!k) { e.dead = 1; return; }
  e.x = k.x; e.y = k.y + 14;
}

// --- THE GATE (boss, three forms sharing the r6 ritual) -------------------------
// Dialect (L6, WS03 #7): THE BOX TRAP — `boxTrap` (../patterns.js) lays six wall
// segments of pink rounds around the ship, omits one (the door), and gives every
// round the same drift and accel, so the pen translates as one body and then
// whips off the field. The pen is cast on a slow beat and the form's OWN aimed
// fire is what assaults you inside it — which is WS03 #7 verbatim ("then other
// patterns assault the box while it moves"). Nothing in any stage section casts
// a pen (S3b-6), and the only other place in the campaign it appears is stage
// 5's medley, as ONE sized-down quote (`s5.js quoteS4`; wiki Q39).
// Forms (Psikyo#6, transform not phase):
//   P1 THE GATE          — the arena's own gate: near-static, a ±34 px drift,
//                          two GATE PODS as its parts (they are the gate's guns,
//                          firing OUTWARD, so the column under the gate is the
//                          point-blank invitation, S3b SHOULD).
//   P2 WHAT WAS BEHIND IT— the thing the gate was holding shut: a fast strafer,
//                          rail to rail at 4.4 px/f (faster than the ship), led
//                          fans, and it throws the pen from wherever it is — the
//                          box distorted by a moving emitter. One node part (56).
//   P3 THE CORE          — bare core on the banded sweep + bob; the desperation
//                          medley recombines only what came before (S3b-5).
// hp = the shared BOSS_PHASE_HP (390 spawn / 402 / 405, the r71 3×); timeout
// BOSS_PHASE_TIMEOUT 35 s; the escalation clock k exactly as boss 1's (§5.2b).
const GATE_GEO = [[42, 6], [40, -2], [38, -4]];
function spawnGateParts(g, boss) {
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + GATE_GEO[boss.phase][0] * s, boss.y + GATE_GEO[boss.phase][1], { side: s });
    if (p) { p.phase = boss.phase; p.armorUntil = boss.armorUntil; if (boss.phase === 1) p.hp = p.prevHp = 56; }
  }
}
// One pen, centred EXACTLY on the ship and never clamped to the field. The clamp
// this function shipped with for one revision was a bug the peek pass caught:
// clamping the CENTRE while the walls stay hw from it puts a wall on top of a
// ship hugging an edge, which is a spawn-on-player death with one frame to move —
// rubric S7's "no unavoidable deaths", straight through. Uncentred is also the
// truer reading of WS03 #7 (the emitters pen THE PLAYER): the nearest wall is
// always exactly hw / hh away, and a ship at an edge simply gets a pen whose far
// wall falls off the field and is culled — hugging the wall buys you one open
// side and the screen edge does the penning instead. Nothing spawns on you.
// `dir` is the sweep direction; the DOOR is on the trailing side, so leaving the
// pen means giving up ground against the sweep [WS03 "dodge away = safe but no
// counter"], while the leading walls can be micro-dodged for position.
function pen(g, hw, hh, step, dir, k, rep) {
  const door = dir > 0 ? (rep & 1 ? 4 : 5) : (rep & 1 ? 1 : 2);
  boxTrap(g, g.player.x, g.player.y, hw, hh, step, dir * 0.34 * k, 0.12 * k, door, 0.010);
}
function updateGate(g, e) {
  g.emitter = e;
  const phase = e.phase, rep = e.fireT / 240 | 0;
  const k = Math.min(1 + rep * 0.08 + Math.max(0, rep - 3) * 0.22, 2.2);
  if (bossEntrance(g, e, spawnGateParts)) return;
  bossBurn(g, e);
  const { latched, parked, vLead } = campGovernor(g, e);
  e.fireT++;
  const t = e.fireT % 240;
  if (phase === 0) {          // P1 — THE GATE
    const tx = latched ? pickSafeX(e) : W / 2 + Math.sin(e.fireT * 0.0035) * 34;
    e.x += clamp(tx - e.x, -1.0, 1.0);
    e.y += clamp(88 - e.y, -0.5, 0.5);
    if (mayFire(g, e)) {
      if (t % 150 === 40) pen(g, 60, 48, 15, (t % 300 === 40) ? 1 : -1, k, rep);           // the dialect: one pen per 2.5 s, sweeping alternate ways
      if (t % 76 === 18) aimedFan(g, e.x, e.y + 16, 3 + Math.min(rep, 2), 0.5, 3.0 * k);   // the gate's own modest gun; the pods carry the rest (L7)
      if (t % 96 === 60) arcWall(g, e.x, e.y + 14, 11, 1.5, 1.55 * k, (e.x < W / 2 ? 2 : 8) + ((g.rng.next() * 3) | 0), 2); // a laned wall biased toward its own column
      if (rep >= 3 && t % 150 === 115) pen(g, 46, 38, 14, (t % 300 === 115) ? -1 : 1, k, rep + 1); // timeout-rider tax: a second, tighter pen
    }
  } else if (phase === 1) {   // P2 — WHAT WAS BEHIND IT (hard strafing)
    const railX = latched ? pickSafeX(e) : W / 2 + e.side * 100;
    let landed = false;
    if (Math.abs(e.x - railX) > 3) { e.x += Math.sign(railX - e.x) * 4.4; e.sweepOff = 1; }
    else {
      if (e.sweepOff === 1) { e.sweepOff = 0; landed = true; }
      if (--e.holdT <= 0) {
        const far = g.player.x < W / 2 ? 1 : -1;
        e.side = (far === e.side && !(parked || latched)) ? -e.side : far;
        e.holdT = 140;
      }
    }
    e.y += clamp(104 - e.y, -0.7, 0.7);
    if (mayFire(g, e)) {
      if (t % 46 === 16) ledFan(g, e.x, e.y + 14, 4 + Math.min(rep, 4), 0.6, 3.2 * k, vLead); // aimed AND led: neither standing still nor drifting answers it
      if (t % 160 === 70) pen(g, 56, 44, 16, e.side, k, rep);                                  // the pen thrown from a moving emitter: it sweeps the way the strafer is going
      if (landed) { staticFan(g, e.x - 26, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 + 0.55); staticFan(g, e.x + 26, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 - 0.55); } // landing sprays go OUTWARD: under it is clear, re-earned every step (L7)
      if (rep >= 3 && t % 52 === 26) ring(g, e.x, e.y, 12, 1.5 * k, 0.19);                     // timeout-rider tax
    }
  } else {                    // P3 — THE CORE (medley)
    bandedSweep(e, latched, 0.005);
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // the bare-core beat every boss ends on
      if (t % 170 === 60) pen(g, 52, 42, 15, (t % 340 === 60) ? 1 : -1, k, rep);                 // P1's pen…
      if (t % 54 === 28) ledFan(g, e.x, e.y + 12, 4, 0.6, 3.1 * k, vLead);                       // …and P2's led fans. Nothing new (S3b-5).
      if (t === 130 || t === 200) { staticFan(g, e.x - 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 + 0.55); staticFan(g, e.x + 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 - 0.55); } // P2's flank sprays
      if (rep >= 3 && (t === 105 || t === 195)) ring(g, e.x, e.y, 14, 1.5, g.rng.range(0, 0.3)); // timeout-rider tax
    }
  }
  bossTimeout(g, e, spawnGateParts);
}
// The Gate's parts (type 6): slaved to the form, each hosting an emitter, so
// killing one measurably reduces the form's output (as every earlier boss's do —
// Q17 "parts bite back" is open and applies here unchanged).
function updateGatePart(g, e) {
  g.emitter = e;
  const boss = findType(g, 5);
  if (!boss || boss.phase !== e.phase) { e.dead = 1; return; }
  e.x = boss.x + GATE_GEO[e.phase][0] * e.side; e.y = boss.y + GATE_GEO[e.phase][1];
  e.fireT++;
  if (!mayFire(g, e)) return;
  if (e.phase === 0) { if (e.fireT % 78 === (e.side < 0 ? 22 : 60)) staticFan(g, e.x, e.y + 8, 4, 0.7, 2.4, PI / 2 + e.side * 0.5); } // GATE PODS: they fire OUTWARD, so the column under the gate stays open — the point-blank invitation (S3b SHOULD)
  else if (e.phase === 1) { if (e.fireT % 70 === 40) spray(g, e.x, e.y + 8, 7, 0.6, 2.0, 3.0); }                                     // the node: the strafing form's only spray
  else { if (e.fireT % 100 === (e.side < 0 ? 30 : 80)) aimedFan(g, e.x, e.y + 8, 2, 0.2, 3.3); }                                      // relays: needle pairs, as every bare-core form's
}

export const enemyUpdate = {
  4: gatekeeper,
  16: updateLock,
  14: (g, e) => { g.emitter = e; warden(g, e); },
  6: updateGatePart,
};
export const boss = {
  update: updateGate,
  advance: (g, e, killed, fade) => advanceBossPhase(g, e, killed, fade, spawnGateParts),
  phases: 3,
};

// --- timeline ------------------------------------------------------------
// Sections (≤ 2 reps each, escalating): corridor run → the Warden (solo) → the
// inner court → THE GATEKEEPER (gate) → the back-attack rush → Warden 2 + wall
// pods → release → WARNING → THE GATE.
// Flow (WS05 / Jacob's standing Q21 point / [BH101 §Level design]): never two
// STRONG bodies arriving together — the two Wardens are 1,720 stageT apart and
// there is never a Warden on screen with the midboss or the boss; popcorn comes
// from one side at a time; risers climb ONE lane edge at a time; wall pods
// alternate flanks and are staggered by ≥ 62 f, so no vertical stack and no two
// far edges firing on the same frame. What the court DOES overlap is high-hp
// LIFETIMES (mids + turrets + pods), which is WS05's "heavy overlap of high-hp
// enemies = tense, strict, play by my rules" — the paralysis rule is about
// simultaneous ARRIVAL of two high-priority bodies, and the mids here are
// sequenced ≥ 90 f apart.
export function buildTimeline() {
  const { tl, at, zakoGroup, crossers, risersOneSide, podRun } = makeKit();

  // S1 CORRIDOR RUN — the flank half of the niche introduced bare. rep 1: four
  // pods alternating walls with crossers over them, so the horizontal fire and
  // the horizontal traffic teach the same geometry. rep 2 (the twist): five pods
  // faster, and the first RISERS — the corridor is attacked from behind [T2].
  podRun(120, 4, -1);
  crossers(260, 1, 5, 60);
  zakoGroup(380, -1, 5);
  podRun(520, 5, 1);
  crossers(650, -1, 5, 88);
  risersOneSide(720, 3, 1);
  zakoGroup(790, 1, 6, { diver: true });

  // S2 THE WARDEN — solo, and nothing else strong on the screen: the counter has
  // to be learnable before it is combined [WS05 repetition legitimizes, T1
  // chunk-with-escalation]. Traffic only, so it is not fought in a vacuum (r19).
  at(900, (g) => spawnEnemy(g, 14, 96, -18, { side: -1 }));
  crossers(1010, 1, 4, 60);
  zakoGroup(1140, -1, 5);
  crossers(1250, -1, 4, 88);

  // S3 THE INNER COURT — the strict section: heavy overlap of HIGH-HP bodies
  // (mids, turrets, wall pods), each arriving alone but living into each other's
  // time, so the court is "play by my rules" [WS05] and the answer is kill order.
  const midAt = (t, x, side, hold) => at(t, (g) => spawnEnemy(g, 1, x, -12, { side, holdT: hold }));
  midAt(1400, 84, -1, 130);
  at(1470, (g) => { spawnEnemy(g, 2, 64, -16); spawnEnemy(g, 2, 137, -40); });
  podRun(1500, 2, -1);
  midAt(1560, W - 84, 1, 145);
  crossers(1630, 1, 5, 60);
  midAt(1720, W / 2, -1, 120);
  at(1790, (g) => { spawnEnemy(g, 2, W - 64, -16); spawnEnemy(g, 2, W - 137, -40); });
  podRun(1830, 2, 1);
  zakoGroup(1890, -1, 6, { diver: true });
  risersOneSide(1960, 3, -1);

  // S4 THE GATEKEEPER — gate; a fast kill means the rush starts at once (T2)
  at(2100, (g) => { g.gate = 'midboss'; spawnEnemy(g, 4, W / 2, -20); });

  // S5 BACK ATTACK — the stage's tension peak and the niche's other half at full
  // volume: risers from behind on alternating lane edges, divers over the top,
  // one mid as the metronome (Psikyo#5). Nothing from the flanks here — the pods
  // are S6's twist, and three sources at once would be clutter, not pressure.
  risersOneSide(2160, 4, -1);
  zakoGroup(2200, 1, 8, { diver: true, spd: 0.2 });
  risersOneSide(2270, 4, 1);
  crossers(2330, -1, 5, 60);
  risersOneSide(2380, 4, -1);
  zakoGroup(2420, -1, 8, { diver: true, spd: 0.3 });
  at(2480, (g) => spawnEnemy(g, 1, W / 2 + 46, -12, { side: 1, holdT: 128 }));
  risersOneSide(2530, 4, 1);

  // S6 WARDEN 2 + WALL PODS — the twist (≤ 2 reps): the counter you learned in
  // S2, now inside the corridor geometry, so flanking it means standing where
  // the pods shoot. Warden 2 opens at rep 1 (phase 1 — the r25 elite-pair fix).
  at(2620, (g) => { const w = spawnEnemy(g, 14, W - 96, -18, { side: 1 }); if (w) w.phase = 1; });
  podRun(2700, 5, -1, 58);
  crossers(2830, 1, 5, 88);
  risersOneSide(2890, 3, -1);

  // S7 RELEASE — short (plan §3: "release 2 at the gate, short"), loot over the
  // gate landmark, ending empty (L2 + BRDA#9). Items stay garnish-priced (S6).
  at(3000, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 40 + i * 17, -10 - (i % 3) * 16, 150);
  });

  // WARNING ritual (r6 S3b): scoreless sweep + cancel, ≥ 1 s over an empty field
  at(3130, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning';
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12);
  });

  // S8 THE GATE — gate until the run resolves
  at(3200, (g) => { g.gate = 'boss'; spawnEnemy(g, 5, W / 2, -27); });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, enemyUpdate, buildTimeline };
