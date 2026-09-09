// SPEEDHELL core — DOM-free, deterministic, fixed 60Hz logic.
// Runs identically in browser and Node (sim harness imports this file).
import { makeRng } from './rng.js';
import { makePool } from './pool.js';
import { buildTimeline, updateEnemy, updateBoss, advanceBossPhase, ENEMY_DEFS, BOSS_PHASE_TIMEOUT } from './stage.js';

export const W = 320, H = 427;
export const STEP = 1 / 60;

// Field shrunk r4 (playtest 3: "field seems too large"): 480x640 -> 320x427 with
// sprite pixel sizes UNCHANGED — the canvas stretch renders everything larger.
// Ship is now 0.69 field-widths/s (genre band 0.65-0.85, boghog Cave analysis)
// and 5.6% of field width. All world speeds scaled x2/3 with the field so
// relative dynamics (bullet band, descent times, speed-kill windows) hold.
// focusSpeed close to full speed per boghog's Cave frame analysis (~1.6x ratio,
// "halving feels bad") [BOGHOG_CRAFT]. Transition is instant: twitchy, speed-hell.
// Shot economy is the point-blank incentive (S1, playtest r2): the on-screen cap
// (6) binds hard at range — beyond ~90px the pipeline saturates and throughput is
// cap/flight-time limited (~57 dmg/s at 200px) — while point-blank the cap never
// binds and the fire rate delivers the full 120 dmg/s. Real physics, no multiplier.
export const PLAYER = {
  speed: 3.7, focusSpeed: 2.3, hitR: 3,
  shotSpeed: 9, shotLimit: 6, shotEvery: 3, shotDmg: 3,
};

// Sound events (r7-sfx). The core stays DOM-free: it only APPENDS event ids to a
// fixed ring (g.sfx) each frame; the browser bootstrap drains it after update()
// and the sim harness ignores it. Bounded (SFX_CAP) — zero per-frame allocation.
export const SFX = {
  SHOT: 1, HIT: 2, KILL: 3, KILL_BIG: 4, SPEED: 5, RUSH: 6, ITEM: 7, CANCEL: 8,
  BOMB: 9, DIE: 10, WARNING: 11, MIDBOSS: 12, BOSS: 13, PHASE: 14, CLEAR: 15, GAMEOVER: 16,
};
const SFX_CAP = 32;
// r8-fx: particle KINDS (the renderer draws each differently) and colour
// FAMILIES (p.hue is a family index, not a hue). All fx randomness lives here
// in core (g.rng) — the renderer keys only off g.frame (determinism seam).
export const FX = { SPARK: 0, FIRE: 1, SMOKE: 2, DEBRIS: 3, RING: 4, CORE: 5, BLOB: 6 }; // BLOB: r52 chunky grape blob
export const FAM = { WHITE: 0, ORANGE: 1, CYAN: 2, BURN: 3 };
export const TIER = { POP: 0, MED: 1, BIG: 2, PHASE: 3, PLAYER: 4 };

export function sfx(g, id) {
  if (g.sfxN < SFX_CAP) g.sfx[g.sfxN++] = id;
}

