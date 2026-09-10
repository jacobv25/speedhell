// Stage 3 — THE CANDLE SEA (r82; plan docs/plans/campaign-five-stages.md §3).
// The set-piece climax and the campaign's density peak. Its one new niche is
// FORMATIONS: popcorn files with a LEADER (kill it inside its window and the
// file scatters; miss the window and the file TURNS and streams at you), and
// CARRIER mids that release popcorn on a metronome and whose deaths are the
// stage's just-in-time cancel (WS05's cancel theme). Its midboss is the TWIN
// MOTHS — two elite-tier bodies at once, entering staggered by ≥ 1 beat
// (Psikyo M7), mirroring each other, and each one's death ENRAGING the other
// (behaviour, never hp). Its boss is THE MOTH QUEEN, three forms, with a
// boss-only dialect of EGGS THAT HATCH EMITTERS (WS03 #5).
// Everything shared lives elsewhere: ../stage.js keeps ENEMY_DEFS (rows 11–13
// appended, zero new hp tiers), mayFire's r18 gates, the camp governor and the
// r6 boss beats; ./kit.js keeps the timeline grammar (vFile is this stage's
// addition); game.js keeps the two consequences a stage cannot own (a leader's
// death telling its file, a Moth pair holding the gate).
// Music: reuses the stage and boss tracks for now (a stage-3 cue is a later pass).
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, W, H } from '../game.js';
import { MIDBOSS_TIMEOUT, mayFire, fleeTelegraph, campGovernor, bossEntrance, bossBurn, bandedSweep, bossTimeout, pickSafeX, advanceBossPhase, updateEnemy } from '../stage.js';
import { aimedFan, ring, arcWall, spray, ledFan, staticFan, eggFan } from '../patterns.js';
import { makeKit } from './kit.js';

export const id = 3;
export const name = 'THE CANDLE SEA';

// Section table (index 0 = FULL RUN). The WARNING beat sits inside S6, as on
// both earlier stages; S7 is the gate. Seven sections, ≤ 2 reps each (plan §4).
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 120, label: 'S1 FORMATION DRILL', name: 'S1 formation drill' },
  { t: 800, label: 'S2 CARRIER PAIR', name: 'S2 carrier pair' },
  { t: 1500, label: 'S3 THE VIGIL', name: 'S3 the vigil — just-in-time cancels' },
  { t: 2200, label: 'S4 TWIN MOTHS', name: 'S4 midboss — the Twin Moths' },
  { t: 2260, label: 'S5 SWARM RUSH', name: 'S5 swarm rush' },
  { t: 2880, label: 'S6 RELEASE', name: 'S6 release' },
  { t: 3090, label: 'S7 THE MOTH QUEEN', name: 'S7 boss — the Moth Queen' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

const PI = Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const findType = (g, type) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === type && !o.dead) return o; } return null; };
const findTwin = (g, e) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o !== e && o.type === 13 && !o.dead) return o; } return null; };
const findLeader = (g, gid) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === 11 && o.sweepOff === gid && !o.dead) return o; } return null; };
const markFile = (g, gid, state) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === 0 && o.holdT >= 3 && o.sweepOff === gid && !o.dead && !o.bloomed) o.bloomed = state; } };

// --- THE NICHE: formations ------------------------------------------------------
// A FILE is one type-11 leader plus n type-0 followers (holdT 3, or 4 for the
// every-third one that shoots) sharing a group id in `sweepOff` (kit.js vFile).
// Follower states live in `bloomed`: 0 in formation · 1 scattered · 2 streaming.
// The file flies ONE straight diagonal while it is a formation — no steering, no
// rng — so a novice who waits a full second after the spawn before moving is
// never hit by the file itself (boghog's novice test [T1]); the first prong any
// follower fires is at age 70 (≈ 1.2 s), and only from the shooter third.

