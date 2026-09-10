// Stage 2 — THE BONE RAIL (r80; plan docs/plans/campaign-five-stages.md §3).
// The GROUND stage: rail tanks, destructible bone walls, an ossuary barge with
// a turret deck — all sealed by proximity (r18 canon), so the stage TEACHES
// sealing: the way to silence a ground gun is to go to it. The shared enemy
// machinery (ENEMY_DEFS 7–10, updateEnemy, mayFire, the camp governor, the r6
// boss ritual beats) lives in ../stage.js; this file is what is *this stage*:
// its timeline, its section table, its midboss (THE HEARSE) and its boss (THE
// BELL) — both built ON the shared beats (campGovernor, bossEntrance, bossBurn,
// bandedSweep, bossTimeout, advanceBossPhase), never copies of boss 1.
// Music: reuses the stage track and the boss track for now (the SFX.BOSS cue
// switches tracks exactly as on stage 1; a stage-2 cue is a later pass).
import { sfx, SFX, spawnEnemy, spawnItem, bulletCancelWall, W, H } from '../game.js';
import { ENEMY_DEFS, MIDBOSS_TIMEOUT, mayFire, fleeTelegraph, campGovernor, bossEntrance, bossBurn, bandedSweep, bossTimeout, pickSafeX, advanceBossPhase } from '../stage.js';
import { aimedFan, ring, arcWall, spray, bendyStream, staticFan } from '../patterns.js';
import { makeKit } from './kit.js';

export const id = 2;
export const name = 'THE BONE RAIL';

// Section table (index 0 = FULL RUN). The WARNING beat sits inside S6 like
// stage 1's sits inside its S7; S7 is the gate.
export const SECTIONS = [
  { t: 0, label: 'FULL RUN', name: 'intro' },
  { t: 120, label: 'S1 TANK COLUMN', name: 'S1 tank column' },
  { t: 760, label: 'S2 BONE WALLS', name: 'S2 bone-wall breach' },
  { t: 1400, label: 'S3 HULL DECK', name: 'S3 hull turret deck' },
  { t: 2400, label: 'S4 THE HEARSE', name: 'S4 midboss — the Hearse' },
  { t: 2460, label: 'S5 RAIL RUSH', name: 'S5 rail rush' },
  { t: 2880, label: 'S6 RELEASE', name: 'S6 release' },
  { t: 3080, label: 'S7 THE BELL', name: 'S7 boss — the Bell' },
];
export const SEC_T = SECTIONS.map((s) => s.t);

const PI = Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const findType = (g, type) => { for (let i = 0; i < g.enemies.count; i++) { const o = g.enemies.items[i]; if (o.type === type && !o.dead) return o; } return null; };