// r59 (Jacob, 2026-09-04): BULLET CASTE BY SOURCE. Cyan needles are the aimed
// fire of the "special" tier only — mid (1), elite (3), midboss (4), boss (5)
// and its parts (6). Everything else (popcorn family, turrets) fires pink
// rounds even when aimed. patterns.js fire() downgrades out-of-tier needles.
// Sim (seed C0FFEE, expert): needles 45% → 22% of all fire; first needle now
// appears with the s3 mids; s1/s2/s5 are all-pink. Set g.needleTier = null
// to replay the old rule. Referee recert pending (bullet stream changed).
export const NEEDLE_TIER = { 1: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

export function makeGame(seed = 1) {
  const g = {
    seed, rng: makeRng(seed), frame: 0,
    // r8-fx: particles roll on their OWN stream so effect tuning never perturbs the
    // gameplay rng (the certified bot/camp laws replay against g.rng alone)
    fxRng: makeRng((seed ^ 0x5bd1e995) >>> 0),
    state: 'title', // title | play | dead-wait | clear | gameover
    player: {
      x: W / 2, y: H - 53, prevX: W / 2, prevY: H - 53,
      alive: true, invuln: 0, focus: false, fireCd: 0,
      lives: 3, bombs: 2, bombActive: 0, bombCd: 0,
    },
    input: { dx: 0, dy: 0, focus: false, fire: false, bomb: false },
    score: 0, chain: 0, speedKills: 0, kills: 0,
    stageT: 0, timeline: null, tlIndex: 0, gate: null, bossDown: false, bossKilled: false, practice: 0,
    // r26 variant knobs (Booth experiments): deterministic — same knobs + seed
    // + inputs = same run. 0 / 'top' = shipped ENEMY_DEFS values. The referee
    // never sets these, so certified paths are untouched by construction.
    tune: { eliteHp: 0, eliteEntry: 'side', eliteEscort: 1, midbossHp: 0, bossHp: 0 }, // bossHp: r70 Lab EXPERIMENT — multiplier on every boss phase's hp (0/1 = shipped 130/134/135), set at run start // r27: side entry + escort are the shipped defaults (Booth verdict); chips roll back
    warn: 0, // r6 S3b arrival ritual: frames of WARNING remaining before the boss gate

    clearBonus: 0, clearAt: 0, endFrame: 0,
    // pools — capacities are hard caps (rubric S8)
    pBullets: makePool(64, () => ({ x: 0, y: 0, vy: 0, alive: 0 })),
    needleTier: NEEDLE_TIER, emitter: null, // r59: bullet caste by source (null = every aimed shot is a needle, the r5–r58 rule)
    eBullets: makePool(1400, () => ({ x: 0, y: 0, vx: 0, vy: 0, kind: 0, r: 3, accel: 0, curve: 0, age: 0 })),
    enemies: makePool(64, () => ({
      type: 0, x: 0, y: 0, vx: 0, vy: 0, hp: 0, r: 10, age: 0,
      vulnAt: 0, armorUntil: 0, holdT: 0, phase: 0, fireT: 0, side: 1, value: 0, window: 0, dead: 0,
      bloomed: 0, // r9: midboss arrival bloom fired (waits for a clean screen so a straggler's cancel wall can't wipe it)
      sweepOff: 0, // boss-phase sweep phase offset (r5: continuous phase handoff)
      campT: 0, // r6 boss serve budget: continuous frames spent serving the player's column
      prevHp: 0, // r6: last frame's hp (boss damage-stream detection for the serve budget)
      latchX: -1e9, // r6.3: x latched at an over-serve relocation (-1e9 = none); cleared
      // ONLY by genuine pursuit (co-movement with the boss) — never by displacement
      latchX2: -1e9, // r6.3: the PREVIOUS latched band (a 2-spot shuffler banks two bands)
      latchN: 0, // r6.3: relocations this phase — ratchets the serve ration 55→25→12→6→2
      trackT: 0, // r6.3: demonstrated-tracking credit while latched (staying under the relocated boss)
      pxEma: 0, // r6.3: fast EMA of player x (~0.4s) — 'parked' posture detector
      lastDir: 0, // r6.4: last nonzero x-direction of the player (crawl detector)
      monoT: 0, // r6.4: moving-frames without a direction reversal (crawl detector)
      stillRun: 0, // r6.5: consecutive still frames (a real dwell resets monoT)
      latchT: 0, // r6.5: refunds granted this phase (each further refund costs +25 credit)
      grazeT: 0, // r6.4: frames since a bullet grazed the player's core (in-fire window)
      grindHp: 0, // r6.4: per-phase hp dealt from IN-FIRE play — the grind account
      flash: 0, // r8-fx S4-MUST: hit-flash frames remaining (renderer paints the silhouette white)
    })),
    items: makePool(200, () => ({ x: 0, y: 0, vy: 0, val: 0, tw: 0 })),
    particles: makePool(400, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, hue: 0,
      kind: 0, size: 0, rot: 0, vrot: 0, delay: 0, grav: 0, // r8-fx typed particle
      fr: 1, off: 0, ck: 0, // r52 chunky: friction/frame, colour-clock start offset, chunky-spawned flag (CORE/RING draw variants)
    })),
    popups: makePool(32, () => ({ x: 0, y: 0, life: 0, text: '', big: 0, val: 0 })), // val: paid value (speed kills) — the renderer formats it (r50 lab)
    shake: 0, shakeMax: 0, flash: 0, cancelFlash: 0,
    hitstop: 0, fxHitstop: 0, // r8-fx: frames of world-freeze remaining; fxHitstop = frames granted per BIG/PHASE kill (0 = off)
    fxMeta: 0, // r53 lab: dress the natural meta — speed kills explode one tier up, rush = PHASE-tier chain + KILL_BIG, cancel walls pop per bullet (presentation only; scoring untouched)
    sfx: new Array(SFX_CAP).fill(0), sfxN: 0, // sound-event ring, drained per frame
    // instrumentation (read by sim + critics; cheap fixed-size)
    stats: {
      maxEBullets: 0, deaths: [], killLog: [], bulletCurve: [],
      scoreCurve: [], bossPhaseFrames: [], timeouts: 0, timeoutLog: [],
      maxChain: 0, bombsUsed: 0, // r44 receipt instrumentation — counters only, no rng, no behavior
    },
  };
  return g;
}

export function startRun(g, atT = 0) {
  const seed = g.seed;
  Object.assign(g, makeGame(seed));
  g.state = 'play';
  g.timeline = buildTimeline();
  // r36 practice/section select — the sandbox's stage-jump made player-facing.
  // Pure stageT/tlIndex math, no rng consumed; atT=0 (every full run, the
  // referee, the Booth, replays) is byte-identical to the pre-r36 path.
  // g.practice marks the run for the renderer tag and for exclusion from real
  // scores (hi-score table, when it lands).
  if (atT > 0) {
    g.stageT = atT;
    while (g.tlIndex < g.timeline.length && g.timeline[g.tlIndex].t < atT) g.tlIndex++;
    g.practice = atT;
  }
  return g;
}