function follower(g, e) {
  if (e.bloomed === 0 && !findLeader(g, e.sweepOff)) e.bloomed = 2; // the leader is gone and nobody told us: the file turns (a leader that flew off the screen)
  if (e.bloomed === 1) {          // SCATTERED — the reward for a speed-killed leader: the
    // file breaks up and leaves. It is SAFETY that is paid, not points: each of
    // these still pays only its own binary speed-kill (Pillar 2, no group payout).
    e.vx = clamp(e.vx + e.side * 0.05, -2.4, 2.4);
    e.x += e.vx; e.y += e.vy;
    return;
  }
  if (e.bloomed === 2) {          // STREAMING — the price of missing the window: the file
    // turns onto your column and dives, which is what makes a player stream side
    // to side [WS05 "popcorn forces streaming"]. Capped steering (the r19 diver's
    // clamp) so a wall-hugger cannot drag the file off-screen (s5_edges).
    const tx = clamp(g.player.x, 37, W - 37);
    e.vx = clamp(e.vx + (tx - e.x) * 0.0026, -1.5, 1.5);
    e.vy = Math.min(e.vy + 0.02, 2.3);
    e.x += e.vx; e.y += e.vy;
    if (e.holdT === 4 && e.age === 130 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.45, 2.7); // the turn bites
    return;
  }
  e.x += e.vx; e.y += e.vy;       // IN FORMATION — dead straight, in lockstep
  if (e.holdT === 4 && e.age === 70 && mayFire(g, e)) aimedFan(g, e.x, e.y + 6, 3, 0.45, 2.7);
}

// The LEADER (type 11, turret class — 24 hp is the lowest tier that still makes
// picking it out a DECISION you can fail; at popcorn hp any stray shot would
// decapitate every file for free [WS04 "lowest hp that still fulfils the role"]).
// It flies at the head of its file's diagonal. The window (150 f) is the whole
// mechanic: kill it inside and the file scatters (game.js killEnemy); let the
// window expire and the leader itself TURNS onto your column and takes the file
// with it — the miss is announced by the file's own motion, so a death here
// teaches (S5 MUST "a game-over teaches"). Pink fire: turret class is outside
// NEEDLE_TIER, so a file never speaks the special tier's cyan (S2/§6.3).
function leader(g, e) {
  if (e.phase === 0 && e.vulnAt >= 0 && g.frame - e.vulnAt > e.window) { e.phase = 1; markFile(g, e.sweepOff, 2); }
  if (e.phase === 1) {            // the turn: it leads the stream it just started
    const tx = clamp(g.player.x, 40, W - 40);
    e.vx = clamp(e.vx + (tx - e.x) * 0.0022, -1.6, 1.6);
    e.vy = Math.min(e.vy + 0.015, 2.1);
  }
  e.x += e.vx; e.y += e.vy;
  if (e.x < 20 && e.vx < 0.6) e.vx += 0.2; else if (e.x > W - 20 && e.vx > -0.6) e.vx -= 0.2; // soft wall (s5_edges)
  if (!mayFire(g, e)) return;
  if (e.age === 70) aimedFan(g, e.x, e.y + 7, 3, 0.5, 2.6);
  else if (e.age > 70 && e.age % 90 === 20) aimedFan(g, e.x, e.y + 7, e.phase ? 4 : 3, e.phase ? 0.7 : 0.5, 2.6); // the turned leader fires wider
}

// The CARRIER (type 12, mid class). Its niche job is a metronome: it parks and
// releases a POD of two popcorn every 110 f (musical layering [T1]; the plan's
// midsize metronome, Psikyo#5), escalating to every 70 f if it is left alive
// (S4 dynamic lifecycle) — and then it EXITS, so nothing here respawns for ever
// (S6 no milking). Its own gun is one cyan aimed fan: it is in the special tier,
// so a needle in this stage still means "a real gun has you" (§6.3). Sealed by
// proximity like every non-boss enemy (r18 canon): flying to the carrier is how
// you silence it, and its death is the stage's cancel button (game.js killEnemy:
// garnish rate either way, the speed kill buys REACH).
// Fields: holdT = the hold line, sweepOff = pods released, phase 1 = committed exit.
function carrier(g, e) {
  if (e.phase === 1) { e.vy -= 0.05; e.y += e.vy; e.x += e.side * 0.4; return; } // committed exit (the mid's rule: never re-descends)
  if (e.y < e.holdT) { e.y += 1.5; if (e.age === 46 && mayFire(g, e)) aimedFan(g, e.x, e.y + 8, 3, 0.4, 2.9); return; }
  e.fireT++;
  const hot = e.fireT > 380; // left alive: the metronome doubles and it starts hosing
  const every = hot ? 70 : 110;
  if (e.fireT % every === 30 && e.sweepOff < 8) { // the POD: two popcorn, spread outward — deterministic, no rng
    e.sweepOff++;
    for (const s of [-1, 1]) {
      const z = spawnEnemy(g, 0, e.x + s * 15, e.y + 10, { vx: s * 0.55, vy: 1.5, side: s, holdT: s > 0 ? 1 : 0 });
      if (z) z.phase = 0;
    }
  }
  if (mayFire(g, e)) {
    if (e.fireT % 95 === 40) aimedFan(g, e.x, e.y + 10, 3, 0.45, 3.0);
    if (hot && e.fireT % 60 === 15) spray(g, e.x, e.y + 10, 8, 1.0, 1.7, 2.8);
  }
  if (e.fireT > 620) e.phase = 1; // it leaves before the next strong thing arrives (no dragged bullet sources, S4 outro)
}