// --- THE HEARSE (midboss, type 4 through enemyUpdate) ---------------------------
// A rail crawler: enters to y 80, then CRAWLS stop to stop along the rail toward
// your column (2.2px/f, dwell 70f — a stalker, not stage 1's tanh sweep). It
// drags a chained ANCHOR (type 10, part class) on a visible pendulum: chain 105px,
// ±1.0 rad, period ~3.5s. The anchor is a PHYSICAL hazard (contact r 10 + motion,
// no rng — T3 "checkmate from physical properties") and the speed-kill sub-part:
// point-blank on the Hearse means standing inside the swing. Kill the anchor and
// the hazard is gone (parts behave like stage 1's: Q17 is open). Never sealed (a
// boss, r19). Phase B (< 45% hp) is hp-triggered and announces itself with a
// ring the frame it flips (r14 grammar). Timeout = the shared MIDBOSS_TIMEOUT.
// Escort: a crosser PAIR from ONE side every 150f, alternating sides (Jacob's
// Q21 addendum — never both far edges at once). No arrival bloom: that is the
// Reliquary's signature; the Hearse's opening is the anchor DROP (60f telegraph).
// Fields: bloomed = anchor state (0 none / 1 hung / 2 lost), holdT = dwell,
// sweepOff = current rail stop index, bobX/bobY = the anchor's spot.
const STOPS = [60, 110, 160, 210, 260];
const HEARSE_Y = 80, CHAIN = 105, SWING = 1.0, SWING_W = 0.03;
function updateHearse(g, e) {
  g.emitter = e;
  if (e.y < HEARSE_Y) { e.y += 1.05; return; }
  e.fireT++;
  const half = e.hp < (g.tune.midbossHp || ENEMY_DEFS[4].hp) * 0.45;
  if (!e.bloomed) { // first parked frame: hang the anchor (chain drops over 60f, see below)
    e.bloomed = 1; e.holdT = 70; e.sweepOff = 2;
    const a = spawnEnemy(g, 10, e.x, e.y + 8, { side: 1 });
    if (a) a.armorUntil = g.frame + 30;
  } else if (e.bloomed === 1 && !findType(g, 10)) e.bloomed = 2; // the chain snapped — hazard gone
  // the pendulum (deterministic): chain length grows 0 → CHAIN over the first 60 parked frames
  const L = CHAIN * Math.min(1, e.fireT / 60), th = SWING * Math.sin(e.fireT * SWING_W);
  e.bobX = e.x + Math.sin(th) * L; e.bobY = e.y + Math.cos(th) * L;
  // rail crawl: dwell, then lurch ONE stop toward the ship's column (phase B: faster, shorter dwells)
  const spd = half ? 3.0 : 2.2, dwell = half ? 40 : 70;
  const tx = STOPS[e.sweepOff];
  if (Math.abs(e.x - tx) > 1.5) e.x += Math.sign(tx - e.x) * spd;
  else if (--e.holdT <= 0) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < STOPS.length; i++) { const d = Math.abs(STOPS[i] - g.player.x); if (d < bd) { bd = d; best = i; } }
    e.sweepOff = clamp(e.sweepOff + Math.sign(best - e.sweepOff), 0, STOPS.length - 1);
    e.holdT = dwell;
  }
  if (mayFire(g, e)) {
    if (half && e.phase === 0) { e.phase = 1; ring(g, e.x, e.y, 20, 1.6, (e.fireT * 0.13) % 1); } // the flip beat announces itself
    if (!half) { // phase A: aimed lantern fans (cyan — it IS the special tier) + a laned bone toss
      if (e.fireT % 80 === 20) aimedFan(g, e.x - 20, e.y + 12, 3, 0.4, 3.1);
      if (e.fireT % 80 === 60) aimedFan(g, e.x + 20, e.y + 12, 3, 0.4, 3.1);
      if (e.fireT % 150 === 100) arcWall(g, e.x, e.y + 10, 9, 1.6, 1.5, 4, 0); // static, fixed centre gap: no rng
      if (e.fireT > 780 && e.fireT % 32 === 5) spray(g, e.x, e.y + 12, 11, 1.1, 1.9, 3.1); // leave-alive hose (only slow play meets it)
    } else {     // phase B: rings + bounded spray, bendy pair as the desperation layer
      if (e.fireT % 130 === 10) ring(g, e.x, e.y, 20, 1.6, (e.fireT * 0.13) % 1);
      if (e.fireT % 75 === 40) spray(g, e.x, e.y + 12, 6, 0.9, 2.0, 3.1);
      if (e.fireT > 950 && e.fireT % 70 === 5) { bendyStream(g, e.x - 20, e.y + 8, PI / 2 - 0.4, 7, 1.1, 2.8); bendyStream(g, e.x + 20, e.y + 8, PI / 2 + 0.4, 7, 1.1, 2.8); }
    }
  }
  // escort: a crosser pair from ONE side every 150f, alternating sides
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
// The anchor: position slaved to the Hearse's pendulum every frame; no gun.
// Dies scorelessly with its owner (the Hearse's kill or flee).
function updateAnchor(g, e) {
  const h = findType(g, 4);
  if (!h) { e.dead = 1; return; }
  e.x = h.bobX; e.y = h.bobY;
}