// r50: `val` carries the paid value on speed-kill popups; core never formats
// presentation — renderer.js decides how (or whether) the number shows, per
// the lab experiment (wiki §2.6). Core text stays the binary state 'SPEED'.
export function addPopup(g, x, y, text, big = 0, val = 0) { // exported r22: stage.js flee telegraph
  const p = g.popups.spawn(); if (!p) return;
  // De-conflict at spawn (r5 S6-legibility): no two live popups may share a
  // baseline. Keep on-field, below the HUD block, and nudge down 14px past any
  // live popup occupying the same slot (bounded by the 32-popup pool).
  x = Math.max(40, Math.min(W - 40, x));
  if (y < 58) y = 58;
  // bound: clearing one popup's ±13 band can take two 14px steps, so a ladder
  // of n live popups needs up to 2n pushes plus one final clear check
  for (let guard = 0; guard <= g.popups.count * 2; guard++) {
    let hit = false;
    for (let i = 0; i < g.popups.count; i++) {
      const o = g.popups.items[i];
      if (o !== p && Math.abs(o.y - y) < 13 && Math.abs(o.x - x) < 60) { hit = true; break; }
    }
    if (!hit) break;
    y += 14;
  }
  p.x = x; p.y = y; p.life = 50; p.text = text; p.big = big; p.val = val;
}

// r8-fx: single particle spawn. `delay` frames dormant before it lives (how a
// composite explosion staggers its sub-bursts while all rng stays in core).
export function spawnFx(g, kind, x, y, vx, vy, life, size, hue, delay = 0, grav = 0) {
  const p = g.particles.spawn(); if (!p) return null;
  p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.max = p.life = life | 0; p.size = size; p.hue = hue; p.delay = delay | 0; p.grav = grav;
  p.rot = 0; p.vrot = 0; p.fr = 1; p.off = 0; p.ck = 0;
  return p;
}

function burst(g, x, y, n, hue, power = 1) { // isotropic spark spray
  for (let i = 0; i < n; i++) {
    const a = g.fxRng.range(0, Math.PI * 2), s = g.fxRng.range(0.5, 3.5) * power;
    if (!spawnFx(g, FX.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, 14 + g.fxRng.range(0, 12), 1, hue)) return;
  }
}

function setShake(g, n) { g.shake = g.shakeMax = n; }

// r52 EXPERIMENT "chunky" (wiki §10 / open Q12) — the Lazy Devs / CAVE recipe
// distilled from four episodes (Better Explosions, Shockwaves, Explosions,
// Blob Grapes): matter thrown outward that STALLS (launch fast, friction
// 0.86/frame), shaded OPAQUE blobs (renderer draws 3 offset circles, dark rim
// → bright off-centre highlight, centre blob last) instead of additive discs,
// ONE blob that cools white → yellow → orange → dark red → grey SMOKE and dies
// by shrinking to zero (no separate smoke kind), a structured GRAPE (6 spokes
// on a ring at a random start angle + a centre blob), bigger tiers stack
// staggered grapes so new puffs emerge as earlier ones collapse (billow), a
// static 2-frame oversized flash (S4 ≤2 startup frames) and a constant-width
// white shockwave drawn UNDER the particles. Everything on g.fxRng; budgets
// stay under classic's (POP 7+7+14 ≈ 28 … PHASE ≈ 74 < 93).
const CH_GRAPES = [1, 2, 3, 4, 2], CH_SPOKES = 6, CH_FRICTION = 0.86;
function explodeChunky(g, x, y, tier, hue, r) {
  const rng = g.fxRng;
  const R = Math.max(r, 8) * TIER_SC[tier];
  const fl = spawnFx(g, FX.CORE, x, y, 0, 0, 2, R * 1.15, hue); if (fl) fl.ck = 1;       // static 2-frame contrast flash
  const rw = spawnFx(g, FX.RING, x, y, 0, 0, Math.max(6, (R * 2.4 / 3.5) | 0), R * 2.4, hue); if (rw) rw.ck = 1; // linear, culled at target
  for (let k = 0; k < CH_GRAPES[tier]; k++) {
    const cx = k ? x + rng.range(-R * 0.5, R * 0.5) : x, cy = k ? y + rng.range(-R * 0.5, R * 0.5) : y;
    const dl = k * 5, a0 = rng.range(0, 6.283), dist = R * 0.6, rb = R * 0.48 * (k ? rng.range(0.75, 1) : 1);
    const life = 22 + rng.range(0, 10) + 18 + rng.range(0, 12); // fire phase + smoke phase, one particle
    for (let i = 0; i < CH_SPOKES; i++) { // peripheral blobs first: outward along their spoke, then stall
      // launch speed scales with R so the stall distance (≈ 7.1·s at 0.86 friction) lands the blob ~0.6R out:
      // grape stays a raspberry (Lazy Devs: 6 spokes, ring 8, radius 5 for a popcorn), never a fidget spinner
      const a = a0 + (i / CH_SPOKES) * 6.283, s = R * (0.05 + rng.range(0, 0.03)) * (1 + tier * 0.1);
      const p = spawnFx(g, FX.BLOB, cx + Math.cos(a) * dist * 0.25, cy + Math.sin(a) * dist * 0.25, Math.cos(a) * s, Math.sin(a) * s - 0.2,
        life + rng.range(-4, 4), rb, hue, dl);
      if (p) { p.fr = CH_FRICTION; p.off = rng.range(0, 3) | 0; }
    }
    const c = spawnFx(g, FX.BLOB, cx, cy, 0, -0.25, life + 4, rb * 1.25, hue, dl); // centre blob LAST = drawn on top
    if (c) { c.fr = 1; c.off = 0; }
  }
  for (let i = 0; i < TIER_DEBRIS[tier]; i++) { // chunks of the sprite, tumbling under gravity (unchanged from classic)
    const a = rng.range(0, 6.283), s = rng.range(1.5, 4) * (0.8 + tier * 0.3);
    const p = spawnFx(g, FX.DEBRIS, x, y, Math.cos(a) * s, Math.sin(a) * s - 1, 30 + rng.range(0, 20), 1.5 + rng.range(0, 2), hue, 0, 0.08);
    if (p) { p.rot = rng.range(0, 6.283); p.vrot = rng.range(-0.4, 0.4); }
  }
  for (let i = 0; i < TIER_SPARK[tier]; i++) { // sparks: violent launch, hard stall
    const a = rng.range(0, Math.PI * 2), s = rng.range(2, 6) * TIER_POWER[tier];
    const p = spawnFx(g, FX.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, 12 + rng.range(0, 10), 1, hue);
    if (!p) break; p.fr = 0.82;
  }
}