// --- THE TWIN MOTHS (midboss; type 13 ×2, elite-tier bodies) --------------------
// Rubric S5's ONE sanctioned exception (Jacob, 2026-09-10, pending his commit in
// docs/CRITIC_RUBRIC.md): a designed midboss PAIR entering staggered by ≥ 1 beat,
// once per campaign. The stagger is geometric and needs no second timeline event
// (the gate freezes the timeline): the right Moth holds above the top edge for
// STAGGER frames before it descends, so the pair arrives one beat apart and the
// sequence still suggests the route [WS05 / BH101 §Level design].
// Why 220 each and not the midboss tier split in half: 220 IS an existing tier
// (the elite row, verbatim); 400/2 = 200 would be a NEW number, and the plan
// forbids new tiers. 440 total is 10 % over the Hearse, and the expert kills the
// Hearse in 7.7–10.9 s — the pair fits the 35 s MIDBOSS_TIMEOUT with room.
// They MIRROR: both read one shared clock (g.frame) and sit at W/2 ± the same
// offset, so their halves are exact reflections. Their fans alternate by half a
// beat, so the player never reads two aimed patterns on the same frame (S3 MUST
// "no pattern requires reading > 2 focal points"). Killing one ENRAGES the other
// (bloomed 1): it stops mirroring, hunts your column, and fires BOTH slots — the
// pair's whole sentence out of one body. Behaviour, never hp.
// Each Moth is sealed by proximity like any elite (r18 canon, no new gate): you
// can silence ONE by hugging it — and the mirror is exactly what covers the spot
// you have to stand in to do it. That is the pair's point.
const MOTH_Y = 84, STAGGER = 95;
function moth(g, e) {
  if (e.phase === 0) {                                  // staggered arrival
    if (e.holdT > 0) { e.holdT--; return; }              // the right Moth waits one beat above the edge
    if (e.y < MOTH_Y) { e.y += 1.15; return; }
    e.phase = 1; e.fireT = 0;
  }
  e.fireT++;
  const twin = e.bloomed ? null : findTwin(g, e); // (no closure per frame — rubric S8's zero-allocation rule)
  if (!e.bloomed && !twin && e.fireT > 4) { // the twin is down: ENRAGE (announced the frame it flips, r14 grammar)
    e.bloomed = 1; e.fireT = 1;
    if (mayFire(g, e)) ring(g, e.x, e.y, 18, 1.7, 0.12);
  }
  // movement: mirrored patrol off a SHARED clock while both live; a hunt once enraged
  if (!e.bloomed) {
    const tx = W / 2 + e.side * (58 + Math.sin(g.frame * 0.011) * 34);
    e.x += clamp(tx - e.x, -1.9, 1.9);
    e.y += clamp(MOTH_Y - e.y, -0.5, 0.5);
  } else {
    const tx = clamp(g.player.x, 56, W - 56);
    e.x += clamp(tx - e.x, -1.8, 1.8);
    e.y += clamp(96 - e.y, -0.5, 0.5);
  }
  // THE CURTAIN ACCENT (HOMAGE guardrail: true curtains only at midboss and boss
  // finale, 5–10 s). The left Moth throws it once on arrival — three slow laned
  // sheets 26 f apart from the shrine's height, ~8 s to cross the field, two
  // lanes open per sheet and the lanes MOVE between sheets. It is dense but
  // slow: density low, lethality positional. This is what the carriers you kept
  // alive are for (the just-in-time cancel, WS05's theme; L2).
  if (e.side < 0 && !e.bloomed && (e.fireT === 8 || e.fireT === 34 || e.fireT === 60)) {
    const step = (e.fireT / 26) | 0; // 0 / 1 / 2
    arcWall(g, W / 2, 34, 17, 3.0, 0.80 + step * 0.07, 4 + step * 4, 2);
  }
  if (mayFire(g, e)) {
    const half = e.side < 0 ? 0 : 48;                    // the pair speaks in turn, never together
    if (e.fireT % 96 === 20 + half) aimedFan(g, e.x, e.y + 12, 4, 0.5, 3.1);
    if (e.fireT % 168 === 70 + half) arcWall(g, e.x, e.y + 10, 11, 1.6, 1.55, e.side < 0 ? 8 : 2, 1); // gap biased toward the CENTRE: the lane between the pair is real (and it is the point-blank lane)
    if (e.bloomed) {                                     // enraged: the dead twin's slots too, plus a desperation layer
      if (e.fireT % 96 === 20 + (48 - half)) aimedFan(g, e.x, e.y + 12, 4, 0.5, 3.1);
      if (e.fireT % 168 === 70 + (48 - half)) arcWall(g, e.x, e.y + 10, 11, 1.6, 1.55, e.side < 0 ? 2 : 8, 1);
      if (e.fireT % 80 === 40) spray(g, e.x, e.y + 12, 6, 0.9, 2.0, 3.0);
      if (e.fireT > 900 && e.fireT % 130 === 15) ring(g, e.x, e.y, 16, 1.6, 0.07); // leave-alive tax
    }
  }
  // the mirrored ESCORT: a crosser pair from ONE side every 170 f, alternating
  // (Jacob's Q21 addendum — never both far edges at once). Thrown by the LEFT
  // Moth only while both live, so the pair never doubles the escort.
  if ((e.side < 0 || e.bloomed) && e.fireT % 170 === 90) {
    const k = ((e.fireT / 170) | 0) % 2, sx = k ? W - 16 : 16, vx = k ? -1.7 : 1.7, side = k ? 1 : -1;
    const a = spawnEnemy(g, 0, sx, 38, { vx, vy: 0.3, side, holdT: 1 });
    const b = spawnEnemy(g, 0, sx, 54, { vx, vy: 0.3, side, holdT: 0 });
    if (a) a.phase = 2; if (b) b.phase = 2;
  }
  if (e.vulnAt >= 0 && g.frame - e.vulnAt > MIDBOSS_TIMEOUT) { // flees, no score; the gate waits for the LAST Moth (the pair holds it)
    e.dead = 1; g.stats.timeouts++; g.stats.timeoutLog.push('midboss');
    fleeTelegraph(g, e);
    if (!twin) g.gate = null;
  }
}