// --- THE BELL (boss, three forms sharing the r6 ritual) ------------------------
// Dialect (L6, WS03 #6): PENDULUM ARCS — a clapper swinging under the boss fires
// a static 5-round fan along the chain's radial on a 30f beat; each beat leaves
// from a new spot and angle on the swing, so the fixed fans trace the arc
// (grouped beats, never a curtain — HOMAGE guardrail: density low, lethality positional). Boss-only: no section fires from a
// moving emitter. Forms (Psikyo#6, transform not phase):
//   P1 BELL TOWER  — near-static (a ±40px drift), the arcs + aimed needle fans;
//                    two lantern parts carry the tower's aimed pressure (L7).
//   P2 BELL WALKER — hard strafing: steps rail to rail at 4.2px/f (dwell 90f) on
//                    boss 1's far-side-of-the-player rule; static side sprays
//                    leave the column UNDER it clear — the safe spot, re-earned
//                    every step; a stomp ring on landing. One rope node part
//                    (56hp) is the phase's only aimed emitter.
//   P3 THE CLAPPER — bare core on the banded sweep + bob; rings + TWO clappers'
//                    arcs + the walker's side sprays recombined. Nothing new.
// hp per phase = the shared BOSS_PHASE_HP (390 spawn / 402 / 405, r71 3×);
// timeout = BOSS_PHASE_TIMEOUT (35s); escalation clock k as boss 1 (§5.2b).
const BELL_GEO = [[36, 4], [38, 0], [38, -4]];
function spawnBellParts(g, boss) {
  const sides = boss.phase === 1 ? [1] : [-1, 1];
  for (const s of sides) {
    const p = spawnEnemy(g, 6, boss.x + BELL_GEO[boss.phase][0] * s, boss.y + BELL_GEO[boss.phase][1], { side: s });
    if (p) { p.phase = boss.phase; p.armorUntil = boss.armorUntil; if (boss.phase === 1) p.hp = 56; }
  }
}
function updateBell(g, e) {
  g.emitter = e;
  const phase = e.phase, rep = e.fireT / 240 | 0;
  const k = Math.min(1 + rep * 0.08 + Math.max(0, rep - 3) * 0.22, 2.2);
  if (bossEntrance(g, e, spawnBellParts)) return;
  bossBurn(g, e);
  const { latched, parked } = campGovernor(g, e);
  e.fireT++;
  const t = e.fireT % 240;
  // the clapper(s): pendulum under the boss, deterministic
  const L = phase === 0 ? 96 : phase === 1 ? 56 : 70, A = phase === 1 ? 0.7 : 1.05, om = phase === 0 ? 0.028 : phase === 1 ? 0.036 : 0.032; // the walker's chain is short: it walks low
  const th = A * Math.sin(e.fireT * om);
  e.bobX = e.x + Math.sin(th) * L; e.bobY = e.y + Math.cos(th) * L;
  const th2 = -A * Math.sin(e.fireT * om + 0.9);
  if (phase === 2) { e.bobX2 = e.x + Math.sin(th2) * L; e.bobY2 = e.y + Math.cos(th2) * L; }
  if (phase === 0) {         // P1 BELL TOWER
    const tx = latched ? pickSafeX(e) : W / 2 + Math.sin(e.fireT * 0.004) * 40;
    e.x += clamp(tx - e.x, -1.2, 1.2);
    if (mayFire(g, e)) {
      if (t % 30 === 0 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5 + Math.min(rep, 2), 0.9, 2.1 * k, th + PI / 2);  // the dialect: a fan per beat, thrown from the swing's ENDS (the arcs claim the flanks; the column under the tower is the aimed fire's)
      if (t % 60 === 25) aimedFan(g, e.x, e.y + 14, 3 + Math.min(rep, 3), 0.5, 3.1 * k);       // tower pressure
      if (rep >= 3 && t % 30 === 15 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 4, 0.7, 2.4 * k, th + PI / 2 + 0.3); // timeout-rider tax: the off-beat fan
    }
  } else if (phase === 1) {  // P2 BELL WALKER
    // r81 `calm` (Lab `bellWalker` → g.tune.bellWalker, wiki §13.9 / Q28 — Jacob: "the
    // boss keeps running around extremely fast and is hard to catch"): walk 3.4
    // (under the ship's 3.7, so pursuit catches it), dwell 240, flank sprays every
    // 70 f, the stomp on every SECOND landing (e.bloomed counts landings — the
    // field is the midboss's, free on the boss). hp / rope node / clapper unchanged.
    const calm = g.tune.bellWalker | 0;
    const railX = latched ? pickSafeX(e) : W / 2 + e.side * 100;
    let landed = false; // sweepOff doubles as the "in transit" flag here (P3's handoff re-solves it)
    if (Math.abs(e.x - railX) > 3) { e.x += Math.sign(railX - e.x) * (calm ? 3.4 : 4.2); e.sweepOff = 1; }
    else {
      if (e.sweepOff === 1) { e.sweepOff = 0; landed = true; }
      if (--e.holdT <= 0) {
        const far = g.player.x < W / 2 ? 1 : -1;
        e.side = (far === e.side && !(parked || latched)) ? -e.side : far;
        e.holdT = calm ? 240 : 170; // a dwell long enough to be chased (boss 1's rail hop dwells 210)
      }
    }
    e.y += clamp(118 - e.y, -0.6, 0.6); // walks lower: into the pipeline's strong band
    if (mayFire(g, e)) {
      if (t % (calm ? 70 : 50) === 0) { staticFan(g, e.x - 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 + 0.55); staticFan(g, e.x + 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 - 0.55); } // outward flank sprays: under it is clear
      if (t % 36 === 18 && Math.abs(th) > 0.3) staticFan(g, e.bobX, e.bobY, 5, 0.9, 1.9 * k, th + PI / 2); // the dialect, on the walker's slower beat
      if (landed && (!calm || (e.bloomed++ & 1) === 0)) ring(g, e.x, e.y, 12 + Math.min(rep, 4) * 2, 1.5 * k, 0); // stomp on landing (no rng); calm: every second landing
      if (rep >= 3 && t % 40 === 20) aimedFan(g, e.x, e.y + 16, 4, 0.6, 3.2 * k);            // timeout-rider tax
    }
  } else {                   // P3 THE CLAPPER — medley
    bandedSweep(e, latched, 0.005);
    e.y = 93 + Math.sin(e.fireT * 0.013) * 22;
    if (mayFire(g, e)) {
      if (t === 20) ring(g, e.x, e.y, 14 + Math.min(rep, 4) * 2, 1.45 * k, g.rng.range(0, 0.3)); // the bare-core beat
      if (t % 30 === 0 && Math.abs(th) > 0.45) staticFan(g, e.bobX, e.bobY, 5, 0.9, 2.1 * k, th + PI / 2);        // P1's arcs…
      if (t % 30 === 15 && Math.abs(th2) > 0.45) staticFan(g, e.bobX2, e.bobY2, 5, 0.9, 2.1 * k, th2 + PI / 2);   // …twinned, off-beat
      if (t === 130 || t === 190) { staticFan(g, e.x - 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 + 0.55); staticFan(g, e.x + 24, e.y + 4, 4, 0.8, 2.2 * k, PI / 2 - 0.55); } // P2's flank sprays
      if (rep >= 3 && (t === 100 || t === 170)) ring(g, e.x, e.y, 14, 1.5, g.rng.range(0, 0.3)); // timeout-rider tax
    }
  }
  bossTimeout(g, e, spawnBellParts);
}
// The Bell's parts: slaved to the form; each hosts an emitter, so killing it
// reduces the form's output (as stage 1's parts do today — Q17 open).
function updateBellPart(g, e) {
  g.emitter = e;
  const boss = findType(g, 5);
  if (!boss || boss.phase !== e.phase) { e.dead = 1; return; }
  e.x = boss.x + BELL_GEO[e.phase][0] * e.side; e.y = boss.y + BELL_GEO[e.phase][1];
  e.fireT++;
  if (!mayFire(g, e)) return;
  if (e.phase === 0) { if (e.fireT % 90 === (e.side < 0 ? 30 : 75)) aimedFan(g, e.x, e.y + 8, 3, 0.45, 3.0); }        // lantern: aimed fan
  else if (e.phase === 1) { if (e.fireT % 70 === 40) spray(g, e.x, e.y + 8, 7, 0.6, 2.0, 3.0); }                        // rope node: the walker's only aimed emitter
  else { if (e.fireT % 100 === (e.side < 0 ? 30 : 80)) aimedFan(g, e.x, e.y + 8, 2, 0.2, 3.3); }                        // relays: needle pairs
}