// r8-fx S4-MUST "explosions punchy" — since r67 the recipe is explodeChunky
// above (Lazy Devs / CAVE: static flash, linear shockwave, stalling blob
// grapes, debris, sparks); these tier tables size it.
// Footprint is >1.5x the sprite radius at every tier [Boghog: explosions
// significantly bigger than the enemy, varied patterns, extra debris].
// Tiers: POP (zako, sub-part) · MED (turret, mid) · BIG (elite, midboss) · PHASE (boss) · PLAYER.
// Per-tier particle budgets (max): 31 · 38 · 55 · ~93 · ~63. Jacob 2026-08-26: "lean bigger".
const TIER_SC = [1.6, 1.8, 2.3, 2.8, 2.6];
const TIER_DEBRIS = [7, 8, 12, 14, 12], TIER_SPARK = [14, 18, 26, 30, 30], TIER_POWER = [1.2, 1.6, 2, 2.2, 2.5];
export function explode(g, x, y, tier, hue = FAM.ORANGE, r = 10) { return explodeChunky(g, x, y, tier, hue, r); } // r67: chunky IS the explosion (open Q12 decided); the classic recipe was deleted with the Lab rows

export function spawnEnemy(g, type, x, y, opts = {}) {
  const e = g.enemies.spawn(); if (!e) return null;
  const d = ENEMY_DEFS[type];
  e.type = type; e.x = x; e.y = y; e.vx = opts.vx || 0; e.vy = opts.vy || 0;
  e.hp = d.hp; e.r = d.r; e.age = 0; e.phase = 0; e.fireT = 0; e.dead = 0;
  if (type === 3 && g.tune.eliteHp) e.hp = g.tune.eliteHp;   // r26 variant knob
  if (type === 4 && g.tune.midbossHp) e.hp = g.tune.midbossHp;
  if (type === 5 && g.tune.bossHp) e.hp = Math.round(e.hp * g.tune.bossHp); // r70 experiment (open Q16)
  e.side = opts.side || 1; e.holdT = opts.holdT || 0;
  e.value = d.value; e.window = d.window; e.sweepOff = 0; e.campT = 0; e.prevHp = e.hp;
  e.latchX = -1e9; e.latchX2 = -1e9; e.latchN = 0; e.trackT = 0; e.pxEma = g.player.x;
  e.grazeT = 0; e.grindHp = 0; e.lastDir = 0; e.monoT = 0; e.latchT = 0; e.stillRun = 0; e.flash = 0; e.bloomed = 0;
  e.vulnAt = -1; e.armorUntil = 0; // vuln set once on-screen (top dead zone + intro armor)
  // r6.4: the boss's entrance armor lives HERE, not in the timeline event, so
  // every spawn path (referee camp probes included) gets the untouchable 90f
  // descent. (r6.3 shipped this line BEFORE the armorUntil reset above — the
  // armor never existed and every strategy shaved free descent HP, critic B.)
  if (type === 5) e.armorUntil = g.frame + 95;
  if (type === 5) sfx(g, SFX.BOSS); else if (type === 4) sfx(g, SFX.MIDBOSS);
  return e;
}

export function spawnItem(g, x, y, val = 500) {
  const it = g.items.spawn(); if (!it) return;
  it.x = x; it.y = y; it.vy = -1.0; it.val = val;
  it.tw = (x + y * 0.7) * 0.1; // glint phase — cosmetic, spawn-position hash, no rng
}