// --- THE MOTH QUEEN (boss, three FORMS on the r6 ritual) ------------------------
// Dialect (L6, WS03 #5 "projectiles that spawn emitters"): EGGS THAT HATCH.
// An egg is an ordinary pink round carrying a fuse (patterns.js eggFan); it
// drifts, PULSES over its last 30 f (the renderer's telegraph — the S2 warning
// rule) and bursts into a fixed 6-round ring where it sits (game.js). The
// pattern you dodge is therefore not the one that was fired: you dodge where the
// eggs will be. Nothing in any stage section fires an egg (S3b-6).
//   P1 COCOON      — hangs almost still and lobs eggs OUTWARD, so the column
//                    under it is the point-blank invitation; two silk-anchor
//                    parts carry all of its aimed pressure (L7).
//   P2 THE MOTH    — the imago: hard rail-to-rail strafing (faster than the ship),
//                    led aimed fans, and it DROPS eggs along its path — the
//                    dialect distorted by a moving emitter. One wing node (56 hp).
//   P3 EMBER CORE  — bare core on the banded sweep + bob; the desperation medley
//                    recombines only what came before (rings, eggs, led fans).
// hp per form = the shared BOSS_PHASE_HP (390 / 402 / 405, the r71 3×); timeout
// BOSS_PHASE_TIMEOUT 35 s; the escalation clock k exactly as boss 1's (§5.2b).
const QUEEN_GEO = [[36, 8], [40, -2], [38, -4]];
function spawnQueenParts(g, boss) {
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + QUEEN_GEO[boss.phase][0] * s, boss.y + QUEEN_GEO[boss.phase][1], { side: s });
    if (p) { p.phase = boss.phase; p.armorUntil = boss.armorUntil; if (boss.phase === 1) p.hp = 56; }
  }
}
function updateQueen(g, e) {
  g.emitter = e;
  const phase = e.phase, rep = e.fireT / 240 | 0;
  const k = Math.min(1 + rep * 0.08 + Math.max(0, rep - 3) * 0.22, 2.2);
  if (bossEntrance(g, e, spawnQueenParts)) return;
  bossBurn(g, e);
  const { latched, parked, vLead } = campGovernor(g, e);
  e.fireT++;
  const t = e.fireT % 240;
  if (phase === 0) {          // P1 — THE COCOON
    const tx = latched ? pickSafeX(e) : W / 2 + Math.sin(e.fireT * 0.0035) * 30;
    e.x += clamp(tx - e.x, -0.9, 0.9);
    e.y += clamp(92 - e.y, -0.5, 0.5);
    if (mayFire(g, e)) {
      if (t % 70 === 0) { // the dialect: eggs lobbed OUTWARD (the column under the cocoon stays open — the point-blank invitation)
        eggFan(g, e.x - 10, e.y + 16, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 + 0.62, 110);
        eggFan(g, e.x + 10, e.y + 16, 2 + Math.min(rep, 2), 0.5, 1.15 * k, PI / 2 - 0.62, 110);
      }
      if (t % 84 === 40) aimedFan(g, e.x, e.y + 16, 3 + Math.min(rep, 2), 0.5, 3.0 * k); // the cocoon's own modest gun; the anchors carry the rest (L7)
      if (rep >= 3 && t % 70 === 35) eggFan(g, e.x, e.y + 16, 3, 0.9, 1.35 * k, PI / 2, 95); // timeout-rider tax: eggs down the middle, closing the invitation
    }
  } else if (phase === 1) {   // P2 — THE MOTH (hard strafing)
    const railX = latched ? pickSafeX(e) : W / 2 + e.side * 98;
    let landed = false;
    if (Math.abs(e.x - railX) > 3) { e.x += Math.sign(railX - e.x) * 4.0; e.sweepOff = 1; }
    else {
      if (e.sweepOff === 1) { e.sweepOff = 0; landed = true; }
      if (--e.holdT <= 0) {
        const far = g.player.x < W / 2 ? 1 : -1;
        e.side = (far === e.side && !(parked || latched)) ? -e.side : far;
        e.holdT = 150;
      }
    }
    e.y += clamp(108 - e.y, -0.7, 0.7);
    if (mayFire(g, e)) {
      if (t % 44 === 14) ledFan(g, e.x, e.y + 14, 4 + Math.min(rep, 4), 0.6, 3.2 * k, vLead); // aimed + led: neither standing still nor drifting answers it
      if (t % 60 === 30) eggFan(g, e.x, e.y + 14, 1, 0, 1.0, PI / 2, 150);                    // it lays a slow egg wherever it is — the path becomes a minefield (moving emitter × hatching)
      if (landed) { staticFan(g, e.x - 26, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 + 0.55); staticFan(g, e.x + 26, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 - 0.55); } // wing-beat on landing: outward, so under it is the safe spot, re-earned every step (L7)
      if (rep >= 3 && t % 48 === 24) ring(g, e.x, e.y, 12, 1.5 * k, 0.31);                    // timeout-rider tax
    }
  } else {                    // P3 — THE EMBER CORE (medley)
    bandedSweep(e, latched, 0.005);
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // the bare-core beat
      if (t % 70 === 10) { eggFan(g, e.x - 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 + 0.55, 95); eggFan(g, e.x + 10, e.y + 12, 2, 0.5, 1.25 * k, PI / 2 - 0.55, 95); } // P1's eggs…
      if (t % 52 === 26) ledFan(g, e.x, e.y + 12, 4, 0.6, 3.1 * k, vLead);                    // …and P2's led fans. Nothing new (S3b MUST).
      if (rep >= 3 && (t === 110 || t === 200)) ring(g, e.x, e.y, 14, 1.5, g.rng.range(0, 0.3)); // timeout-rider tax
    }
  }
  bossTimeout(g, e, spawnQueenParts);
}
// The Queen's parts (type 6): slaved to the form, each hosting an emitter, so
// killing one measurably reduces the form's output (as stage 1's do — Q17 open).
function updateQueenPart(g, e) {
  g.emitter = e;
  const boss = findType(g, 5);
  if (!boss || boss.phase !== e.phase) { e.dead = 1; return; }
  e.x = boss.x + QUEEN_GEO[e.phase][0] * e.side; e.y = boss.y + QUEEN_GEO[e.phase][1];
  e.fireT++;
  if (!mayFire(g, e)) return;
  if (e.phase === 0) { if (e.fireT % 76 === (e.side < 0 ? 24 : 62)) aimedFan(g, e.x, e.y + 8, 3, 0.45, 3.0); }   // silk anchor: P1's aimed pressure lives here
  else if (e.phase === 1) { if (e.fireT % 70 === 40) spray(g, e.x, e.y + 8, 7, 0.6, 2.0, 3.0); }                  // wing node: the strafing form's only spray
  else { if (e.fireT % 100 === (e.side < 0 ? 30 : 80)) aimedFan(g, e.x, e.y + 8, 2, 0.2, 3.3); }                  // relays: needle pairs
}