export const enemyUpdate = { 4: updateHearse, 10: updateAnchor, 6: updateBellPart };
export const boss = {
  update: updateBell,
  advance: (g, e, killed, fade) => advanceBossPhase(g, e, killed, fade, spawnBellParts),
  phases: 3,
};

// --- timeline ------------------------------------------------------------
// Sections (≤2 reps each, escalating): tank column → bone-wall breach → hull
// turret deck → THE HEARSE (gate) → rail rush → release → WARNING → THE BELL.
// Flow (WS05 / Q21): one strong thing at a time; popcorn from one side at a
// time; lanes never at the screen edge.
export function buildTimeline() {
  const { tl, at, zakoGroup, crossers, risersOneSide, tankFile, boneWall } = makeKit();

  // S1 TANK COLUMN — the ground layer introduced bare: sealing is the lesson.
  // rep 1: a four-tank staircase from the left; crossers over it from the right.
  tankFile(120, -1, 4, { flank: 1 }); // flank: the r81 `swarm` knob reshapes this file (kit.js)
  crossers(300, 1, 5, 88);
  // rep 2 (denser): five from the right, faster; popcorn from the left; then
  // three HALF-TRACKS that creep toward your column (behaviour, not count [T2])
  tankFile(420, 1, 5, { spd: 0.1, flank: 1 });
  zakoGroup(540, -1, 5);
  tankFile(600, -1, 3, { half: 1, flank: 1 });

  // S2 BONE-WALL BREACH — destructible terrain (WS05 theme). A wall with one
  // 90px lane arrives; every segment fires one prong as it crosses y 140 unless
  // you are on it (sealed) or it is dead; then it is a silent barrier. Breach a
  // lane where you stand (3 segments, ~0.6s point-blank) and the loot spills, or
  // take the lane it gives you — which is where the next wave aims.
  boneWall(760, [2, 3, 4]);                 // lane centre x 115
  crossers(900, 1, 4, 60);
  boneWall(1000, [6, 7, 8]);                // rep 2: the lane switches sides (centre x 235)…
  tankFile(1120, 1, 3, { spd: 0.1 });       // …with tanks rolling down behind it (no `flank`: r80's shape under every knob — a wall AND a flank file is two strong things at once, WS05)
  zakoGroup(1180, -1, 6, { diver: true });

  // S3 HULL TURRET DECK — the turret alley grown up (HOMAGE R7, L1 structural):
  // an ossuary barge parks at y 120 with four turrets bolted to its deck; the
  // core is armored until the deck is dead, then its cyan gun opens and the
  // elite window starts (DDP#4 chain-link). Traffic keeps the point-blank
  // approach honest.
  at(1400, (g) => {
    const h = spawnEnemy(g, 9, W / 2, -70);
    if (!h) return;
    h.armorUntil = 1e12; // sealed shut until the deck falls (stage.js case 9)
    for (const [dx, dy] of [[-58, -6], [-22, 16], [22, 16], [58, -6]]) spawnEnemy(g, 2, h.x + dx, h.y + dy, { vx: dx, vy: dy, holdT: 2 });
  });
  crossers(1500, -1, 5, 60); crossers(1700, 1, 5, 60);
  zakoGroup(1850, 1, 6);
  crossers(1950, -1, 4, 88);

  // S4 THE HEARSE — gate; a fast kill means the rush starts at once (T2)
  at(2400, (g) => { g.gate = 'midboss'; spawnEnemy(g, 4, W / 2, -20); });

  // S5 RAIL RUSH — tanks + crossers + a mid (the metronome), risers from ONE
  // lane edge at a time (Q21 addendum), divers to close.
  tankFile(2460, -1, 4, { spd: 0.15, flank: 1 }); crossers(2500, 1, 5, 60);
  risersOneSide(2560, 3, 1);
  at(2600, (g) => spawnEnemy(g, 1, W / 2 + 40, -12, { side: 1, holdT: 130 }));
  tankFile(2640, 1, 4, { half: 1, spd: 0.15, flank: 1 }); zakoGroup(2700, -1, 8, { diver: true, spd: 0.2 });
  risersOneSide(2760, 3, -1);

  // S6 RELEASE — loot over the bell-tower approach, ending empty (L2 + BRDA#9)
  at(2880, (g) => {
    bulletCancelWall(g, W / 2, H / 2, 30);
    for (let i = 0; i < 14; i++) spawnItem(g, 40 + i * 17, -10 - (i % 3) * 16, 150);
  });

  // WARNING ritual (r6 S3b): scoreless sweep + cancel, ≥1s over an empty field
  at(3010, (g) => {
    for (let i = g.enemies.count - 1; i >= 0; i--) g.enemies.killAt(i);
    for (let i = g.eBullets.count - 1; i >= 0; i--) g.eBullets.killAt(i);
    g.warn = 70; g.gate = 'warning';
    sfx(g, SFX.WARNING);
    g.cancelFlash = Math.max(g.cancelFlash, 12);
  });

  // S7 THE BELL — gate until the run resolves
  at(3080, (g) => { g.gate = 'boss'; spawnEnemy(g, 5, W / 2, -27); });

  tl.sort((a, b) => a.t - b.t);
  return tl;
}

export default { id, name, SECTIONS, SEC_T, boss, enemyUpdate, buildTimeline };