function killEnemy(g, e, idx) {
  const aliveFrames = g.frame - e.vulnAt;
  const speed = e.vulnAt >= 0 && aliveFrames <= e.window;
  let v = e.value;
  if (speed) {
    v *= 2; g.chain++; g.speedKills++; if (g.chain > g.stats.maxChain) g.stats.maxChain = g.chain;
    addPopup(g, e.x, e.y, 'SPEED', 1, v); sfx(g, SFX.SPEED);
    if (g.chain % 5 === 0) { // rush shower: garnish, subordinate to core (S6)
      for (let k = 0; k < 6; k++) spawnItem(g, e.x + g.rng.range(-20, 20), e.y + g.rng.range(-13, 13), g.chain * 20);
      addPopup(g, e.x, e.y - 24, 'RUSH x' + g.chain, 1); sfx(g, SFX.RUSH);
    }
  } else {
    g.chain = 0;
    addPopup(g, e.x, e.y, '+' + v, 0);
  }
  g.score += v; g.kills++;
  g.stats.killLog.push({ t: e.type, f: aliveFrames, s: speed ? 1 : 0 });
  const big = e.type === 3 || e.type === 4; // elite/midboss get the shake (S4);
  // boss sub-parts (type 6) pop like popcorn — shake stays reserved (S4-SHOULD)
  const med = e.type === 1 || e.type === 2; // turret / mid: heavier than popcorn, no shake
  let tier = big ? TIER.BIG : med ? TIER.MED : TIER.POP;
  // r53 EXPERIMENT (wiki §10, research/explosion-and-weapon-feel): the reward
  // the natural meta pays is dressed, not the gun — a speed kill explodes one
  // tier up (POP→MED→BIG→PHASE), a rush (every 5th) gets the PHASE-tier hull
  // chain + the big kill sound. Power is earned on the stopwatch (MSX
  // "difficulty creates meaning"; DOJ rations the hyper). No DPS/cap change.
  if (g.fxMeta && speed) tier = g.chain % 5 === 0 ? TIER.PHASE : Math.min(tier + 1, TIER.PHASE);
  explode(g, e.x, e.y, tier, e.type === 1 ? FAM.CYAN : FAM.ORANGE, e.r);
  if (big) { setShake(g, 14); g.hitstop = g.fxHitstop; }
  sfx(g, big || (g.fxMeta && speed && g.chain % 5 === 0) ? SFX.KILL_BIG : SFX.KILL);
  if (e.type === 4) { // midboss down: relief wall + shower, gate opens — no breather (T2)
    // r9: the 100/bullet payday is a SPEED-kill property. A late kill cancels at
    // garnish rate like every other wall, so a dense screen can never be farmed
    // by waiting — density is only worth money to the player who beat the clock.
    bulletCancelWall(g, e.x, e.y, speed ? 100 : 30);
    for (let i = 0; i < 8; i++) spawnItem(g, e.x + g.rng.range(-27, 27), e.y + g.rng.range(-7, 20), 800);
    g.gate = null;
  }
  // r11: relief is scoped to what the dead enemy actually controlled (playtest:
  // six full wipes per stage flattened tension into all-release — the wall was
  // relief from pressure that never had time to build).
  //  - elite down: LOCAL cancel (r=90) — its denial field dies with it, but the
  //    turrets'/popcorn's fire lives on (speed-kill = safety stays true locally).
  //  - mid down: no wall at all — a mid holding one column is not a
  //    space-controller, and its full wipe erased the next mid's entry fan
  //    (r10), un-toothing the gauntlet the moment it grew teeth.
  // Garnish-priced like the S7 release wall so it can't out-earn the core (S6).
  if (e.type === 3) bulletCancelWall(g, e.x, e.y, 30, 90);
  g.enemies.killAt(idx);
}

// Boss phases score like kills but the entity persists until the last phase.
function scoreBossPhase(g, e) {
  const dur = e.vulnAt >= 0 ? g.frame - e.vulnAt : 1e9;
  const speed = dur <= e.window;
  // r6 late-kill decay (Psikyo pays boss GOLD by kill time): full value through
  // 1200f of the phase (every honest expert kill across the certified + robust
  // seeds lands under it), sliding to ~nothing at the 1450f timeout — a phase
  // ground down at the buzzer pays like the timeout it almost was, so slow
  // grinding is never a payday and camp-luck can't spike a passive score (S6).
  const fade = Math.max(0, Math.min(1, (BOSS_PHASE_TIMEOUT - dur) / 250));
  let v = Math.round(ENEMY_DEFS[5].value * fade / 10) * 10;
  if (speed) { v *= 2; g.chain++; g.speedKills++; if (g.chain > g.stats.maxChain) g.stats.maxChain = g.chain; addPopup(g, e.x, e.y, 'SPEED', 1, v); sfx(g, SFX.SPEED); }
  g.score += v; g.kills++;
  sfx(g, SFX.PHASE);
  g.stats.killLog.push({ t: 5, f: e.vulnAt >= 0 ? g.frame - e.vulnAt : -1, s: speed ? 1 : 0 });
  explode(g, e.x, e.y, TIER.PHASE, FAM.ORANGE, e.r); setShake(g, 16); g.hitstop = g.fxHitstop;
  advanceBossPhase(g, e, true, fade);
}

function cancelAllBullets(g, perBullet = 100) {
  let n = g.eBullets.count;
  if (n === 0) return 0;
  for (let i = n - 1; i >= 0; i--) {
    const b = g.eBullets.items[i];
    cancelPop(g, b.x, b.y, n - 1 - i);
    g.eBullets.killAt(i);
  }
  g.score += n * perBullet;
  g.cancelFlash = 20;
  return n;
}

// r53: what a cancelled bullet looks like. Classic = one cyan spark on every
// 4th bullet (the wall reads as a fade). fxMeta = every bullet POPS: a small
// opaque blob (white → cyan, shrinks to zero over 10f) at the bullet — DOJ's
// "every hit is answered", the wall reads as a payday. Capped so a 200-bullet
// midboss wall can't drain the 400 pool: first 120 pop, then every other.
function cancelPop(g, x, y, k) {
  if (!g.fxMeta) { if ((k & 3) === 0) burst(g, x, y, 1, FAM.CYAN, 0.6); return; }
  if (k > 120 && (k & 1)) return;
  spawnFx(g, FX.BLOB, x, y, 0, 0, 10, 4.5, FAM.CYAN);
}