// Stage-owned per-type updates (r80 module contract). Type 0 is DELEGATED: only
// a formation follower (holdT ≥ 3) takes this stage's branch; every other
// popcorn — crossers, divers, risers, carrier pods — runs the shared updateEnemy
// exactly as it does on stages 1 and 2.
export const enemyUpdate = {
  0: (g, e) => { if (e.holdT >= 3) { g.emitter = e; follower(g, e); } else updateEnemy(g, e); },
  11: (g, e) => { g.emitter = e; leader(g, e); },
  12: (g, e) => { g.emitter = e; carrier(g, e); },
  13: (g, e) => { g.emitter = e; moth(g, e); },
  6: updateQueenPart,
};
export const boss = {
  update: updateQueen,
  advance: (g, e, killed, fade) => advanceBossPhase(g, e, killed, fade, spawnQueenParts),
  phases: 3,
};

// --- timeline ------------------------------------------------------------
// Sections (≤ 2 reps each, escalating): formation drill → carrier pair → the
// vigil (the just-in-time-cancel run-up) → TWIN MOTHS (gate) → swarm rush →
// release → WARNING → THE MOTH QUEEN.
// Flow (WS05 / Q21 / BH101 §Level design): one strong thing at a time — the
// carriers never overlap each other, and no file shares a frame with a carrier's
// arrival; files come from ONE side at a time, sequenced by ≥ 90 f; entries sit
// at x 56 / W−56, never the screen edge.
export function buildTimeline() {
  const { tl, at, zakoGroup, crossers, risersOneSide, vFile } = makeKit();

  // S1 FORMATION DRILL — the niche introduced bare, and the drill IS the lesson:
  // one file, then the mirrored double-V. rep 1: a single V from the left, with
  // nothing else on screen — you have the whole file to yourself and the leader
  // is the only decision. rep 2 (the twist, ≤ 2 reps): two files, mirrored, ONE
  // BEAT APART, so the route is still obvious [WS05 "spawn them one by one with
  // slight delays"] — and now there are two leaders and two windows.
  vFile(120, -1, 6, 1);
  crossers(400, 1, 4, 60);
  vFile(560, 1, 6, 2);
  vFile(660, -1, 6, 3, { vx: 1.15 });

  // S2 CARRIER PAIR — the second half of the niche: a mid whose job is to make
  // more popcorn. Two of them, one at a time (never two strong things at once —
  // the S5 MUST the Moths are the campaign's ONE exception to), each with a
  // file over it so the pods are never the only thing to shoot.
  at(800, (g) => { const c = spawnEnemy(g, 12, W / 2 - 62, -16, { side: -1 }); if (c) c.holdT = 92; });
  vFile(940, 1, 5, 4);
  zakoGroup(1060, -1, 5);
  at(1180, (g) => { const c = spawnEnemy(g, 12, W / 2 + 62, -16, { side: 1 }); if (c) c.holdT = 104; });
  vFile(1320, -1, 6, 5, { vx: 1.2 });

  // S3 THE VIGIL — the just-in-time-cancel theme (WS05). Two carriers arrive
  // LATE and near the shrine, so a player who speed-kills everything on sight
  // walks into the Moths' curtain with nothing to cancel it — and a player who
  // leaves one alive walks in with a pod-spitting mid on the screen. That is the
  // conflict of goals a scoring system is made of [WS06 / BH101 §Scoring], and
  // it is priced entirely in existing garnish (the cancel wall), never in math.
  at(1500, (g) => { const c = spawnEnemy(g, 12, 96, -16, { side: -1 }); if (c) c.holdT = 100; });
  vFile(1620, 1, 6, 6);
  crossers(1760, -1, 5, 60);
  at(1860, (g) => { const c = spawnEnemy(g, 12, W - 96, -16, { side: 1 }); if (c) c.holdT = 112; });
  vFile(1980, -1, 5, 7, { vx: 1.2 });
  zakoGroup(2080, 1, 5, { diver: true });

  // S4 THE TWIN MOTHS — gate. Both spawn on this one frame (the gate freezes the
  // timeline); the right Moth holds one beat above the edge, so the pair enters
  // staggered (Psikyo M7). The left one throws the curtain on arrival.
  at(2200, (g) => {
    g.gate = 'midboss';
    const a = spawnEnemy(g, 13, W / 2 - 74, -22, { side: -1 });
    const b = spawnEnemy(g, 13, W / 2 + 74, -22, { side: 1 });
    if (a) a.holdT = 0;
    if (b) b.holdT = STAGGER;
  });

  // S5 SWARM RUSH — the density peak of the campaign and the S8 stress scene.
  // Files from alternating sides on a tightening clock, a carrier as the
  // metronome, risers up ONE lane edge at a time, divers to close. Still one
  // strong thing at a time: the carrier is alone in its beat.
  vFile(2260, -1, 7, 8, { vx: 1.25, vy: 1.6 });
  crossers(2310, 1, 5, 60);
  vFile(2350, 1, 7, 9, { vx: 1.25, vy: 1.6 });
  risersOneSide(2410, 3, 1);
  vFile(2440, -1, 7, 10, { vx: 1.3, vy: 1.7, out: 14 });
  at(2470, (g) => { const c = spawnEnemy(g, 12, W / 2, -16, { side: 1 }); if (c) c.holdT = 86; });
  vFile(2530, 1, 7, 11, { vx: 1.3, vy: 1.7, out: 14, hot: 1 });
  zakoGroup(2580, -1, 8, { diver: true, spd: 0.2 });
  vFile(2600, -1, 8, 12, { vx: 1.35, vy: 1.75, out: 13, hot: 1 });
  crossers(2640, 1, 5, 88);
  risersOneSide(2660, 3, -1);
  vFile(2700, 1, 8, 13, { vx: 1.35, vy: 1.8, out: 13, hot: 1 });

  // S6 RELEASE — loot over the cocoon, ending empty (L2 + BRDA#9). Items stay
  // garnish-priced (S6).
  at(2880, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 40 + i * 17, -10 - (i % 3) * 16, 150);
  });

  // WARNING ritual (r6 S3b): scoreless sweep + cancel, ≥ 1 s over an empty field
  at(3020, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning';
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12);
  });

  // S7 THE MOTH QUEEN — gate until the run resolves
  at(3090, (g) => { g.gate = 'boss'; spawnEnemy(g, 5, W / 2, -27); });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, enemyUpdate, buildTimeline };