export function bulletCancelWall(g, x, y, perBullet = 100, radius = Infinity) { // release moment (S5)
  // r11: finite radius = LOCAL relief (elite) — clears the dead enemy's own
  // neighborhood, leaves the rest of the field's pressure standing.
  let n = 0;
  if (radius === Infinity) n = cancelAllBullets(g, perBullet);
  else {
    for (let i = g.eBullets.count - 1; i >= 0; i--) {
      const b = g.eBullets.items[i];
      const dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy > radius * radius) continue;
      cancelPop(g, b.x, b.y, n);
      g.eBullets.killAt(i); n++;
    }
    g.score += n * perBullet;
    if (n > 0) g.cancelFlash = Math.max(g.cancelFlash, 10);
  }
  if (n > 0) { addPopup(g, x, y, 'CANCEL +' + (n * perBullet), 1); sfx(g, SFX.CANCEL); }
}

function playerDie(g, cause) {
  const p = g.player;
  g.stats.deaths.push({ f: g.frame, x: p.x | 0, y: p.y | 0, c: cause });
  explode(g, p.x, p.y, TIER.PLAYER, FAM.WHITE, 12);
  setShake(g, 20); g.chain = 0; sfx(g, SFX.DIE);
  cancelAllBullets(g, 0); // safety clear, no points
  p.lives--;
  if (p.lives < 0) { g.state = 'gameover'; g.endFrame = g.frame; sfx(g, SFX.GAMEOVER); return; }
  p.x = W / 2; p.y = H - 53; p.invuln = 150; p.bombs = 2; p.bombActive = 0;
}

function fireBomb(g) {
  const p = g.player;
  if (p.bombs <= 0 || p.bombCd > 0) return;
  p.bombs--; p.bombCd = 90; p.bombActive = 60; p.invuln = Math.max(p.invuln, 180);
  g.stats.bombsUsed++; // r44 receipt
  // bomb-cancel points are a garnish, subordinate to speed-kill core (S6)
  const n = cancelAllBullets(g, 30);
  addPopup(g, p.x, p.y - 40, n > 0 ? 'BOMB +' + (n * 30) : 'BOMB', 1);
  g.flash = 12; sfx(g, SFX.BOMB);
}

export function update(g) {
  if (g.state !== 'play') return;
  g.sfxN = 0; // sound ring is per-frame: whatever wasn't drained is dropped
  // r8-fx hitstop: the world freezes for a few frames on a BIG/PHASE kill; only
  // the fx layer keeps moving. g.frame does not advance (core-deterministic).
  if (g.hitstop > 0) { g.hitstop--; updateFx(g); return; }
  g.frame++;
  if (!g.gate) {
    g.stageT++; // gates: timeline holds for midboss/boss, resumes instantly
    // Caravan pull (S5, WS06 lineage): speed-killing a wave pulls the next one in
    // sooner. Empty screen + no gate + next event still far ⇒ fast-forward the
    // timeline 4x. Deterministic (pure stageT math); the 30-frame guard preserves
    // each wave's telegraph space so arrivals never pop in unannounced.
    // r6: never fast-forward through the WARNING ritual — the emptied field IS
    // the telegraph (S3b arrival ritual needs its full >=1s on the clock).
    // r24 (Booth flag: "if I don't kill all the popcorn I have to wait for
    // them to fly off before the mids arrive"): stragglers the player can no
    // longer possibly hit — anything at or below the ship, since shots only
    // travel up — used to block the pull. Now only ENGAGEABLE enemies
    // (strictly above the ship) hold the timeline. Deterministic, no rng.
    let engageable = 0;
    for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].y < g.player.y) { engageable = 1; break; }
    if (!engageable && !g.warn && !g.bossDown && g.tlIndex < g.timeline.length
      && g.timeline[g.tlIndex].t - g.stageT > 30) g.stageT += 3;
  }
  const p = g.player, inp = g.input;

  // --- player movement: instant response, normalized diagonals (S1) ---
  p.prevX = p.x; p.prevY = p.y;
  let dx = inp.dx, dy = inp.dy;
  if (dx !== 0 && dy !== 0) { const inv = 1 / Math.SQRT2; dx *= inv; dy *= inv; }
  const spd = inp.focus ? PLAYER.focusSpeed : PLAYER.speed;
  p.x = Math.max(12, Math.min(W - 12, p.x + dx * spd));
  p.y = Math.max(16, Math.min(H - 16, p.y + dy * spd));
  p.focus = inp.focus;
  if (p.invuln > 0) p.invuln--;
  if (p.bombCd > 0) p.bombCd--;
  if (inp.bomb) fireBomb(g);

  // --- player shots: on-screen cap → point-blank reward (S1) ---
  if (p.fireCd > 0) p.fireCd--;
  if (inp.fire && p.fireCd === 0 && g.pBullets.count <= PLAYER.shotLimit - 2) {
    for (const off of [-7, 7]) {
      const b = g.pBullets.spawn(); if (!b) break;
      b.x = p.x + off; b.y = p.y - 10; b.vy = -PLAYER.shotSpeed;
    }
    p.fireCd = PLAYER.shotEvery; sfx(g, SFX.SHOT);
  }
  for (let i = g.pBullets.count - 1; i >= 0; i--) {
    const b = g.pBullets.items[i];
    b.y += b.vy;
    if (b.y < -20) g.pBullets.killAt(i);
  }

  // --- stage timeline ---
  const tl = g.timeline;
  while (g.tlIndex < tl.length && tl[g.tlIndex].t <= g.stageT) {
    tl[g.tlIndex].fn(g); g.tlIndex++;
  }

  // --- enemies ---
  for (let i = g.enemies.count - 1; i >= 0; i--) {
    const e = g.enemies.items[i];
    e.age++;
    // vulnerability: on-screen + 30f intro armor (S4); speed-kill clock starts here
    if (e.vulnAt < 0 && e.y > 16 && e.age > 30 && g.frame >= e.armorUntil) e.vulnAt = g.frame;
    if (e.flash > 0) e.flash--;
    // r23 (Jacob: "I killed the boss and its blue laser stayed on screen and
    // killed me"): dead enemies used to get ONE more update tick before the
    // sweep below removed them — a killed P3 boss could fire a final lance
    // volley AFTER its kill's full-screen cancel, from beyond the grave, with
    // nothing left alive to ever cancel it. Dead enemies never update.
    if (!e.dead) { if (e.type === 5) updateBoss(g, e); else updateEnemy(g, e); }
    // outro: off-screen enemies despawn silently, fire nothing (S4)
    if (e.dead || e.y > H + 40 || e.y < -80 || e.x < -60 || e.x > W + 60) {
      if (e.dead === 2) killEnemy(g, e, i); // marked killed by script (timeout phases use dead=1: no score)
      else g.enemies.killAt(i);
      continue;
    }
    // player shots vs enemy
    if (e.vulnAt >= 0) {
      for (let j = g.pBullets.count - 1; j >= 0; j--) {
        const b = g.pBullets.items[j];
        const dxx = b.x - e.x, dyy = b.y - e.y;
        if (dxx * dxx + dyy * dyy < (e.r + 6) * (e.r + 6)) {
          g.pBullets.killAt(j);
          e.hp -= PLAYER.shotDmg;
          // r8-fx S4-MUST hit-flash + hit spark: 3 sparks kicked back down the
          // shot's path (the enemy visibly REACTS — Boghog) and a tiny flame lick
          e.flash = 2;
          for (let k = 0; k < 3; k++) {
            const a = g.fxRng.range(0.3, 2.84), s = g.fxRng.range(1, 3);
            spawnFx(g, FX.SPARK, b.x, b.y, Math.cos(a) * s, Math.sin(a) * s, 8 + g.fxRng.range(0, 6), 1, FAM.ORANGE);
          }
          spawnFx(g, FX.FIRE, b.x, b.y - 2, 0, -0.5, 8, 4, FAM.ORANGE);
          sfx(g, SFX.HIT);
          if (g.player.bombActive > 0) e.hp -= 0.5;
          if (e.hp <= 0) { if (e.type === 5) scoreBossPhase(g, e); else killEnemy(g, e, i); break; }
        }
      }
    }
  }
  if (p.bombActive > 0) {
    p.bombActive--;
    // bomb ticks all enemies lightly (dead-flagged skip: a final-phase boss
    // killed by shots this same frame must not be re-killed and re-paid — the
    // double-path double-paid P3 on a robust seed, r6.2)
    for (let i = g.enemies.count - 1; i >= 0; i--) {
      const e = g.enemies.items[i];
      if (e.vulnAt >= 0 && !e.dead) {
        e.hp -= 0.4;
        if (e.hp <= 0) { if (e.type === 5) scoreBossPhase(g, e); else killEnemy(g, e, i); }
      }
    }
  }

  // r23 guarantee: once the boss is KILLED (not timed out — a timeout's
  // bullets stay by the r6 law), no enemy bullet may exist. Belt over the
  // root fix above: sweeps scorelessly every frame until the tally.
  if (g.bossKilled && g.eBullets.count) cancelAllBullets(g, 0);

  // --- enemy bullets ---
  for (let i = g.eBullets.count - 1; i >= 0; i--) {
    const b = g.eBullets.items[i];
    b.age++;
    if (b.accel) { const s = 1 + b.accel; b.vx *= s; b.vy *= s; }
    if (b.curve) { const c = Math.cos(b.curve), s = Math.sin(b.curve); const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
    b.x += b.vx; b.y += b.vy;
    if (b.x < -16 || b.x > W + 16 || b.y < -16 || b.y > H + 16) { g.eBullets.killAt(i); continue; }
    if (p.invuln === 0) {
      const dxx = b.x - p.x, dyy = b.y - p.y, rr = b.r + PLAYER.hitR;
      if (dxx * dxx + dyy * dyy < rr * rr) {
        g.eBullets.killAt(i);
        playerDie(g, 'bullet'); // flushes the pool — stop iterating it
        if (g.state !== 'play') return;
        break;
      }
    }
  }
  // enemy contact
  if (p.invuln === 0) {
    for (let i = 0; i < g.enemies.count; i++) {
      const e = g.enemies.items[i];
      const dxx = e.x - p.x, dyy = e.y - p.y, rr = e.r + PLAYER.hitR;
      if (dxx * dxx + dyy * dyy < rr * rr) { playerDie(g, 'contact'); break; }
    }
    if (g.state !== 'play') return;
  }

  // --- items (magnet + fall) ---
  // r15 clear vacuum: boss down → every coin on screen is drawn to the ship
  // from any distance, fast, so the tally never eats uncollected gold (homage
  // L3 "receipt", boghog "breathers paid in loot"; Psikyo/Cave stage-end
  // auto-collect). No decision is lost — the threat is already dead [MSX].
  const vac = g.bossDown;
  for (let i = g.items.count - 1; i >= 0; i--) {
    const it = g.items.items[i];
    it.vy = Math.min(it.vy + 0.053, 1.6);
    const dxx = p.x - it.x, dyy = p.y - it.y, d2 = dxx * dxx + dyy * dyy;
    if (vac || d2 < 53 * 53) { const d = Math.sqrt(d2) || 1; const spd = vac ? 8 : 4; it.x += (dxx / d) * spd; it.y += (dyy / d) * spd; }
    else it.y += it.vy;
    if (d2 < 12 * 12) { g.score += it.val; g.items.killAt(i); sfx(g, SFX.ITEM); continue; }
    if (it.y > H + 12) g.items.killAt(i);
  }

  updateFx(g);
  for (let i = g.popups.count - 1; i >= 0; i--) {
    const q = g.popups.items[i];
    // float up, but hold below the HUD block (y 58) and queue behind any popup
    // just above — popups never mush into the score/chain text or each other (r5)
    let rise = q.y > 58;
    if (rise) for (let j = 0; j < g.popups.count; j++) {
      if (j === i) continue;
      const o = g.popups.items[j];
      if (o.y < q.y && q.y - o.y < 13 && Math.abs(o.x - q.x) < 60) { rise = false; break; }
    }
    if (rise) q.y -= 0.5;
    if (--q.life <= 0) g.popups.killAt(i);
  }
  if (g.warn > 0) {
    g.warn--;
    // the WARNING ritual holds the timeline via a gate (so the emptied field is
    // ritual, not dead air); release it the moment the warning expires
    if (g.warn === 0 && g.gate === 'warning') g.gate = null;
  }

  // --- stage clear (boss down → tally after a beat) ---
  if (g.bossDown && !g.clearAt) g.clearAt = g.frame + 150;
  if (g.clearAt && g.frame >= g.clearAt) {
    g.clearBonus = p.lives * 1000 + p.bombs * 500; // stock bonus, garnish-sized (S6)
    g.score += g.clearBonus;
    g.state = 'clear'; g.endFrame = g.frame; sfx(g, SFX.CLEAR);
  }

  // --- instrumentation (fixed cadence, bounded size) ---
  g.stats.maxEBullets = Math.max(g.stats.maxEBullets, g.eBullets.count);
  if (g.frame % 60 === 0) {
    g.stats.bulletCurve.push(g.eBullets.count);
    g.stats.scoreCurve.push(g.score);
  }
}

// r8-fx: particles + screen counters. Runs every frame, hitstop included.
function updateFx(g) {
  for (let i = g.particles.count - 1; i >= 0; i--) {
    const q = g.particles.items[i];
    if (q.delay > 0) { q.delay--; continue; } // dormant sub-burst
    q.x += q.vx; q.y += q.vy;
    switch (q.kind) {
      case FX.BLOB: q.vx *= q.fr; q.vy *= q.fr; break; // r52 chunky: launch fast, stall
      case FX.SPARK: q.vx *= (q.fr < 1 ? q.fr : 0.94); q.vy *= (q.fr < 1 ? q.fr : 0.94); break;
      case FX.FIRE: q.vx *= 0.9; q.vy *= 0.9; break;
      case FX.SMOKE: q.vx *= 0.97; q.vy *= 0.97; break;
      case FX.DEBRIS: q.vy += q.grav; q.vx *= 0.97; q.vy *= 0.97; q.rot += q.vrot; break;
      default: break; // RING / CORE are stationary
    }
    if (--q.life <= 0) g.particles.killAt(i);
  }
  if (g.shake > 0) g.shake--;
  if (g.flash > 0) g.flash--;
  if (g.cancelFlash > 0) g.cancelFlash--;
}

// Debug/stress API for the sim harness (rubric S8 gate).
export function stressScene(g) {
  g.state = 'play'; g.timeline = []; g.tlIndex = 0;
  for (let i = 0; i < 48; i++) spawnEnemy(g, i % 4, 20 + (i % 12) * 24, 40 + ((i / 12) | 0) * 27);
  for (let i = 0; i < 1000; i++) {
    const b = g.eBullets.spawn(); if (!b) break;
    const a = g.rng.range(0, Math.PI * 2);
    b.x = g.rng.range(0, W); b.y = g.rng.range(0, H / 2);
    b.vx = Math.cos(a) * 2; b.vy = Math.abs(Math.sin(a) * 2) + 1;
    b.kind = i & 1; b.r = 3; b.accel = 0; b.curve = 0; b.age = 0;
  }
  for (let i = 0; i < 200; i++) burst(g, g.fxRng.range(0, W), g.fxRng.range(0, H), 1, FAM.ORANGE, 1);
  g.player.invuln = 999999;
}
